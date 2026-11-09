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
        return { label: 'Super Admin', bg: 'bg-[#F0EDF7] text-purple-900 border-purple-200' };
      case 'OPS_MANAGER':
        return { label: 'Ops Manager', bg: 'bg-[#DCE7DC] text-[#2D6359] border-[#A4B9A9]' };
      case 'POD_LEAD':
        return { label: 'Pod Lead', bg: 'bg-[#EBF2F7] text-blue-900 border-blue-200' };
      case 'EMPLOYEE':
        return { label: 'Employee', bg: 'bg-[#EAE6DC] text-app-primaryText border-app-border' };
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
    <header className="h-16 bg-app-card border-b border-app-border px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
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
            <div className="absolute right-0 mt-2 w-56 bg-app-card rounded-xl shadow-elevated border border-app-border py-2 z-50 text-xs">
              <div className="px-3 py-1.5 font-semibold text-app-secondaryText border-b border-app-border/60">
                Simulate Role (Instant Switch)
              </div>
              <button
                onClick={() => handleQuickSwitch('admin@datastraw.io', 'Admin@123')}
                className="w-full text-left px-3 py-2 hover:bg-app-bg flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-purple-800">Super Admin</div>
                  <div className="text-[10px] text-app-secondaryText">Full system & company settings</div>
                </div>
                {user?.role === 'SUPER_ADMIN' && <UserCheck className="w-4 h-4 text-purple-700" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('ops@datastraw.io', 'Ops@123')}
                className="w-full text-left px-3 py-2 hover:bg-app-bg flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-app-primaryAccent">Operations Manager</div>
                  <div className="text-[10px] text-app-secondaryText">Rosters, assignments & publishing</div>
                </div>
                {user?.role === 'OPS_MANAGER' && <UserCheck className="w-4 h-4 text-app-primaryAccent" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('lead@datastraw.io', 'Lead@123')}
                className="w-full text-left px-3 py-2 hover:bg-app-bg flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-blue-800">Pod Lead</div>
                  <div className="text-[10px] text-app-secondaryText">Pod schedules & roster reviews</div>
                </div>
                {user?.role === 'POD_LEAD' && <UserCheck className="w-4 h-4 text-blue-700" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('emp@datastraw.io', 'Emp@123')}
                className="w-full text-left px-3 py-2 hover:bg-app-bg flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-[#397C70]">Employee</div>
                  <div className="text-[10px] text-app-secondaryText">Personal schedule & leaves</div>
                </div>
                {user?.role === 'EMPLOYEE' && <UserCheck className="w-4 h-4 text-[#397C70]" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          className="relative p-2 rounded-lg text-app-secondaryText hover:text-app-primaryText hover:bg-app-secondaryBg transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-app-primaryAccent" />
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-3 pl-2 border-l border-app-border">
          <div className="w-8 h-8 rounded-full bg-app-sidebar text-app-secondaryAccent font-bold text-xs flex items-center justify-center border border-[#2D3C4A]">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-app-primaryText leading-none">{user?.full_name}</div>
            <div className="text-[10px] text-app-secondaryText mt-0.5 leading-none">{user?.email}</div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-app-secondaryText hover:text-app-critical rounded-lg hover:bg-[#FBEBEA] transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
