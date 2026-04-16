import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Server, Cpu, MemoryStick, Droplets, RefreshCw, ShieldOff, ShieldCheck } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import { UsageDonut } from '../components/charts/ResourceCharts';
import { useK8sData } from '../hooks/useK8sData';
import { fetchNodes, drainNode, cordonNode, uncordonNode } from '../api/k8sApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import clsx from 'clsx';

function UsageBar({ value, color = 'brand' }) {
  const colors = { brand: 'bg-brand-500', green: 'bg-status-running', yellow: 'bg-status-pending', red: 'bg-status-failed' };
  const c = value > 80 ? 'red' : value > 60 ? 'yellow' : 'green';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surface-700 rounded-full h-1.5 overflow-hidden max-w-[80px]">
        <div className={clsx('h-full rounded-full transition-all duration-500', colors[c])} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-400 tabular-nums w-8">{value}%</span>
    </div>
  );
}

export default function Nodes() {
  const { autoRefresh } = useOutletContext();
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('All');
  const [selected,    setSelected]    = useState(null);
  const [actionMsg,   setActionMsg]   = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: nodes, loading, refresh, error, lastFetch } = useK8sData(fetchNodes, [], { autoRefresh, refreshInterval: 10_000 });

  const filtered = useMemo(() => {
    if (!nodes) return [];
    return nodes.filter(n => {
      const matchSearch = n.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                          n.internalIP.includes(debouncedSearch);
      const matchStatus = statusFilter === 'All' || n.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [nodes, debouncedSearch, statusFilter]);

  const doAction = async (fn, label) => {
    setActionMsg({ loading: true, text: `${label}…` });
    try {
      await fn(selected.name);
      setActionMsg({ loading: false, text: `${label} succeeded`, ok: true });
      setTimeout(() => { setActionMsg(null); refresh(); }, 1500);
    } catch {
      setActionMsg({ loading: false, text: `${label} failed`, ok: false });
    }
  };

  const COLUMNS = [
    {
      key: 'name', label: 'Name',
      render: (v, row) => (
        <div>
          <p className="font-medium text-slate-200">{v}</p>
          <p className="text-[11px] text-slate-500">{row.internalIP}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'roles',  label: 'Roles',  render: v => <span className="badge bg-surface-700 text-slate-300">{v}</span> },
    { key: 'version', label: 'Version', render: v => <span className="font-mono text-xs text-slate-400">{v}</span> },
    {
      key: 'cpuUsage', label: 'CPU',
      render: v => <UsageBar value={v} />,
    },
    {
      key: 'memoryUsage', label: 'Memory',
      render: v => <UsageBar value={v} />,
    },
    { key: 'pods', label: 'Pods', render: (v, row) => `${v} / ${row.maxPods}` },
    { key: 'age',  label: 'Age',  render: v => <span className="text-slate-500">{v}</span> },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Server size={20} className="text-brand-400" /> Nodes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{nodes?.length ?? '—'} nodes in cluster</p>
        </div>
        <button onClick={refresh} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search nodes…" className="w-60" />
        <div className="flex gap-1">
          {['All', 'Ready', 'NotReady'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200',
                statusFilter === s
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-surface-700 border-surface-600 text-slate-400 hover:text-slate-200',
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {nodes && (
          <div className="ml-auto flex gap-3 text-xs text-slate-500">
            <span><span className="text-status-running font-semibold">{nodes.filter(n=>n.status==='Ready').length}</span> Ready</span>
            <span><span className="text-status-failed font-semibold">{nodes.filter(n=>n.status==='NotReady').length}</span> NotReady</span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>Last updated: {lastFetch ? lastFetch.toLocaleTimeString() : '—'}</span>
      </div>

      <DataTable
        columns={COLUMNS}
        data={filtered}
        loading={loading}
        error={error}
        onRowClick={setSelected}
        emptyMessage="No nodes match your filters"
        skeletonRows={6}
      />

      {/* Detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setActionMsg(null); }}
        title={`Node: ${selected?.name}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            {/* Action feedback */}
            {actionMsg && (
              <div className={clsx(
                'px-3 py-2 rounded-xl text-sm flex items-center gap-2',
                actionMsg.loading ? 'bg-brand-600/20 text-brand-400' :
                actionMsg.ok     ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
              )}>
                {actionMsg.loading && <RefreshCw size={13} className="animate-spin" />}
                {actionMsg.text}
              </div>
            )}

            {/* Gauges */}
            <div className="flex justify-around py-2">
              <UsageDonut value={selected.cpuUsage}    label="CPU"    color="#6366f1" />
              <UsageDonut value={selected.memoryUsage} label="Memory" color="#22d3ee" />
              <UsageDonut value={selected.diskUsage}   label="Disk"   color="#a78bfa" />
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Internal IP',       selected.internalIP],
                ['External IP',       selected.externalIP],
                ['OS',                selected.os],
                ['Kernel',            selected.kernel],
                ['Container Runtime', selected.containerRuntime],
                ['CPU Capacity',      selected.cpuCapacity],
                ['Memory Capacity',   selected.memoryCapacity],
                ['Max Pods',          selected.maxPods],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-mono text-slate-300">{v}</p>
                </div>
              ))}
            </div>

            {/* Conditions */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Conditions</h3>
              <div className="space-y-1.5">
                {selected.conditions.map(c => (
                  <div key={c.type} className="flex items-center justify-between px-3 py-2 bg-surface-700/40 rounded-lg">
                    <span className="text-xs text-slate-300">{c.type}</span>
                    <StatusBadge status={c.status} size="xs" />
                  </div>
                ))}
              </div>
            </div>

            {/* Taints */}
            {selected.taints.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Taints</h3>
                {selected.taints.map(t => (
                  <div key={t.key} className="badge bg-amber-500/15 text-amber-400 font-mono text-xs">
                    {t.key}:{t.effect}
                  </div>
                ))}
              </div>
            )}

            {/* Events */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Events</h3>
              {selected.events.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 bg-surface-700/40 rounded-lg mb-1.5">
                  <span className={clsx('w-2 h-2 rounded-full mt-1 flex-shrink-0', ev.type==='Warning'?'bg-amber-400':'bg-emerald-400')} />
                  <div>
                    <span className="text-xs font-medium text-slate-300">{ev.reason}: </span>
                    <span className="text-xs text-slate-500">{ev.message}</span>
                    <span className="text-[10px] text-slate-600 ml-2">{ev.age}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-surface-600">
              <button onClick={() => doAction(drainNode,    'Drain')}    className="btn-secondary flex items-center gap-2 text-xs">
                <Droplets size={13} /> Drain
              </button>
              <button onClick={() => doAction(cordonNode,   'Cordon')}   className="btn-secondary flex items-center gap-2 text-xs">
                <ShieldOff size={13} /> Cordon
              </button>
              <button onClick={() => doAction(uncordonNode, 'Uncordon')} className="btn-primary flex items-center gap-2 text-xs">
                <ShieldCheck size={13} /> Uncordon
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
