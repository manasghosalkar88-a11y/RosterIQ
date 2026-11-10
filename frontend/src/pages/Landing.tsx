import React, { useRef, useState } from 'react';
import Crosshair from '../components/reactbits/Crosshair';
import {
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
  ArrowRight,
  ShieldCheck,
  Activity,
  Lock,
  Sparkles,
  Zap,
  Clock,
  Compass,
  Database,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

export interface LandingProps {
  onLogin: () => void;
  isAuthenticated?: boolean;
}

export const LandingPage: React.FC<LandingProps> = ({ onLogin, isAuthenticated = false }) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const modules = [
    {
      id: 'roster-planner',
      name: 'Intelligent Roster Planner',
      icon: CalendarDays,
      badge: 'Core Engine',
      color: 'teal',
      description:
        'Deterministic monthly scheduling matrix supporting Company-Wide, Pod-Wise, Brand-Wise, and Process-Wise perspectives with SLA-aware shift allocations.',
    },
    {
      id: 'employees',
      name: 'Employee Management',
      icon: Users,
      badge: 'Workforce',
      color: 'blue',
      description:
        'Comprehensive directory of 32 verified operations specialists across 5 pods, tracking contract terms, weekly rest rules, and multi-skill proficiencies.',
    },
    {
      id: 'brands',
      name: 'Brand Management',
      icon: Building2,
      badge: 'Client SLA',
      color: 'purple',
      description:
        'Manage 10 active D2C brand accounts (GlowBotanics, UrbanKicks, ZenHealth, etc.) with dedicated Single-Resource vs Multi-Resource operating SLAs.',
    },
    {
      id: 'processes',
      name: 'Process Management',
      icon: Cpu,
      badge: 'Operations',
      color: 'cyan',
      description:
        'Configure and monitor critical operational workflows: Customer Support (CS), Account Management (ACC), Retention, and Non-Delivery Reports (NDR).',
    },
    {
      id: 'pods',
      name: 'Pods & Teams',
      icon: Layers,
      badge: 'Hierarchy',
      color: 'amber',
      description:
        '5 autonomous operational pods (Alpha through Epsilon) overseen by designated Pod Leads to ensure balanced workload distribution and cross-functional support.',
    },
    {
      id: 'allocation',
      name: 'Resource Allocation Matrix',
      icon: Network,
      badge: 'Assignments',
      color: 'emerald',
      description:
        'Visual specialist-to-brand relationship mapping distinguishing Primary Responsible staff from Standby Backups to cover leaves and weekly offs.',
    },
    {
      id: 'leave',
      name: 'Leave & Staff Availability',
      icon: CalendarCheck,
      badge: 'Availability',
      color: 'rose',
      description:
        'Real-time tracking of planned annual leaves, comp-off credits, and availability changes with instant operational impact calculation.',
    },
    {
      id: 'holidays',
      name: 'Holidays & Calendar',
      icon: Palmtree,
      badge: 'Statutory',
      color: 'indigo',
      description:
        'Comprehensive operational calendar clearly separating national statutory holidays from company working days and floating leaves.',
    },
    {
      id: 'conflicts',
      name: 'Conflicts & Real-time Alerts',
      icon: AlertTriangle,
      badge: 'Zero Silent Failures',
      color: 'rose',
      description:
        'Active constraint auditor detecting staffing shortages, overlapping assignments, and labor policy breaches with weighted remediation suggestions.',
    },
    {
      id: 'approvals',
      name: 'Managerial Approvals',
      icon: CheckCircle,
      badge: 'Governance',
      color: 'emerald',
      description:
        'Streamlined multi-tier approval queue for leave applications, comp-off grants, and specialist manual override verifications.',
    },
    {
      id: 'analytics',
      name: 'Analytics & Compliance Reports',
      icon: BarChart3,
      badge: 'Intelligence',
      color: 'teal',
      description:
        'Live operational coverage reporting (80.56% baseline), pod headcount breakdown, weekly-off distribution, and executive CSV roster exports.',
    },
  ];

  return (
    <div className="relative min-h-screen text-[#F8FAFC] overflow-x-hidden selection:bg-[#14B8A6]/30 selection:text-white font-sans">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-[#0B1016]/85 backdrop-blur-[16px] border-b border-[rgba(148,163,184,0.16)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-[#14B8A6]/20 border border-white/10">
              R
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-[#F8FAFC]">ROSTERIQ</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[rgba(20,184,166,0.12)] text-[#2DD4BF] border border-[#14B8A6]/30 uppercase">
                  Enterprise
                </span>
              </div>
              <p className="text-[10px] text-[#94A3B8] tracking-wider uppercase font-mono">
                Workforce & Operations Matrix
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-[#CBD5E1]">
            <button
              onClick={() => scrollToSection('hero')}
              className="hover:text-[#2DD4BF] transition-colors duration-150"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-[#2DD4BF] transition-colors duration-150"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#2DD4BF] transition-colors duration-150"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('platform')}
              className="hover:text-[#2DD4BF] transition-colors duration-150"
            >
              Platform Modules
            </button>
            <button
              onClick={() => scrollToSection('enterprise')}
              className="hover:text-[#2DD4BF] transition-colors duration-150"
            >
              Enterprise
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="hover:text-[#2DD4BF] transition-colors duration-150"
            >
              Contact
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#CBD5E1] hover:text-white hover:bg-[#151D25] border border-[rgba(148,163,184,0.18)] transition-all duration-150"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </button>
            <button
              onClick={onLogin}
              className="btn-primary px-4 py-2 text-xs flex items-center space-x-1.5"
            >
              <span>{isAuthenticated ? 'Open RosterIQ' : 'Get Started'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-white bg-[#151D25] border border-[rgba(148,163,184,0.16)]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#080D12] border-b border-[rgba(148,163,184,0.16)] px-4 py-4 space-y-3 animate-dropdown">
            <button
              onClick={() => scrollToSection('hero')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#CBD5E1] hover:text-[#2DD4BF]"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#CBD5E1] hover:text-[#2DD4BF]"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#CBD5E1] hover:text-[#2DD4BF]"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('platform')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#CBD5E1] hover:text-[#2DD4BF]"
            >
              Platform Modules
            </button>
            <button
              onClick={() => scrollToSection('enterprise')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#CBD5E1] hover:text-[#2DD4BF]"
            >
              Enterprise
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left py-2 text-xs font-semibold text-[#CBD5E1] hover:text-[#2DD4BF]"
            >
              Contact
            </button>
            <div className="pt-3 border-t border-[rgba(148,163,184,0.16)] flex flex-col space-y-2">
              <button
                onClick={onLogin}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-center text-[#CBD5E1] bg-[#151D25] border border-[rgba(148,163,184,0.18)]"
              >
                Sign In
              </button>
              <button
                onClick={onLogin}
                className="btn-primary w-full py-2.5 text-xs text-center"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION (WITH CROSSHAIR INTEGRATION) */}
      <section
        id="hero"
        ref={heroRef}
        className="relative pt-20 pb-28 md:pt-28 md:pb-36 overflow-hidden"
      >
        {/* React Bits Crosshair Component (Scoped strictly to hero container) */}
        <Crosshair
          containerRef={heroRef}
          color="#14B8A6"
          targetEffect="lock"
          thickness={1}
          opacity={0.8}
          smoothing={0.35}
          showCoordinates={false}
          clickPulse={true}
          hideCursor={false}
          blendMode="normal"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[rgba(20,184,166,0.1)] border border-[#14B8A6]/30 text-[#2DD4BF] text-xs font-mono font-semibold mb-6 animate-fade-up">
            <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse" />
            <span>Deterministic Operations Management & Roster Planning</span>
          </div>

          {/* Main Hero Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#F8FAFC] max-w-5xl mx-auto leading-[1.08] mb-6">
            Intelligent Workforce.{' '}
            <span className="bg-gradient-to-r from-[#14B8A6] via-[#2DD4BF] to-[#38BDF8] bg-clip-text text-transparent">
              Seamless Operations.
            </span>
          </h1>

          {/* Supporting Description */}
          <p className="text-base sm:text-lg md:text-xl text-[#94A3B8] max-w-3xl mx-auto leading-relaxed mb-10">
            Enterprise-grade deterministic scheduling, multi-brand resource matrix allocation, real-time conflict auditing,
            and zero-silent-failure shift planning for modern distributed operations.
          </p>

          {/* CTA Button Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => scrollToSection('platform')}
              className="btn-primary w-full sm:w-auto px-7 py-3.5 text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-[#14B8A6]/25"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Platform</span>
            </button>
            <button
              onClick={onLogin}
              className="btn-secondary w-full sm:w-auto px-7 py-3.5 text-sm font-semibold flex items-center justify-center space-x-2"
            >
              <span>{isAuthenticated ? 'Open Dashboard' : 'Sign In to Operations'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Live Operational Metrics Pill Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="glass-card p-4 rounded-xl border border-[rgba(148,163,184,0.16)] kpi-card">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] font-mono">32</div>
              <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mt-1">
                Active Specialists
              </div>
            </div>
            <div className="glass-card p-4 rounded-xl border border-[rgba(148,163,184,0.16)] kpi-card">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#2DD4BF] font-mono">10</div>
              <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mt-1">
                D2C Brands Managed
              </div>
            </div>
            <div className="glass-card p-4 rounded-xl border border-[rgba(148,163,184,0.16)] kpi-card">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#38BDF8] font-mono">5</div>
              <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mt-1">
                Autonomous Pods
              </div>
            </div>
            <div className="glass-card p-4 rounded-xl border border-[rgba(148,163,184,0.16)] kpi-card">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">0</div>
              <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mt-1">
                Silent Shortfalls
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DASHBOARD PREVIEW SECTION */}
      <section id="features" className="py-20 relative bg-[#080D12]/60 border-y border-[rgba(148,163,184,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#14B8A6]">
              Real-time Operations Control
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight mt-2 mb-4">
              Enterprise Dashboard & Roster Matrix
            </h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Engineered with Dark Enterprise Glass aesthetics. Real-time telemetry, 16 relational data models, and
              instant conflict resolution across every operational pod.
            </p>
          </div>

          {/* Interactive Preview Container */}
          <div className="glass-card rounded-2xl border border-[rgba(148,163,184,0.22)] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Top Window Bar */}
            <div className="bg-[#0B1016] px-5 py-3 border-b border-[rgba(148,163,184,0.16)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-[#94A3B8] ml-2">rosteriq.app · DataStraw Enterprise Suite</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  SYSTEM OPTIMAL
                </span>
                <span className="text-[10px] font-mono text-[#CBD5E1] bg-[#111820] px-2 py-0.5 rounded border border-white/10">
                  Nov 2026 · Cycle A
                </span>
              </div>
            </div>

            {/* Preview Body */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Header metrics inside preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#080D12] p-4 rounded-xl border border-[rgba(148,163,184,0.14)]">
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                    Operational Coverage
                  </span>
                  <div className="text-xl font-bold text-amber-400 font-mono mt-1">80.56%</div>
                  <div className="w-full bg-[#151D25] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: '80.56%' }} />
                  </div>
                </div>

                <div className="bg-[#080D12] p-4 rounded-xl border border-[rgba(148,163,184,0.14)]">
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                    Fairness Index
                  </span>
                  <div className="text-xl font-bold text-[#2DD4BF] font-mono mt-1">71.9 / 100</div>
                  <span className="text-[10px] text-[#94A3B8] mt-1 block">Balanced weekend off distribution</span>
                </div>

                <div className="bg-[#080D12] p-4 rounded-xl border border-[rgba(148,163,184,0.14)]">
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                    Unresolved Conflicts
                  </span>
                  <div className="text-xl font-bold text-rose-400 font-mono mt-1">124 flagged gaps</div>
                  <span className="text-[10px] text-rose-400/80 mt-1 block">Zero silent failures active</span>
                </div>

                <div className="bg-[#080D12] p-4 rounded-xl border border-[rgba(148,163,184,0.14)]">
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block">
                    Workforce Scheduled
                  </span>
                  <div className="text-xl font-bold text-[#F8FAFC] font-mono mt-1">32 Specialists</div>
                  <span className="text-[10px] text-[#94A3B8] mt-1 block">Across 5 operational pods</span>
                </div>
              </div>

              {/* Mini Matrix Sample Table */}
              <div className="bg-[#080D12] rounded-xl border border-[rgba(148,163,184,0.16)] overflow-hidden">
                <div className="p-3.5 bg-[#0B1016] border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F8FAFC]">Monthly Roster Planner Matrix Snapshot</span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-[rgba(20,184,166,0.12)] text-[#2DD4BF] text-[10px] font-semibold">
                      Company-Wide
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#151D25] text-[#94A3B8] text-[10px]">Pod-Wise</span>
                    <span className="px-2 py-0.5 rounded bg-[#151D25] text-[#94A3B8] text-[10px]">Brand-Wise</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[rgba(148,163,184,0.12)] bg-[#111820]/70 text-[#94A3B8]">
                        <th className="py-2.5 px-4 font-semibold">Specialist / Pod</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Sun 1</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Mon 2</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Tue 3</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Wed 4</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Thu 5</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Fri 6</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Sat 7</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(148,163,184,0.08)] font-mono text-[11px]">
                      <tr>
                        <td className="py-2.5 px-4 text-[#F8FAFC] font-sans font-semibold">
                          Aditya Kulkarni <span className="text-[10px] text-[#94A3B8] block">EMP014 · Pod Alpha</span>
                        </td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">OFF</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-teal-950 text-[#2DD4BF] border border-teal-800/40">Urban Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-teal-950 text-[#2DD4BF] border border-teal-800/40">Urban Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-teal-950 text-[#2DD4BF] border border-teal-800/40">Urban Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-teal-950 text-[#2DD4BF] border border-teal-800/40">Urban Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-teal-950 text-[#2DD4BF] border border-teal-800/40">Urban Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-teal-950 text-[#2DD4BF] border border-teal-800/40">Urban Cust</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-[#F8FAFC] font-sans font-semibold">
                          Ananya Basu <span className="text-[10px] text-[#94A3B8] block">EMP032 · Pod Alpha</span>
                        </td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">HOLIDAY</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">OFF</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">OFF</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">OFF</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">OFF</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">OFF</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">OFF</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-[#F8FAFC] font-sans font-semibold">
                          Arjun Das <span className="text-[10px] text-[#94A3B8] block">EMP013 · Pod Alpha</span>
                        </td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">OFF</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">Velve Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">Velve Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">Velve Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">Velve Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">Velve Cust</span></td>
                        <td className="py-2 px-3 text-center"><span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">Velve Cust</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW ROSTERIQ WORKS SECTION */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#14B8A6]">
            Architectural Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight mt-2 mb-4">
            How RosterIQ Operates
          </h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            A 4-stage deterministic pipeline from statutory labor constraints to automated conflict auditing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] flex flex-col justify-between kpi-card">
            <div>
              <div className="text-xs font-mono font-bold text-[#14B8A6] mb-3">STEP 01</div>
              <div className="w-10 h-10 rounded-xl bg-[rgba(20,184,166,0.12)] text-[#2DD4BF] flex items-center justify-center font-bold mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Constraint Definition</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Establish statutory labor parameters: maximum consecutive working days (mandatory weekly rest), standard
                shift start/end timings, and brand SLA requirements.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[rgba(148,163,184,0.12)] text-[11px] font-mono text-[#CBD5E1]">
              Max 6 Consecutive Days
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] flex flex-col justify-between kpi-card">
            <div>
              <div className="text-xs font-mono font-bold text-[#14B8A6] mb-3">STEP 02</div>
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 text-blue-400 flex items-center justify-center font-bold mb-4">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Resource Allocation</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Map 32 specialists across 5 pods to 10 D2C brands. Categorize roles as Dedicated Primary Responsible or
                Cross-Trained Standby Backups for seamless off coverage.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[rgba(148,163,184,0.12)] text-[11px] font-mono text-[#CBD5E1]">
                15 Primary · 5 Backups
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] flex flex-col justify-between kpi-card">
            <div>
              <div className="text-xs font-mono font-bold text-[#14B8A6] mb-3">STEP 03</div>
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 text-purple-400 flex items-center justify-center font-bold mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Deterministic Scheduling</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Generate the entire monthly roster with deterministic algorithms. Connects operating days, employee availability,
                and national holidays into an immutable grid.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[rgba(148,163,184,0.12)] text-[11px] font-mono text-[#CBD5E1]">
              Instant Execution &lt; 1.2s
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] flex flex-col justify-between kpi-card">
            <div>
              <div className="text-xs font-mono font-bold text-[#14B8A6] mb-3">STEP 04</div>
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 text-rose-400 flex items-center justify-center font-bold mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Audit & Conflict Resolution</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Every uncovered slot is audited with zero silent failures. The system recommends qualified replacements with
                0–100% multi-factor compatibility scoring.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[rgba(148,163,184,0.12)] text-[11px] font-mono text-[#CBD5E1]">
              Impact Simulator Integration
            </div>
          </div>
        </div>
      </section>

      {/* 5. PLATFORM MODULES OVERVIEW */}
      <section id="platform" className="py-24 bg-[#080D12]/60 border-t border-[rgba(148,163,184,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#14B8A6]">
              Modular Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight mt-2 mb-4">
              11 Core Enterprise Modules
            </h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Every capability is fully realized and interconnected within our operational backend.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] hover:border-[#14B8A6]/40 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.16)] flex items-center justify-center text-[#2DD4BF] group-hover:border-[#14B8A6]/50 transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[rgba(20,184,166,0.1)] text-[#2DD4BF] border border-[#14B8A6]/30">
                        {m.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#F8FAFC] mb-2 group-hover:text-[#2DD4BF] transition-colors">
                      {m.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{m.description}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[rgba(148,163,184,0.1)] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#64748B]">Active & Integrated</span>
                    <button
                      onClick={onLogin}
                      className="text-xs font-semibold text-[#14B8A6] hover:text-[#2DD4BF] flex items-center space-x-1"
                    >
                      <span>Access Module</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. ENTERPRISE CAPABILITIES SECTION */}
      <section id="enterprise" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#14B8A6]">
            Governance & Reliability
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight mt-2 mb-4">
            Enterprise-Grade Infrastructure
          </h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Built for compliance, resilience, and operational precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] kpi-card">
            <div className="w-10 h-10 rounded-xl bg-teal-950/60 text-[#2DD4BF] flex items-center justify-center font-bold mb-4 border border-teal-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Role-Based Access Control</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Granular permission models across Super Admin, Operations Manager, Pod Lead, and Employee roles ensure data
              isolation and strict organizational oversight.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] kpi-card">
            <div className="w-10 h-10 rounded-xl bg-blue-950/60 text-blue-400 flex items-center justify-center font-bold mb-4 border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Multi-Brand Operations</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Designed for BPO and shared-service organizations managing diverse portfolios. Seamlessly supports dedicated
              single-resource contracts alongside multi-brand agents.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] kpi-card">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center font-bold mb-4 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Statutory Labor Compliance</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Statutory rest parameters are hard-coded into the scheduling engine. Shifts exceeding 6 consecutive days are
              prevented during roster generation.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] kpi-card">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 text-purple-400 flex items-center justify-center font-bold mb-4 border border-purple-500/30">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC] mb-2">16 Normalized Relational Tables</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Clean relational schema with SQLAlchemy 2.0 and Pydantic v2. Normalized foreign keys connect users, employees,
              pods, brands, processes, and rules.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] kpi-card">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 text-amber-400 flex items-center justify-center font-bold mb-4 border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Immutable Audit Trail</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Complete historical logging of every specialist reassignment, managerial override, and roster publication
              ensuring audit readiness at all times.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[rgba(148,163,184,0.16)] kpi-card">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 text-cyan-400 flex items-center justify-center font-bold mb-4 border border-cyan-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC] mb-2">Live Engine Telemetry</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Real-time database latency telemetry (&lt; 0.3 ms), engine uptime counters, and health monitors available directly
              within the System Settings diagnostics console.
            </p>
          </div>
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION (CTA) */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-b from-[#080D12] to-[#050505] border-t border-[rgba(148,163,184,0.16)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-[#14B8A6]/30 border border-white/20">
            <Sparkles className="w-7 h-7" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F8FAFC] tracking-tight mb-4">
            Take Control of Your Workforce Operations.
          </h2>

          <p className="text-base sm:text-lg text-[#94A3B8] max-w-2xl mx-auto leading-relaxed mb-10">
            Eliminate scheduling blindspots, protect client SLAs, and orchestrate high-performing distributed teams with
            deterministic precision.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLogin}
              className="btn-primary w-full sm:w-auto px-8 py-4 text-sm font-bold flex items-center justify-center space-x-2 shadow-xl shadow-[#14B8A6]/30"
            >
              <span>{isAuthenticated ? 'Enter Operations Command Centre' : 'Access Operations Platform'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="btn-outline w-full sm:w-auto px-8 py-4 text-sm font-semibold flex items-center justify-center space-x-2"
            >
              <span>Review How It Works</span>
            </button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer id="contact" className="bg-[#050505] border-t border-[rgba(148,163,184,0.14)] py-14 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Col 1: Branding */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center font-bold text-white text-sm">
                  R
                </div>
                <span className="text-base font-bold text-[#F8FAFC]">ROSTERIQ</span>
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                Smart Workforce & Roster Management System. Deterministic constraint scheduling and multi-brand SLA governance.
              </p>
              <div className="text-[11px] font-mono text-[#64748B]">DataStraw Operations Suite</div>
            </div>

            {/* Col 2: Platform Links */}
            <div>
              <h4 className="font-bold text-[#F8FAFC] uppercase tracking-wider mb-3">Platform</h4>
              <ul className="space-y-2 text-[#94A3B8]">
                <li><button onClick={() => scrollToSection('platform')} className="hover:text-[#2DD4BF]">Roster Planner</button></li>
                <li><button onClick={() => scrollToSection('platform')} className="hover:text-[#2DD4BF]">Resource Allocation</button></li>
                <li><button onClick={() => scrollToSection('platform')} className="hover:text-[#2DD4BF]">Conflicts & Alerts</button></li>
                <li><button onClick={() => scrollToSection('platform')} className="hover:text-[#2DD4BF]">Operational Analytics</button></li>
              </ul>
            </div>

            {/* Col 3: Operations & Governance */}
            <div>
              <h4 className="font-bold text-[#F8FAFC] uppercase tracking-wider mb-3">Governance</h4>
              <ul className="space-y-2 text-[#94A3B8]">
                <li><button onClick={() => scrollToSection('enterprise')} className="hover:text-[#2DD4BF]">Role-Based Access (RBAC)</button></li>
                <li><button onClick={() => scrollToSection('enterprise')} className="hover:text-[#2DD4BF]">Statutory Labor Rules</button></li>
                <li><button onClick={() => scrollToSection('enterprise')} className="hover:text-[#2DD4BF]">Immutable Audit Logs</button></li>
                <li><button onClick={() => scrollToSection('enterprise')} className="hover:text-[#2DD4BF]">Database Telemetry</button></li>
              </ul>
            </div>

            {/* Col 4: Operations Contact */}
            <div>
              <h4 className="font-bold text-[#F8FAFC] uppercase tracking-wider mb-3">Operations Contact</h4>
              <ul className="space-y-2 text-[#94A3B8]">
                <li><span className="text-[#CBD5E1]">DataStraw Enterprise Operations</span></li>
                <li><span className="font-mono text-[#94A3B8]">support@datastraw.io</span></li>
                <li><span className="font-mono text-[#94A3B8]">admin@datastraw.io</span></li>
                <li className="pt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    Engine Active
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[rgba(148,163,184,0.1)] flex flex-col sm:flex-row items-center justify-between text-[#64748B]">
            <div>© 2026 RosterIQ. All rights reserved. DataStraw Operations Suite.</div>
            <div className="mt-2 sm:mt-0 font-mono text-[11px]">
              Engine v2.4 · 16 Normalized Tables · React 18 & Three.js
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
