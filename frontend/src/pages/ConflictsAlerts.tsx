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
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-primaryText">Scheduling Conflicts & Coverage Alerts</h1>
          <p className="text-sm text-app-secondaryText mt-0.5">
            Real-time constraint auditor. Zero silent failures: all unstaffed slots and policy breaches are flagged here.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-app-border hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-subtle transition-all"
        >
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Refresh Conflict Audit</span>
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
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Total Conflicts</div>
          <div className="text-2xl font-bold text-app-primaryText mt-1">{stats?.total_conflicts ?? 0}</div>
          <div className="text-[11px] text-app-secondaryText mt-0.5">Identified by engine</div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-rose-200 bg-rose-50/20 shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-700">Critical Unstaffed</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats?.critical_count ?? 0}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">Requires immediate backup</div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-amber-200 bg-amber-50/20 shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">High / Medium Severity</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{(stats?.high_count ?? 0) + (stats?.medium_count ?? 0)}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">Labor rule or staffing shortfall</div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-emerald-200 bg-emerald-50/20 shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Resolved Rate</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats?.resolution_rate ?? 100}%</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">{stats?.resolved_count ?? 0} conflicts addressed</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by brand, process, employee or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-app-border focus:bg-white focus:ring-1 focus:ring-teal-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg ${
                statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('UNRESOLVED')}
              className={`px-3 py-1 rounded-lg ${
                statusFilter === 'UNRESOLVED' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Unresolved
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1 rounded-lg ${
                statusFilter === 'RESOLVED' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Resolved
            </button>
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white border border-app-border text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
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
          <div className="bg-white p-12 text-center rounded-enterprise border border-app-border text-slate-400">
            Auditing roster constraints...
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-enterprise border border-app-border">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Zero Active Conflicts Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All shifts meet operational demand headcount and satisfy statutory labor compliance policies.
            </p>
          </div>
        ) : (
          filteredConflicts.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-enterprise border p-5 transition-all shadow-subtle ${
                c.is_resolved
                  ? 'border-emerald-200 bg-emerald-50/10 opacity-75'
                  : c.severity === 'CRITICAL'
                  ? 'border-rose-300 hover:border-rose-400'
                  : 'border-app-border hover:border-slate-300'
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-app-border max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-app-primaryText flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Resolve Scheduling Conflict</span>
              </h3>
              <button onClick={() => setSelectedConflict(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">{selectedConflict.title}</div>
              <div className="text-slate-600">{selectedConflict.description}</div>
              {selectedConflict.recommended_action && (
                <div className="text-teal-700 font-medium pt-1">
                  Tip: {selectedConflict.recommended_action}
                </div>
              )}
            </div>

            <form onSubmit={handleResolve} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Resolution Decision & Notes *
                </label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g., Assigned secondary backup from Pod Beta, or approved single-day variance..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-app-border focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-app-border flex items-center justify-between">
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
                  className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center space-x-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                  <span>Simulate in Engine</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedConflict(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center space-x-1.5"
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
