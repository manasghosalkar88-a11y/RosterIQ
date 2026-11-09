import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Building2,
  Cpu,
  Layers,
  Network,
  CalendarCheck,
  Palmtree,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  currentModule: string;
  onSelectModule: (moduleName: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user } = useAuth();

  // Definition of the 14 application modules - visible across roles for full transparency
  const allNavItems = [
    { name: 'Overview', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Roster Planner', icon: CalendarDays, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Employees', icon: Users, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Brands', icon: Building2, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Processes', icon: Cpu, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Pods & Teams', icon: Layers, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Resource Allocation', icon: Network, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Leave & Availability', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Holidays & Calendar', icon: Palmtree, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Conflicts & Alerts', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Approvals', icon: CheckCircle, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD'] },
    { name: 'Analytics & Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD'] },
    { name: 'Notifications', icon: Bell, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'] },
    { name: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'OPS_MANAGER'] },
  ];

  // Filter items visible to user role
  const visibleNavItems = allNavItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside
      className={`bg-app-sidebar text-slate-300 flex flex-col transition-all duration-300 relative border-r border-[#2D3C4A] ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#2D3C4A]">
        {!isCollapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-app-primaryAccent flex items-center justify-center text-[#FFFDF8] font-bold text-lg shadow-md shadow-black/20 flex-shrink-0">
              R
            </div>
            <div className="leading-tight">
              <span className="font-bold text-[#FFFDF8] text-base tracking-tight block">RosterIQ</span>
              <span className="text-[10px] text-app-secondaryAccent font-medium block tracking-wider uppercase">Editorial Enterprise</span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-app-primaryAccent flex items-center justify-center text-[#FFFDF8] font-bold text-lg shadow-md">
              R
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-app-sidebarHover transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.name;

          return (
            <button
              key={item.name}
              onClick={() => onSelectModule(item.name)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-app-primaryAccent text-white shadow-sm'
                  : 'text-[#A0ABA8] hover:text-[#FFFDF8] hover:bg-app-sidebarHover'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#A0ABA8]'}`} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* Operational Pod & Version Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[#2D3C4A] bg-[#1A232B] text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] text-[#A0ABA8]">DataStraw Ops</span>
            <span className="text-[10px] bg-app-sidebarHover text-app-secondaryAccent px-1.5 py-0.5 rounded font-mono">v1.2.0</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {user?.role === 'SUPER_ADMIN' ? 'Company Administration' : user?.full_name}
          </div>
        </div>
      )}
    </aside>
  );
};
