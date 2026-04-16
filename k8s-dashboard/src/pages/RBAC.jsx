import { useOutletContext } from 'react-router-dom';
import { Shield, User, Key, Lock } from 'lucide-react';

const ROLES = [
  { name: 'cluster-admin',  type: 'ClusterRole', rules: 'All resources, all verbs', bound: 2,  created: '365d' },
  { name: 'admin',          type: 'ClusterRole', rules: 'Most resources, CRUD',     bound: 5,  created: '200d' },
  { name: 'edit',           type: 'ClusterRole', rules: 'Read/Write (no RBAC)',     bound: 12, created: '200d' },
  { name: 'view',           type: 'ClusterRole', rules: 'Read-only',                bound: 20, created: '200d' },
  { name: 'monitoring-role',type: 'Role',        rules: 'Metrics, Pods (read)',     bound: 3,  created: '90d'  },
];

const BINDINGS = [
  { name: 'admin-binding',   subject: 'admin',    role: 'cluster-admin', ns: 'cluster-wide', type: 'User'           },
  { name: 'dev-binding',     subject: 'dev-team', role: 'edit',          ns: 'production',   type: 'Group'          },
  { name: 'viewer-binding',  subject: 'viewer',   role: 'view',          ns: 'cluster-wide', type: 'User'           },
  { name: 'sa-binding',      subject: 'ci-bot',   role: 'edit',          ns: 'staging',      type: 'ServiceAccount' },
  { name: 'monitor-binding', subject: 'prometheus',role:'monitoring-role',ns: 'monitoring',   type: 'ServiceAccount' },
];

export default function RBAC() {
  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Shield size={20} className="text-brand-400" /> RBAC
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Role-based access control configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Roles */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Key size={15} className="text-brand-400" /> Cluster Roles
          </h2>
          <div className="space-y-2">
            {ROLES.map(r => (
              <div key={r.name} className="flex items-center justify-between p-3 bg-surface-700/50 rounded-xl hover:bg-surface-700 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-200">{r.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.rules}</p>
                </div>
                <div className="text-right">
                  <span className="badge bg-brand-600/20 text-brand-400 text-xs">{r.type}</span>
                  <p className="text-[10px] text-slate-600 mt-1">{r.bound} bindings</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bindings */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Lock size={15} className="text-brand-400" /> Role Bindings
          </h2>
          <div className="space-y-2">
            {BINDINGS.map(b => (
              <div key={b.name} className="flex items-center justify-between p-3 bg-surface-700/50 rounded-xl hover:bg-surface-700 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-600 flex items-center justify-center">
                    <User size={13} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{b.subject}</p>
                    <p className="text-[10px] text-slate-500">{b.type} · {b.ns}</p>
                  </div>
                </div>
                <span className="badge bg-purple-500/15 text-purple-400 text-xs">{b.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
