import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AnalyticsDashboardResponse } from '../types/analytics';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Building2,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const POD_COLORS = ['#14B8A6', '#0284C7', '#8B5CF6', '#F59E0B', '#EC4899'];

export const AnalyticsReportsPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<number>(11); // Default to current month (Nov 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<AnalyticsDashboardResponse>('/analytics/dashboard', {
        params: { month: currentMonth, year: currentYear },
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDownloadRosterCSV = async () => {
    setIsExporting(true);
    try {
      const res = await api.get(`/analytics/export/roster/csv?month=${currentMonth}&year=${currentYear}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RosterIQ_Master_Roster_${data?.month_name || currentMonth}_${currentYear}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export roster CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSummaryCSV = async () => {
    setIsExporting(true);
    try {
      const res = await api.get(`/analytics/export/summary/csv?month=${currentMonth}&year=${currentYear}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RosterIQ_Operational_Summary_${data?.month_name || currentMonth}_${currentYear}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export summary CSV');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-page-fade">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Operational Analytics & Reports</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Workforce distribution, brand coverage targets, statutory labor audits, and executive CSV export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigator */}
          <div className="inline-flex items-center space-x-1 bg-[#111820] border border-[rgba(148,163,184,0.16)] rounded-xl px-2 py-1 shadow-glass backdrop-blur-[14px]">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-[#151D25] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 font-bold text-xs text-[#F8FAFC] min-w-[120px] text-center">
              {data?.month_name || `Month ${currentMonth}`} {currentYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-[#151D25] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* CSV Export Buttons */}
          <button
            onClick={handleDownloadRosterCSV}
            disabled={isExporting}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-primary text-xs font-semibold disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Export Roster CSV</span>
          </button>

          <button
            onClick={handleDownloadSummaryCSV}
            disabled={isExporting}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-secondary text-xs font-semibold disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>Executive Summary</span>
          </button>
        </div>
      </div>

      {isLoading && !data && (
        <div className="glass-card p-16 text-center rounded-2xl border border-[rgba(148,163,184,0.16)] text-[#94A3B8]">
          Loading analytics & operational reporting...
        </div>
      )}

      {/* KPI Cards Bar */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kpi-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Coverage Percentage</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-2xl font-black ${data.kpis.monthly_coverage_percentage >= 90 ? 'text-[#2DD4BF]' : 'text-amber-400'}`}>
                {data.kpis.monthly_coverage_percentage}%
              </span>
              <span className="text-[11px] text-[#94A3B8]">of operating demand</span>
            </div>
            <div className="w-full bg-[#080D12] rounded-full h-1.5 mt-2 overflow-hidden border border-[rgba(148,163,184,0.10)]">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-[#14B8A6] to-[#2DD4BF]"
                style={{ width: `${Math.min(100, data.kpis.monthly_coverage_percentage)}%` }}
              />
            </div>
          </div>

          <div className="kpi-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Total Workforce</div>
            <div className="text-2xl font-black text-[#F8FAFC] mt-1">{data.kpis.total_employees}</div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">Across {data.kpis.total_pods} operational pods</div>
          </div>

          <div className="kpi-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Brand Architecture</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-[#2DD4BF]">{data.kpis.single_resource_brands}</span>
              <span className="text-xs text-[#94A3B8]">Single /</span>
              <span className="text-2xl font-black text-blue-400">{data.kpis.multi_resource_brands}</span>
              <span className="text-xs text-[#94A3B8]">Multi</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">~80% dedicated specialist model</div>
          </div>

          <div className="kpi-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Active Conflicts</div>
            <div className="text-2xl font-black text-rose-400 mt-1">{data.kpis.total_unresolved_conflicts}</div>
            <div className="text-[11px] text-rose-400 font-medium mt-0.5">Unsatisfied demand gaps</div>
          </div>
        </div>
      )}

      {/* Main Charts Grid */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Pod Workforce Headcount */}
          <div className="glass-card p-5 rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#2DD4BF]" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">Workforce Headcount by Pod</h3>
              </div>
              <span className="text-[11px] text-[#94A3B8]">Total: {data.kpis.total_employees} Employees</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pod_metrics} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="pod_code" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1016', borderColor: 'rgba(148,163,184,0.22)', borderRadius: 12, color: '#F8FAFC', fontSize: 12 }}
                    formatter={(val: any) => [`${val} Employees`, 'Headcount']}
                  />
                  <Bar dataKey="employee_count" radius={[6, 6, 0, 0]}>
                    {data.pod_metrics.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={POD_COLORS[index % POD_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Brand Coverage Performance */}
          <div className="glass-card p-5 rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">Brand Coverage Performance (%)</h3>
              </div>
              <span className="text-[11px] text-[#94A3B8]">Target: 100% Demand</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.brand_metrics} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="brand_code" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1016', borderColor: 'rgba(148,163,184,0.22)', borderRadius: 12, color: '#F8FAFC', fontSize: 12 }}
                    formatter={(val: any) => [`${val}% Coverage`, 'Operational Met']}
                  />
                  <Bar dataKey="coverage_percentage" fill="#14B8A6" radius={[6, 6, 0, 0]}>
                    {data.brand_metrics.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.coverage_percentage >= 90 ? '#10B981' : entry.coverage_percentage >= 70 ? '#F59E0B' : '#EF4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Process Workforce & Shifts */}
          <div className="glass-card p-5 rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">Process Workforce Allocations</h3>
              </div>
              <span className="text-[11px] text-[#94A3B8]">CS, ACC, Retention, NDR</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.process_metrics} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="process_code" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1016', borderColor: 'rgba(148,163,184,0.22)', borderRadius: 12, color: '#F8FAFC', fontSize: 12 }}
                  />
                  <Bar dataKey="total_assignments" fill="#0284C7" radius={[6, 6, 0, 0]} name="Assigned Agents" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Weekly-Off Distribution */}
          <div className="glass-card p-5 rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-[#F8FAFC]">Weekly-Off Day Distribution</h3>
              </div>
              <span className="text-[11px] text-[#94A3B8]">Employee Preferred Rest Days</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weekly_off_metrics} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="day_name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1016', borderColor: 'rgba(148,163,184,0.22)', borderRadius: 12, color: '#F8FAFC', fontSize: 12 }}
                    formatter={(val: any) => [`${val} Employees`, 'Rest Day']}
                  />
                  <Bar dataKey="employee_count" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Brand Operational Summary Table */}
      {data && (
        <div className="glass-card rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card overflow-hidden">
          <div className="p-4 border-b border-[rgba(148,163,184,0.16)] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F8FAFC]">Brand Operational Coverage Ledger</h3>
            <span className="text-xs text-[#94A3B8]">Detailed staffing breakdown</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0F16]/95 border-b border-[rgba(148,163,184,0.16)] text-[#CBD5E1] font-semibold uppercase tracking-wider backdrop-blur-md">
              <tr>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Architecture</th>
                <th className="py-3 px-4">Primary Headcount</th>
                <th className="py-3 px-4">Staffed Shifts</th>
                <th className="py-3 px-4">Demanded Shifts</th>
                <th className="py-3 px-4 text-right">Coverage Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(148,163,184,0.10)]">
              {data.brand_metrics.map((bm) => (
                <tr key={bm.brand_id} className="hover:bg-[rgba(20,184,166,0.06)] transition-colors duration-150">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#F8FAFC]">{bm.brand_name}</div>
                    <div className="text-[10px] text-[#2DD4BF] font-mono">{bm.brand_code}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        bm.is_single_resource
                          ? 'bg-teal-950/80 text-[#2DD4BF] border border-teal-500/40'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {bm.is_single_resource ? 'Single-Resource (Dedicated)' : 'Multi-Resource (Shared)'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#CBD5E1]">{bm.primary_specialists_count} Agent(s)</td>
                  <td className="py-3 px-4 font-mono text-[#F8FAFC]">{bm.staffed_shifts}</td>
                  <td className="py-3 px-4 font-mono text-[#94A3B8]">{bm.demanded_shifts}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-bold font-mono text-xs ${
                        bm.coverage_percentage >= 90
                          ? 'text-[#2DD4BF]'
                          : bm.coverage_percentage >= 70
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {bm.coverage_percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
