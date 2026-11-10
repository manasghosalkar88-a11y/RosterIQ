import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Conflict, ConflictStats, ConflictSeverity } from '../types/roster';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Check,
  X,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { RosterImpactSimulator } from '../components/planner/RosterImpactSimulator';

export const ConflictsAlertsPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [stats, setStats] = useState<ConflictStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Impact Simulator States
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorContext, setSimulatorContext] = useState<{
    employeeId?: number;
    employeeName?: string;
    date?: string;
    brandId?: number;
    brandName?: string;
    processId?: number;
    conflictId?: number;
  } | null>(null);
  const [activeRosterId, setActiveRosterId] = useState<number>(1);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [conflictsRes, statsRes] = await Promise.all([
        api.get<Conflict[]>('/conflicts'),
        api.get<ConflictStats>('/conflicts/stats'),
      ]);
      setConflicts(conflictsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load conflicts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConflict) return;

    try {
      await api.put(`/conflicts/${selectedConflict.id}/resolve`, {
        notes: resolveNotes || 'Manually resolved by Operations Lead',
      });
      setNotification(`Conflict #${selectedConflict.id} marked as resolved!`);
      setTimeout(() => setNotification(null), 3500);
      setSelectedConflict(null);
      setResolveNotes('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve conflict.');
    }
  };

  const filteredConflicts = conflicts.filter((c) => {
    if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;
    if (statusFilter === 'UNRESOLVED' && c.is_resolved) return false;
    if (statusFilter === 'RESOLVED' && !c.is_resolved) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchBrand = c.brand_name?.toLowerCase().includes(q) || false;
      const matchProc = c.process_name?.toLowerCase().includes(q) || false;
      const matchEmp = c.employee_name?.toLowerCase().includes(q) || false;
      const matchDesc = c.description.toLowerCase().includes(q);
      if (!matchTitle && !matchBrand && !matchProc && !matchEmp && !matchDesc) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: ConflictSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/50';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      case 'MEDIUM':
        return 'bg-blue-950/80 text-blue-300 border-blue-500/50';
      case 'LOW':
        return 'bg-[#151D25] text-[#94A3B8] border-[rgba(148,163,184,0.2)]';
    }
  };

  return (
    <div className="space-y-6 animate-page-fade">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Scheduling Conflicts & Coverage Alerts</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Real-time constraint auditor. Zero silent failures: all unstaffed slots and policy breaches are flagged here.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl btn-secondary text-xs font-semibold"
        >
          <Clock className="w-4 h-4 text-[#2DD4BF]" />
          <span>Refresh Conflict Audit</span>
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
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Total Conflicts</div>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">{stats?.total_conflicts ?? 0}</div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">Identified by engine</div>
        </div>

        <div className="kpi-card p-4 border-rose-500/30">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-400">Critical Unstaffed</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{stats?.critical_count ?? 0}</div>
          <div className="text-[11px] text-rose-400 font-medium mt-0.5">Requires immediate backup</div>
        </div>

        <div className="kpi-card p-4 border-amber-500/30">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">High / Medium Severity</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{(stats?.high_count ?? 0) + (stats?.medium_count ?? 0)}</div>
          <div className="text-[11px] text-amber-400 font-medium mt-0.5">Labor rule or staffing shortfall</div>
        </div>

        <div className="kpi-card p-4 border-emerald-500/30">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Resolved Rate</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats?.resolution_rate ?? 100}%</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-0.5">{stats?.resolved_count ?? 0} conflicts addressed</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 glass-card p-4 rounded-2xl border border-[rgba(148,163,184,0.16)]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by brand, process, employee or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="inline-flex rounded-xl bg-[#080D12] p-1 text-xs font-medium border border-[rgba(148,163,184,0.14)]">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'ALL' ? 'bg-[#151D25] text-[#F8FAFC] shadow-xs font-semibold' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('UNRESOLVED')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'UNRESOLVED' ? 'bg-rose-950/60 text-rose-300 shadow-xs font-semibold' : 'text-[#94A3B8] hover:text-rose-300'
              }`}
            >
              Unresolved
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'RESOLVED' ? 'bg-emerald-950/60 text-emerald-300 shadow-xs font-semibold' : 'text-[#94A3B8] hover:text-emerald-300'
              }`}
            >
              Resolved
            </button>
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] font-medium focus:border-[#14B8A6]"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Conflict Cards List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-[rgba(148,163,184,0.16)] text-[#94A3B8]">
            Auditing roster constraints...
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-[rgba(148,163,184,0.16)]">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Zero Active Conflicts Found</h3>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-sm mx-auto">
              All shifts meet operational demand headcount and satisfy statutory labor compliance policies.
            </p>
          </div>
        ) : (
          filteredConflicts.map((c) => (
            <div
              key={c.id}
              className={`glass-card rounded-2xl border p-5 transition-all shadow-card ${
                c.is_resolved
                  ? 'border-emerald-500/30 bg-emerald-950/15 opacity-80'
                  : c.severity === 'CRITICAL'
                  ? 'border-rose-500/40 hover:border-rose-500/60'
                  : 'border-[rgba(148,163,184,0.16)] hover:border-[#14B8A6]/40'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${getSeverityBadge(
                        c.severity
                      )}`}
                    >
                      {c.severity}
                    </span>

                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                      {c.date}
                    </span>

                    {c.brand_name && (
                      <span className="text-xs font-medium text-slate-700 bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-lg">
                        {c.brand_name}
                      </span>
                    )}

                    {c.process_name && (
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {c.process_name}
                      </span>
                    )}

                    {c.is_resolved && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolved</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>

                  {c.recommended_action && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800">Engine Recommendation: </span>
                        <span>{c.recommended_action}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {!c.is_resolved && (
                    <>
                      <button
                        onClick={() => {
                          setActiveRosterId(c.roster_id || 1);
                          setSimulatorContext({
                            employeeId: c.employee_id || undefined,
                            employeeName: c.employee_name || undefined,
                            date: c.date,
                            brandId: c.brand_id || undefined,
                            brandName: c.brand_name || undefined,
                            processId: c.process_id || undefined,
                            conflictId: c.id,
                          });
                          setIsSimulatorOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5"
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                        <span>Simulate Impact</span>
                      </button>

                      <button
                        onClick={() => setSelectedConflict(c)}
                        className="px-4 py-2 rounded-xl bg-app-sidebar hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-teal-400" />
                        <span>Resolve Conflict</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-lg w-full p-6 shadow-elevated animate-modal">
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(148,163,184,0.16)] pb-3">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Resolve Scheduling Conflict</span>
              </h3>
              <button onClick={() => setSelectedConflict(null)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3.5 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.16)] text-xs space-y-1">
              <div className="font-semibold text-[#F8FAFC]">{selectedConflict.title}</div>
              <div className="text-[#94A3B8]">{selectedConflict.description}</div>
              {selectedConflict.recommended_action && (
                <div className="text-[#2DD4BF] font-medium pt-1">
                  Tip: {selectedConflict.recommended_action}
                </div>
              )}
            </div>

            <form onSubmit={handleResolve} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">
                  Resolution Decision & Notes *
                </label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g., Assigned secondary backup from Pod Beta, or approved single-day variance..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
                />
              </div>

              <div className="pt-3 border-t border-[rgba(148,163,184,0.16)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedConflict) return;
                    setActiveRosterId(selectedConflict.roster_id || 1);
                    setSimulatorContext({
                      employeeId: selectedConflict.employee_id || undefined,
                      employeeName: selectedConflict.employee_name || undefined,
                      date: selectedConflict.date,
                      brandId: selectedConflict.brand_id || undefined,
                      brandName: selectedConflict.brand_name || undefined,
                      processId: selectedConflict.process_id || undefined,
                      conflictId: selectedConflict.id,
                    });
                    setSelectedConflict(null);
                    setIsSimulatorOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[rgba(20,184,166,0.12)] hover:bg-[rgba(20,184,166,0.22)] text-[#2DD4BF] border border-[#14B8A6]/40 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-[#2DD4BF]" />
                  <span>Simulate in Engine</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedConflict(null)}
                    className="btn-secondary px-4 py-2 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Resolution</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RosterIQ Impact Simulator Drawer */}
      <RosterImpactSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        rosterId={activeRosterId}
        month={11}
        year={2026}
        onRosterUpdated={fetchData}
        initialContext={simulatorContext}
      />
    </div>
  );
};
