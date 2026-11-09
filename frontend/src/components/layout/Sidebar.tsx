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
  LogOut,
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
  const { user, logout } = useAuth();

  // Definition of the 14 application modules
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
    { name: 'Conflicts & Alerts', icon: AlertTriangle, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'], badge: { text: '0', type: 'success' } },
    { name: 'Approvals', icon: CheckCircle, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD'], badge: { text: '3', type: 'warning' } },
    { name: 'Analytics & Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD'] },
    { name: 'Notifications', icon: Bell, roles: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'], badge: { text: '2', type: 'teal' } },
    { name: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'OPS_MANAGER'] },
  ];

  // Filter items visible to user role
  const visibleNavItems = allNavItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside
      className={`bg-[#0B0E12] text-[#A0AAB5] flex flex-col transition-all duration-300 relative border-r border-white/10 h-screen z-20 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {!isCollapsed && (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#397C70] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-teal-500/20 border border-white/10 flex-shrink-0">
              R
            </div>
            <div className="leading-tight">
              <span className="font-bold text-white text-base tracking-tight block">ROSTERIQ</span>
              <span className="text-[10px] text-teal-400 font-semibold block tracking-wider uppercase font-mono">
                Dark Glass Enterprise
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-[#397C70] flex items-center justify-center text-white font-bold text-lg shadow-md border border-white/10">
              R
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="text-[#727E89] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.name;

          return (
            <button
              key={item.name}
              onClick={() => onSelectModule(item.name)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-[rgba(30,36,43,0.92)] text-white border-l-2 border-[#397C70] shadow-neumorph-raised'
                  : 'text-[#A0AAB5] hover:text-white hover:bg-white/5'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-teal-400' : 'text-[#727E89] group-hover:text-teal-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                    item.badge.type === 'warning'
                      ? 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                      : item.badge.type === 'teal'
                      ? 'bg-teal-950/70 text-teal-300 border-teal-800/60'
                      : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                  }`}
                >
                  {item.badge.text}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Sign Out Footer */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-white/10 bg-[#090B0E]/80">
          <div className="p-2.5 rounded-xl bg-[rgba(23,28,34,0.88)] border border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-8 h-8 rounded-lg bg-[#0B0E12] text-teal-400 font-bold text-xs flex items-center justify-center border border-white/10 flex-shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate leading-tight">
                  {user?.full_name}
                </div>
                <div className="text-[10px] text-teal-400 font-mono truncate leading-tight">
                  {user?.role.replace('_', ' ')}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-[#727E89] hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-white/10 flex justify-center">
          <button
            onClick={logout}
            className="p-2 text-[#727E89] hover:text-rose-400 rounded-xl hover:bg-rose-950/30 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
