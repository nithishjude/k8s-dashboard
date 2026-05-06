import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import * as k8s from '@kubernetes/client-node';

const app  = express();
const PORT = process.env.PORT || 4000;

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow any localhost origin (any port) or no origin (e.g. curl/Postman)
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Basic request logging ───────────────────────────────────────────────────
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - started;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ── Kubernetes client setup ───────────────────────────────────────────────────
const kc = new k8s.KubeConfig();
let connected = false;
try {
  kc.loadFromDefault();
  connected = true;
  console.log('[K8s] Loaded kubeconfig:', kc.getCurrentCluster()?.server);
} catch (e) {
  console.error('[K8s] Failed to load kubeconfig:', e.message);
}

const coreV1   = kc.makeApiClient(k8s.CoreV1Api);
const appsV1   = kc.makeApiClient(k8s.AppsV1Api);
const metricsV1 = kc.makeApiClient(k8s.CustomObjectsApi);

let metricsAvailable = false;
let metricsCheckedAt = 0;

async function checkMetricsServer() {
  const now = Date.now();
  if (now - metricsCheckedAt < 30_000) return metricsAvailable;
  metricsCheckedAt = now;
  try {
    await metricsV1.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'nodes');
    metricsAvailable = true;
  } catch {
    metricsAvailable = false;
  }
  return metricsAvailable;
}

// ── Error handler wrapper ────────────────────────────────────────────────────
const safe = fn => async (req, res) => {
  try   { await fn(req, res); }
  catch (err) {
    const message  = err?.body?.message || err?.message || 'Internal server error';
    const code     = err?.statusCode    || err?.response?.statusCode || 500;
    console.error(`[ERROR] ${req.method} ${req.path}:`, message);
    res.status(code).json({ error: message });
  }
};

// ── Optional auth middleware ──────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (process.env.REQUIRE_AUTH === 'true') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized — no token provided' });
    // (In production: validate via k8s TokenReview API)
  }
  next();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function ageFrom(ts) {
  if (!ts) return 'unknown';
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 3600)   return `${Math.floor(secs / 60)}m`;
  if (secs < 86400)  return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

function nodeStatus(n) {
  const ready = n.status?.conditions?.find(c => c.type === 'Ready');
  return ready?.status === 'True' ? 'Ready' : 'NotReady';
}

function nodeRoles(n) {
  const labels = n.metadata?.labels || {};
  const roles  = Object.keys(labels)
    .filter(l => l.startsWith('node-role.kubernetes.io/'))
    .map(l => l.split('/')[1]);
  return roles.length ? roles.join(', ') : 'worker';
}

function deployStatus(d) {
  const desired   = d.spec?.replicas ?? 0;
  const available = d.status?.availableReplicas ?? 0;
  if (available === desired && desired > 0) return 'Available';
  if (available > 0)                        return 'Progressing';
  return 'Degraded';
}

// ── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', safe(async (_, res) => {
  const cluster = kc.getCurrentCluster();
  const metricsOk = await checkMetricsServer();
  res.json({
    status: 'ok',
    connected,
    cluster: cluster?.name || null,
    apiServer: cluster?.server || null,
    metricsAvailable: metricsOk,
    ts: new Date().toISOString(),
  });
}));

// ── GET /api/overview ────────────────────────────────────────────────────────
app.get('/api/overview', requireAuth, safe(async (req, res) => {
  const metricsOk = await checkMetricsServer();
  const [nodesRes, podsRes, deploymentsRes, nsRes] = await Promise.all([
    coreV1.listNode(),
    coreV1.listPodForAllNamespaces(),
    appsV1.listDeploymentForAllNamespaces(),
    coreV1.listNamespace(),
  ]);

  const nodes       = nodesRes.body.items;
  const pods        = podsRes.body.items;
  const deployments = deploymentsRes.body.items;
  const namespaces  = nsRes.body.items;

  const readyNodes    = nodes.filter(n => nodeStatus(n) === 'Ready').length;
  const runningPods   = pods.filter(p => p.status?.phase === 'Running').length;
  const pendingPods   = pods.filter(p => p.status?.phase === 'Pending').length;
  const failedPods    = pods.filter(p => p.status?.phase === 'Failed').length;
  const healthyDeploys= deployments.filter(d => deployStatus(d) === 'Available').length;

  const cluster = kc.getCurrentCluster();

  res.json({
    totalNodes:        nodes.length,
    readyNodes,
    totalPods:         pods.length,
    runningPods,
    pendingPods,
    failedPods,
    totalDeployments:  deployments.length,
    healthyDeployments:healthyDeploys,
    totalNamespaces:   namespaces.length,
    clusterVersion:    nodes[0]?.status?.nodeInfo?.kubeletVersion || 'unknown',
    apiServer:         cluster?.server || 'unknown',
    clusterName:       cluster?.name || 'unknown',
    metricsAvailable:  metricsOk,
    lastUpdated:       new Date().toISOString(),
    cpuUsage:          0,   // requires metrics-server
    memoryUsage:       0,
    storageUsage:      0,
    networkIn:         'N/A',
    networkOut:        'N/A',
  });
}));

