import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ApprovalItem, ApprovalStats, ApprovalStatus } from '../types/approval';
import type { Pod } from '../types/management';
import {
  CheckCircle2,
  Clock,
  Search,
  Check,
  X,
  CalendarCheck,
  Award,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [pendingItems, setPendingItems] = useState<ApprovalItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [pods, setPods] = useState<Pod[]>([]);

  // Filters
  const [selectedPodId, setSelectedPodId] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LEAVE' | 'COMPOFF' | 'SIMULATION_SCENARIO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<{ [key: string]: boolean }>({});

  // Loading & Action states
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ item: ApprovalItem; decision: ApprovalStatus } | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, statsRes, podRes] = await Promise.all([
        api.get<ApprovalItem[]>('/approvals/pending'),
        api.get<ApprovalStats>('/approvals/stats'),
        api.get<Pod[]>('/pods'),
      ]);
      setPendingItems(pendingRes.data);
      setStats(statsRes.data);
      setPods(podRes.data);
    } catch (err) {
      console.error('Failed to load approvals', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<ApprovalItem[]>('/approvals/history');
      setHistoryItems(res.data);
    } catch (err) {
      console.error('Failed to load approval history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'PENDING') {
      fetchData();
    } else {
      fetchHistory();
    }
  }, [activeTab]);

  const handleSingleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;

    setIsSubmitting(true);
    try {
      const endpoint =
        reviewTarget.item.item_type === 'LEAVE'
          ? `/approvals/leave/${reviewTarget.item.id}`
          : reviewTarget.item.item_type === 'SIMULATION_SCENARIO'
          ? `/approvals/scenario/${reviewTarget.item.id}`
          : `/approvals/compoff/${reviewTarget.item.id}`;

      await api.put(endpoint, {
        status: reviewTarget.decision,
        review_comments: reviewComments || `Decision: ${reviewTarget.decision}`,
      });

      setNotification(`Request #${reviewTarget.item.id} successfully marked as ${reviewTarget.decision}!`);
      setTimeout(() => setNotification(null), 3500);
      setReviewTarget(null);
      setReviewComments('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchReview = async (decision: ApprovalStatus) => {
    const selectedKeys = Object.keys(selectedIds).filter((k) => selectedIds[k]);
    if (selectedKeys.length === 0) return;

    const leaveIds: number[] = [];
    const compIds: number[] = [];

    selectedKeys.forEach((key) => {
      const [type, idStr] = key.split('-');
      if (type === 'LEAVE') leaveIds.push(Number(idStr));
      if (type === 'COMPOFF') compIds.push(Number(idStr));
    });

    try {
      const res = await api.post('/approvals/batch', {
        leave_ids: leaveIds,
        comp_off_ids: compIds,
        decision,
        comments: `Batch ${decision} by operations reviewer`,
      });

      setNotification(res.data.message);
      setTimeout(() => setNotification(null), 4000);
      setSelectedIds({});
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Batch approval failed.');
    }
  };

  const currentList = activeTab === 'PENDING' ? pendingItems : historyItems;

  const filteredItems = currentList.filter((item) => {
    if (typeFilter !== 'ALL' && item.item_type !== typeFilter) return false;
    if (selectedPodId !== 'ALL' && item.pod_id !== Number(selectedPodId)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.employee_name.toLowerCase().includes(q) ||
        item.employee_code.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const batchableFiltered = filteredItems.filter((i) => i.item_type !== 'SIMULATION_SCENARIO');

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds({});
    } else {
      const newSel: { [key: string]: boolean } = {};
      batchableFiltered.forEach((i) => {
        newSel[`${i.item_type}-${i.id}`] = true;
      });
      setSelectedIds(newSel);
    }
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-page-fade">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Approvals Workflow & Governance</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Operational sign-off for planned time-off, emergency comp-offs, and roster change requests.
          </p>
        </div>

        <button
          onClick={activeTab === 'PENDING' ? fetchData : fetchHistory}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl btn-secondary text-xs font-semibold"
        >
          <Clock className="w-4 h-4 text-[#2DD4BF]" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center space-x-2.5 shadow-subtle animate-toast">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Total Pending</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats?.total_pending ?? 0}</div>
          <div className="text-[11px] text-amber-400 font-medium mt-0.5">Requires reviewer decision</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Pending Leaves</div>
          <div className="text-2xl font-black text-[#2DD4BF] mt-1">{stats?.pending_leaves ?? 0}</div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">Planned / Casual time-off</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Pending Comp-Offs / Scenarios</div>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {(stats?.pending_compoffs ?? 0)} <span className="text-sm font-bold text-[#2DD4BF]">/ {stats?.pending_scenarios ?? 0} sim</span>
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">Comp-offs & escalated simulator plans</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Approved Requests</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats?.approved_this_month ?? 0}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-0.5">Reflected in active rosters</div>
        </div>
      </div>

      {/* Tabs & Batch Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[rgba(148,163,184,0.16)] pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tab-transition ${
              activeTab === 'PENDING'
                ? 'bg-[#14B8A6] text-white shadow-md shadow-teal-500/20'
                : 'bg-[#111820] text-[#94A3B8] border border-[rgba(148,163,184,0.16)] hover:text-[#F8FAFC]'
            }`}
          >
            Pending Queue ({pendingItems.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tab-transition ${
              activeTab === 'HISTORY'
                ? 'bg-[#14B8A6] text-white shadow-md shadow-teal-500/20'
                : 'bg-[#111820] text-[#94A3B8] border border-[rgba(148,163,184,0.16)] hover:text-[#F8FAFC]'
            }`}
          >
            Review History
          </button>
        </div>

        {/* Batch Actions when items are selected in Pending tab */}
        {activeTab === 'PENDING' && selectedCount > 0 && (
          <div className="flex items-center space-x-2 animate-dropdown">
            <span className="text-xs text-[#CBD5E1] font-semibold">{selectedCount} selected</span>
            <button
              onClick={() => handleBatchReview('APPROVED')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs flex items-center space-x-1 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Selected</span>
            </button>
            <button
              onClick={() => handleBatchReview('REJECTED')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-xs flex items-center space-x-1 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject Selected</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 glass-card p-4 rounded-2xl border border-[rgba(148,163,184,0.16)]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search employee, scenario, or justification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#14B8A6]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pod Filter */}
          <select
            value={selectedPodId}
            onChange={(e) => setSelectedPodId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#E2E8F0] font-medium focus:outline-none focus:border-[#14B8A6]"
          >
            <option value="ALL">All Operational Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#E2E8F0] font-medium focus:outline-none focus:border-[#14B8A6]"
          >
            <option value="ALL">All Request Types</option>
            <option value="LEAVE">Leave Requests Only</option>
            <option value="COMPOFF">Comp-Off Credits Only</option>
            <option value="SIMULATION_SCENARIO">Simulation Scenarios Only</option>
          </select>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="glass-card rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-subtle overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#080D12]/80 border-b border-[rgba(148,163,184,0.16)] text-[#94A3B8] font-semibold uppercase tracking-wider">
            <tr>
              {activeTab === 'PENDING' && (
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={batchableFiltered.length > 0 && selectedCount === batchableFiltered.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-[rgba(148,163,184,0.3)] bg-[#080D12] text-[#14B8A6] focus:ring-[#14B8A6]"
                  />
                </th>
              )}
              <th className="py-3 px-4">Employee / Scenario</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Date Range / Shift</th>
              <th className="py-3 px-4">Justification & Details</th>
              <th className="py-3 px-4">Status</th>
              {activeTab === 'HISTORY' && <th className="py-3 px-4">Reviewer</th>}
              {activeTab === 'PENDING' && <th className="py-3 px-4 text-right">Decision</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(148,163,184,0.12)]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                  Loading approval queue...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                  No requests matching selected filters.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const key = `${item.item_type}-${item.id}`;
                const isSelected = !!selectedIds[key];

                return (
                  <tr key={key} className={`hover:bg-[#111820]/60 transition-colors ${isSelected ? 'bg-[#14B8A6]/10' : ''}`}>
                    {activeTab === 'PENDING' && (
                      <td className="py-3 px-4 text-center">
                        {item.item_type !== 'SIMULATION_SCENARIO' ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => setSelectedIds({ ...selectedIds, [key]: e.target.checked })}
                            className="rounded border-[rgba(148,163,184,0.3)] bg-[#080D12] text-[#14B8A6] focus:ring-[#14B8A6]"
                          />
                        ) : (
                          <span className="text-[10px] text-[#64748B]" title="Requires individual governance review">•</span>
                        )}
                      </td>
                    )}

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#F8FAFC]">{item.employee_name}</div>
                      <div className="text-[10px] text-[#94A3B8] font-mono">
                        {item.employee_code} • {item.pod_name}
                      </div>
                      {item.selected_backup_name && (
                        <div className="text-[10px] text-[#2DD4BF] mt-0.5 font-semibold">
                          Selected Backup: {item.selected_backup_name}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                          item.item_type === 'LEAVE'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                            : item.item_type === 'SIMULATION_SCENARIO'
                            ? 'bg-teal-950/40 text-[#2DD4BF] border-[#14B8A6]/30'
                            : 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {item.item_type === 'LEAVE' ? (
                          <CalendarCheck className="w-3 h-3 mr-1" />
                        ) : item.item_type === 'SIMULATION_SCENARIO' ? (
                          <Sliders className="w-3 h-3 mr-1" />
                        ) : (
                          <Award className="w-3 h-3 mr-1" />
                        )}
                        <span>{item.request_type}</span>
                      </span>
                      {item.required_approver_role && (
                        <div className="text-[9px] text-amber-400 mt-1 flex items-center space-x-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Role: {item.required_approver_role}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-[#CBD5E1]">
                      {item.date_range}
                    </td>

                    <td className="py-3 px-4 text-[#CBD5E1] max-w-xs">
                      <div className="truncate">{item.reason}</div>
                      {item.impact_summary_note && (
                        <div className="text-[10px] text-[#94A3B8] truncate mt-0.5">{item.impact_summary_note}</div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'PENDING'
                            ? 'bg-amber-950/50 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-950/50 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.scenario_status || item.status}
                      </span>
                    </td>

                    {activeTab === 'HISTORY' && (
                      <td className="py-3 px-4 text-[#CBD5E1] text-[11px]">
                        <div>{item.reviewed_by_name || 'System Admin'}</div>
                        {item.review_comments && (
                          <div className="text-[10px] text-[#94A3B8] italic">"{item.review_comments}"</div>
                        )}
                      </td>
                    )}

                    {activeTab === 'PENDING' && (
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => setReviewTarget({ item, decision: 'APPROVED' })}
                            className="p-1.5 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/60 transition-colors"
                            title="Approve Request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setReviewTarget({ item, decision: 'REJECTED' })}
                            className="p-1.5 rounded-lg bg-rose-950/50 text-rose-400 border border-rose-500/30 hover:bg-rose-900/60 transition-colors"
                            title="Reject Request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-md w-full p-6 shadow-elevated animate-modal space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.16)] pb-3">
              <h3 className="text-base font-bold text-[#F8FAFC]">
                {reviewTarget.decision === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
              </h3>
              <button onClick={() => setReviewTarget(null)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.16)] text-xs space-y-1">
              <div className="font-semibold text-[#F8FAFC]">
                {reviewTarget.item.employee_name} ({reviewTarget.item.employee_code})
              </div>
              <div className="text-[#CBD5E1]">
                {reviewTarget.item.request_type} • {reviewTarget.item.date_range}
              </div>
              <div className="text-[#94A3B8] italic">"{reviewTarget.item.reason}"</div>
            </div>

            <form onSubmit={handleSingleReview} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">
                  Reviewer Justification / Feedback
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="e.g., Authorized, pod coverage verified..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="btn-secondary px-4 py-2 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl font-semibold text-white shadow-xs transition-all ${
                    reviewTarget.decision === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : `Confirm ${reviewTarget.decision}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
