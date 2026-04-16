import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';
import { fetchHealth } from '../../api/k8sApi';
import { useK8sData } from '../../hooks/useK8sData';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false);
  const [refreshing,       setRefreshing]         = useState(false);
  const [autoRefresh,      setAutoRefresh]        = useState(false);
  const [refreshKey,       setRefreshKey]         = useState(0);

  const { error: healthError } = useK8sData(fetchHealth, [refreshKey], { autoRefresh, refreshInterval: 10_000 });

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar
          onRefresh={handleRefresh}
          refreshing={refreshing}
          autoRefresh={autoRefresh}
          refreshKey={refreshKey}
          onToggleAutoRefresh={() => setAutoRefresh(r => !r)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {healthError && (
            <div className="mx-6 mt-4 card p-3 border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
              Backend disconnected. Check the API server or update `VITE_API_URL` if running backend in WSL.
            </div>
          )}
          <div className="p-6 animate-fade-in">
            <Outlet context={{ refreshKey, autoRefresh }} />
          </div>
        </main>
      </div>
    </div>
  );
}
