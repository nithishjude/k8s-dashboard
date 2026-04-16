import { useOutletContext } from 'react-router-dom';
import { Activity, ExternalLink } from 'lucide-react';
import { ResourceAreaChart, PodsTrendChart } from '../components/charts/ResourceCharts';
import { useK8sData } from '../hooks/useK8sData';
import { fetchCpuHistory, fetchPodsTrend, fetchOverview } from '../api/k8sApi';

export default function Metrics() {
  const { autoRefresh } = useOutletContext();
  const opts = { autoRefresh, refreshInterval: 15_000 };
  const { data: cpuHist, error: cpuError }   = useK8sData(fetchCpuHistory, [], opts);
  const { data: podsTrend } = useK8sData(fetchPodsTrend,  [], opts);
  const { data: overview, error: ovError, lastFetch }  = useK8sData(fetchOverview,   [], opts);

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity size={20} className="text-brand-400" /> Metrics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Cluster resource utilization and trends</p>
          <p className="text-xs text-slate-600 mt-1">Last updated: {lastFetch ? lastFetch.toLocaleTimeString() : '—'}</p>
        </div>
      </div>

      {ovError && (
        <div className="card p-4 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
          {ovError.statusCode === 403 ? 'Insufficient permissions (RBAC) to read metrics.' : ovError.message}
        </div>
      )}

      {overview && overview.metricsAvailable === false && (
        <div className="card p-4 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
          Metrics are unavailable. Install metrics-server to see live CPU and memory usage.
        </div>
      )}

      {/* Key metrics row */}
      {overview && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'CPU Usage',    value: `${overview.cpuUsage}%`,    color: '#6366f1' },
            { label: 'Memory Usage', value: `${overview.memoryUsage}%`, color: '#22d3ee' },
            { label: 'Storage',      value: `${overview.storageUsage}%`, color: '#a78bfa' },
          ].map(m => (
            <div key={m.label} className="card p-5 text-center">
              <p className="text-3xl font-bold" style={{ color: m.color }}>{m.value}</p>
              <p className="text-xs text-slate-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">CPU & Memory (24h)</h2>
        {cpuHist && !cpuError ? <ResourceAreaChart data={cpuHist} /> : <div className="skeleton h-[220px] rounded-xl" />}
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Pods Status (7-day)</h2>
        {podsTrend ? <PodsTrendChart data={podsTrend} /> : <div className="skeleton h-[220px] rounded-xl" />}
      </div>

      {/* Grafana / Prometheus integration card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { name: 'Grafana', desc: 'Advanced dashboards & alerting', url: 'http://grafana.local:3000', color: 'from-orange-600/20 to-amber-600/10', border: 'border-orange-600/20' },
          { name: 'Prometheus', desc: 'Metrics collection & PromQL', url: 'http://prometheus.local:9090', color: 'from-orange-500/20 to-red-500/10', border: 'border-orange-500/20' },
        ].map(tool => (
          <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer"
            className={`card card-hover p-5 bg-gradient-to-br ${tool.color} border ${tool.border} flex items-center justify-between group`}>
            <div>
              <p className="font-semibold text-slate-200">{tool.name}</p>
              <p className="text-xs text-slate-500 mt-1">{tool.desc}</p>
            </div>
            <ExternalLink size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}
