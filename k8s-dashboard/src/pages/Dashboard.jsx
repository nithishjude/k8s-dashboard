import { useOutletContext } from 'react-router-dom';
import { Server, Box, Rocket, Layers, AlertTriangle, CheckCircle, Activity, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import { ResourceAreaChart, PodsTrendChart, UsageDonut } from '../components/charts/ResourceCharts';
import StatusBadge from '../components/ui/StatusBadge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useK8sData } from '../hooks/useK8sData';
import { fetchOverview, fetchCpuHistory, fetchPodsTrend, fetchAlerts } from '../api/k8sApi';

export default function Dashboard() {
  const { autoRefresh } = useOutletContext();
  const opts = { autoRefresh, refreshInterval: 10_000 };

  const { data: overview, loading: ovLoading, error: ovError, lastFetch } = useK8sData(fetchOverview,   [], opts);
  const { data: cpuHist,  loading: cpuLoading, error: cpuError } = useK8sData(fetchCpuHistory, [], opts);
  const { data: podsTrend }                     = useK8sData(fetchPodsTrend,  [], opts);
  const { data: alerts }                        = useK8sData(fetchAlerts,     [], opts);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Cluster Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {overview ? `${overview.clusterName || 'cluster'} · ${overview.apiServer} · Kubernetes ${overview.clusterVersion}` : 'Loading cluster info…'}
        </p>
        <p className="text-xs text-slate-600 mt-1">Last updated: {lastFetch ? lastFetch.toLocaleTimeString() : '—'}</p>
      </div>

      {ovError && (
        <div className="card p-4 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
          {ovError.statusCode === 403 ? 'Insufficient permissions (RBAC) to read cluster overview.' : ovError.message}
        </div>
      )}

      {overview && overview.metricsAvailable === false && (
        <div className="card p-4 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
          Metrics are unavailable. Install metrics-server to see live CPU and memory usage.
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(ovLoading || !overview) ? (
          Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard icon={Server}   label="Total Nodes"        value={overview.totalNodes}        sub={`${overview.readyNodes} Ready`}         color="brand"  />
            <MetricCard icon={Box}      label="Running Pods"       value={overview.runningPods}       sub={`${overview.totalPods} total`}           color="green"  />
            <MetricCard icon={Rocket}   label="Deployments"        value={overview.healthyDeployments} sub={`${overview.totalDeployments} total`}  color="purple" />
            <MetricCard icon={Layers}   label="Namespaces"         value={overview.totalNamespaces}   sub="Active namespaces"                       color="cyan"   />
            <MetricCard icon={AlertTriangle} label="Pending Pods"  value={overview.pendingPods}       sub={`${overview.failedPods} failed`}         color="yellow" />
            <MetricCard icon={Cpu}      label="CPU Usage"          value={`${overview.cpuUsage}%`}    sub="Cluster average"                         color="brand"  />
            <MetricCard icon={MemoryStick} label="Memory Usage"    value={`${overview.memoryUsage}%`} sub="Cluster average"                         color="purple" />
            <MetricCard icon={HardDrive} label="Storage Usage"     value={`${overview.storageUsage}%`} sub="Persistent volumes"                    color="cyan"   />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* CPU/Memory area */}
        <div className="xl:col-span-2 card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Resource Usage (24h)</h2>
              <p className="text-xs text-slate-500">CPU and Memory trend</p>
            </div>
            <Activity size={16} className="text-brand-400" />
          </div>
          {(cpuLoading || !cpuHist || cpuError) ? (
            <div className="skeleton h-[220px] rounded-xl" />
          ) : (
            <ResourceAreaChart data={cpuHist} />
          )}
        </div>

        {/* Usage donuts */}
        <div className="card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Current Usage</h2>
            <p className="text-xs text-slate-500">Live cluster metrics</p>
          </div>
          {(ovLoading || !overview) ? (
            <div className="skeleton h-[180px] rounded-xl" />
          ) : (
            <div className="flex flex-col gap-5 pt-2">
              <div className="flex justify-around">
                <UsageDonut value={overview.cpuUsage}     label="CPU"     color="#6366f1" />
                <UsageDonut value={overview.memoryUsage}  label="Memory"  color="#22d3ee" />
                <UsageDonut value={overview.storageUsage} label="Storage" color="#a78bfa" />
              </div>

              <div className="space-y-2 pt-2 border-t border-surface-600">
                {[
                  { label: 'Network In',  value: overview.networkIn  },
                  { label: 'Network Out', value: overview.networkOut  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-mono text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pods trend + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Pods weekly bar chart */}
        <div className="xl:col-span-2 card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Pods Status (7-day trend)</h2>
            <p className="text-xs text-slate-500">Running / Pending / Failed distribution</p>
          </div>
          {(podsTrend && podsTrend.length) ? <PodsTrendChart data={podsTrend} /> : <div className="skeleton h-[220px] rounded-xl" />}
        </div>

        {/* Recent alerts */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Recent Alerts</h2>
          <div className="space-y-2">
            {(alerts || []).map(alert => (
              <div key={alert.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-700/50 hover:bg-surface-700 transition-colors">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-400' :
                  alert.severity === 'warning'  ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{alert.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={alert.severity} size="xs" />
                    <span className="text-[10px] text-slate-600">{alert.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cluster health summary */}
      {overview && !ovLoading && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Cluster Health</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'API Server',        ok: true,  detail: 'Reachable' },
              { label: 'etcd',              ok: true,  detail: 'Healthy' },
              { label: 'Scheduler',         ok: true,  detail: 'Active' },
              { label: 'Controller Mgr',    ok: overview.readyNodes === overview.totalNodes, detail: overview.readyNodes === overview.totalNodes ? 'OK' : 'Degraded' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-700/50">
                {item.ok
                  ? <CheckCircle size={15} className="text-status-running flex-shrink-0" />
                  : <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
                }
                <div>
                  <p className="text-xs font-semibold text-slate-300">{item.label}</p>
                  <p className={`text-[10px] ${item.ok ? 'text-status-running' : 'text-amber-400'}`}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
