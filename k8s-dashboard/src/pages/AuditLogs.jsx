import { useOutletContext } from 'react-router-dom';
import { Settings, User, CheckCircle, XCircle } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import { useK8sData } from '../hooks/useK8sData';
import { fetchAuditLogs } from '../api/k8sApi';

const ACTION_COLORS = {
  GET:    'bg-blue-500/15 text-blue-400',
  CREATE: 'bg-emerald-500/15 text-emerald-400',
  UPDATE: 'bg-amber-500/15 text-amber-400',
  DELETE: 'bg-red-500/15 text-red-400',
  PATCH:  'bg-purple-500/15 text-purple-400',
};

export default function AuditLogs() {
  const { autoRefresh } = useOutletContext();
  const { data: logs, loading, error, lastFetch } = useK8sData(fetchAuditLogs, [], { autoRefresh, refreshInterval: 15_000 });

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings size={20} className="text-brand-400" /> Audit Logs
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">User actions and cluster changes</p>
        <p className="text-xs text-slate-600 mt-1">Last updated: {lastFetch ? lastFetch.toLocaleTimeString() : '—'}</p>
      </div>

      {error && (
        <div className="card p-4 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
          {error.statusCode === 403 ? 'Insufficient permissions (RBAC) to read audit logs.' : error.message}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-600 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Recent Activity</h2>
          {logs && <span className="badge bg-surface-700 text-slate-400">{logs.length} entries</span>}
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : (
          <div className="divide-y divide-surface-700/50">
            {(logs || []).map(log => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-700/40 transition-colors">
                {/* User avatar */}
                <div className="w-8 h-8 rounded-lg bg-surface-600 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-slate-400" />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-200">{log.user}</span>
                    <span className={`badge text-xs ${ACTION_COLORS[log.action] || 'bg-surface-600 text-slate-400'}`}>{log.action}</span>
                    <span className="text-sm text-slate-400 font-mono">{log.resource}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-600">{log.time}</span>
                    <span className="badge bg-surface-700 text-slate-500 text-xs font-mono">{log.namespace}</span>
                  </div>
                </div>

                {/* Result */}
                <div className="flex-shrink-0">
                  {log.result === 'success' ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle size={13} /> success
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <XCircle size={13} /> {log.result}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
