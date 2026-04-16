import { useState, useMemo, useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Rocket, RefreshCw, Trash2, RotateCcw, Minus, Plus } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import { useK8sData } from '../hooks/useK8sData';
import { fetchDeployments, scaleDeployment, deleteDeployment, restartDeployment, fetchNamespaces } from '../api/k8sApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import clsx from 'clsx';

function ReplicaBar({ ready, desired }) {
  const pct = desired === 0 ? 0 : Math.round((ready / desired) * 100);
  const color = pct === 100 ? 'bg-status-running' : pct === 0 ? 'bg-status-failed' : 'bg-status-pending';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-surface-700 rounded-full h-1.5 overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 tabular-nums">{ready}/{desired}</span>
    </div>
  );
}

export default function Deployments() {
  const { autoRefresh } = useOutletContext();
  const [search,      setSearch]      = useState('');
  const [nsFilter,    setNsFilter]    = useState('All');
  const [statusFilter,setStatusFilter]= useState('All');
  const [selected,    setSelected]    = useState(null);
  const [scaleTarget, setScaleTarget] = useState(null);
  const [scaleReplicas, setScaleReplicas] = useState(1);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [actionMsg,    setActionMsg]      = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, nsFilter, statusFilter]);

  const fetchPagedDeployments = useCallback(() => fetchDeployments({
    namespace: nsFilter === 'All' ? undefined : nsFilter,
    status: statusFilter === 'All' ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    page,
    pageSize,
  }), [nsFilter, statusFilter, debouncedSearch, page, pageSize]);

  const { data: deployResp, loading, refresh, error, lastFetch } = useK8sData(fetchPagedDeployments, [fetchPagedDeployments], { autoRefresh, refreshInterval: 10_000 });
  const { data: namespaces }                    = useK8sData(fetchNamespaces, []);

  const deployments = deployResp?.items || [];
  const totalDeployments = deployResp?.total ?? 0;

  const nsOptions = useMemo(() => ['All', ...(namespaces?.map(n => n.name) || [])], [namespaces]);

  const filtered = useMemo(() => deployments, [deployments]);

  const openScale = (dep, e) => {
    e?.stopPropagation();
    setScaleTarget(dep);
    setScaleReplicas(dep.desired);
    setActionMsg('');
  };

  const handleScale = async () => {
    setActionMsg('Scaling…');
    try {
      await scaleDeployment(scaleTarget.namespace, scaleTarget.name, scaleReplicas);
      setActionMsg(`✓ Scaled to ${scaleReplicas} replicas`);
      setTimeout(() => { setScaleTarget(null); refresh(); }, 1200);
    } catch { setActionMsg('✗ Scale failed'); }
  };

  const handleDelete = async () => {
    await deleteDeployment(deleteTarget.namespace, deleteTarget.name);
    setDeleteTarget(null);
    refresh();
  };

  const handleRestart = async (dep, e) => {
    e?.stopPropagation();
    await restartDeployment(dep.namespace, dep.name);
    refresh();
  };

  const COLUMNS = [
    {
      key: 'name', label: 'Name',
      render: (v, row) => (
        <div>
          <p className="font-medium text-slate-200">{v}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{row.image}</p>
        </div>
      ),
    },
    { key: 'namespace', label: 'Namespace', render: v => <span className="badge bg-surface-700 text-slate-300 font-mono text-xs">{v}</span> },
    { key: 'status',    label: 'Status',    render: v => <StatusBadge status={v} /> },
    {
      key: 'ready', label: 'Replicas',
      render: (v, row) => <ReplicaBar ready={row.ready} desired={row.desired} />,
    },
    { key: 'strategy', label: 'Strategy', render: v => <span className="text-xs text-slate-500">{v}</span> },
    { key: 'age',      label: 'Age',      render: v => <span className="text-slate-500 text-xs">{v}</span> },
    {
      key: 'id', label: 'Actions', sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button title="Scale"   onClick={e => openScale(row, e)}             className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-500 hover:text-brand-400  transition-colors"><Plus      size={13} /></button>
          <button title="Restart" onClick={e => handleRestart(row, e)}          className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-500 hover:text-amber-400 transition-colors"><RotateCcw size={13} /></button>
          <button title="Delete"  onClick={e => { e.stopPropagation(); setDeleteTarget(row); }} className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-500 hover:text-red-400    transition-colors"><Trash2    size={13} /></button>
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
            <Rocket size={20} className="text-brand-400" /> Deployments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalDeployments || '—'} deployments across all namespaces</p>
        </div>
        <button onClick={refresh} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search deployments…" className="w-64" />
        <select value={nsFilter} onChange={e => setNsFilter(e.target.value)} className="input text-xs py-1.5">
          {nsOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="flex gap-1">
          {['All', 'Available', 'Progressing', 'Degraded'].map(s => (
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
        {deployments && (
          <div className="ml-auto flex gap-3 text-xs text-slate-500">
            <span><span className="text-status-running font-semibold">{deployments.filter(d=>d.status==='Available').length}</span> Available</span>
            <span><span className="text-status-failed  font-semibold">{deployments.filter(d=>d.status==='Degraded').length}</span>  Degraded</span>
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
        emptyMessage="No deployments match filters"
        skeletonRows={8}
        manualPagination
        page={page}
        pageSize={pageSize}
        total={totalDeployments}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Detail modal */}
      {selected && !scaleTarget && !deleteTarget && (
        <Modal isOpen onClose={() => setSelected(null)} title={`Deployment: ${selected.name}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Namespace',    selected.namespace],
                ['Strategy',     selected.strategy],
                ['Desired',      selected.desired],
                ['Ready',        selected.ready],
                ['Available',    selected.available],
                ['Up-to-date',   selected.upToDate],
                ['Max Surge',    selected.maxSurge],
                ['Max Unavail.', selected.maxUnavailable],
                ['CPU Request',  selected.cpuRequest],
                ['Mem Request',  selected.memoryRequest],
                ['Revisions',    selected.revisionHistory],
                ['Age',          selected.age],
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
                  <div>
                    <span className="text-xs text-slate-300">{c.type}</span>
                    <span className="text-[10px] text-slate-500 ml-2">{c.reason}</span>
                  </div>
                  <StatusBadge status={c.status} size="xs" />
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Image</h3>
              <code className="text-xs bg-surface-700 px-3 py-2 rounded-lg block text-slate-300 font-mono">{selected.image}</code>
            </div>

            <div className="flex gap-3 pt-2 border-t border-surface-600">
              <button onClick={() => { setSelected(null); openScale(selected); }} className="btn-primary flex items-center gap-2 text-xs">
                <Plus size={13} /> Scale
              </button>
              <button onClick={() => { handleRestart(selected); setSelected(null); }} className="btn-secondary flex items-center gap-2 text-xs">
                <RotateCcw size={13} /> Restart
              </button>
              <button onClick={() => { setSelected(null); setDeleteTarget(selected); }} className="btn-danger flex items-center gap-2 text-xs ml-auto">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Scale modal */}
      <Modal isOpen={!!scaleTarget} onClose={() => setScaleTarget(null)} title={`Scale: ${scaleTarget?.name}`} size="sm"
        footer={
          <>
            <button onClick={() => setScaleTarget(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleScale} className="btn-primary text-xs">Apply Scale</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Set the desired number of replicas for <span className="font-semibold text-slate-200">{scaleTarget?.name}</span>.</p>
          <div className="flex items-center gap-4 justify-center py-2">
            <button onClick={() => setScaleReplicas(r => Math.max(0, r - 1))} className="p-2 rounded-xl bg-surface-700 hover:bg-surface-600 transition-colors">
              <Minus size={16} />
            </button>
            <div className="text-center">
              <span className="text-4xl font-bold text-slate-100">{scaleReplicas}</span>
              <p className="text-xs text-slate-500 mt-1">replicas</p>
            </div>
            <button onClick={() => setScaleReplicas(r => Math.min(50, r + 1))} className="p-2 rounded-xl bg-surface-700 hover:bg-surface-600 transition-colors">
              <Plus size={16} />
            </button>
          </div>
          {actionMsg && <p className={clsx('text-sm text-center', actionMsg.startsWith('✓') ? 'text-emerald-400' : actionMsg === 'Scaling…' ? 'text-brand-400' : 'text-red-400')}>{actionMsg}</p>}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Deployment" size="sm"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleDelete} className="btn-danger text-xs">Delete</button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          Delete deployment <span className="font-mono font-semibold text-slate-200">{deleteTarget?.name}</span> in <span className="font-mono text-brand-400">{deleteTarget?.namespace}</span>?
          <br /><span className="text-red-400 text-xs mt-2 block">This will terminate all {deleteTarget?.ready} running pods.</span>
        </p>
      </Modal>
    </div>
  );
}
