import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/auth';
import { Bell, LogOut, Shield, ChevronDown, UserCheck } from 'lucide-react';

interface NavbarProps {
  currentModule: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentModule }) => {
  const { user, logout, login } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = React.useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'Super Admin', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'OPS_MANAGER':
        return { label: 'Ops Manager', bg: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'POD_LEAD':
        return { label: 'Pod Lead', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'EMPLOYEE':
        return { label: 'Employee', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      default:
        return { label: 'Guest', bg: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const badge = getRoleBadge(user?.role);

  const handleQuickSwitch = async (email: string, pass: string) => {
    setShowRoleMenu(false);
    await login(email, pass);
  };

  return (
    <header className="h-16 bg-white border-b border-app-border px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
      {/* Current Page Title */}
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-bold text-app-primaryText">{currentModule}</h2>
        <span className="text-xs text-app-secondaryText hidden md:inline">· DataStraw Enterprise Operations</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Role Switcher for Assessment Evaluation */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${badge.bg}`}
            title="Click to simulate switching user roles"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-app-border py-2 z-50 text-xs">
              <div className="px-3 py-1.5 font-semibold text-app-secondaryText border-b border-gray-100">
                Simulate Role (Instant Switch)
              </div>
              <button
                onClick={() => handleQuickSwitch('admin@datastraw.io', 'Admin@123')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-purple-700">Super Admin</div>
                  <div className="text-[10px] text-gray-500">Full system & company settings</div>
                </div>
                {user?.role === 'SUPER_ADMIN' && <UserCheck className="w-4 h-4 text-purple-600" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('ops@datastraw.io', 'Ops@123')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-teal-700">Operations Manager</div>
                  <div className="text-[10px] text-gray-500">Rosters, assignments & publishing</div>
                </div>
                {user?.role === 'OPS_MANAGER' && <UserCheck className="w-4 h-4 text-teal-600" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('lead@datastraw.io', 'Lead@123')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-blue-700">Pod Lead</div>
                  <div className="text-[10px] text-gray-500">Pod schedules & roster reviews</div>
                </div>
                {user?.role === 'POD_LEAD' && <UserCheck className="w-4 h-4 text-blue-600" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('emp@datastraw.io', 'Emp@123')}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-emerald-700">Employee</div>
                  <div className="text-[10px] text-gray-500">Personal schedule & leaves</div>
                </div>
                {user?.role === 'EMPLOYEE' && <UserCheck className="w-4 h-4 text-emerald-600" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          className="relative p-2 rounded-lg text-app-secondaryText hover:text-app-primaryText hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500" />
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-2 border-l border-app-border">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-teal-400 font-bold text-xs flex items-center justify-center border border-slate-700">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-app-primaryText leading-none">{user?.full_name}</div>
            <div className="text-[10px] text-app-secondaryText mt-0.5 leading-none">{user?.email}</div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-app-secondaryText hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
