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
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  Palmtree,
  History,
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
      <div className="bg-white p-16 text-center rounded-enterprise border border-app-border text-slate-400">
        Loading operations command hub...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & 3D Interactive Hero */}
      <div className="bg-white rounded-enterprise border border-app-border overflow-hidden shadow-subtle">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Left Text & Role Info */}
          <div className="p-6 md:p-8 lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                Active Role: {user?.role.replace('_', ' ')}
              </span>
              <span className="text-xs text-app-secondaryText font-medium">· DataStraw Operations Control</span>
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-app-primaryText tracking-tight">
                Operations Command Hub
              </h1>
              <p className="text-xs md:text-sm text-app-secondaryText mt-1.5 leading-relaxed">
                Smart workforce management across 32 specialists, 10 D2C brands, 5 operational pods, and 4 core processes.
              </p>
            </div>

            {/* Quick Stats Pill Strip */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('Roster Planner')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white text-xs font-semibold shadow-md shadow-teal-500/20 transition-all"
              >
                <span>Open Roster Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigate('Conflicts & Alerts')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Review Active Conflicts</span>
              </button>
            </div>
          </div>

          {/* Right 3D Workforce Network Visualization */}
          <div className="lg:col-span-5 h-64 lg:h-72 bg-gradient-to-br from-slate-900 to-[#14243A] relative flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-3 left-4 z-10 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span className="text-[11px] font-mono text-teal-300 font-semibold uppercase tracking-wider">
                Live Workforce Network (Three.js)
              </span>
            </div>

            <WorkforceNetwork totalEmployees={data?.kpis.total_employees || 32} podCount={data?.kpis.total_pods || 5} />

            <div className="absolute bottom-3 right-4 z-10 text-[10px] text-slate-400 font-mono">
              32 Nodes · 5 Hubs · Rotating Graph
            </div>
          </div>
        </div>
      </div>

      {/* 8 Operational KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('Employees')}
            className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle hover:border-teal-400 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Total Employees</span>
              <Users className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-app-primaryText mt-1.5">{data.kpis.total_employees}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">32 specialists verified</div>
          </div>

          <div
            onClick={() => onNavigate('Brands')}
            className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle hover:border-teal-400 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Active Brands</span>
              <Building2 className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-app-primaryText mt-1.5">{data.kpis.active_brands}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">80% Single-Resource model</div>
          </div>

          <div
            onClick={() => onNavigate('Processes')}
            className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle hover:border-teal-400 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Active Processes</span>
              <Cpu className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-app-primaryText mt-1.5">{data.kpis.active_processes}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">CS, ACC, Retention, NDR</div>
          </div>

          <div
            onClick={() => onNavigate('Pods & Teams')}
            className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle hover:border-teal-400 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Operational Pods</span>
              <Layers className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-app-primaryText mt-1.5">{data.kpis.total_pods}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Pods Alpha to Epsilon</div>
          </div>

          <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Working Today</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1.5">{data.kpis.working_today}</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Active on client shifts</div>
          </div>

          <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">On Leave Today</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1.5">{data.kpis.on_leave_today}</div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">Planned / Casual time-off</div>
          </div>

          <div
            onClick={() => onNavigate('Roster Planner')}
            className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle hover:border-teal-400 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Roster Coverage</span>
              <TrendingUp className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-teal-600 mt-1.5">{data.kpis.coverage_percentage}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Monthly operating demand</div>
          </div>

          <div
            onClick={() => onNavigate('Conflicts & Alerts')}
            className="bg-white p-4 rounded-enterprise border border-rose-200 bg-rose-50/20 shadow-subtle hover:border-rose-400 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Unresolved Gaps</span>
              <AlertTriangle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1.5">{data.kpis.unresolved_conflicts}</div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">Zero silent failures active</div>
          </div>
        </div>
      )}

      {/* Pending Approvals Callout Banner */}
      {data && data.pending_approvals_count > 0 && (
        <div className="p-4 rounded-enterprise bg-amber-950/30 border border-amber-800/40 text-amber-200 flex items-center justify-between shadow-subtle">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-200">Action Required: Pending Approvals Queue</div>
              <div className="text-[11px] text-amber-400/80">
                You have {data.pending_approvals_count} leave and comp-off requests waiting for operational review.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('Approvals')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-xs transition-all flex items-center space-x-1"
          >
            <span>Review Approvals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid of Modular Widgets */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Widget 1: Today's Workforce Status */}
          <div className="bg-white rounded-enterprise border border-app-border p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Today's Operating Workforce</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {data.today_status.date} · {data.today_status.day_name}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {data.today_status.working_count} Active Shifts
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {data.today_status.working_sample.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No shifts scheduled today.</div>
              ) : (
                data.today_status.working_sample.map((emp) => (
                  <div key={emp.employee_id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{emp.employee_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">{emp.pod_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-[10px]">
                        {emp.brand_name} ({emp.process_name})
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Widget 2: Critical Coverage Alerts */}
          <div className="bg-white rounded-enterprise border border-app-border p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Critical Coverage Alerts</h3>
                <p className="text-[11px] text-slate-400">Immediate unstaffed process risks</p>
              </div>
              <button
                onClick={() => onNavigate('Conflicts & Alerts')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {data.critical_alerts.length === 0 ? (
                <div className="py-8 text-center text-emerald-600 font-semibold">Zero active critical conflicts!</div>
              ) : (
                data.critical_alerts.map((alert) => (
                  <div key={alert.conflict_id} className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-900 truncate max-w-xs">{alert.title}</span>
                      <span className="font-mono text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">{alert.date}</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-tight">{alert.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Widget 3: Recent Roster Changes Stream */}
          <div className="bg-white rounded-enterprise border border-app-border p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Operational Changes</h3>
              </div>
              <span className="text-[11px] text-slate-400">Immutable Audit Feed</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {data.recent_changes.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No shift changes recorded recently.</div>
              ) : (
                data.recent_changes.map((change) => (
                  <div key={change.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 font-mono text-[11px]">{change.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(change.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">{change.change_details}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Widget 4: Upcoming Public Holidays & Leaves */}
          <div className="bg-white rounded-enterprise border border-app-border p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div className="flex items-center space-x-2">
                <Palmtree className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Holidays & Leaves</h3>
              </div>
              <button
                onClick={() => onNavigate('Holidays & Calendar')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
              >
                <span>Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {data.upcoming_holidays.map((h, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-purple-900">{h.name}</span>
                    <span className="text-[10px] text-purple-600 font-mono block">{h.day_name}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
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
