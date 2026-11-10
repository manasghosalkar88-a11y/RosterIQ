import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { LeaveRequest, CompOff, LeaveType, ApprovalStatus } from '../types/leave';
import type { Employee } from '../types/management';
import {
  Plus,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const LeaveAvailabilityPage: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [compOffs, setCompOffs] = useState<CompOff[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'LEAVES' | 'COMPOFFS'>('LEAVES');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Leave Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [leaveType, setLeaveType] = useState<LeaveType>('PLANNED');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leavesRes, compRes, empRes] = await Promise.all([
        api.get<LeaveRequest[]>('/leaves'),
        api.get<CompOff[]>('/leaves/comp-offs'),
        api.get<Employee[]>('/employees'),
      ]);
      setLeaves(leavesRes.data);
      setCompOffs(compRes.data);
      setEmployees(empRes.data);

      if (empRes.data.length > 0 && selectedEmpId === '') {
        setSelectedEmpId(empRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load leave data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReviewLeave = async (leaveId: number, newStatus: ApprovalStatus) => {
    try {
      await api.put(`/leaves/${leaveId}/review`, {
        status: newStatus,
        review_comments: `Decision applied by ${user?.full_name}`,
      });
      setNotification(`Leave request marked as ${newStatus}!`);
      setTimeout(() => setNotification(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to review leave.');
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !startDate || !endDate) {
      setModalError('Please fill in all mandatory fields.');
      return;
    }

    try {
      await api.post('/leaves', {
        employee_id: Number(selectedEmpId),
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || 'Personal leave request',
      });

      setIsModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setModalError(null);
      setNotification('Leave request submitted with status PENDING.');
      setTimeout(() => setNotification(null), 4000);
      fetchData();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to submit leave.');
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (statusFilter === 'ALL') return true;
    return l.status === statusFilter;
  });

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;

  return (
    <div className="space-y-6 animate-page-fade">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Leave & Availability Management</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Planned time-off, comp-off credits, and approval workflows affecting roster scheduling.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-primary text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center space-x-2.5 shadow-subtle animate-toast">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Total Leave Requests</div>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">{leaves.length}</div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">Logged in system</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Pending Approvals</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-amber-400 font-medium mt-0.5">Requires manager review</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Approved Time-Off</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{approvedCount}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-0.5">Blocks roster generation</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Comp-Off Credits</div>
          <div className="text-2xl font-black text-blue-400 mt-1">{compOffs.length}</div>
          <div className="text-[11px] text-[#2DD4BF] font-medium mt-0.5">Earned from holiday/Sunday shifts</div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[rgba(148,163,184,0.16)] pb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('LEAVES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tab-transition ${
              activeTab === 'LEAVES'
                ? 'bg-[#14B8A6] text-white shadow-md shadow-teal-500/20'
                : 'bg-[#111820] text-[#94A3B8] border border-[rgba(148,163,184,0.16)] hover:text-[#F8FAFC]'
            }`}
          >
            Leave Requests ({leaves.length})
          </button>
          <button
            onClick={() => setActiveTab('COMPOFFS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tab-transition ${
              activeTab === 'COMPOFFS'
                ? 'bg-[#14B8A6] text-white shadow-md shadow-teal-500/20'
                : 'bg-[#111820] text-[#94A3B8] border border-[rgba(148,163,184,0.16)] hover:text-[#F8FAFC]'
            }`}
          >
            Comp-Off Balances ({compOffs.length})
          </button>
        </div>

        {activeTab === 'LEAVES' && (
          <div className="inline-flex rounded-xl bg-[#080D12] p-1 text-xs font-medium border border-[rgba(148,163,184,0.14)]">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'ALL' ? 'bg-[#151D25] shadow-sm font-bold text-[#F8FAFC]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'PENDING' ? 'bg-amber-950/60 text-amber-300 font-bold border border-amber-500/40' : 'text-[#94A3B8] hover:text-amber-300'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'APPROVED' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/40' : 'text-[#94A3B8] hover:text-emerald-300'
              }`}
            >
              Approved ({approvedCount})
            </button>
          </div>
        )}
      </div>

      {/* Leave Requests Table */}
      {activeTab === 'LEAVES' && (
        <div className="bg-white rounded-enterprise border border-app-border shadow-subtle overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-app-border text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Pod</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Loading leaves...
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No leave requests matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{l.employee_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{l.employee_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.employee_pod_name || 'General'}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        {l.leave_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                      {l.start_date} → {l.end_date}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{l.reason || 'Personal'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {l.status === 'PENDING' ? (
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => handleReviewLeave(l.id, 'APPROVED')}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Approve Leave"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReviewLeave(l.id, 'REJECTED')}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                            title="Reject Leave"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          {l.status === 'APPROVED' ? 'Validated for Roster' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Comp-Off Balances Table */}
      {activeTab === 'COMPOFFS' && (
        <div className="bg-white rounded-enterprise border border-app-border shadow-subtle overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-app-border text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date Worked (Overtime/Sunday)</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Credit Status</th>
                <th className="py-3 px-4">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {compOffs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    No compensatory off credits recorded.
                  </td>
                </tr>
              ) : (
                compOffs.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.employee_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{c.earned_date}</td>
                    <td className="py-3 px-4 text-slate-600">{c.reason || 'Weekend coverage'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.is_utilized === 1 ? 'Utilized' : 'Available for scheduling'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-md w-full p-6 shadow-elevated animate-modal">
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(148,163,184,0.16)] pb-3">
              <h3 className="text-base font-bold text-[#F8FAFC]">Submit Planned Leave Request</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Select Employee *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] focus:border-[#14B8A6]"
                  required
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code}) · {e.pod_name || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] focus:border-[#14B8A6]"
                >
                  <option value="PLANNED">Planned Leave</option>
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="COMP_OFF">Comp-Off Usage</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#CBD5E1] font-semibold mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] focus:border-[#14B8A6]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#CBD5E1] font-semibold mb-1">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] focus:border-[#14B8A6]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide context or family event details..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
                />
              </div>

              <div className="pt-3 border-t border-[rgba(148,163,184,0.16)] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
