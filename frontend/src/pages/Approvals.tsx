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
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [pendingItems, setPendingItems] = useState<ApprovalItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [pods, setPods] = useState<Pod[]>([]);

  // Filters
  const [selectedPodId, setSelectedPodId] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LEAVE' | 'COMPOFF'>('ALL');
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
      const endpoint = reviewTarget.item.item_type === 'LEAVE'
        ? `/approvals/leave/${reviewTarget.item.id}`
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

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds({});
    } else {
      const newSel: { [key: string]: boolean } = {};
      filteredItems.forEach((i) => {
        newSel[`${i.item_type}-${i.id}`] = true;
      });
      setSelectedIds(newSel);
    }
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-primaryText">Approvals Workflow & Governance</h1>
          <p className="text-sm text-app-secondaryText mt-0.5">
            Operational sign-off for planned time-off, emergency comp-offs, and roster change requests.
          </p>
        </div>

        <button
          onClick={activeTab === 'PENDING' ? fetchData : fetchHistory}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-app-border hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-subtle transition-all"
        >
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2.5 shadow-subtle">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Total Pending</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats?.total_pending ?? 0}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">Requires reviewer decision</div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Pending Leaves</div>
          <div className="text-2xl font-bold text-teal-600 mt-1">{stats?.pending_leaves ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Planned / Casual time-off</div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Pending Comp-Offs</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats?.pending_compoffs ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Earned from overtime/Sunday</div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Approved Requests</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats?.approved_this_month ?? 0}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Reflected in active rosters</div>
        </div>
      </div>

      {/* Tabs & Batch Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-app-border pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PENDING'
                ? 'bg-app-sidebar text-white shadow-sm'
                : 'bg-white text-slate-600 border border-app-border hover:bg-slate-50'
            }`}
          >
            Pending Queue ({pendingItems.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-app-sidebar text-white shadow-sm'
                : 'bg-white text-slate-600 border border-app-border hover:bg-slate-50'
            }`}
          >
            Review History
          </button>
        </div>

        {/* Batch Actions when items are selected in Pending tab */}
        {activeTab === 'PENDING' && selectedCount > 0 && (
          <div className="flex items-center space-x-2 animate-fadeIn">
            <span className="text-xs text-slate-600 font-semibold">{selectedCount} selected</span>
            <button
              onClick={() => handleBatchReview('APPROVED')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Selected</span>
            </button>
            <button
              onClick={() => handleBatchReview('REJECTED')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject Selected</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search employee or justification..."
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

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-white border border-app-border text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Request Types</option>
            <option value="LEAVE">Leave Requests Only</option>
            <option value="COMPOFF">Comp-Off Credits Only</option>
          </select>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-enterprise border border-app-border shadow-subtle overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-app-border text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              {activeTab === 'PENDING' && (
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedCount === filteredItems.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                </th>
              )}
              <th className="py-3 px-4">Employee / Pod</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Date Range / Shift</th>
              <th className="py-3 px-4">Justification</th>
              <th className="py-3 px-4">Status</th>
              {activeTab === 'HISTORY' && <th className="py-3 px-4">Reviewer</th>}
              {activeTab === 'PENDING' && <th className="py-3 px-4 text-right">Decision</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Loading approval queue...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No requests matching selected filters.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const key = `${item.item_type}-${item.id}`;
                const isSelected = !!selectedIds[key];

                return (
                  <tr key={key} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-teal-50/20' : ''}`}>
                    {activeTab === 'PENDING' && (
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => setSelectedIds({ ...selectedIds, [key]: e.target.checked })}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                    )}

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.employee_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.employee_code} • {item.pod_name}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                          item.item_type === 'LEAVE'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {item.item_type === 'LEAVE' ? <CalendarCheck className="w-3 h-3 mr-1" /> : <Award className="w-3 h-3 mr-1" />}
                        <span>{item.request_type}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                      {item.date_range}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {item.reason}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {activeTab === 'HISTORY' && (
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        <div>{item.reviewed_by_name || 'System Admin'}</div>
                        {item.review_comments && (
                          <div className="text-[10px] text-slate-400 italic">"{item.review_comments}"</div>
                        )}
                      </td>
                    )}

                    {activeTab === 'PENDING' && (
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => setReviewTarget({ item, decision: 'APPROVED' })}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Approve Request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setReviewTarget({ item, decision: 'REJECTED' })}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-app-border max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-app-border pb-3">
              <h3 className="text-base font-bold text-app-primaryText">
                {reviewTarget.decision === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
              </h3>
              <button onClick={() => setReviewTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                {reviewTarget.item.employee_name} ({reviewTarget.item.employee_code})
              </div>
              <div className="text-slate-600">
                {reviewTarget.item.request_type} • {reviewTarget.item.date_range}
              </div>
              <div className="text-slate-500 italic">"{reviewTarget.item.reason}"</div>
            </div>

            <form onSubmit={handleSingleReview} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reviewer Justification / Feedback
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="e.g., Authorized, pod coverage verified..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-app-border focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl font-semibold text-white shadow-xs ${
                    reviewTarget.decision === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
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
