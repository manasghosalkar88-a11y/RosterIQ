import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GeometricBackground } from '../components/3d/GeometricBackground';
import { Shield, Sparkles, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, seedUsers } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Authentication failed. Please verify credentials.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const handleSeedDemoAccounts = async () => {
    try {
      await seedUsers();
      setSeedNotice('4 demo accounts (Super Admin, Ops Mgr, Lead, Employee) are active in DB!');
      setTimeout(() => setSeedNotice(null), 5000);
    } catch (err) {
      setError('Failed to seed users. Ensure backend is running.');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center p-6 overflow-hidden">
      {/* 3D Subtle Three.js Geometric Operational Network */}
      <GeometricBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white font-extrabold text-2xl shadow-xl shadow-teal-500/20 mb-4 border border-teal-300/30">
            R
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">RosterIQ</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Smart Operations & Roster System · DataStraw
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1E293B]/90 backdrop-blur-md rounded-2xl border border-slate-700/60 p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Sign In to Workspace</h2>
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Role-Based RBAC
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {seedNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-sm flex items-start space-x-2.5">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-teal-400" />
              <span>{seedNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@datastraw.io"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Assessment Reviewer Quick-Fill */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Assessment Quick Logins</span>
              </span>
              <button
                type="button"
                onClick={handleSeedDemoAccounts}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium underline"
              >
                Sync Accounts
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@datastraw.io', 'Admin@123')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors flex items-center space-x-2"
              >
                <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white">Super Admin</div>
                  <div className="text-[10px] text-slate-400">admin@datastraw.io</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('ops@datastraw.io', 'Ops@123')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors flex items-center space-x-2"
              >
                <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white">Ops Manager</div>
                  <div className="text-[10px] text-slate-400">ops@datastraw.io</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('lead@datastraw.io', 'Lead@123')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors flex items-center space-x-2"
              >
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white">Pod Lead</div>
                  <div className="text-[10px] text-slate-400">lead@datastraw.io</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('emp@datastraw.io', 'Emp@123')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors flex items-center space-x-2"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-white">Employee</div>
                  <div className="text-[10px] text-slate-400">emp@datastraw.io</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center space-x-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>Secured with Bcrypt password hashing & RS256/HS256 JWT tokens</span>
        </p>
      </div>
    </div>
  );
};
