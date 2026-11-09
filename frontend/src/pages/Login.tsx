import React, { useState, useEffect } from 'react';
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
  const [introStage, setIntroStage] = useState<'crumpled' | 'unfolding' | 'revealed'>('crumpled');

  // Fallback timer: ensure login form is revealed even if WebGL is delayed or unavailable
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroStage('revealed');
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both work email and password.');
      return;
    }

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
    <div className="min-h-screen bg-[#F5F2EB] text-[#202B35] flex flex-col justify-between items-center p-3 sm:p-6 lg:p-8 font-sans selection:bg-[#397C70]/20 selection:text-[#202B35] relative overflow-hidden select-none">
      {/* Editorial Top Ambient Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between z-20 py-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#202B35] text-[#F5F2EB] font-serif font-bold text-base flex items-center justify-center shadow-xs">
            R
          </div>
          <div>
            <span className="font-bold tracking-tight text-sm text-[#202B35]">RosterIQ</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#66736F] block">
              Editorial Enterprise • v2.0
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-[11px] font-mono text-[#66736F]">
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#EAE6DC]/60 border border-[#E5DED2]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#397C70] animate-pulse" />
            <span>Interactive 3D Paper Surface</span>
          </span>
          <span className="opacity-60">Deterministic Scheduling</span>
        </div>
      </header>

      {/* Main Full-Screen Paper Stage */}
      <main className="relative w-full max-w-[1020px] h-[700px] sm:h-[720px] max-h-[85vh] my-auto flex items-center justify-center">
        {/* Layer 1: 3D PaperCrumple Canvas (Occupies full stage bounds) */}
        <div className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing">
          <PaperCrumple
            src="/images/rosteriq-sheet-paper.png"
            alt="RosterIQ Editorial Paper Sheet"
            intro="unfold"
            introDuration={1.2}
            width={960}
            height={660}
            sceneHeight={720}
            releaseBehavior="restore"
            crumpleAmount={0.85}
            crumpleDuration={0.55}
            releaseDuration={0.4}
            foldCount={7}
            foldSharpness={0.65}
            wrinkleDepth={0.7}
            creaseStrength={0.16}
            paperColor="#F4F0E8"
            paperTexture={0.08}
            draggable
            returnToOrigin
            imageFit="contain"
            roughness={0.92}
            lightIntensity={1.85}
            lightAngle={-35}
            shadow
            shadowOpacity={0.18}
            dragRotation={10}
            dragRadius={160}
            rotation={0}
            seed={7}
            detail={64}
            disabled={false}
            onStateChange={(state) => {
              if (state === 'unfolding') {
                setIntroStage('unfolding');
              }
            }}
            onUnfoldComplete={() => {
              setIntroStage('revealed');
            }}
          />
        </div>

        {/* Intro Loading / Unfolding Badge (Unobtrusive bottom pill, unmounts on reveal) */}
        {introStage !== 'revealed' && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-10 animate-in fade-in duration-300">
            <div className="bg-[#FFFDF8]/90 backdrop-blur-xs px-4 py-2 rounded-full border border-[#E5DED2] shadow-sm flex items-center space-x-2 text-xs font-mono text-[#202B35] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#397C70]" />
              <span>Unfolding RosterIQ workspace sheet...</span>
            </div>
          </div>
        )}

        {/* Layer 2: Interactive HTML Login Interface (Revealed gracefully on the paper) */}
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-all duration-700 ease-out px-4 ${
            introStage === 'revealed'
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="w-full max-w-[460px] bg-[#FFFDF8]/92 backdrop-blur-xs border border-[#E5DED2] rounded-2xl shadow-[0_12px_36px_rgba(32,43,53,0.08)] p-6 sm:p-8 pointer-events-auto select-auto">
            {/* Form Header */}
            <div className="text-center mb-5">
              <div className="inline-flex w-10 h-10 rounded-xl bg-[#202B35] text-[#F5F2EB] font-serif font-bold text-xl items-center justify-center shadow-xs mb-2">
                R
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#202B35]">
                Welcome back
              </h1>
              <p className="text-xs text-[#66736F] mt-1 leading-relaxed">
                Deterministic workforce & operations management. Zero coverage shortfall.
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[#C65C52]/10 border border-[#C65C52]/30 text-[#C65C52] text-xs font-medium flex items-start space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {seedNotice && (
              <div className="mb-4 p-3 rounded-xl bg-[#56866B]/10 border border-[#56866B]/30 text-[#397C70] text-xs font-medium flex items-start space-x-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{seedNotice}</span>
              </div>
            )}

            {forgotNotice && (
              <div className="mb-4 p-3 rounded-xl bg-[#DCE7DC] border border-[#A4B9A9] text-[#202B35] text-xs font-medium flex items-start space-x-2 animate-in fade-in duration-200">
                <HelpCircle className="w-4 h-4 text-[#397C70] flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{forgotNotice}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#202B35] uppercase tracking-wider mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66736F]">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@datastraw.io"
                    required
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F5F2EB]/50 border border-[#E5DED2] text-[#202B35] placeholder-[#66736F]/60 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#397C70] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#202B35] uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66736F]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F5F2EB]/50 border border-[#E5DED2] text-[#202B35] placeholder-[#66736F]/60 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#397C70] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <label className="flex items-center space-x-1.5 cursor-pointer text-[#66736F] hover:text-[#202B35] transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#E5DED2] text-[#397C70] focus:ring-[#397C70]"
                  />
                  <span>Remember device</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotNotice('For assessment review, please click any of the 1-click Quick Logins below.');
                    setTimeout(() => setForgotNotice(null), 6000);
                  }}
                  className="font-medium text-[#397C70] hover:text-[#202B35] hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#397C70] hover:bg-[#2D6359] text-white shadow-sm shadow-[#397C70]/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Assessment Quick Logins */}
            <div className="mt-4 pt-3.5 border-t border-[#E5DED2]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#66736F] uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#397C70]" />
                  <span>Assessment Quick Logins</span>
                </span>
                <button
                  type="button"
                  onClick={handleSeedDemoAccounts}
                  className="text-[10px] text-[#397C70] hover:underline font-semibold"
                >
                  Sync Accounts
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@datastraw.io', 'Admin@123')}
                  className="p-2 rounded-lg bg-[#F5F2EB]/80 hover:bg-[#EAE6DC] border border-[#E5DED2] text-left transition-colors flex items-center space-x-1.5 group cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#397C70] flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-[11px] text-[#202B35] group-hover:text-[#397C70] transition-colors truncate">
                      Super Admin
                    </div>
                    <div className="text-[9px] text-[#66736F] font-mono truncate">admin@datastraw.io</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('ops@datastraw.io', 'Ops@123')}
                  className="p-2 rounded-lg bg-[#F5F2EB]/80 hover:bg-[#EAE6DC] border border-[#E5DED2] text-left transition-colors flex items-center space-x-1.5 group cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#56866B] flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-[11px] text-[#202B35] group-hover:text-[#397C70] transition-colors truncate">
                      Ops Manager
                    </div>
                    <div className="text-[9px] text-[#66736F] font-mono truncate">ops@datastraw.io</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('lead@datastraw.io', 'Lead@123')}
                  className="p-2 rounded-lg bg-[#F5F2EB]/80 hover:bg-[#EAE6DC] border border-[#E5DED2] text-left transition-colors flex items-center space-x-1.5 group cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D99A42] flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-[11px] text-[#202B35] group-hover:text-[#397C70] transition-colors truncate">
                      Pod Lead
                    </div>
                    <div className="text-[9px] text-[#66736F] font-mono truncate">lead@datastraw.io</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('emp@datastraw.io', 'Emp@123')}
                  className="p-2 rounded-lg bg-[#F5F2EB]/80 hover:bg-[#EAE6DC] border border-[#E5DED2] text-left transition-colors flex items-center space-x-1.5 group cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A4B9A9] flex-shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-[11px] text-[#202B35] group-hover:text-[#397C70] transition-colors truncate">
                      Employee
                    </div>
                    <div className="text-[9px] text-[#66736F] font-mono truncate">emp@datastraw.io</div>
                  </div>
                </button>
              </div>

              <p className="text-[10px] text-[#66736F] mt-2.5 flex items-center justify-center space-x-1">
                <Shield className="w-3 h-3 text-[#397C70]" />
                <span>Bcrypt hashing • JWT Bearer • Scoped RBAC Governance</span>
              </p>
            </div>
          </div>
        </div>

        {/* Marginal Physics Hint */}
        <div
          className={`absolute bottom-2 text-center pointer-events-none z-10 transition-opacity duration-700 ${
            introStage === 'revealed' ? 'opacity-70' : 'opacity-0'
          }`}
        >
          <p className="text-[11px] font-mono text-[#66736F] flex items-center justify-center space-x-1">
            <span>✦ Click & drag outer paper margins to test 3D crumple physics</span>
          </p>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="w-full max-w-6xl flex items-center justify-between text-[11px] font-mono text-[#66736F] py-2 z-20">
        <span>RosterIQ Intelligent Operations Platform</span>
        <span className="hidden sm:inline">Tactile Enterprise Interface</span>
      </footer>
    </div>
  );
};
export default Login;
