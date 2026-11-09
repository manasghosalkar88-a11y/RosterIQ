import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PaperCrumple from '../components/reactbits/PaperCrumple';
import {
  Shield,
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  HelpCircle,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, seedUsers } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both work email and password.');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid work email address (e.g. name@datastraw.io).');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const message =
        err.response?.data?.detail || 'Authentication failed. Please verify credentials or sync demo accounts.';
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
      setSeedNotice('4 demo accounts (Super Admin, Ops Mgr, Lead, Employee) are synchronized in database!');
      setTimeout(() => setSeedNotice(null), 5000);
    } catch (err) {
      setError('Failed to sync demo accounts. Ensure FastAPI backend is running on port 8000.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#202B35] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#397C70]/20 selection:text-[#202B35]">
      {/* Container Card - Editorial Enterprise Split Screen */}
      <div className="w-full max-w-6xl bg-[#FFFDF8] rounded-3xl border border-[#E5DED2] shadow-[0_20px_50px_rgba(32,43,53,0.06)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* ============================================================== */}
        {/* LEFT SECTION: LOGIN FORM & AUTHENTICATION                      */}
        {/* ============================================================== */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E5DED2]">
          <div>
            {/* Editorial Brand Header */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#202B35] text-[#F5F2EB] font-serif font-bold text-xl flex items-center justify-center shadow-xs">
                R
              </div>
              <div>
                <span className="font-bold tracking-tight text-lg text-[#202B35]">RosterIQ</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#66736F] block">
                  Editorial Enterprise • v2.0
                </span>
              </div>
            </div>

            {/* Welcome Heading & Short Description */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202B35]">
                Welcome back
              </h1>
              <p className="text-sm text-[#66736F] mt-1.5 leading-relaxed font-normal">
                Intelligent Workforce & Operations Management. Deterministic scheduling across pods, brands, and processes.
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-[#C65C52]/10 border border-[#C65C52]/30 text-[#C65C52] text-xs font-medium flex items-start space-x-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {seedNotice && (
              <div className="mb-5 p-3.5 rounded-xl bg-[#56866B]/10 border border-[#56866B]/30 text-[#397C70] text-xs font-medium flex items-start space-x-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{seedNotice}</span>
              </div>
            )}

            {forgotNotice && (
              <div className="mb-5 p-3.5 rounded-xl bg-[#DCE7DC] border border-[#A4B9A9] text-[#202B35] text-xs font-medium flex items-start space-x-2.5 animate-in fade-in duration-200">
                <HelpCircle className="w-4 h-4 text-[#397C70] flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{forgotNotice}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-[#202B35] uppercase tracking-wider mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736F]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@datastraw.io"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFDF8] border border-[#E5DED2] text-[#202B35] placeholder-[#66736F]/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#397C70] focus:border-transparent transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-[#202B35] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736F]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFDF8] border border-[#E5DED2] text-[#202B35] placeholder-[#66736F]/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#397C70] focus:border-transparent transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-[#66736F] hover:text-[#202B35] transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E5DED2] text-[#397C70] focus:ring-[#397C70] focus:ring-offset-0"
                  />
                  <span>Remember this device</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotNotice('For assessment review, please use the 1-click Assessment Quick Logins below.');
                    setTimeout(() => setForgotNotice(null), 6000);
                  }}
                  className="font-medium text-[#397C70] hover:text-[#202B35] hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#397C70] hover:bg-[#2D6359] text-white shadow-md shadow-[#397C70]/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Assessment Quick-Logins (Canonical Reviewer Credentials) */}
          <div className="mt-8 pt-6 border-t border-[#E5DED2]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#66736F] uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#397C70]" />
                <span>Assessment Quick Logins</span>
              </span>
              <button
                type="button"
                onClick={handleSeedDemoAccounts}
                className="text-[11px] text-[#397C70] hover:underline font-semibold"
              >
                Sync Accounts
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@datastraw.io', 'Admin@123')}
                className="p-2.5 rounded-xl bg-[#F5F2EB] hover:bg-[#EAE6DC] border border-[#E5DED2] text-left transition-colors flex items-center space-x-2 group"
              >
                <div className="w-2 h-2 rounded-full bg-[#397C70] flex-shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-[#202B35] group-hover:text-[#397C70] transition-colors truncate">
                    Super Admin
                  </div>
                  <div className="text-[10px] text-[#66736F] font-mono truncate">admin@datastraw.io</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('ops@datastraw.io', 'Ops@123')}
                className="p-2.5 rounded-xl bg-[#F5F2EB] hover:bg-[#EAE6DC] border border-[#E5DED2] text-left transition-colors flex items-center space-x-2 group"
              >
                <div className="w-2 h-2 rounded-full bg-[#56866B] flex-shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-[#202B35] group-hover:text-[#397C70] transition-colors truncate">
                    Ops Manager
                  </div>
                  <div className="text-[10px] text-[#66736F] font-mono truncate">ops@datastraw.io</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('lead@datastraw.io', 'Lead@123')}
                className="p-2.5 rounded-xl bg-[#F5F2EB] hover:bg-[#EAE6DC] border border-[#E5DED2] text-left transition-colors flex items-center space-x-2 group"
              >
                <div className="w-2 h-2 rounded-full bg-[#D99A42] flex-shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-[#202B35] group-hover:text-[#397C70] transition-colors truncate">
                    Pod Lead
                  </div>
                  <div className="text-[10px] text-[#66736F] font-mono truncate">lead@datastraw.io</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('emp@datastraw.io', 'Emp@123')}
                className="p-2.5 rounded-xl bg-[#F5F2EB] hover:bg-[#EAE6DC] border border-[#E5DED2] text-left transition-colors flex items-center space-x-2 group"
              >
                <div className="w-2 h-2 rounded-full bg-[#A4B9A9] flex-shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-[#202B35] group-hover:text-[#397C70] transition-colors truncate">
                    Employee
                  </div>
                  <div className="text-[10px] text-[#66736F] font-mono truncate">emp@datastraw.io</div>
                </div>
              </button>
            </div>

            <p className="text-[11px] text-[#66736F] mt-4 flex items-center justify-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-[#397C70]" />
              <span>Bcrypt hashing • JWT Bearer • Scoped RBAC Governance</span>
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT SECTION: INTERACTIVE PAPERCRUMPLE WORKFORCE ARTWORK      */}
        {/* ============================================================== */}
        <div className="lg:col-span-6 bg-gradient-to-b from-[#EAE6DC] to-[#F5F2EB] p-8 sm:p-12 flex flex-col items-center justify-between relative overflow-hidden select-none">
          {/* Subtle Top Metadata Pill */}
          <div className="w-full flex items-center justify-between text-[11px] font-mono text-[#66736F] border-b border-[#E5DED2]/80 pb-3">
            <span className="uppercase tracking-wider">React Bits Component</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFFDF8] border border-[#E5DED2] text-[#397C70] font-bold">
              3D PaperCrumple
            </span>
          </div>

          {/* Interactive PaperCrumple 3D Component */}
          <div className="my-auto flex flex-col items-center justify-center w-full py-4">
            <div className="w-full max-w-[360px] flex justify-center relative group cursor-grab active:cursor-grabbing">
              <PaperCrumple
                src="/images/rosteriq-paper-art.png"
                alt="RosterIQ workforce operations artwork"
                width={320}
                height={400}
                sceneHeight={480}
                releaseBehavior="restore"
                crumpleAmount={0.85}
                crumpleDuration={0.55}
                releaseDuration={0.4}
                foldCount={6}
                foldSharpness={0.6}
                wrinkleDepth={0.65}
                creaseStrength={0.18}
                paperColor="#F4F0E8"
                paperTexture={0.08}
                draggable
                returnToOrigin
                imageFit="contain"
                roughness={0.92}
                lightIntensity={1.8}
                lightAngle={-35}
                shadow
                shadowOpacity={0.16}
                dragRotation={10}
                dragRadius={140}
                rotation={0}
                seed={7}
                detail={64}
                disabled={false}
              />
            </div>

            {/* Interaction Hint */}
            <p className="text-[11px] font-mono text-[#66736F] mt-2 flex items-center space-x-1 opacity-75">
              <span>✦ Click, hold & drag to crumple the paper sheet</span>
            </p>
          </div>

          {/* Editorial Caption & Explanatory Text */}
          <div className="w-full text-center border-t border-[#E5DED2]/80 pt-4">
            <h3 className="font-serif font-bold text-base text-[#202B35] tracking-tight">
              Bring workforce operations together.
            </h3>
            <p className="text-xs text-[#66736F] mt-1 max-w-sm mx-auto leading-relaxed">
              An intelligent workspace for people, processes and performance. Deterministic scheduling with zero coverage shortfall.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
