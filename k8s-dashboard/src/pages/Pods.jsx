import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Box, RefreshCw, Trash2, Terminal, RotateCcw } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import { useK8sData } from '../hooks/useK8sData';
import { fetchPods, deletePod, fetchPodLogs, fetchNamespaces } from '../api/k8sApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import clsx from 'clsx';

const STATUS_FILTERS = ['All', 'Running', 'Pending', 'Failed', 'Succeeded'];

export default function Pods() {
  const { autoRefresh } = useOutletContext();
  const [search,      setSearch]      = useState('');
  const [nsFilter,    setNsFilter]    = useState('All');
  const [statusFilter,setStatusFilter]= useState('All');
  const [selected,    setSelected]    = useState(null);
  const [showLogs,    setShowLogs]    = useState(false);
  const [logs,        setLogs]        = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, nsFilter, statusFilter]);

  const fetchPagedPods = useCallback(() => fetchPods({
    namespace: nsFilter === 'All' ? undefined : nsFilter,
    status: statusFilter === 'All' ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    page,
    pageSize,
  }), [nsFilter, statusFilter, debouncedSearch, page, pageSize]);

  const { data: podsResp, loading, refresh, error, lastFetch } = useK8sData(fetchPagedPods, [fetchPagedPods], { autoRefresh, refreshInterval: 10_000 });
  const { data: namespaces }                   = useK8sData(fetchNamespaces, []);

  const pods = podsResp?.items || [];
  const totalPods = podsResp?.total ?? 0;

  const nsOptions = useMemo(() => ['All', ...(namespaces?.map(n => n.name) || [])], [namespaces]);

  const filtered = useMemo(() => pods, [pods]);

  const openLogs = async (pod) => {
    setSelected(pod);
    setShowLogs(true);
    setLogsLoading(true);
    const l = await fetchPodLogs(pod.namespace, pod.name);
    setLogs(l);
    setLogsLoading(false);
  };

  const handleDelete = async (pod) => {
    await deletePod(pod.namespace, pod.name);
    setDeleteConfirm(null);
    refresh();
  };

  const COLUMNS = [
    {
      key: 'name', label: 'Pod Name',
      render: (v, row) => (
        <div>
          <p className="font-medium text-slate-200 font-mono text-xs">{v}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">IP: {row.ip}</p>
        </div>
      ),
    },
    { key: 'namespace', label: 'Namespace', render: v => <span className="badge bg-surface-700 text-slate-300 font-mono text-xs">{v}</span> },
    { key: 'status',    label: 'Status',    render: v => <StatusBadge status={v} /> },
    { key: 'node',      label: 'Node',      render: v => <span className="text-xs text-slate-400">{v}</span> },
    {
      key: 'restarts', label: 'Restarts',
      render: v => <span className={clsx('text-xs font-semibold', v > 5 ? 'text-red-400' : v > 0 ? 'text-amber-400' : 'text-slate-500')}>{v}</span>,
    },
    { key: 'image', label: 'Image', render: v => <span className="text-xs text-slate-500 font-mono">{v}</span> },
    { key: 'age',   label: 'Age',   render: v => <span className="text-slate-500 text-xs">{v}</span> },
    {
      key: 'id', label: 'Actions', sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button title="View Logs"   onClick={() => openLogs(row)}       className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-500 hover:text-brand-400  transition-colors"><Terminal size={13} /></button>
          <button title="Delete Pod"  onClick={() => setDeleteConfirm(row)} className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-500 hover:text-red-400    transition-colors"><Trash2   size={13} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Box size={20} className="text-brand-400" /> Pods
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalPods || '—'} pods across all namespaces</p>
        </div>
        <button onClick={refresh} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search pods…" className="w-64" />

        {/* Namespace select */}
        <select value={nsFilter} onChange={e => setNsFilter(e.target.value)} className="input text-xs py-1.5">
          {nsOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </select>

        {/* Status pills */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(s => (
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

        {pods && (
          <div className="ml-auto flex gap-3 text-xs text-slate-500">
            <span><span className="text-status-running font-semibold">{pods.filter(p=>p.status==='Running').length}</span> Running</span>
            <span><span className="text-status-pending font-semibold">{pods.filter(p=>p.status==='Pending').length}</span> Pending</span>
            <span><span className="text-status-failed  font-semibold">{pods.filter(p=>p.status==='Failed').length}</span>  Failed</span>
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
        emptyMessage="No pods match filters"
        skeletonRows={10}
        manualPagination
        page={page}
        pageSize={pageSize}
        total={totalPods}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Detail modal (non-log view) */}
      {selected && !showLogs && (
        <Modal isOpen onClose={() => setSelected(null)} title={`Pod: ${selected.name}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Namespace',   selected.namespace],
                ['Node',        selected.node],
                ['Pod IP',      selected.ip],
                ['Phase',       selected.phase],
                ['Restarts',    selected.restarts],
                ['Age',         selected.age],
                ['CPU Request', selected.cpuRequest],
                ['Mem Request', selected.memoryRequest],
                ['CPU Limit',   selected.cpuLimit],
                ['Mem Limit',   selected.memoryLimit],
              ].map(([k, v]) => (
                <div key={k} className="bg-surface-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-sm font-mono text-slate-300">{v}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Conditions</h3>
              {selected.conditions.map(c => (
                <div key={c.type} className="flex justify-between px-3 py-2 bg-surface-700/40 rounded-lg mb-1.5">
                  <span className="text-xs text-slate-300">{c.type}</span>
                  <StatusBadge status={c.status} size="xs" />
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Image</h3>
              <code className="text-xs bg-surface-700 px-3 py-2 rounded-lg block text-slate-300 font-mono">{selected.image}</code>
            </div>

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

            <div className="flex gap-3 pt-2 border-t border-surface-600">
              <button onClick={() => openLogs(selected)} className="btn-secondary flex items-center gap-2 text-xs">
                <Terminal size={13} /> View Logs
              </button>
              <button onClick={() => { setSelected(null); setDeleteConfirm(selected); }} className="btn-danger flex items-center gap-2 text-xs ml-auto">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Logs modal */}
      <Modal isOpen={showLogs} onClose={() => { setShowLogs(false); setSelected(null); }} title={`Logs: ${selected?.name}`} size="xl">
        <div className="bg-surface-900 rounded-xl p-4 font-mono text-xs text-emerald-400 min-h-[300px] max-h-[60vh] overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {logsLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <RefreshCw size={13} className="animate-spin" /> Fetching logs…
            </div>
          ) : (
            logs || 'No logs available.'
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Pod" size="sm"
        footer={
          <>
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger text-xs">Delete</button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          Are you sure you want to delete{' '}
          <span className="font-mono text-slate-200 font-semibold">{deleteConfirm?.name}</span>{' '}
          in namespace <span className="font-mono text-brand-400">{deleteConfirm?.namespace}</span>?
        </p>
      </Modal>
    </div>
  );
}
