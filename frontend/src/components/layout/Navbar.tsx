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
        return { label: 'Super Admin', bg: 'bg-purple-950/70 text-purple-300 border-purple-800/60' };
      case 'OPS_MANAGER':
        return { label: 'Ops Manager', bg: 'bg-teal-950/70 text-teal-300 border-teal-800/60' };
      case 'POD_LEAD':
        return { label: 'Pod Lead', bg: 'bg-blue-950/70 text-blue-300 border-blue-800/60' };
      case 'EMPLOYEE':
        return { label: 'Employee', bg: 'bg-slate-800/70 text-slate-300 border-slate-700/60' };
      default:
        return { label: 'Guest', bg: 'bg-gray-800 text-gray-300 border-gray-700' };
    }
  };

  const badge = getRoleBadge(user?.role);

  const handleQuickSwitch = async (email: string, pass: string) => {
    setShowRoleMenu(false);
    await login(email, pass);
  };

  return (
    <header className="h-16 bg-[#151719]/90 backdrop-blur-md border-b border-[#23262A] px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
      {/* Current Page Title */}
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-bold text-white tracking-tight">{currentModule}</h2>
        <span className="text-xs text-gray-400 hidden md:inline">· DataStraw Enterprise Operations</span>
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
            <div className="absolute right-0 mt-2 w-56 bg-[#151719] rounded-xl shadow-elevated border border-[#23262A] py-2 z-50 text-xs">
              <div className="px-3 py-1.5 font-semibold text-gray-400 border-b border-[#23262A]">
                Simulate Role (Instant Switch)
              </div>
              <button
                onClick={() => handleQuickSwitch('admin@datastraw.io', 'Admin@123')}
                className="w-full text-left px-3 py-2 hover:bg-[#1A1D20] flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-purple-400">Super Admin</div>
                  <div className="text-[10px] text-gray-400">Full system & company settings</div>
                </div>
                {user?.role === 'SUPER_ADMIN' && <UserCheck className="w-4 h-4 text-purple-400" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('ops@datastraw.io', 'Ops@123')}
                className="w-full text-left px-3 py-2 hover:bg-[#1A1D20] flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-teal-400">Operations Manager</div>
                  <div className="text-[10px] text-gray-400">Rosters, assignments & publishing</div>
                </div>
                {user?.role === 'OPS_MANAGER' && <UserCheck className="w-4 h-4 text-teal-400" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('lead@datastraw.io', 'Lead@123')}
                className="w-full text-left px-3 py-2 hover:bg-[#1A1D20] flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-blue-400">Pod Lead</div>
                  <div className="text-[10px] text-gray-400">Pod schedules & roster reviews</div>
                </div>
                {user?.role === 'POD_LEAD' && <UserCheck className="w-4 h-4 text-blue-400" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('emp@datastraw.io', 'Emp@123')}
                className="w-full text-left px-3 py-2 hover:bg-[#1A1D20] flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-teal-400">Employee</div>
                  <div className="text-[10px] text-gray-400">Personal schedule & leaves</div>
                </div>
                {user?.role === 'EMPLOYEE' && <UserCheck className="w-4 h-4 text-teal-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1D20] transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-2 border-l border-[#23262A]">
          <div className="w-8 h-8 rounded-full bg-[#1A1D20] text-teal-400 font-bold text-xs flex items-center justify-center border border-[#23262A]">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-white leading-none">{user?.full_name}</div>
            <div className="text-[10px] text-gray-400 mt-0.5 leading-none">{user?.email}</div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
