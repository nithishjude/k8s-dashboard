import { useOutletContext } from 'react-router-dom';
import { Layers, Box, Rocket, Globe } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { useK8sData } from '../hooks/useK8sData';
import { fetchNamespaces } from '../api/k8sApi';

export default function Namespaces() {
  const { autoRefresh } = useOutletContext();
  const { data: namespaces, loading, error, lastFetch } = useK8sData(fetchNamespaces, [], { autoRefresh, refreshInterval: 15_000 });

  const COLUMNS = [
    {
      key: 'name', label: 'Name',
      render: v => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-600/20 flex items-center justify-center">
            <Layers size={12} className="text-brand-400" />
          </div>
          <span className="font-medium text-slate-200 font-mono">{v}</span>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'pods',        label: 'Pods',        render: v => <span className="flex items-center gap-1.5 text-xs"><Box size={12} className="text-slate-500" />{v}</span> },
    { key: 'deployments', label: 'Deployments', render: v => <span className="flex items-center gap-1.5 text-xs"><Rocket size={12} className="text-slate-500" />{v}</span> },
    { key: 'services',    label: 'Services',    render: v => <span className="flex items-center gap-1.5 text-xs"><Globe size={12} className="text-slate-500" />{v}</span> },
    { key: 'cpuQuota',    label: 'CPU Quota',   render: v => <span className="text-xs text-slate-400">{v}</span> },
    { key: 'memoryQuota', label: 'Memory Quota',render: v => <span className="text-xs text-slate-400">{v}</span> },
    { key: 'age',         label: 'Age',         render: v => <span className="text-xs text-slate-500">{v}</span> },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Layers size={20} className="text-brand-400" /> Namespaces
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{namespaces?.length ?? '—'} namespaces in cluster</p>
      </div>

      {/* Summary cards */}
      {namespaces && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {namespaces.map(ns => (
            <div key={ns.name} className="card card-hover p-4 space-y-2 text-center">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center mx-auto">
                <Layers size={16} className="text-brand-400" />
              </div>
              <p className="text-xs font-semibold text-slate-200 truncate">{ns.name}</p>
              <StatusBadge status={ns.status} size="xs" />
              <p className="text-[10px] text-slate-500">{ns.pods} pods · {ns.services} svc</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between text-xs text-slate-500">
        <span>Last updated: {lastFetch ? lastFetch.toLocaleTimeString() : '—'}</span>
      </div>

      <DataTable columns={COLUMNS} data={namespaces || []} loading={loading} error={error} emptyMessage="No namespaces found" skeletonRows={6} />
    </div>
  );
}
