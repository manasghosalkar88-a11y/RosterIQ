import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type {
  RosterGridResponse,
  RosterGridRow,
  RosterGridCell,
  BackupRecommendation,
  AuditLogItem,
} from '../types/roster';
import type { Pod, Brand, Process } from '../types/management';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  Send,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  History,
  UserCheck,
  FlaskConical,
} from 'lucide-react';
import { RosterImpactSimulator } from '../components/planner/RosterImpactSimulator';

export const RosterPlannerPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<number>(11); // Default to current month (Nov 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [gridData, setGridData] = useState<RosterGridResponse | null>(null);
  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  // Filters & Stakeholder Views (Company-wide, Pod-wise, Brand-wise, Process-wise, Employee-wise)
  const [activeViewMode, setActiveViewMode] = useState<'COMPANY' | 'POD' | 'BRAND' | 'PROCESS' | 'EMPLOYEE'>(() => {
    try {
      if (localStorage.getItem('rosteriq_selected_pod_filter')) return 'POD';
    } catch {}
    return 'COMPANY';
  });
  const [selectedPodId, setSelectedPodId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('rosteriq_selected_pod_filter');
      if (saved) {
        localStorage.removeItem('rosteriq_selected_pod_filter');
        return saved;
      }
    } catch {}
    return 'ALL';
  });
  const [selectedBrandId, setSelectedBrandId] = useState<string>('ALL');
  const [selectedProcessId, setSelectedProcessId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // General States
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: RosterGridRow; cell: RosterGridCell } | null>(null);

  // Change Management & Backup States
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<{ row: RosterGridRow; cell: RosterGridCell } | null>(null);
  const [recommendations, setRecommendations] = useState<BackupRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [selectedBackupEmpId, setSelectedBackupEmpId] = useState<number | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Audit Trail States
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Impact Simulator States
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorContext, setSimulatorContext] = useState<{
    employeeId?: number;
    employeeName?: string;
    date?: string;
    brandId?: number;
    brandName?: string;
    processId?: number;
  } | null>(null);

  const fetchRoster = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedPodId !== 'ALL') params.pod_id = Number(selectedPodId);
      if (selectedBrandId !== 'ALL') params.brand_id = Number(selectedBrandId);
      if (selectedProcessId !== 'ALL') params.process_id = Number(selectedProcessId);

      const res = await api.get<RosterGridResponse>(`/roster/${currentMonth}/${currentYear}/grid`, { params });
      setGridData(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setGridData(null);
      } else {
        console.error('Failed to load roster', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [podRes, brandRes, procRes] = await Promise.all([
        api.get<Pod[]>('/pods'),
        api.get<Brand[]>('/brands'),
        api.get<Process[]>('/processes'),
      ]);
      setPods(podRes.data);
      setBrands(brandRes.data);
      setProcesses(procRes.data);
    } catch (err) {
      console.error('Failed to load pods/brands/processes', err);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [currentMonth, currentYear, selectedPodId, selectedBrandId, selectedProcessId]);

  const handleGenerateRoster = async () => {
    setIsGenerating(true);
    try {
      await api.post('/roster/generate', {
        month: currentMonth,
        year: currentYear,
        name: `Roster for ${gridData?.month_name || 'Month'} ${currentYear}`,
      });
      setNotification(`Deterministic engine completed! Monthly schedule generated.`);
      setTimeout(() => setNotification(null), 4000);
      fetchRoster();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate roster.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishRoster = async () => {
    if (!gridData) return;
    setIsPublishing(true);
    try {
      await api.post(`/roster/${gridData.roster_id}/publish`);
      setNotification(`Roster published successfully! It is now locked and visible to employees.`);
      setTimeout(() => setNotification(null), 4000);
      fetchRoster();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to publish roster.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenReassignModal = async (row: RosterGridRow, cell: RosterGridCell) => {
    setReassignTarget({ row, cell });
    setSelectedCell(null); // Close inspect modal
    setIsReassignModalOpen(true);
    setIsLoadingRecs(true);
    setOverrideReason('Operational change: specialist unavailable');

    const brandId = cell.brand_id || (brands.length > 0 ? brands[0].id : 1);

    try {
      const res = await api.get<BackupRecommendation[]>('/changes/recommendations', {
        params: {
          date: cell.date,
          brand_id: brandId,
          absent_employee_id: row.employee_id,
          roster_id: gridData?.roster_id,
        },
      });
      setRecommendations(res.data);
      if (res.data.length > 0) {
        setSelectedBackupEmpId(res.data[0].employee_id);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations', err);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTarget || !selectedBackupEmpId || !gridData) return;

    setIsSubmittingOverride(true);
    try {
      const brandId = reassignTarget.cell.brand_id || (brands.length > 0 ? brands[0].id : 1);
      const res = await api.post('/changes/override', {
        roster_id: gridData.roster_id,
        date: reassignTarget.cell.date,
        source_employee_id: reassignTarget.row.employee_id,
        target_employee_id: selectedBackupEmpId,
        brand_id: brandId,
        process_id: reassignTarget.cell.process_id,
        reason: overrideReason || 'Specialist reassignment',
      });

      setNotification(res.data.message);
      setTimeout(() => setNotification(null), 4500);
      setIsReassignModalOpen(false);
      setReassignTarget(null);
      fetchRoster(); // In-place refresh
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to apply shift override.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleOpenAuditModal = async () => {
    setIsAuditModalOpen(true);
    setIsLoadingAudit(true);
    try {
      const res = await api.get<AuditLogItem[]>('/changes/audit-logs');
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

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

  const filteredRows = gridData
    ? gridData.rows.filter((row) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          row.employee_name.toLowerCase().includes(q) ||
          row.employee_code.toLowerCase().includes(q) ||
          row.pod_name.toLowerCase().includes(q)
        );
      })
    : [];

  const getCellBadge = (cell: RosterGridCell) => {
    switch (cell.status) {
      case 'WORKING':
        return cell.is_manual_override
          ? 'bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 font-bold'
          : 'bg-teal-950/80 border border-teal-500/50 text-[#2DD4BF] font-semibold';
      case 'WEEKLY_OFF':
        return 'bg-[#080D12] border border-white/5 text-[#64748B] font-medium';
      case 'LEAVE':
        return 'bg-amber-950/80 border border-amber-400/50 text-amber-300 font-bold';
      case 'COMP_OFF':
        return 'bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 font-bold';
      case 'HOLIDAY':
        return 'bg-purple-950/80 border border-purple-400/50 text-purple-300 font-bold';
      default:
        return 'bg-[#080D12] text-[#64748B]';
    }
  };

  return (
    <div className="space-y-6 animate-page-fade">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Monthly Roster Planner</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Deterministic scheduling matrix. Connects 30+ employees across 10 D2C brands, pods, and process rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigator */}
          <div className="inline-flex items-center space-x-1 bg-[#111820] border border-[rgba(148,163,184,0.16)] rounded-xl px-2 py-1 shadow-glass backdrop-blur-[14px]">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 font-bold text-xs text-[#F8FAFC] min-w-[120px] text-center font-mono">
              {gridData?.month_name || `Month ${currentMonth}`} {currentYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* RosterIQ Impact Simulator Button */}
          <button
            onClick={() => {
              setSimulatorContext(null);
              setIsSimulatorOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-teal-950/70 border border-teal-800/60 hover:bg-teal-900/70 text-[#2DD4BF] font-bold text-xs shadow-sm transition-all duration-150 hover:-translate-y-0.5 group cursor-pointer"
          >
            <FlaskConical className="w-4 h-4 text-[#14B8A6] group-hover:rotate-12 transition-transform" />
            <span>Impact Simulator</span>
          </button>

          {/* Audit Trail Button */}
          <button
            onClick={handleOpenAuditModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-[#151D25] border border-[rgba(148,163,184,0.18)] hover:bg-[#1E2732] text-[#F8FAFC] font-semibold text-xs shadow-sm transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
          >
            <History className="w-4 h-4 text-[#14B8A6]" />
            <span>Audit Trail</span>
          </button>

          {/* Action Buttons */}
          <button
            onClick={handleGenerateRoster}
            disabled={isGenerating}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-xs shadow-md shadow-teal-500/25 transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Engine...' : 'Generate Roster'}</span>
          </button>

          {gridData && gridData.status !== 'PUBLISHED' && (
            <button
              onClick={handlePublishRoster}
              disabled={isPublishing}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#172B4D] hover:bg-[#29466B] border border-[rgba(148,163,184,0.18)] text-white font-semibold text-xs shadow-xs transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>{isPublishing ? 'Publishing...' : 'Publish Roster'}</span>
            </button>
          )}

          {gridData && gridData.status === 'PUBLISHED' && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Roster Published</span>
            </span>
          )}
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-sm flex items-center space-x-2.5 shadow-glass animate-toast">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Stats Bar (Section 7) */}
      {gridData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kpi-card p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1]">Operational Coverage</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-2xl font-black ${gridData.coverage_percentage >= 90 ? 'text-[#2DD4BF]' : 'text-amber-400'}`}>
                {gridData.coverage_percentage}%
              </span>
              <span className="text-[11px] text-[#94A3B8]">of demand slots met</span>
            </div>
            <div className="w-full bg-[#080D12] rounded-full h-1.5 mt-2 border border-white/5">
              <div
                className={`h-1.5 rounded-full ${gridData.coverage_percentage >= 90 ? 'bg-[#14B8A6]' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, gridData.coverage_percentage)}%` }}
              />
            </div>
          </div>

          <div className="kpi-card p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1]">Fairness Index</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-[#2DD4BF]">{gridData.fairness_score}</span>
              <span className="text-[11px] text-[#94A3B8]">/ 100</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">Weekend shift distribution balance</div>
          </div>

          <div className="kpi-card p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1]">Unresolved Conflicts</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-2xl font-black ${gridData.total_conflicts > 0 ? 'text-[#F43F5E]' : 'text-[#22C55E]'}`}>
                {gridData.total_conflicts}
              </span>
              <span className="text-[11px] text-[#94A3B8]">flagged gaps</span>
            </div>
            <div className="text-[11px] text-[#F43F5E] font-medium mt-1">
              {gridData.total_conflicts > 0 ? 'Zero silent failures active' : 'All constraints fulfilled'}
            </div>
          </div>

          <div className="kpi-card p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1]">Workforce Scheduled</div>
            <div className="text-2xl font-black text-[#F8FAFC] mt-1">{gridData.rows.length}</div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">Across {pods.length} operational pods</div>
          </div>
        </div>
      )}

      {/* Stakeholder View Selector (Company, Pod, Brand, Process, Employee) */}
      <div className="glass-card p-3 rounded-enterprise border border-[rgba(148,163,184,0.16)] shadow-glass flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mr-1">Roster Views:</span>
          {[
            { id: 'COMPANY', label: 'Company-Wide', desc: 'All 32 specialists' },
            { id: 'POD', label: 'Pod-Wise', desc: 'By operational pod' },
            { id: 'BRAND', label: 'Brand-Wise', desc: 'By D2C brand' },
            { id: 'PROCESS', label: 'Process-Wise', desc: 'By CS, ACC, RET, NDR' },
            { id: 'EMPLOYEE', label: 'Employee-Wise', desc: 'Individual schedule' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setActiveViewMode(v.id as any);
                if (v.id === 'COMPANY') {
                  setSelectedPodId('ALL');
                  setSelectedBrandId('ALL');
                  setSelectedProcessId('ALL');
                  setSearchQuery('');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-[200ms] ${
                activeViewMode === v.id
                  ? 'bg-[#14B8A6] text-white shadow-md shadow-teal-500/25'
                  : 'bg-[#111820] hover:bg-[#151D25] text-[#94A3B8] hover:text-[#F8FAFC] border border-[rgba(148,163,184,0.12)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-[#94A3B8] font-medium">
          {gridData ? `Showing ${filteredRows.length} scheduled specialists` : 'No active roster loaded'}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 glass-card p-4 rounded-enterprise border border-[rgba(148,163,184,0.16)] shadow-glass">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search employee name or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) setActiveViewMode('EMPLOYEE');
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pod Filter */}
          <select
            value={selectedPodId}
            onChange={(e) => {
              setSelectedPodId(e.target.value);
              if (e.target.value !== 'ALL') setActiveViewMode('POD');
            }}
            className="px-3 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] font-medium focus:border-[#14B8A6]"
          >
            <option value="ALL">All Operational Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrandId}
            onChange={(e) => {
              setSelectedBrandId(e.target.value);
              if (e.target.value !== 'ALL') setActiveViewMode('BRAND');
            }}
            className="px-3 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] font-medium focus:border-[#14B8A6]"
          >
            <option value="ALL">All D2C Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Process Filter */}
          <select
            value={selectedProcessId}
            onChange={(e) => {
              setSelectedProcessId(e.target.value);
              if (e.target.value !== 'ALL') setActiveViewMode('PROCESS');
            }}
            className="px-3 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] font-medium focus:border-[#14B8A6]"
          >
            <option value="ALL">All Core Processes</option>
            {processes.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.code} - {pr.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master Grid Table */}
      {!gridData && !isLoading ? (
        <div className="glass-card p-16 text-center rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card">
          <CalendarIcon className="w-12 h-12 text-[#94A3B8]/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#F8FAFC]">No Roster Generated for this Period</h3>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-md mx-auto">
            Click 'Generate Roster' above to execute the deterministic scheduling engine for {currentMonth}/{currentYear}.
          </p>
          <button
            onClick={handleGenerateRoster}
            disabled={isGenerating}
            className="btn-primary mt-4 px-5 py-2.5 rounded-xl text-xs font-semibold"
          >
            Execute Scheduling Engine
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card overflow-hidden">
          <div className="overflow-x-auto max-h-[650px] relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0A0F16]/95 border-b border-[rgba(148,163,184,0.16)] sticky top-0 z-20 backdrop-blur-md">
                <tr>
                  {/* Sticky Employee Column Header */}
                  <th className="py-3 px-4 font-bold text-[#CBD5E1] uppercase tracking-wider sticky left-0 bg-[#0A0F16] z-30 min-w-[200px] border-r border-[rgba(148,163,184,0.16)]">
                    Employee / Pod
                  </th>

                  <th className="py-3 px-2 font-semibold text-[#94A3B8] uppercase tracking-wider text-center min-w-[60px] border-r border-[rgba(148,163,184,0.16)]">
                    Summary
                  </th>

                  {/* Day Headers */}
                  {gridData?.days.map((d) => (
                    <th
                      key={d.date}
                      className={`py-2 px-1 text-center min-w-[44px] border-r border-[rgba(148,163,184,0.16)] transition-colors ${
                        d.is_sunday
                          ? 'bg-rose-950/30 text-rose-300'
                          : d.is_holiday
                          ? 'bg-purple-950/30 text-purple-300'
                          : 'text-[#CBD5E1]'
                      }`}
                      title={d.holiday_name || undefined}
                    >
                      <div className="text-[10px] uppercase font-semibold text-[#64748B]">{d.day_name}</div>
                      <div className="text-xs font-bold text-[#F8FAFC]">{d.day_number}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[rgba(148,163,184,0.10)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={(gridData?.days.length || 30) + 2} className="py-12 text-center text-[#94A3B8]">
                      Loading schedule matrix...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={(gridData?.days.length || 30) + 2} className="py-12 text-center text-[#94A3B8]">
                      No employees match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-[rgba(20,184,166,0.06)] transition-colors duration-150">
                      {/* Sticky Employee Cell */}
                      <td className="py-2.5 px-4 sticky left-0 bg-[#0B1016] z-10 border-r border-[rgba(148,163,184,0.16)] group-hover:bg-[#111820]">
                        <div className="font-bold text-[#F8FAFC] truncate max-w-[180px]">{row.employee_name}</div>
                        <div className="text-[10px] text-[#94A3B8] font-mono flex items-center space-x-1.5 mt-0.5">
                          <span>{row.employee_code}</span>
                          <span>•</span>
                          <span className="truncate max-w-[110px] text-[#2DD4BF]">{row.pod_name}</span>
                        </div>
                      </td>

                      {/* Summary Cell */}
                      <td className="py-2.5 px-2 text-center border-r border-[rgba(148,163,184,0.16)] font-mono text-[10px] bg-[#0A0F16]/50">
                        <span className="font-bold text-[#2DD4BF]" title="Working Shifts">{row.total_working_days}W</span>
                        <span className="text-[#64748B] mx-1">/</span>
                        <span className="text-[#94A3B8]" title="Weekly Offs">{row.total_off_days}O</span>
                      </td>

                      {/* Day Cells */}
                      {gridData?.days.map((d) => {
                        const cell = row.schedule[d.date];
                        if (!cell) {
                          return <td key={d.date} className="border-r border-[rgba(148,163,184,0.16)] bg-[#080D12]/40" />;
                        }

                        return (
                          <td
                            key={d.date}
                            onClick={() => setSelectedCell({ row, cell })}
                            className={`p-1 text-center border-r border-[rgba(148,163,184,0.16)] cursor-pointer transition-all hover:ring-2 hover:ring-[#14B8A6] hover:z-10 relative ${
                              d.is_sunday ? 'bg-rose-950/15' : d.is_holiday ? 'bg-purple-950/15' : ''
                            }`}
                          >
                            <div
                              className={`h-9 rounded-lg flex flex-col items-center justify-center p-0.5 text-[9px] leading-tight transition-transform ${getCellBadge(
                                cell
                              )}`}
                            >
                              {cell.has_conflict && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                              )}
                              {cell.has_conflict && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                              )}

                              {cell.status === 'WORKING' ? (
                                <>
                                  <span className="font-bold truncate max-w-[38px] text-[8px] text-[#F8FAFC]">
                                    {cell.brand_name ? cell.brand_name.slice(0, 5) : 'SHIFT'}
                                  </span>
                                  <span className="text-[7px] text-[#2DD4BF] truncate max-w-[38px]">
                                    {cell.process_name ? cell.process_name.slice(0, 4) : 'CS'}
                                  </span>
                                </>
                              ) : cell.status === 'WEEKLY_OFF' ? (
                                <span className="text-[#64748B] font-mono text-[8px]">OFF</span>
                              ) : cell.status === 'LEAVE' ? (
                                <span className="text-amber-300 font-bold text-[8px]">LEAVE</span>
                              ) : cell.status === 'COMP_OFF' ? (
                                <span className="text-cyan-300 font-bold text-[8px]">COMP</span>
                              ) : (
                                <span className="text-purple-300 font-bold text-[8px]">HOLIDAY</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cell Detail / Quick Inspect Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-sm w-full p-5 shadow-elevated animate-modal space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.16)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC]">{selectedCell.row.employee_name}</h3>
                <p className="text-[11px] text-[#94A3B8] font-mono">{selectedCell.row.employee_code} • {selectedCell.row.pod_name}</p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[rgba(148,163,184,0.10)]">
                <span className="text-[#94A3B8]">Date</span>
                <span className="font-mono font-bold text-[#F8FAFC]">{selectedCell.cell.date} ({selectedCell.cell.day_name})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[rgba(148,163,184,0.10)]">
                <span className="text-[#94A3B8]">Shift Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getCellBadge(selectedCell.cell)}`}>
                  {selectedCell.cell.status}
                </span>
              </div>
              {selectedCell.cell.status === 'WORKING' && (
                <>
                  <div className="flex justify-between py-1 border-b border-[rgba(148,163,184,0.10)]">
                    <span className="text-[#94A3B8]">Brand Assigned</span>
                    <span className="font-semibold text-[#2DD4BF]">{selectedCell.cell.brand_name || 'Operational Floater'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(148,163,184,0.10)]">
                    <span className="text-[#94A3B8]">Operational Process</span>
                    <span className="font-semibold text-[#F8FAFC]">{selectedCell.cell.process_name || 'Customer Support'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[rgba(148,163,184,0.10)]">
                    <span className="text-[#94A3B8]">Shift Hours</span>
                    <span className="font-mono text-[#CBD5E1]">{selectedCell.cell.shift_start} - {selectedCell.cell.shift_end}</span>
                  </div>
                </>
              )}

              {selectedCell.cell.has_conflict && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2 mt-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Active Conflict Flagged</div>
                    <div>{selectedCell.cell.conflict_title || 'Coverage shortfall or labor policy violation detected on this date.'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  setSimulatorContext({
                    employeeId: selectedCell.row.employee_id,
                    employeeName: selectedCell.row.employee_name,
                    date: selectedCell.cell.date,
                    brandId: selectedCell.cell.brand_id || undefined,
                    brandName: selectedCell.cell.brand_name || undefined,
                    processId: selectedCell.cell.process_id || undefined,
                  });
                  setSelectedCell(null);
                  setIsSimulatorOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[rgba(20,184,166,0.12)] hover:bg-[rgba(20,184,166,0.22)] border border-[#14B8A6]/40 text-[#2DD4BF] text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
              >
                <FlaskConical className="w-4 h-4 text-[#2DD4BF]" />
                <span>Simulate Operational Impact</span>
              </button>

              <button
                onClick={() => handleOpenReassignModal(selectedCell.row, selectedCell.cell)}
                className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Reassign Specialist / Find Backup</span>
              </button>

              <button
                onClick={() => setSelectedCell(null)}
                className="btn-secondary w-full py-2 text-xs font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Management / Intelligent Backup Recommendation Modal */}
      {isReassignModalOpen && reassignTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-xl w-full p-6 shadow-elevated animate-modal space-y-5">
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.16)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC] flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-[#2DD4BF]" />
                  <span>Intelligent Shift Reassignment & Backup</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Replace {reassignTarget.row.employee_name} on {reassignTarget.cell.date} without rebuilding the roster.
                </p>
              </div>
              <button onClick={() => setIsReassignModalOpen(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shift Context Card */}
            <div className="p-3.5 rounded-xl bg-[rgba(20,184,166,0.08)] border border-[#14B8A6]/25 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Target Shift:</span>
                <span className="font-bold text-[#2DD4BF]">
                  {reassignTarget.cell.brand_name || 'Brand Shift'} ({reassignTarget.cell.process_name || 'Process'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Unavailable Specialist:</span>
                <span className="font-semibold text-[#F8FAFC]">
                  {reassignTarget.row.employee_name} ({reassignTarget.row.pod_name})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Shift Date:</span>
                <span className="font-mono font-bold text-[#F8FAFC]">{reassignTarget.cell.date}</span>
              </div>
            </div>

            {/* Scored Recommendations List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center justify-between">
                <span>Ranked Backup Candidates</span>
                <span className="text-[11px] font-normal text-[#94A3B8]">Sorted by multi-factor suitability</span>
              </div>

              {isLoadingRecs ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">
                  Evaluating pod floaters, skills & labor law compliance...
                </div>
              ) : recommendations.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#94A3B8] border border-dashed border-[rgba(148,163,184,0.20)] rounded-xl">
                  No eligible candidates found.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {recommendations.map((rec) => {
                    const isSelected = selectedBackupEmpId === rec.employee_id;
                    return (
                      <div
                        key={rec.employee_id}
                        onClick={() => setSelectedBackupEmpId(rec.employee_id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#14B8A6] bg-[rgba(20,184,166,0.12)] ring-1 ring-[#14B8A6]'
                            : 'border-[rgba(148,163,184,0.16)] hover:border-[#14B8A6]/40 bg-[#111820]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="radio"
                              name="backup_employee"
                              checked={isSelected}
                              onChange={() => setSelectedBackupEmpId(rec.employee_id)}
                              className="text-[#14B8A6] focus:ring-[#14B8A6] bg-[#080D12] border-[rgba(148,163,184,0.3)]"
                            />
                            <div>
                              <span className="font-bold text-[#F8FAFC] text-xs">{rec.full_name}</span>
                              <span className="text-[10px] text-[#94A3B8] font-mono ml-1.5">
                                {rec.employee_code} • {rec.pod_name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.suitability_score >= 80
                                  ? 'bg-emerald-950/80 border border-emerald-400/50 text-emerald-300'
                                  : rec.suitability_score >= 60
                                  ? 'bg-teal-950/80 border border-teal-400/50 text-[#2DD4BF]'
                                  : 'bg-amber-950/80 border border-amber-400/50 text-amber-300'
                              }`}
                            >
                              {rec.suitability_score}% Match
                            </span>
                          </div>
                        </div>

                        {/* Match Reasons Pill Tags */}
                        <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                          {rec.match_reasons.map((reason, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-md ${
                                reason.includes('Alert')
                                  ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                                  : 'bg-[#151D25] text-[#CBD5E1] border border-[rgba(148,163,184,0.12)]'
                              }`}
                            >
                              {reason}
                            </span>
                          ))}
                          {rec.requires_comp_off && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 font-semibold border border-cyan-400/40">
                              +1 Comp-Off Credit
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Override Form */}
            <form onSubmit={handleSubmitOverride} className="space-y-3 pt-2 border-t border-[rgba(148,163,184,0.16)] text-xs">
              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">
                  Operational Justification *
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Medical leave emergency cover, swapped with pod lead approval..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="btn-secondary px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride || !selectedBackupEmpId}
                  className="btn-primary px-5 py-2 text-xs font-semibold flex items-center space-x-2 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isSubmittingOverride ? 'Applying Override...' : 'Confirm In-Place Swap'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Audit Trail Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-2xl w-full p-6 shadow-elevated animate-modal space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.16)] pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-[#2DD4BF]" />
                <h3 className="text-base font-bold text-[#F8FAFC]">Roster Change Audit Trail</h3>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Immutable ledger of manual shift overrides, emergency reassignments, and roster versions.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingAudit ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">Loading audit log records...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94A3B8] border border-dashed border-[rgba(148,163,184,0.20)] rounded-xl">
                  No manual overrides recorded for this period.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-[rgba(148,163,184,0.16)] bg-[#111820] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2DD4BF] font-mono">{log.action}</span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[#94A3B8] text-[11px]">
                      By: <span className="font-semibold text-[#F8FAFC]">{log.user_name || 'Operations Lead'}</span>
                    </div>
                    {log.change_details && (
                      <div className="mt-1 p-2 rounded-lg bg-[#080D12] border border-[rgba(148,163,184,0.16)] text-[11px] text-[#CBD5E1] font-mono break-all">
                        {log.change_details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[rgba(148,163,184,0.16)] flex justify-end">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="btn-secondary px-4 py-2 text-xs font-semibold"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RosterIQ Impact Simulator Drawer */}
      <RosterImpactSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        rosterId={gridData?.roster_id || 1}
        month={currentMonth}
        year={currentYear}
        onRosterUpdated={fetchRoster}
        initialContext={simulatorContext}
      />
    </div>
  );
};
