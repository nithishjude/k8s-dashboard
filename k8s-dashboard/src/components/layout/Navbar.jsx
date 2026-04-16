import { useState } from 'react';
import { RefreshCw, Bell, User, ChevronDown, Circle, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import { fetchAlerts, fetchHealth } from '../../api/k8sApi';
import { useK8sData } from '../../hooks/useK8sData';
import Modal from '../ui/Modal';

export default function Navbar({ onRefresh, refreshing, autoRefresh, refreshKey, onToggleAutoRefresh }) {
  const [showAlerts,  setShowAlerts]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState(() => localStorage.getItem('k8s_token') || '');

  const { data: alertsData, error } = useK8sData(fetchAlerts, [refreshKey], {
    autoRefresh,
    refreshInterval: 10_000,
  });
  const { data: health, error: healthError } = useK8sData(fetchHealth, [refreshKey], {
    autoRefresh,
    refreshInterval: 10_000,
  });
  const alerts = Array.isArray(alertsData) ? alertsData : [];
  const criticalAlerts = Array.isArray(alerts) ? alerts.filter(a => a.severity === 'critical') : [];

  const connectionError = healthError || error;
  const clusterName = health?.cluster || 'cluster';

  const saveToken = () => {
    if (tokenInput?.trim()) {
      localStorage.setItem('k8s_token', tokenInput.trim());
    } else {
      localStorage.removeItem('k8s_token');
    }
    setShowToken(false);
  };

  return (
    <header className="h-14 bg-surface-850 border-b border-surface-700 flex items-center px-4 gap-3 flex-shrink-0 relative z-30">
      {/* Cluster badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-700 rounded-xl border border-surface-600 text-xs mr-2">
        <Circle size={7} className="text-status-running fill-status-running" />
        <span className="text-slate-300 font-medium">{clusterName}</span>
        <ChevronDown size={12} className="text-slate-500" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Connection indicator */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 px-2">
        {connectionError ? (
          <>
            <WifiOff size={13} className="text-amber-400" />
            <span className="text-amber-400 font-medium hidden sm:inline">Disconnected</span>
          </>
        ) : health ? (
          <>
            <Wifi size={13} className="text-emerald-400" />
            <span className="text-emerald-400 font-medium hidden sm:inline">Live</span>
          </>
        ) : (
          <>
            <Wifi size={13} className="text-slate-500" />
            <span className="text-slate-500 font-medium hidden sm:inline">Connecting</span>
          </>
        )}
      </div>

      {/* Auto-refresh toggle */}
      <button
        onClick={onToggleAutoRefresh}
        className={clsx(
          'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200',
          autoRefresh
            ? 'bg-brand-600/20 border-brand-600/40 text-brand-400'
            : 'bg-surface-700 border-surface-600 text-slate-400 hover:text-slate-200',
        )}
        title="Toggle auto-refresh (10s)"
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full', autoRefresh ? 'bg-brand-400 animate-pulse' : 'bg-slate-500')} />
        Auto Refresh
      </button>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="p-2 rounded-xl hover:bg-surface-700 text-slate-400 hover:text-slate-200 transition-all duration-200 disabled:opacity-50"
        title="Refresh now"
      >
        <RefreshCw size={16} className={clsx(refreshing && 'animate-spin')} />
      </button>

      {/* Alerts bell */}
      <div className="relative">
        <button
          onClick={() => { setShowAlerts(s => !s); setShowProfile(false); }}
          className="p-2 rounded-xl hover:bg-surface-700 text-slate-400 hover:text-slate-200 transition-all duration-200 relative"
        >
          <Bell size={16} />
          {criticalAlerts.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse-slow" />
          )}
        </button>

        {showAlerts && (
          <div className="absolute right-0 top-full mt-2 w-80 card shadow-card-hover z-50 animate-slide-up">
            <div className="px-4 py-3 border-b border-surface-600 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Alerts</h3>
              <span className="badge bg-red-500/15 text-red-400 text-xs">{criticalAlerts.length} critical</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {alerts.map(alert => (
                <div key={alert.id} className="px-4 py-3 border-b border-surface-700/50 hover:bg-surface-700/40 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', {
                      'bg-red-400': alert.severity === 'critical',
                      'bg-amber-400': alert.severity === 'warning',
                      'bg-blue-400': alert.severity === 'info',
                    })} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200">{alert.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => { setShowProfile(s => !s); setShowAlerts(false); }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-surface-700 transition-all duration-200"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <User size={13} className="text-white" />
          </div>
          <span className="text-xs text-slate-300 font-medium hidden sm:inline">admin</span>
          <ChevronDown size={12} className="text-slate-500 hidden sm:block" />
        </button>

        {showProfile && (
          <div className="absolute right-0 top-full mt-2 w-52 card shadow-card-hover z-50 animate-slide-up">
            <div className="px-4 py-3 border-b border-surface-600">
              <p className="text-sm font-semibold text-slate-200">admin</p>
              <p className="text-xs text-slate-500">cluster-admin</p>
            </div>
            <button
              onClick={() => { setShowToken(true); setShowProfile(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-surface-700/60 transition-colors"
            >
              API Token
            </button>
            {['Settings', 'Sign out'].map(label => (
              <button key={label} className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-surface-700/60 transition-colors">
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overlay to close dropdowns */}
      {(showAlerts || showProfile) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowAlerts(false); setShowProfile(false); }} />
      )}

      <Modal
        isOpen={showToken}
        onClose={() => setShowToken(false)}
        title="API Token"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowToken(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={saveToken} className="btn-primary text-xs">Save</button>
          </>
        }
      >
        <p className="text-xs text-slate-500 mb-2">Optional bearer token for clusters that require auth.</p>
        <input
          type="password"
          value={tokenInput}
          onChange={e => setTokenInput(e.target.value)}
          className="input text-xs w-full"
          placeholder="Paste token or leave empty"
        />
        <p className="text-[10px] text-slate-600 mt-2">Stored locally in your browser.</p>
      </Modal>
    </header>
  );
}
