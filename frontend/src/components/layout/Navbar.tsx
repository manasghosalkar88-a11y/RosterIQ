import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/auth';
import { Bell, LogOut, Shield, ChevronDown, UserCheck, Search, Calendar } from 'lucide-react';

interface NavbarProps {
  currentModule: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentModule }) => {
  const { user, logout, login } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    <header className="h-16 bg-[#0B1016]/90 backdrop-blur-[14px] border-b border-[rgba(148,163,184,0.16)] px-6 flex items-center justify-between sticky top-0 z-30 shadow-glass select-none">
      {/* Left: Module Title & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        <h2 className="text-base sm:text-lg font-extrabold text-[#F8FAFC] tracking-tight">{currentModule}</h2>
        <span className="text-xs text-[#94A3B8] hidden lg:inline font-mono">
          · DataStraw Operations Matrix
        </span>
      </div>

      {/* Center: Inset Search Bar */}
      <div className="hidden md:flex items-center max-w-sm w-full mx-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search specialists, brands, shifts..."
            className="w-full pl-9 pr-14 py-1.5 rounded-xl bg-[#111820] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] placeholder-[#64748B] text-xs focus:outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] shadow-inner transition-all duration-150"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-[#94A3B8] bg-white/5 border border-white/10 rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls: Live Status, Shift Date, Role Switcher, Notifications, Profile */}
      <div className="flex items-center space-x-3">
        {/* Live Status Pill */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-950/70 border border-teal-800/60 text-[10px] font-mono text-[#2DD4BF]">
          <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
          <span className="tracking-wider uppercase font-semibold">SYSTEM OPTIMAL</span>
        </div>

        {/* Current Shift Pill */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#111820] border border-[rgba(148,163,184,0.16)] text-[10px] font-mono text-[#CBD5E1]">
          <Calendar className="w-3 h-3 text-[#14B8A6]" />
          <span>Nov 2026 · Cycle A</span>
        </div>

        {/* Role Switcher for Assessment Evaluation */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 hover:brightness-110 ${badge.bg}`}
            title="Click to simulate switching user roles"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#141A21] backdrop-blur-[16px] rounded-2xl shadow-elevated border border-[rgba(148,163,184,0.20)] py-2 z-50 text-xs animate-dropdown">
              <div className="px-3 py-1.5 font-semibold text-[#94A3B8] border-b border-[rgba(148,163,184,0.16)] text-[11px]">
                Simulate Role (Instant Switch)
              </div>
              <button
                onClick={() => handleQuickSwitch('admin@datastraw.io', 'Admin@123')}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-purple-400">Super Admin</div>
                  <div className="text-[10px] text-[#94A3B8]">Full system & company settings</div>
                </div>
                {user?.role === 'SUPER_ADMIN' && <UserCheck className="w-4 h-4 text-purple-400" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('ops@datastraw.io', 'Ops@123')}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-[#2DD4BF]">Operations Manager</div>
                  <div className="text-[10px] text-[#94A3B8]">Rosters, assignments & publishing</div>
                </div>
                {user?.role === 'OPS_MANAGER' && <UserCheck className="w-4 h-4 text-[#2DD4BF]" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('lead@datastraw.io', 'Lead@123')}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-blue-400">Pod Lead</div>
                  <div className="text-[10px] text-[#94A3B8]">Pod schedules & roster reviews</div>
                </div>
                {user?.role === 'POD_LEAD' && <UserCheck className="w-4 h-4 text-blue-400" />}
              </button>
              <button
                onClick={() => handleQuickSwitch('emp@datastraw.io', 'Emp@123')}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-cyan-400">Employee</div>
                  <div className="text-[10px] text-[#94A3B8]">Personal schedule & leaves</div>
                </div>
                {user?.role === 'EMPLOYEE' && <UserCheck className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          className="relative p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 transition-colors border border-[rgba(148,163,184,0.16)]"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#14B8A6] shadow-sm shadow-teal-400/50" />
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-[rgba(148,163,184,0.16)]">
          <div className="w-8 h-8 rounded-full bg-[#111820] text-[#14B8A6] font-bold text-xs flex items-center justify-center border border-[rgba(148,163,184,0.18)] shadow-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-[#F8FAFC] leading-none">{user?.full_name}</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-none">{user?.email}</div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-[#94A3B8] hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
