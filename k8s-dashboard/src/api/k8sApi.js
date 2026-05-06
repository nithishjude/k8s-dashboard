import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const API_ROOT = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;

const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

// ── interceptors ────────────────────────────────────────────────────────────
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('k8s_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const statusCode = err.response?.status;
    const message = err.response?.data?.error || err.response?.data || err.message;
    return Promise.reject({ message, statusCode });
  },
);

// ── Overview ────────────────────────────────────────────────────────────────
export const fetchOverview    = ()       => api.get('/overview');
export const fetchCpuHistory  = ()       => api.get('/metrics/cpu');
export const fetchPodsTrend   = ()       => api.get('/metrics/pods-trend');
export const fetchAlerts      = ()       => api.get('/alerts');
export const fetchAuditLogs   = ()       => api.get('/audit');
export const fetchHealth      = ()       => axios.get(`${API_ROOT}/health`, { timeout: 10000 }).then(r => r.data);

// ── Nodes ───────────────────────────────────────────────────────────────────
export const fetchNodes  = ()     => api.get('/nodes');
export const fetchNode   = (name) => api.get(`/nodes/${name}`);
export const drainNode   = (name) => api.post(`/nodes/${name}/drain`);
export const cordonNode  = (name) => api.post(`/nodes/${name}/cordon`);
export const uncordonNode= (name) => api.post(`/nodes/${name}/uncordon`);

// ── Pods ────────────────────────────────────────────────────────────────────
export const fetchPods   = ({ namespace, status, search, page, pageSize } = {}) => api.get('/pods', {
  params: {
    namespace,
    status,
    search,
    page,
    pageSize,
  },
});
export const fetchPod    = (ns, name) => api.get(`/pods/${ns}/${name}`);
export const deletePod   = (ns, name) => api.delete(`/pods/${ns}/${name}`);
export const fetchPodLogs = (ns, name, { raw = false, lines = 200 } = {}) => api.get(`/pods/${ns}/${name}/logs`, {
  params: {
    raw,
    lines,
  },
  responseType: raw ? 'text' : 'json',
});

// ── Deployments ─────────────────────────────────────────────────────────────
export const fetchDeployments    = ({ namespace, status, search, page, pageSize } = {}) => api.get('/deployments', {
  params: {
    namespace,
    status,
    search,
    page,
    pageSize,
  },
});
export const createDeployment    = (payload) => api.post('/deployments', payload);
export const fetchDeployment     = (ns, name)   => api.get(`/deployments/${ns}/${name}`);
export const scaleDeployment     = (ns, name, replicas) => api.patch(`/deployments/${ns}/${name}/scale`, { replicas });
export const deleteDeployment    = (ns, name)   => api.delete(`/deployments/${ns}/${name}`);
export const restartDeployment   = (ns, name)   => api.post(`/deployments/${ns}/${name}/restart`);

// ── Namespaces ───────────────────────────────────────────────────────────────
export const fetchNamespaces = () => api.get('/namespaces');
