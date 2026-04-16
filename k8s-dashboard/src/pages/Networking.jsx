import { useOutletContext } from 'react-router-dom';
import { Network, Globe, ArrowRight } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';

const SERVICES = [
  { name: 'api-gateway',    namespace: 'production', type: 'LoadBalancer', clusterIP: '10.100.0.10', externalIP: '203.0.113.10', ports: '80:31000/TCP, 443:31001/TCP', age: '45d' },
  { name: 'auth-service',   namespace: 'production', type: 'ClusterIP',   clusterIP: '10.100.0.11', externalIP: '-',            ports: '8080/TCP',                    age: '45d' },
  { name: 'postgres',       namespace: 'production', type: 'ClusterIP',   clusterIP: '10.100.0.12', externalIP: '-',            ports: '5432/TCP',                    age: '60d' },
  { name: 'redis',          namespace: 'default',    type: 'ClusterIP',   clusterIP: '10.100.0.13', externalIP: '-',            ports: '6379/TCP',                    age: '30d' },
  { name: 'grafana',        namespace: 'monitoring', type: 'NodePort',    clusterIP: '10.100.0.20', externalIP: '-',            ports: '3000:32000/TCP',              age: '90d' },
  { name: 'prometheus',     namespace: 'monitoring', type: 'ClusterIP',   clusterIP: '10.100.0.21', externalIP: '-',            ports: '9090/TCP',                    age: '90d' },
];

const INGRESSES = [
  { name: 'main-ingress',  namespace: 'production', class: 'nginx', hosts: 'api.example.com', paths: '/api/* → api-gateway:80', tls: true,  age: '45d' },
  { name: 'grafana-ingress',namespace: 'monitoring',class: 'nginx', hosts: 'monitor.example.com', paths: '/* → grafana:3000', tls: true, age: '90d' },
  { name: 'dev-ingress',   namespace: 'dev',        class: 'nginx', hosts: 'dev.example.com',  paths: '/* → frontend:80',   tls: false, age: '10d' },
];

const TYPE_COLORS = {
  LoadBalancer: 'bg-brand-600/20 text-brand-400',
  ClusterIP:    'bg-surface-600 text-slate-400',
  NodePort:     'bg-purple-500/15 text-purple-400',
};

export default function Networking() {
  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Network size={20} className="text-brand-400" /> Networking
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Services and Ingress configuration</p>
      </div>

      {/* Services */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-600">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Globe size={15} className="text-brand-400" /> Services ({SERVICES.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-600">
                {['Name', 'Namespace', 'Type', 'Cluster IP', 'External IP', 'Ports', 'Age'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {SERVICES.map(svc => (
                <tr key={svc.name} className="table-row-hover">
                  <td className="px-4 py-3 text-sm font-medium text-slate-200">{svc.name}</td>
                  <td className="px-4 py-3"><span className="badge bg-surface-700 text-slate-300 font-mono text-xs">{svc.namespace}</span></td>
                  <td className="px-4 py-3"><span className={`badge text-xs ${TYPE_COLORS[svc.type]}`}>{svc.type}</span></td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{svc.clusterIP}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{svc.externalIP}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{svc.ports}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{svc.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingresses */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ArrowRight size={15} className="text-brand-400" /> Ingresses ({INGRESSES.length})
        </h2>
        <div className="space-y-3">
          {INGRESSES.map(ing => (
            <div key={ing.name} className="p-4 bg-surface-700/50 rounded-xl hover:bg-surface-700 transition-colors">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{ing.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Class: {ing.class} · {ing.age}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-surface-700 text-slate-300 font-mono text-xs">{ing.namespace}</span>
                  {ing.tls
                    ? <span className="badge bg-emerald-500/15 text-emerald-400 text-xs">TLS</span>
                    : <span className="badge bg-amber-500/15 text-amber-400 text-xs">No TLS</span>
                  }
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="badge bg-brand-600/15 text-brand-400 font-mono text-xs">{ing.hosts}</span>
                <ArrowRight size={12} className="text-slate-600" />
                <span className="text-xs text-slate-500 font-mono">{ing.paths}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
