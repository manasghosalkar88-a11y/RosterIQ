import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { OverviewDashboardResponse } from '../types/overview';
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
  FlaskConical,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface OverviewPageProps {
  onNavigate: (moduleName: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading && !data) {
    return (
      <div className="glass-card p-16 text-center rounded-enterprise shadow-glass text-[#A0AAB5] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-mono tracking-wider uppercase">Loading Operations Control Center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Operational Hero Card & 3D Live Workforce Network */}
      <div className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] rounded-enterprise border border-white/10 overflow-hidden shadow-glass">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Left: Operational Hero Information & Action Buttons */}
          <div className="p-6 md:p-8 lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-950/70 text-teal-300 border border-teal-800/60 font-mono uppercase tracking-wider">
                Active Role: {user?.role.replace('_', ' ')}
              </span>
              <span className="text-xs text-[#A0AAB5] font-medium font-mono">· DataStraw Operations Control</span>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F5F7FA] tracking-tight">
                Operations Control Center
              </h1>
              <p className="text-xs md:text-sm text-[#A0AAB5] mt-1.5 leading-relaxed max-w-xl">
                Real-time workforce deployment, multi-brand coverage matrices, and intelligent shortfall resolution across 5 operational pods and 10 D2C brands.
              </p>
            </div>

            {/* Action Buttons: Generate Monthly Roster, Simulate Impact, Export Roster */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={() => onNavigate('Roster Planner')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#397C70] hover:bg-[#2D6359] text-white text-xs font-bold uppercase tracking-wider shadow-neumorph-btn active:translate-y-0.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                <span>Generate Monthly Roster</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigate('Roster Planner')}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[rgba(30,36,43,0.78)] hover:bg-[rgba(38,46,55,0.9)] border border-white/10 text-white text-xs font-semibold shadow-sm transition-all"
                title="Launch RosterIQ Impact Simulator"
              >
                <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                <span>Simulate Impact</span>
              </button>

              <button
                onClick={() => onNavigate('Roster Planner')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-[#0B0E12] hover:bg-[#15191E] border border-white/10 text-[#A0AAB5] hover:text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Matrix</span>
              </button>
            </div>
          </div>

          {/* Right: Embedded Live Workforce Network (Three.js 3D Graph) */}
          <div className="lg:col-span-5 h-64 lg:h-72 bg-gradient-to-br from-[#0B0E12] via-[#090B0E] to-[#050505] relative flex flex-col items-center justify-center overflow-hidden border-t lg:border-t-0 lg:border-l border-white/10">
            <div className="absolute top-3 left-4 z-10 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span className="text-[11px] font-mono text-teal-300 font-semibold uppercase tracking-wider">
                Live Workforce Network (3D)
              </span>
            </div>

            <WorkforceNetwork totalEmployees={data?.kpis.total_employees || 32} podCount={data?.kpis.total_pods || 5} />

            <div className="absolute bottom-3 right-4 z-10 text-[10px] text-gray-500 font-mono">
              32 Nodes · 5 Hubs · Rotating Graph
            </div>
          </div>
        </div>
      </div>

      {/* 2. Eight Operational KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Total Active Workforce */}
          <div
            onClick={() => onNavigate('Employees')}
            className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Total Workforce</span>
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

          {/* Card 2: Operating Brands */}
          <div
            onClick={() => onNavigate('Brands')}
            className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Operating Brands</span>
              <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-800/50">
                <Building2 className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#F5F7FA] mt-2 tracking-tight">{data.kpis.active_brands}</div>
            <div className="text-[11px] text-[#A0AAB5] mt-0.5">80% Single-Resource model</div>
          </div>

          {/* Card 3: Core Processes */}
          <div
            onClick={() => onNavigate('Processes')}
            className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Core Processes</span>
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
            className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
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

          {/* Card 5: Schedule Health / Working Today */}
          <div className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Working Today</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">{data.kpis.working_today}</div>
            <div className="text-[11px] text-emerald-400/80 font-medium mt-0.5">Active on client shifts</div>
          </div>

          {/* Card 6: On Leave Today */}
          <div className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">On Leave Today</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2 tracking-tight">{data.kpis.on_leave_today}</div>
            <div className="text-[11px] text-amber-400/80 font-medium mt-0.5">Planned / Casual time-off</div>
          </div>

          {/* Card 7: Roster Coverage / Fill Rate */}
          <div
            onClick={() => onNavigate('Roster Planner')}
            className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Coverage Fill Rate</span>
              <div className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-800/50">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-teal-300 mt-2 tracking-tight">{data.kpis.coverage_percentage}%</div>
            <div className="text-[11px] text-[#A0AAB5] mt-0.5">Target &gt; 95% SLA achieved</div>
          </div>

          {/* Card 8: Unresolved Coverage Conflicts */}
          <div
            onClick={() => onNavigate('Conflicts & Alerts')}
            className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] p-4 rounded-enterprise border border-white/10 shadow-neumorph-raised hover:-translate-y-1 hover:border-teal-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0AAB5]">Coverage Conflicts</span>
              <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2 tracking-tight">{data.kpis.unresolved_conflicts}</div>
            <div className="text-[11px] text-emerald-400/80 font-medium mt-0.5">Zero silent shortfalls</div>
          </div>
        </div>
      )}

      {/* 3. Pending Approvals Callout Banner */}
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

      {/* 4. Modular Operational Widgets */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Widget 1: Today's Operating Workforce */}
          <div className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] rounded-enterprise border border-white/10 p-5 shadow-glass space-y-3">
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
          <div className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] rounded-enterprise border border-white/10 p-5 shadow-glass space-y-3">
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
          <div className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] rounded-enterprise border border-white/10 p-5 shadow-glass space-y-3">
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
          <div className="bg-[rgba(23,28,34,0.88)] backdrop-blur-[14px] rounded-enterprise border border-white/10 p-5 shadow-glass space-y-3">
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
    </div>
  );
};

export default OverviewPage;