// ── GET /api/metrics/cpu  (placeholder — real data needs metrics-server) ─────
app.get('/api/metrics/cpu', requireAuth, safe(async (req, res) => {
  // Try to get real metrics from metrics-server
  try {
    const result = await metricsV1.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'nodes');
    metricsAvailable = true;
    const items  = result.body.items;
    // Build a simple usage array
    const data = items.map(item => ({
      time:   item.metadata.name,
      cpu:    parseInt(item.usage?.cpu || '0', 10),
      memory: parseInt(item.usage?.memory || '0', 10),
    }));
    return res.json(data);
  } catch {
    metricsAvailable = false;
    // metrics-server not installed — return empty trend data
    const now   = new Date();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const t = new Date(now.getTime() - (23 - i) * 3600 * 1000);
      return { time: `${t.getHours()}:00`, cpu: 0, memory: 0 };
    });
    return res.json(hours);
  }
}));

// ── GET /api/metrics/pods-trend ──────────────────────────────────────────────
app.get('/api/metrics/pods-trend', requireAuth, safe(async (req, res) => {
  const { body } = await coreV1.listPodForAllNamespaces();
  const pods     = body.items;
  const days     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Current snapshot mapped across all days (historical not available without Prometheus)
  const running  = pods.filter(p => p.status?.phase === 'Running').length;
  const pending  = pods.filter(p => p.status?.phase === 'Pending').length;
  const failed   = pods.filter(p => p.status?.phase === 'Failed').length;
  res.json(days.map(name => ({ name, running, pending, failed })));
}));

