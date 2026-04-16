import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout      from './components/layout/Layout';
import Dashboard   from './pages/Dashboard';
import Nodes       from './pages/Nodes';
import Pods        from './pages/Pods';
import Deployments from './pages/Deployments';
import Namespaces  from './pages/Namespaces';
import Metrics     from './pages/Metrics';
import Networking  from './pages/Networking';
import RBAC        from './pages/RBAC';
import AuditLogs   from './pages/AuditLogs';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 py-24">
      <span className="text-6xl">🔍</span>
      <h2 className="text-lg font-semibold text-slate-300">Page not found</h2>
      <p className="text-sm">The resource you're looking for doesn't exist.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index           element={<Dashboard   />} />
          <Route path="nodes"        element={<Nodes       />} />
          <Route path="pods"         element={<Pods        />} />
          <Route path="deployments"  element={<Deployments />} />
          <Route path="namespaces"   element={<Namespaces  />} />
          <Route path="metrics"      element={<Metrics     />} />
          <Route path="networking"   element={<Networking  />} />
          <Route path="rbac"         element={<RBAC        />} />
          <Route path="audit"        element={<AuditLogs   />} />
          <Route path="*"            element={<NotFound    />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
