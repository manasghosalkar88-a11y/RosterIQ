import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PaperCrumple from '../components/reactbits/PaperCrumple';
import {
  Shield,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  HelpCircle,
} from 'lucide-react';

export interface LoginProps {
  onBackToLanding?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onBackToLanding }) => {
  const { login, seedUsers } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const [introStage, setIntroStage] = useState<'crumpled' | 'unfolding' | 'revealed'>('crumpled');

  // Fallback timer: ensure login form is revealed smoothly
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroStage('revealed');
    }, 2800);
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
      setSeedNotice('4 demo accounts (Super Admin, Ops Mgr, Lead, Employee) synchronized in database!');
      setTimeout(() => setSeedNotice(null), 5000);
    } catch (err) {
      setError('Failed to sync demo accounts. Ensure FastAPI backend is running on port 8000.');
    }
  };

  return (
    <div className="min-h-screen text-[#F5F7FA] flex flex-col justify-between items-center p-3 sm:p-6 lg:p-8 font-sans selection:bg-[#397C70]/30 selection:text-white relative overflow-hidden select-none z-10">
      {/* Top Ambient Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between z-20 py-2">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#397C70] text-white font-bold text-base flex items-center justify-center shadow-md shadow-teal-500/20 border border-white/10">
            R
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-base text-white">ROSTERIQ</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-950/70 text-teal-300 border border-teal-800/60 uppercase">
                Enterprise v2.4
              </span>
            </div>
            <span className="text-[10px] text-[#A0AAB5] block">
              Smart Roster Management & Operations Matrix
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-xs font-mono text-[#A0AAB5]">
          <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#171C22]/80 border border-white/10 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-gray-300">3D Interactive Paper & Topology Mesh</span>
          </span>
        </div>
      </header>

      {/* Main Full-Screen Paper & Glass Stage */}
      <main className="relative w-full max-w-[1020px] h-[700px] sm:h-[720px] max-h-[85vh] my-auto flex items-center justify-center">
        {/* Layer 1: 3D PaperCrumple Canvas */}
        <div className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing">
          <PaperCrumple
            src="/images/rosteriq-sheet-paper.png"
            alt="RosterIQ Enterprise Paper Sheet"
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
            paperColor="#F2EFE9"
            paperTexture={0.08}
            draggable
            returnToOrigin
            imageFit="contain"
            roughness={0.92}
            lightIntensity={1.85}
            lightAngle={-35}
            shadow
            shadowOpacity={0.25}
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

        {/* Intro Loading / Unfolding Pill (Fades out when revealed) */}
        {introStage !== 'revealed' && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-10 animate-in fade-in duration-300">
            <div className="bg-[#171C22]/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-elevated flex items-center space-x-2 text-xs font-mono text-teal-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Unfolding operational credentials sheet...</span>
            </div>
          </div>
        )}

        {/* Layer 2: Dark Glassmorphic Login Card */}
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-all duration-700 ease-out px-4 ${
            introStage === 'revealed'
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="w-full max-w-[460px] bg-[rgba(23,28,34,0.92)] backdrop-blur-[18px] border border-white/12 rounded-2xl shadow-[0_16px_36px_-4px_rgba(0,0,0,0.7),0_6px_12px_-2px_rgba(0,0,0,0.5)] p-6 sm:p-7 pointer-events-auto select-auto">
            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="mb-4 text-xs font-medium text-[#94A3B8] hover:text-[#2DD4BF] flex items-center space-x-1.5 transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                <span>Back to Platform Overview</span>
              </button>
            )}

            {/* Form Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#397C70] text-white font-bold text-xl shadow-md shadow-teal-500/25 border border-white/10 mb-2">
                R
              </div>
              <div className="flex items-center justify-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  ROSTERIQ
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-950/70 text-teal-300 border border-teal-800/60 uppercase">
                  Enterprise v2.4
                </span>
              </div>
              <p className="text-xs text-[#A0AAB5] mt-1 leading-relaxed">
                Smart Roster Management & Operations Matrix
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[#D45D63]/15 border border-[#D45D63]/30 text-[#FCA5A5] text-xs font-medium flex items-start space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F87171]" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {seedNotice && (
              <div className="mb-4 p-3 rounded-xl bg-[#397C70]/15 border border-[#397C70]/30 text-teal-300 text-xs font-medium flex items-start space-x-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-teal-400" />
                <span className="leading-snug">{seedNotice}</span>
              </div>
            )}

            {forgotNotice && (
              <div className="mb-4 p-3 rounded-xl bg-[#1E242B] border border-white/10 text-gray-300 text-xs font-medium flex items-start space-x-2 animate-in fade-in duration-200">
                <HelpCircle className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{forgotNotice}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#A0AAB5] uppercase tracking-wider mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@datastraw.io"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0B0E12] border border-white/10 text-[#F5F7FA] placeholder-[#727E89] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#397C70] focus:border-transparent transition-all shadow-neumorph-inset"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A0AAB5] uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#0B0E12] border border-white/10 text-[#F5F7FA] placeholder-[#727E89] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#397C70] focus:border-transparent transition-all shadow-neumorph-inset"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <label className="flex items-center space-x-1.5 cursor-pointer text-[#A0AAB5] hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-[#0B0E12] text-[#397C70] focus:ring-[#397C70]"
                  />
                  <span>Remember device</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotNotice('For evaluation, click any of the 1-click Quick Logins below.');
                    setTimeout(() => setForgotNotice(null), 6000);
                  }}
                  className="font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#397C70] hover:bg-[#2D6359] text-white shadow-neumorph-btn flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer active:translate-y-0.5"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Assessment Quick Logins */}
            <div className="mt-4 pt-3.5 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#A0AAB5] uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  <span>Assessment Quick Logins</span>
                </span>
                <button
                  type="button"
                  onClick={handleSeedDemoAccounts}
                  className="text-[10px] text-teal-400 hover:underline font-semibold"
                >
                  Sync Accounts
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@datastraw.io', 'Admin@123')}
                  className="p-2 rounded-xl bg-[#0B0E12]/80 hover:bg-[#15191E] border border-white/10 text-left transition-colors flex items-center space-x-2 group cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 shadow-sm shadow-purple-400/50" />
                  <div className="truncate">
                    <div className="font-bold text-[11px] text-white group-hover:text-purple-300 transition-colors truncate">
                      Super Admin
                    </div>
                    <div className="text-[9px] text-[#A0AAB5] font-mono truncate">admin@datastraw.io</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('ops@datastraw.io', 'Ops@123')}
                  className="p-2 rounded-xl bg-[#0B0E12]/80 hover:bg-[#15191E] border border-white/10 text-left transition-colors flex items-center space-x-2 group cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0 shadow-sm shadow-teal-400/50" />
                  <div className="truncate">
                    <div className="font-bold text-[11px] text-white group-hover:text-teal-300 transition-colors truncate">
                      Ops Manager
                    </div>
                    <div className="text-[9px] text-[#A0AAB5] font-mono truncate">ops@datastraw.io</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('lead@datastraw.io', 'Lead@123')}
                  className="p-2 rounded-xl bg-[#0B0E12]/80 hover:bg-[#15191E] border border-white/10 text-left transition-colors flex items-center space-x-2 group cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 shadow-sm shadow-amber-400/50" />
                  <div className="truncate">
                    <div className="font-bold text-[11px] text-white group-hover:text-amber-300 transition-colors truncate">
                      Pod Lead
                    </div>
                    <div className="text-[9px] text-[#A0AAB5] font-mono truncate">lead@datastraw.io</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('emp@datastraw.io', 'Emp@123')}
                  className="p-2 rounded-xl bg-[#0B0E12]/80 hover:bg-[#15191E] border border-white/10 text-left transition-colors flex items-center space-x-2 group cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 shadow-sm shadow-sky-400/50" />
                  <div className="truncate">
                    <div className="font-bold text-[11px] text-white group-hover:text-sky-300 transition-colors truncate">
                      Employee
                    </div>
                    <div className="text-[9px] text-[#A0AAB5] font-mono truncate">emp@datastraw.io</div>
                  </div>
                </button>
              </div>

              <p className="text-[10px] text-[#727E89] mt-2.5 flex items-center justify-center space-x-1.5 font-mono">
                <Shield className="w-3 h-3 text-teal-400" />
                <span>SOC2 Type II • ISO 27001 • 256-bit AES</span>
              </p>
            </div>
          </div>
        </div>

        {/* Marginal Physics Hint */}
        <div
          className={`absolute bottom-2 text-center pointer-events-none z-10 transition-opacity duration-700 ${
            introStage === 'revealed' ? 'opacity-80' : 'opacity-0'
          }`}
        >
          <p className="text-[11px] font-mono text-gray-400 flex items-center justify-center space-x-1">
            <span>✦ Click & drag outer paper margins to test 3D crumple physics</span>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl flex items-center justify-between text-xs font-mono text-[#727E89] py-2 z-20">
        <span>RosterIQ Intelligent Operations Platform</span>
        <span className="hidden sm:inline">Tactile Enterprise 3D Interface</span>
      </footer>
    </div>
  );
};

export default Login;