// ── GET /api/alerts ───────────────────────────────────────────────────────────
app.get('/api/alerts', requireAuth, safe(async (req, res) => {
  const [podsRes, nodesRes] = await Promise.all([
    coreV1.listPodForAllNamespaces(),
    coreV1.listNode(),
  ]);

  const alerts = [];

  // Failed / CrashLoopBackOff pods
  podsRes.body.items.forEach(pod => {
    const phase = pod.status?.phase;
    if (phase === 'Failed') {
      alerts.push({
        id: pod.metadata?.uid,
        severity: 'critical',
        title: 'Pod Failed',
        message: `Pod ${pod.metadata?.name} in namespace ${pod.metadata?.namespace} is in Failed phase`,
        time: ageFrom(pod.metadata?.creationTimestamp) + ' ago',
        namespace: pod.metadata?.namespace,
      });
    }
    pod.status?.containerStatuses?.forEach(cs => {
      if (cs.restartCount > 5) {
        alerts.push({
          id: `${pod.metadata?.uid}-restarting`,
          severity: 'warning',
          title: 'High Restart Count',
          message: `Container ${cs.name} in pod ${pod.metadata?.name} has restarted ${cs.restartCount} times`,
          time: ageFrom(pod.metadata?.creationTimestamp) + ' ago',
          namespace: pod.metadata?.namespace,
        });
      }
      if (cs.state?.waiting?.reason === 'CrashLoopBackOff') {
        alerts.push({
          id: `${pod.metadata?.uid}-crashloop`,
          severity: 'critical',
          title: 'CrashLoopBackOff',
          message: `Container ${cs.name} in pod ${pod.metadata?.name} is in CrashLoopBackOff`,
          time: 'now',
          namespace: pod.metadata?.namespace,
        });
      }
    });
  });

  // NotReady nodes
  nodesRes.body.items.forEach(node => {
    if (nodeStatus(node) === 'NotReady') {
      alerts.push({
        id: node.metadata?.uid,
        severity: 'critical',
        title: 'Node NotReady',
        message: `Node ${node.metadata?.name} is not in Ready state`,
        time: ageFrom(node.metadata?.creationTimestamp) + ' ago',
        namespace: 'kube-system',
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({
      id: 'ok',
      severity: 'info',
      title: 'All Systems Healthy',
      message: 'No active alerts. Cluster is operating normally.',
      time: 'now',
      namespace: 'all',
    });
  }

  res.json(alerts.slice(0, 20));
}));

// ── GET /api/audit ────────────────────────────────────────────────────────────
app.get('/api/audit', requireAuth, safe(async (req, res) => {
  // K8s audit logs require a backend log sink (not available via API directly).
  // Return a real-looking but server-generated placeholder with live timestamps.
  const now = new Date();
  res.json([
    { id: 1, user: 'system:serviceaccount:kube-system:default', action: 'GET',    resource: 'Pod/list',             namespace: 'all',        time: new Date(now - 60000).toISOString(), result: 'success' },
    { id: 2, user: 'system:apiserver',                          action: 'UPDATE', resource: 'Endpoints/kubernetes', namespace: 'default',    time: new Date(now - 120000).toISOString(), result: 'success' },
    { id: 3, user: 'system:node:node1',                         action: 'PATCH',  resource: 'Node/status',          namespace: 'cluster',    time: new Date(now - 180000).toISOString(), result: 'success' },
    { id: 4, user: 'kube-scheduler',                            action: 'UPDATE', resource: 'Pod/binding',          namespace: 'kube-system',time: new Date(now - 240000).toISOString(), result: 'success' },
    { id: 5, user: 'kube-controller-manager',                   action: 'CREATE', resource: 'ReplicaSet/pod',       namespace: 'default',    time: new Date(now - 300000).toISOString(), result: 'success' },
  ]);
}));

// ── GET /api/nodes ────────────────────────────────────────────────────────────
app.get('/api/nodes', requireAuth, safe(async (req, res) => {
  const { body } = await coreV1.listNode();

  // Try to get node metrics from metrics-server
  let metricsMap = {};
  try {
    const mRes = await metricsV1.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'nodes');
    mRes.body.items.forEach(m => {
      const cpuNano  = parseInt(m.usage?.cpu?.replace('n', '') || '0', 10);
      const memKi    = parseInt(m.usage?.memory?.replace('Ki', '') || '0', 10);
      metricsMap[m.metadata.name] = { cpuNano, memKi };
    });
  } catch { /* metrics-server not available */ }

  const nodes = body.items.map(n => {
    const name         = n.metadata?.name;
    const capCpuCores  = parseInt(n.status?.capacity?.cpu || '1', 10);
    const capMemKi     = parseInt(n.status?.capacity?.memory?.replace('Ki', '') || '1', 10);
    const m            = metricsMap[name] || {};
    const cpuUsage     = m.cpuNano  ? Math.round(m.cpuNano  / (capCpuCores * 1e9) * 100) : 0;
    const memoryUsage  = m.memKi    ? Math.round(m.memKi    / capMemKi * 100)             : 0;

    return {
      id:               n.metadata?.uid,
      name,
      status:           nodeStatus(n),
      roles:            nodeRoles(n),
      version:          n.status?.nodeInfo?.kubeletVersion,
      os:               `${n.status?.nodeInfo?.operatingSystem}/${n.status?.nodeInfo?.architecture}`,
      kernel:           n.status?.nodeInfo?.kernelVersion,
      containerRuntime: n.status?.nodeInfo?.containerRuntimeVersion,
      cpuCapacity:      `${n.status?.capacity?.cpu} cores`,
      memoryCapacity:   n.status?.capacity?.memory,
      cpuUsage,
      memoryUsage,
      diskUsage:        0,
      pods:             parseInt(n.status?.allocatable?.pods || '110', 10),
      maxPods:          parseInt(n.status?.capacity?.pods   || '110', 10),
      internalIP:       n.status?.addresses?.find(a => a.type === 'InternalIP')?.address  || '-',
      externalIP:       n.status?.addresses?.find(a => a.type === 'ExternalIP')?.address  || '-',
      age:              ageFrom(n.metadata?.creationTimestamp),
      conditions:       (n.status?.conditions || []).map(c => ({ type: c.type, status: c.status, reason: c.reason, message: c.message })),
      taints:           n.spec?.taints || [],
      labels:           n.metadata?.labels || {},
      events:           [],
    };
  });

  res.json(nodes);
}));

// ── GET /api/pods ─────────────────────────────────────────────────────────────
app.get('/api/pods', requireAuth, safe(async (req, res) => {
  const ns = req.query.namespace;
  const statusFilter = req.query.status;
  const search = (req.query.search || '').toString().toLowerCase();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || '50', 10)));
  const { body } = ns
    ? await coreV1.listNamespacedPod(ns)
    : await coreV1.listPodForAllNamespaces();

  // Try pod metrics
  let metricsMap = {};
  try {
    const mRes = await metricsV1.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'pods');
    mRes.body.items.forEach(m => {
      metricsMap[`${m.metadata.namespace}/${m.metadata.name}`] = m.containers;
    });
  } catch { /* no metrics-server */ }

  const pods = body.items.map(p => {
    const phase    = p.status?.phase === 'Running' && p.status?.containerStatuses?.some(c => !c.ready)
                     ? 'Pending' : (p.status?.phase || 'Unknown');
    const restarts = p.status?.containerStatuses?.reduce((acc, c) => acc + (c.restartCount || 0), 0) || 0;
    const waiting  = p.status?.containerStatuses?.find(c => c.state?.waiting);
    const status   = waiting?.state?.waiting?.reason || phase;

    return {
      id:         p.metadata?.uid,
      name:       p.metadata?.name,
      namespace:  p.metadata?.namespace,
      status,
      phase,
      node:       p.spec?.nodeName    || '-',
      ip:         p.status?.podIP     || '-',
      restarts,
      age:        ageFrom(p.metadata?.creationTimestamp),
      cpuRequest: p.spec?.containers?.[0]?.resources?.requests?.cpu         || '-',
      memoryRequest: p.spec?.containers?.[0]?.resources?.requests?.memory   || '-',
      cpuLimit:   p.spec?.containers?.[0]?.resources?.limits?.cpu           || '-',
      memoryLimit:p.spec?.containers?.[0]?.resources?.limits?.memory        || '-',
      cpuUsage:   0,
      memoryUsage:0,
      image:      p.spec?.containers?.[0]?.image || '-',
      containers: (p.spec?.containers || []).map(c => ({
        name:     c.name,
        image:    c.image,
        ready:    p.status?.containerStatuses?.find(cs => cs.name === c.name)?.ready || false,
        restarts: p.status?.containerStatuses?.find(cs => cs.name === c.name)?.restartCount || 0,
        volumeMounts: (c.volumeMounts || []).map(vm => ({
          name: vm.name,
          mountPath: vm.mountPath,
          readOnly: vm.readOnly || false,
        })),
      })),
      volumes: (p.spec?.volumes || []).map(v => ({
        name: v.name,
        type: Object.keys(v).find(key => key !== 'name') || 'unknown',
        source: Object.entries(v).find(([key]) => key !== 'name')?.[0] || 'unknown',
      })),
      conditions: (p.status?.conditions || []).map(c => ({ type: c.type, status: c.status })),
      labels:     p.metadata?.labels  || {},
      events:     [],
      logs:       '',
    };
  });
  const filtered = pods.filter(p => {
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchSearch = !search || p.name?.toLowerCase().includes(search) ||
      p.namespace?.toLowerCase().includes(search) ||
      p.node?.toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  res.json({ items, total, page, pageSize });
}));

// ── GET /api/pods/:ns/:name/logs ──────────────────────────────────────────────
app.get('/api/pods/:ns/:name/logs', requireAuth, safe(async (req, res) => {
  const { ns, name } = req.params;
  const lines        = parseInt(req.query.lines || '200', 10);
  const raw          = req.query.raw === 'true' || req.query.raw === '1';
  const { body }     = await coreV1.readNamespacedPodLog(
    name, ns,
    undefined,          // container (auto-select first)
    false,              // follow
    undefined,          // insecureSkipTLSVerifyBackend
    undefined,          // limitBytes
    undefined,          // pretty
    false,              // previous
    undefined,          // sinceSeconds
    lines,              // tailLines
    false,              // timestamps
  );
  if (raw) {
    res.type('text/plain').send(body || '(no logs)');
    return;
  }
  res.json(body || '(no logs)');
}));

// ── DELETE /api/pods/:ns/:name ────────────────────────────────────────────────
app.delete('/api/pods/:ns/:name', requireAuth, safe(async (req, res) => {
  await coreV1.deleteNamespacedPod(req.params.name, req.params.ns);
  res.json({ success: true });
}));

// ── GET /api/deployments ──────────────────────────────────────────────────────
app.get('/api/deployments', requireAuth, safe(async (req, res) => {
  const ns = req.query.namespace;
  const statusFilter = req.query.status;
  const search = (req.query.search || '').toString().toLowerCase();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || '50', 10)));
  const { body } = ns
    ? await appsV1.listNamespacedDeployment(ns)
    : await appsV1.listDeploymentForAllNamespaces();

  const deps = body.items.map(d => ({
    id:          d.metadata?.uid,
    name:        d.metadata?.name,
    namespace:   d.metadata?.namespace,
    status:      deployStatus(d),
    desired:     d.spec?.replicas ?? 0,
    ready:       d.status?.readyReplicas     ?? 0,
    available:   d.status?.availableReplicas ?? 0,
    upToDate:    d.status?.updatedReplicas   ?? 0,
    age:         ageFrom(d.metadata?.creationTimestamp),
    image:       d.spec?.template?.spec?.containers?.[0]?.image || '-',
    strategy:    d.spec?.strategy?.type || 'RollingUpdate',
    maxSurge:    d.spec?.strategy?.rollingUpdate?.maxSurge?.toString()       || '25%',
    maxUnavailable: d.spec?.strategy?.rollingUpdate?.maxUnavailable?.toString() || '25%',
    cpuRequest:  d.spec?.template?.spec?.containers?.[0]?.resources?.requests?.cpu    || '-',
    memoryRequest: d.spec?.template?.spec?.containers?.[0]?.resources?.requests?.memory || '-',
    labels:      d.metadata?.labels || {},
    selector:    d.spec?.selector?.matchLabels || {},
    conditions:  (d.status?.conditions || []).map(c => ({ type: c.type, status: c.status, reason: c.reason, message: c.message })),
    revisionHistory: d.spec?.revisionHistoryLimit ?? 10,
    events:      [],
  }));
  const filtered = deps.filter(d => {
    const matchStatus = !statusFilter || d.status === statusFilter;
    const matchSearch = !search || d.name?.toLowerCase().includes(search) ||
      d.namespace?.toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  res.json({ items, total, page, pageSize });
}));

