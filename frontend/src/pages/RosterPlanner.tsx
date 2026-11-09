import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type {
  RosterGridResponse,
  RosterGridRow,
  RosterGridCell,
  BackupRecommendation,
  AuditLogItem,
} from '../types/roster';
import type { Pod, Brand } from '../types/management';
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
} from 'lucide-react';

export const RosterPlannerPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<number>(11); // Default to current month (Nov 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [gridData, setGridData] = useState<RosterGridResponse | null>(null);
  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Filters
  const [selectedPodId, setSelectedPodId] = useState<string>('ALL');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('ALL');
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

  const fetchRoster = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (selectedPodId !== 'ALL') params.pod_id = Number(selectedPodId);
      if (selectedBrandId !== 'ALL') params.brand_id = Number(selectedBrandId);

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
      const [podRes, brandRes] = await Promise.all([
        api.get<Pod[]>('/pods'),
        api.get<Brand[]>('/brands'),
      ]);
      setPods(podRes.data);
      setBrands(brandRes.data);
    } catch (err) {
      console.error('Failed to load pods/brands', err);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [currentMonth, currentYear, selectedPodId, selectedBrandId]);

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
          ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold'
          : 'bg-teal-50 border border-teal-200 text-teal-800 font-semibold';
      case 'WEEKLY_OFF':
        return 'bg-slate-100 text-slate-400 font-medium';
      case 'LEAVE':
        return 'bg-amber-100 border border-amber-200 text-amber-800 font-semibold';
      case 'COMP_OFF':
        return 'bg-sky-100 border border-sky-200 text-sky-800 font-semibold';
      case 'HOLIDAY':
        return 'bg-purple-100 border border-purple-200 text-purple-800 font-semibold';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-primaryText">Monthly Roster Planner</h1>
          <p className="text-sm text-app-secondaryText mt-0.5">
            Deterministic scheduling matrix. Connects 30+ employees across 10 D2C brands, pods, and process rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigator */}
          <div className="inline-flex items-center space-x-1 bg-white border border-app-border rounded-xl px-2 py-1 shadow-subtle">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 font-bold text-xs text-slate-800 min-w-[120px] text-center">
              {gridData?.month_name || `Month ${currentMonth}`} {currentYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Audit Trail Button */}
          <button
            onClick={handleOpenAuditModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-white border border-app-border hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-subtle transition-all"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Audit Trail</span>
          </button>

          {/* Action Buttons */}
          <button
            onClick={handleGenerateRoster}
            disabled={isGenerating}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white font-semibold text-xs shadow-md shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Engine...' : 'Generate Roster'}</span>
          </button>

          {gridData && gridData.status !== 'PUBLISHED' && (
            <button
              onClick={handlePublishRoster}
              disabled={isPublishing}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-app-sidebar hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-teal-400" />
              <span>{isPublishing ? 'Publishing...' : 'Publish Roster'}</span>
            </button>
          )}

          {gridData && gridData.status === 'PUBLISHED' && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Roster Published</span>
            </span>
          )}
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2.5 shadow-subtle">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      {gridData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
            <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Operational Coverage</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-2xl font-bold ${gridData.coverage_percentage >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {gridData.coverage_percentage}%
              </span>
              <span className="text-[11px] text-slate-400">of demand slots met</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full ${gridData.coverage_percentage >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, gridData.coverage_percentage)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
            <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Fairness Index</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-bold text-teal-600">{gridData.fairness_score}</span>
              <span className="text-[11px] text-slate-400">/ 100</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Weekend shift distribution balance</div>
          </div>

          <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
            <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Unresolved Conflicts</div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-2xl font-bold ${gridData.total_conflicts > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {gridData.total_conflicts}
              </span>
              <span className="text-[11px] text-slate-400">flagged gaps</span>
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-1">
              {gridData.total_conflicts > 0 ? 'Zero silent failures active' : 'All constraints fulfilled'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
            <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Workforce Scheduled</div>
            <div className="text-2xl font-bold text-app-primaryText mt-1">{gridData.rows.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {pods.length} operational pods</div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search employee or pod..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-app-border focus:bg-white focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pod Filter */}
          <select
            value={selectedPodId}
            onChange={(e) => setSelectedPodId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white border border-app-border text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
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
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white border border-app-border text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All D2C Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master Grid Table */}
      {!gridData && !isLoading ? (
        <div className="bg-white p-16 text-center rounded-enterprise border border-app-border">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Roster Generated for this Period</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Click 'Generate Roster' above to execute the deterministic scheduling engine for {currentMonth}/{currentYear}.
          </p>
          <button
            onClick={handleGenerateRoster}
            disabled={isGenerating}
            className="mt-4 px-5 py-2.5 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white font-semibold text-xs shadow-md shadow-teal-500/20"
          >
            Execute Scheduling Engine
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-enterprise border border-app-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto max-h-[650px] relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-app-border sticky top-0 z-20 shadow-xs">
                <tr>
                  {/* Sticky Employee Column Header */}
                  <th className="py-3 px-4 font-bold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-30 min-w-[200px] border-r border-app-border">
                    Employee / Pod
                  </th>

                  <th className="py-3 px-2 font-semibold text-slate-500 uppercase tracking-wider text-center min-w-[60px] border-r border-app-border">
                    Summary
                  </th>

                  {/* Day Headers */}
                  {gridData?.days.map((d) => (
                    <th
                      key={d.date}
                      className={`py-2 px-1 text-center min-w-[44px] border-r border-app-border transition-colors ${
                        d.is_sunday
                          ? 'bg-rose-50/70 text-rose-800'
                          : d.is_holiday
                          ? 'bg-purple-50/70 text-purple-800'
                          : 'text-slate-700'
                      }`}
                      title={d.holiday_name || undefined}
                    >
                      <div className="text-[10px] uppercase font-semibold text-slate-400">{d.day_name}</div>
                      <div className="text-xs font-bold">{d.day_number}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-app-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={(gridData?.days.length || 30) + 2} className="py-12 text-center text-slate-400">
                      Loading schedule matrix...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={(gridData?.days.length || 30) + 2} className="py-12 text-center text-slate-400">
                      No employees match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Sticky Employee Cell */}
                      <td className="py-2.5 px-4 sticky left-0 bg-white z-10 border-r border-app-border group-hover:bg-slate-50/60">
                        <div className="font-bold text-slate-900 truncate max-w-[180px]">{row.employee_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                          <span>{row.employee_code}</span>
                          <span>•</span>
                          <span className="truncate max-w-[110px]">{row.pod_name}</span>
                        </div>
                      </td>

                      {/* Summary Cell */}
                      <td className="py-2.5 px-2 text-center border-r border-app-border font-mono text-[10px]">
                        <span className="font-bold text-teal-700" title="Working Shifts">{row.total_working_days}W</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-slate-500" title="Weekly Offs">{row.total_off_days}O</span>
                      </td>

                      {/* Day Cells */}
                      {gridData?.days.map((d) => {
                        const cell = row.schedule[d.date];
                        if (!cell) {
                          return <td key={d.date} className="border-r border-app-border bg-slate-50" />;
                        }

                        return (
                          <td
                            key={d.date}
                            onClick={() => setSelectedCell({ row, cell })}
                            className={`p-1 text-center border-r border-app-border cursor-pointer transition-all hover:ring-2 hover:ring-teal-500 hover:z-10 relative ${
                              d.is_sunday ? 'bg-rose-50/20' : d.is_holiday ? 'bg-purple-50/20' : ''
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
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600" />
                              )}

                              {cell.status === 'WORKING' ? (
                                <>
                                  <span className="font-bold truncate max-w-[38px] text-[8px]">
                                    {cell.brand_name ? cell.brand_name.slice(0, 5) : 'SHIFT'}
                                  </span>
                                  <span className="text-[7px] text-slate-500 truncate max-w-[38px]">
                                    {cell.process_name ? cell.process_name.slice(0, 4) : 'CS'}
                                  </span>
                                </>
                              ) : cell.status === 'WEEKLY_OFF' ? (
                                <span className="text-slate-400 font-mono text-[8px]">OFF</span>
                              ) : cell.status === 'LEAVE' ? (
                                <span className="text-amber-800 font-bold text-[8px]">LEAVE</span>
                              ) : cell.status === 'COMP_OFF' ? (
                                <span className="text-sky-800 font-bold text-[8px]">COMP</span>
                              ) : (
                                <span className="text-purple-800 font-bold text-[8px]">HOLIDAY</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-app-border max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{selectedCell.row.employee_name}</h3>
                <p className="text-[11px] text-slate-400 font-mono">{selectedCell.row.employee_code} • {selectedCell.row.pod_name}</p>
              </div>
              <button onClick={() => setSelectedCell(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date</span>
                <span className="font-mono font-bold text-slate-800">{selectedCell.cell.date} ({selectedCell.cell.day_name})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Shift Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getCellBadge(selectedCell.cell)}`}>
                  {selectedCell.cell.status}
                </span>
              </div>
              {selectedCell.cell.status === 'WORKING' && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Brand Assigned</span>
                    <span className="font-semibold text-teal-800">{selectedCell.cell.brand_name || 'Operational Floater'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Operational Process</span>
                    <span className="font-semibold text-slate-800">{selectedCell.cell.process_name || 'Customer Support'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Shift Hours</span>
                    <span className="font-mono text-slate-700">{selectedCell.cell.shift_start} - {selectedCell.cell.shift_end}</span>
                  </div>
                </>
              )}

              {selectedCell.cell.has_conflict && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2 mt-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Active Conflict Flagged</div>
                    <div>{selectedCell.cell.conflict_title || 'Coverage shortfall or labor policy violation detected on this date.'}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => handleOpenReassignModal(selectedCell.row, selectedCell.cell)}
                className="w-full py-2.5 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white text-xs font-semibold shadow-md shadow-teal-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Reassign Specialist / Find Backup</span>
              </button>

              <button
                onClick={() => setSelectedCell(null)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Management / Intelligent Backup Recommendation Modal */}
      {isReassignModalOpen && reassignTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-app-border max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div>
                <h3 className="text-base font-bold text-app-primaryText flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  <span>Intelligent Shift Reassignment & Backup</span>
                </h3>
                <p className="text-xs text-app-secondaryText mt-0.5">
                  Replace {reassignTarget.row.employee_name} on {reassignTarget.cell.date} without rebuilding the roster.
                </p>
              </div>
              <button onClick={() => setIsReassignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shift Context Card */}
            <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Target Shift:</span>
                <span className="font-bold text-teal-900">
                  {reassignTarget.cell.brand_name || 'Brand Shift'} ({reassignTarget.cell.process_name || 'Process'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Unavailable Specialist:</span>
                <span className="font-semibold text-slate-800">
                  {reassignTarget.row.employee_name} ({reassignTarget.row.pod_name})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Shift Date:</span>
                <span className="font-mono font-bold text-slate-800">{reassignTarget.cell.date}</span>
              </div>
            </div>

            {/* Scored Recommendations List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Ranked Backup Candidates</span>
                <span className="text-[11px] font-normal text-slate-500">Sorted by multi-factor suitability</span>
              </div>

              {isLoadingRecs ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Evaluating pod floaters, skills & labor law compliance...
                </div>
              ) : recommendations.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
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
                            ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500'
                            : 'border-app-border hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="radio"
                              name="backup_employee"
                              checked={isSelected}
                              onChange={() => setSelectedBackupEmpId(rec.employee_id)}
                              className="text-teal-600 focus:ring-teal-500"
                            />
                            <div>
                              <span className="font-bold text-slate-900 text-xs">{rec.full_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                {rec.employee_code} • {rec.pod_name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.suitability_score >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.suitability_score >= 60
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-amber-100 text-amber-800'
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
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {reason}
                            </span>
                          ))}
                          {rec.requires_comp_off && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold border border-sky-200">
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
            <form onSubmit={handleSubmitOverride} className="space-y-3 pt-2 border-t border-app-border text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Operational Justification *
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Medical leave emergency cover, swapped with pod lead approval..."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-app-border focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride || !selectedBackupEmpId}
                  className="px-5 py-2 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white font-semibold flex items-center space-x-2 shadow-md shadow-teal-500/20 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-app-border max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-slate-600" />
                <h3 className="text-base font-bold text-slate-800">Roster Change Audit Trail</h3>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Immutable ledger of manual shift overrides, emergency reassignments, and roster versions.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingAudit ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading audit log records...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No manual overrides recorded for this period.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-app-border bg-slate-50/50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono">{log.action}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      By: <span className="font-semibold text-slate-800">{log.user_name || 'Operations Lead'}</span>
                    </div>
                    {log.change_details && (
                      <div className="mt-1 p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 font-mono break-all">
                        {log.change_details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-app-border flex justify-end">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
