import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Server, Box, Rocket, Layers,
  Network, Shield, Settings, ChevronLeft, ChevronRight,
  Cpu, Activity,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { path: '/',            icon: LayoutDashboard, label: 'Dashboard'   },
      { path: '/namespaces',  icon: Layers,          label: 'Namespaces'  },
    ],
  },
  {
    title: 'Workloads',
    items: [
      { path: '/nodes',       icon: Server,          label: 'Nodes'       },
      { path: '/pods',        icon: Box,             label: 'Pods'        },
      { path: '/deployments', icon: Rocket,          label: 'Deployments' },
    ],
  },
  {
    title: 'Observability',
    items: [
      { path: '/metrics',     icon: Activity,        label: 'Metrics'     },
      { path: '/networking',  icon: Network,         label: 'Networking'  },
    ],
  },
  {
    title: 'Security',
    items: [
      { path: '/rbac',        icon: Shield,          label: 'RBAC'        },
      { path: '/audit',       icon: Settings,        label: 'Audit Logs'  },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={clsx(
      'flex flex-col h-full bg-surface-850 border-r border-surface-700 transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-[60px]' : 'w-[220px]',
    )}>
      {/* Logo */}
      <div className={clsx(
        'flex items-center h-14 border-b border-surface-700 flex-shrink-0 transition-all duration-300',
        collapsed ? 'px-3 justify-center' : 'px-4 gap-3',
      )}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow flex-shrink-0">
          <Cpu size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-sm font-bold gradient-text leading-none">K8s Dash</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Control Plane</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 no-scrollbar">
        {NAV_SECTIONS.map(section => (
          <div key={section.title} className="mb-1">
            {!collapsed && (
              <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                {section.title}
              </p>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => clsx(
                  'nav-item mx-2',
                  collapsed && 'justify-center px-2',
                  isActive && 'active',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={17} className="flex-shrink-0" />
                {!collapsed && <span className="animate-fade-in truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-surface-700 p-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-surface-700 text-slate-500 hover:text-slate-200 transition-all duration-200"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