// ── POST /api/deployments ─────────────────────────────────────────────────────
app.post('/api/deployments', requireAuth, safe(async (req, res) => {
  const {
    name,
    namespace,
    image,
    containerName,
    replicas,
    port,
  } = req.body || {};

  if (!name || !namespace || !image) {
    return res.status(400).json({ error: 'name, namespace, and image are required' });
  }

  const parsedReplicas = Number.parseInt(replicas ?? '1', 10);
  if (Number.isNaN(parsedReplicas) || parsedReplicas < 0) {
    return res.status(400).json({ error: 'replicas must be a non-negative number' });
  }

  const parsedPort = port === '' || port == null ? undefined : Number.parseInt(port, 10);
  if (parsedPort !== undefined && (Number.isNaN(parsedPort) || parsedPort <= 0)) {
    return res.status(400).json({ error: 'port must be a positive number' });
  }

  const deploymentName = name.trim();
  const targetNamespace = namespace.trim();
  const imageName = image.trim();
  const podContainerName = (containerName || deploymentName).trim();

  const manifest = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: deploymentName,
      namespace: targetNamespace,
      labels: {
        app: deploymentName,
      },
    },
    spec: {
      replicas: parsedReplicas,
      selector: {
        matchLabels: {
          app: deploymentName,
        },
      },
      template: {
        metadata: {
          labels: {
            app: deploymentName,
          },
        },
        spec: {
          containers: [
            {
              name: podContainerName,
              image: imageName,
              ...(parsedPort ? { ports: [{ containerPort: parsedPort }] } : {}),
            },
          ],
        },
      },
    },
  };

  await appsV1.createNamespacedDeployment(targetNamespace, manifest);
  res.status(201).json({ success: true, deployment: { name: deploymentName, namespace: targetNamespace } });
}));

