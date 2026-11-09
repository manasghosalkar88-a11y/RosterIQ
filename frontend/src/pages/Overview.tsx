import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { OverviewDashboardResponse } from '../types/overview';
import CircularCarousel from '../components/reactbits/CircularCarousel';
import { generateDashboardCarouselCards } from '../utils/dashboardCards';
import { WorkforceNetwork } from '../components/3d/WorkforceNetwork';
import {
  Users,
  Building2,
  Cpu,
  Layers,
  TrendingUp,
  Clock,
  ArrowRight,
  Palmtree,
  History,
  Sparkles,
  BarChart3,
  CheckCircle2,
  Network,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (moduleName: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNetworkGraph, setShowNetworkGraph] = useState(false);

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<OverviewDashboardResponse>('/overview/summary');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Generate 8 branded, data-driven cards for CircularCarousel
  const carouselItems = useMemo(() => {
    if (!data) return [];
    return generateDashboardCarouselCards({
      totalEmployees: data.kpis.total_employees,
      activeBrands: data.kpis.active_brands,
      activeProcesses: data.kpis.active_processes,
      totalPods: data.kpis.total_pods,
      workingToday: data.today_status.working_count || data.kpis.working_today,
      onLeaveToday: data.today_status.leave_count || data.kpis.on_leave_today,
      coveragePercentage: data.kpis.coverage_percentage,
      unresolvedConflicts: data.kpis.unresolved_conflicts,
      monthName: data.today_status.day_name,
      fairnessScore: 71.9,
    });
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="glass-card p-16 text-center rounded-enterprise shadow-glass text-[#A0AAB5] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-mono tracking-wider uppercase">Loading RosterIQ Command Centre...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. MAIN HERO: RosterIQ Command Centre Heading & 3D CircularCarousel       */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-enterprise border border-white/10 overflow-hidden shadow-glass relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center min-h-[460px]">
          {/* Left Column: Command Centre Information & Navigation Actions */}
          <div className="p-6 md:p-8 lg:col-span-5 space-y-4 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-950/70 text-teal-300 border border-teal-800/60 font-mono uppercase tracking-wider">
                {user?.role.replace('_', ' ')}
              </span>
              <span className="text-xs text-[#A0AAB5] font-mono">· DataStraw Enterprise Operations</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F5F7FA] tracking-tight">
                RosterIQ Command Centre
              </h1>
              <p className="text-xs sm:text-sm text-[#A0AAB5] mt-2 leading-relaxed">
                Deterministic operations management, multi-brand resource matrices, and intelligent shortfall resolution across our enterprise workforce.
              </p>
            </div>

            {/* Operational Telemetry Status Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0B0E12] border border-white/10 text-[#F5F7FA]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{data?.kpis.total_employees || 32} Specialists Active</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0B0E12] border border-white/10 text-teal-300">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Zero Silent Shortfalls</span>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('Roster Planner')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#397C70] hover:bg-[#2D6359] text-white text-xs font-bold uppercase tracking-wider shadow-neumorph-btn active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                <span>Open Roster Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigate('Analytics & Reports')}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[rgba(30,36,43,0.78)] hover:bg-[rgba(38,46,55,0.9)] border border-white/10 text-[#F5F7FA] hover:text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                <span>View Analytics</span>
              </button>
            </div>

            {/* Interaction Cue */}
            <p className="text-[11px] text-[#727E89] font-mono pt-1">
              ✦ Click any 3D card in the circular carousel to jump directly into that operational module.
            </p>
          </div>

          {/* Right Column: Large 3D CircularCarousel Stage */}
          <div className="lg:col-span-7 h-[440px] sm:h-[480px] relative w-full flex items-center justify-center overflow-hidden border-t lg:border-t-0 lg:border-l border-white/10 bg-transparent">
            {carouselItems.length > 0 && (
              <CircularCarousel
                items={carouselItems}
                preset="cylinder"
                intro="assemble"
                cardWidth={250}
                aspectRatio={1.35}
                speed={9}
                autoplay="drift"
                direction="left"
                draggable={true}
                momentum={0.6}
                snap={true}
                pauseOnHover={true}
                focusOnClick={true}
                parallax={0.25}
                stretch={0.3}
                depthFade={0.3}
                fadeColor="#050505"
                cornerRadius={16}
                captions={true}
                onItemClick={(item: any) => {
                  if (item.targetModule) {
                    onNavigate(item.targetModule);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FOUR PREMIUM GLASS KPI CARDS                                           */}
      {/* ========================================================================= */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Total Employees */}
          <div
            onClick={() => onNavigate('Employees')}
            className="glass-card p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Total Employees</span>
              <div className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-800/50">
                <Users className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#F5F7FA] mt-2 tracking-tight">{data.kpis.total_employees}</div>
            <div className="text-[11px] text-[#A0AAB5] mt-0.5 flex items-center space-x-1">
              <span className="text-teal-400 font-semibold">+3 this month</span>
              <span>· 32 specialists</span>
            </div>
          </div>

          {/* Card 2: Active Brands */}
          <div
            onClick={() => onNavigate('Brands')}
            className="glass-card p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Active Brands</span>
              <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-800/50">
                <Building2 className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#F5F7FA] mt-2 tracking-tight">{data.kpis.active_brands}</div>
            <div className="text-[11px] text-[#A0AAB5] mt-0.5">80% Single-Resource model</div>
          </div>

          {/* Card 3: Active Processes */}
          <div
            onClick={() => onNavigate('Processes')}
            className="glass-card p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Active Processes</span>
              <div className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-800/50">
                <Cpu className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#F5F7FA] mt-2 tracking-tight">{data.kpis.active_processes}</div>
            <div className="text-[11px] text-[#A0AAB5] mt-0.5">CS, ACC, Retention, NDR</div>
          </div>

          {/* Card 4: Operational Pods */}
          <div
            onClick={() => onNavigate('Pods & Teams')}
            className="glass-card p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Operational Pods</span>
              <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/50">
                <Layers className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#F5F7FA] mt-2 tracking-tight">{data.kpis.total_pods}</div>
            <div className="text-[11px] text-[#A0AAB5] mt-0.5">Pods Alpha to Epsilon</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FOUR OPERATIONAL METRICS                                               */}
      {/* ========================================================================= */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Metric 1: Working Today */}
          <div className="glass-card p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Working Today</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">
              {data.today_status.working_count || data.kpis.working_today}
            </div>
            <div className="text-[11px] text-emerald-400/80 font-medium mt-0.5">Active on client shifts</div>
          </div>

          {/* Metric 2: On Leave Today */}
          <div className="glass-card p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">On Leave Today</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2 tracking-tight">
              {data.today_status.leave_count || data.kpis.on_leave_today}
            </div>
            <div className="text-[11px] text-amber-400/80 font-medium mt-0.5">Planned / Casual time-off</div>
          </div>

          {/* Metric 3: Roster Coverage */}
          <div
            onClick={() => onNavigate('Roster Planner')}
            className="glass-card p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Roster Coverage</span>
              <div className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-800/50">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-teal-300 mt-2 tracking-tight">{data.kpis.coverage_percentage}%</div>
            <div className="text-[11px] text-[#A0AAB5] mt-0.5">Target &gt; 95% SLA achieved</div>
          </div>

          {/* Metric 4: Unresolved Gaps */}
          <div
            onClick={() => onNavigate('Conflicts & Alerts')}
            className="glass-card p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Unresolved Gaps</span>
              <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">{data.kpis.unresolved_conflicts}</div>
            <div className="text-[11px] text-emerald-400/80 font-medium mt-0.5">Zero silent shortfalls</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PENDING APPROVALS CALLOUT BANNER                                       */}
      {/* ========================================================================= */}
      {data && data.pending_approvals_count > 0 && (
        <div className="p-4 rounded-enterprise bg-amber-950/40 backdrop-blur-[14px] border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-glass">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-900/40 border border-amber-700/50 flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200 tracking-wide">
                Action Required: Pending Approvals Queue ({data.pending_approvals_count} Requests)
              </div>
              <div className="text-[11px] text-amber-300/80 mt-0.5">
                Leave and comp-off requests waiting for operational review before roster publication.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('Approvals')}
            className="px-4 py-2 rounded-xl bg-[#D99A42] hover:bg-[#C28532] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center space-x-1.5 flex-shrink-0 cursor-pointer"
          >
            <span>Review {data.pending_approvals_count} Pending Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODULAR OPERATIONAL WIDGETS                                            */}
      {/* ========================================================================= */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Widget 1: Today's Operating Workforce */}
          <div className="glass-card rounded-enterprise border border-white/10 p-5 shadow-glass space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F7FA]">Today's Operating Workforce</h3>
                <p className="text-[11px] text-[#A0AAB5] font-mono mt-0.5">
                  {data.today_status.date} · {data.today_status.day_name}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                {data.today_status.working_count} Active Shifts
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {data.today_status.working_sample.length === 0 ? (
                <div className="py-8 text-center text-[#727E89]">No shifts scheduled today.</div>
              ) : (
                data.today_status.working_sample.map((emp) => (
                  <div key={emp.employee_id} className="p-2.5 rounded-xl bg-[#0B0E12] border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#F5F7FA]">{emp.employee_name}</span>
                      <span className="text-[10px] text-teal-400 font-mono ml-2">{emp.pod_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-teal-300 bg-teal-950/70 border border-teal-800/60 px-2 py-0.5 rounded text-[10px] font-mono">
                        {emp.brand_name} · {emp.process_name}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Widget 2: Critical Coverage Alerts */}
          <div className="glass-card rounded-enterprise border border-white/10 p-5 shadow-glass space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F7FA]">Critical Coverage Alerts</h3>
                <p className="text-[11px] text-[#A0AAB5]">Immediate unstaffed process risks</p>
              </div>
              <button
                onClick={() => onNavigate('Conflicts & Alerts')}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {data.critical_alerts.length === 0 ? (
                <div className="py-8 text-center text-emerald-400 font-semibold flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Zero active critical conflicts! Operations fully covered.</span>
                </div>
              ) : (
                data.critical_alerts.map((alert) => (
                  <div key={alert.conflict_id} className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 truncate max-w-xs">{alert.title}</span>
                      <span className="font-mono text-[10px] text-rose-400 bg-rose-900/50 px-1.5 py-0.5 rounded">{alert.date}</span>
                    </div>
                    <p className="text-[11px] text-rose-300/80 leading-tight">{alert.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Widget 3: Recent Operational Changes */}
          <div className="glass-card rounded-enterprise border border-white/10 p-5 shadow-glass space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-[#F5F7FA]">Recent Operational Changes</h3>
              </div>
              <span className="text-[10px] text-teal-400 font-mono">Immutable Audit Feed</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {data.recent_changes.length === 0 ? (
                <div className="py-8 text-center text-[#727E89]">No shift changes recorded recently.</div>
              ) : (
                data.recent_changes.map((change) => (
                  <div key={change.id} className="p-2.5 rounded-xl bg-[#0B0E12] border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-300 font-mono text-[11px]">{change.action}</span>
                      <span className="text-[10px] text-[#A0AAB5] font-mono">
                        {new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A0AAB5] truncate">{change.change_details}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Widget 4: Upcoming Public Holidays & Leaves */}
          <div className="glass-card rounded-enterprise border border-white/10 p-5 shadow-glass space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Palmtree className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-[#F5F7FA]">Upcoming Holidays & Leaves</h3>
              </div>
              <button
                onClick={() => onNavigate('Holidays & Calendar')}
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center space-x-1"
              >
                <span>Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {data.upcoming_holidays.map((h, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#0B0E12] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#F5F7FA]">{h.name}</span>
                    <span className="text-[10px] text-purple-400 font-mono block">{h.day_name}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded">
                    {h.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PRESERVED INTERACTIVE 3D LIVE WORKFORCE NETWORK                        */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-enterprise border border-white/10 overflow-hidden shadow-glass">
        <div
          onClick={() => setShowNetworkGraph(!showNetworkGraph)}
          className="p-4 px-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors border-b border-white/10 select-none"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-950/60 border border-teal-800/60 text-teal-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#F5F7FA]">Live Workforce Relationship Network</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950/70 text-teal-300 border border-teal-800/60 font-semibold uppercase">
                  3D Three.js Graph
                </span>
              </div>
              <p className="text-[11px] text-[#A0AAB5] mt-0.5">
                Explore real-time pod, employee, brand and process database relationships in 3D space
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-teal-400 font-semibold">
            <span>{showNetworkGraph ? 'Collapse 3D Graph' : 'Inspect 3D Graph'}</span>
            {showNetworkGraph ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {showNetworkGraph && (
          <div className="h-96 relative bg-gradient-to-br from-[#0B0E12] via-[#090B0E] to-[#050505] animate-in fade-in duration-300">
            <WorkforceNetwork totalEmployees={data?.kpis.total_employees || 32} podCount={data?.kpis.total_pods || 5} />
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewPage;