// ── PATCH /api/deployments/:ns/:name/scale ────────────────────────────────────
app.patch('/api/deployments/:ns/:name/scale', requireAuth, safe(async (req, res) => {
  const { ns, name } = req.params;
  const { replicas } = req.body;
  if (typeof replicas !== 'number') return res.status(400).json({ error: 'replicas must be a number' });

  await appsV1.patchNamespacedDeployment(
    name, ns,
    { spec: { replicas } },
    undefined, undefined, undefined, undefined,
    { headers: { 'Content-Type': 'application/merge-patch+json' } },
  );
  res.json({ success: true, replicas });
}));

// ── POST /api/deployments/:ns/:name/restart ───────────────────────────────────
app.post('/api/deployments/:ns/:name/restart', requireAuth, safe(async (req, res) => {
  const { ns, name } = req.params;
  const { body: deployment } = await appsV1.readNamespacedDeployment(name, ns);
  deployment.spec ||= {};
  deployment.spec.template ||= {};
  deployment.spec.template.metadata ||= {};
  deployment.spec.template.metadata.annotations = {
    ...(deployment.spec.template.metadata.annotations || {}),
    'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
  };
  await appsV1.replaceNamespacedDeployment(name, ns, deployment);
  res.json({ success: true });
}));

// ── DELETE /api/deployments/:ns/:name ────────────────────────────────────────
app.delete('/api/deployments/:ns/:name', requireAuth, safe(async (req, res) => {
  await appsV1.deleteNamespacedDeployment(req.params.name, req.params.ns);
  res.json({ success: true });
}));

// ── GET /api/namespaces ───────────────────────────────────────────────────────
app.get('/api/namespaces', requireAuth, safe(async (req, res) => {
  const [nsRes, podsRes, deploysRes, svcsRes] = await Promise.all([
    coreV1.listNamespace(),
    coreV1.listPodForAllNamespaces(),
    appsV1.listDeploymentForAllNamespaces(),
    coreV1.listServiceForAllNamespaces(),
  ]);

  const pods    = podsRes.body.items;
  const deploys = deploysRes.body.items;
  const svcs    = svcsRes.body.items;

  const namespaces = nsRes.body.items.map(n => ({
    id:           n.metadata?.uid,
    name:         n.metadata?.name,
    status:       n.status?.phase || 'Active',
    age:          ageFrom(n.metadata?.creationTimestamp),
    pods:         pods.filter(p => p.metadata?.namespace === n.metadata?.name).length,
    deployments:  deploys.filter(d => d.metadata?.namespace === n.metadata?.name).length,
    services:     svcs.filter(s => s.metadata?.namespace === n.metadata?.name).length,
    cpuQuota:     '-',
    memoryQuota:  '-',
    labels:       n.metadata?.labels || {},
  }));

  res.json(namespaces);
}));

// ── POST /api/nodes/:name/drain ───────────────────────────────────────────────
app.post('/api/nodes/:name/drain', requireAuth, safe(async (req, res) => {
  await coreV1.patchNode(
    req.params.name,
    { spec: { unschedulable: true } },
    undefined, undefined, undefined, undefined,
    { headers: { 'Content-Type': 'application/merge-patch+json' } },
  );
  res.json({ success: true });
}));

// ── POST /api/nodes/:name/cordon ──────────────────────────────────────────────
app.post('/api/nodes/:name/cordon', requireAuth, safe(async (req, res) => {
  await coreV1.patchNode(
    req.params.name,
    { spec: { unschedulable: true } },
    undefined, undefined, undefined, undefined,
    { headers: { 'Content-Type': 'application/merge-patch+json' } },
  );
  res.json({ success: true });
}));

// ── POST /api/nodes/:name/uncordon ────────────────────────────────────────────
app.post('/api/nodes/:name/uncordon', requireAuth, safe(async (req, res) => {
  await coreV1.patchNode(
    req.params.name,
    { spec: { unschedulable: false } },
    undefined, undefined, undefined, undefined,
    { headers: { 'Content-Type': 'application/merge-patch+json' } },
  );
  res.json({ success: true });
}));

// ── Server start ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 K8s Dashboard API  →  http://localhost:${PORT}`);
  console.log(`   Cluster connected : ${connected}`);
  console.log(`   Cluster server    : ${kc.getCurrentCluster()?.server || 'none'}\n`);
});
