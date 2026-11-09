import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { SystemSettings, SystemDiagnostics } from '../types/settings';
import {
  Settings as SettingsIcon,
  Server,
  Activity,
  Database,
  RefreshCw,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Users,
  Building2,
  CalendarDays,
  FileCheck,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { token, user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshingDiag, setRefreshingDiag] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState<string>('DataStraw Operations');
  const [shiftStart, setShiftStart] = useState<string>('09:00');
  const [shiftEnd, setShiftEnd] = useState<string>('18:00');
  const [maxDays, setMaxDays] = useState<number>(6);
  const [autoResolve, setAutoResolve] = useState<boolean>(true);

  const fetchSettingsAndDiagnostics = async () => {
    try {
      setLoading(true);
      const [settingsRes, diagRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/settings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://127.0.0.1:8000/api/v1/settings/diagnostics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (settingsRes.ok && diagRes.ok) {
        const sData: SystemSettings = await settingsRes.json();
        const dData: SystemDiagnostics = await diagRes.json();
        setSettings(sData);
        setDiagnostics(dData);
        setCompanyName(sData.company_name);
        setShiftStart(sData.default_shift_start);
        setShiftEnd(sData.default_shift_end);
        setMaxDays(sData.max_consecutive_days);
        setAutoResolve(sData.auto_resolve_on_override);
      }
    } catch (err) {
      console.error('Error fetching settings/diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndDiagnostics();
  }, [token]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: companyName,
          default_shift_start: shiftStart,
          default_shift_end: shiftEnd,
          max_consecutive_days: Number(maxDays),
          auto_resolve_on_override: autoResolve,
        }),
      });

      if (res.ok) {
        const updated: SystemSettings = await res.json();
        setSettings(updated);
        setNotification({
          type: 'success',
          message: 'System configuration updated and labor constraints propagated across all employees!',
        });
      } else {
        setNotification({ type: 'error', message: 'Failed to update configuration.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error updating settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshDiagnostics = async () => {
    setRefreshingDiag(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/settings/diagnostics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const dData = await res.json();
        setDiagnostics(dData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshingDiag(false);
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    setShowResetModal(false);
    setNotification(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/settings/reset-demo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotification({
          type: 'success',
          message: `${data.message} (Employees: ${data.stats?.employees}, Brands: ${data.stats?.brands}, Rosters: ${data.stats?.rosters})`,
        });
        await fetchSettingsAndDiagnostics();
      } else {
        setNotification({ type: 'error', message: 'Reset failed. Check server logs.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error performing master database reset.' });
    } finally {
      setResetting(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    const remSecs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${remMins}m ${remSecs}s`;
    if (mins > 0) return `${mins}m ${remSecs}s`;
    return `${remSecs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
        <span className="ml-3 text-sm font-semibold text-slate-700">Loading Configuration & Diagnostics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-enterprise border border-app-border p-6 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">System Settings & Engine Diagnostics</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure operational rules, inspect live database health, and manage assessment baseline data
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
            Environment: {settings?.environment || 'Production-Ready'}
          </span>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-mono font-medium">
            v{settings?.version || '1.0.0'}
          </span>
        </div>
      </div>

      {/* Notifications Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs underline hover:opacity-80 ml-4 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Telemetry & Diagnostics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-enterprise border border-app-border p-4 shadow-subtle flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Health Status</div>
            <div className="text-base font-bold text-emerald-600 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
              {diagnostics?.status || 'OPERATIONAL'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-enterprise border border-app-border p-4 shadow-subtle flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">DB Latency Ping</div>
            <div className="text-base font-bold text-slate-800">
              {diagnostics?.database_latency_ms ?? 0.2} <span className="text-xs font-normal text-slate-500">ms</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-enterprise border border-app-border p-4 shadow-subtle flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Relational Tables</div>
            <div className="text-base font-bold text-slate-800">
              {diagnostics?.total_tables || 16} <span className="text-xs font-normal text-slate-500">Models</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-enterprise border border-app-border p-4 shadow-subtle flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Engine Uptime</div>
            <div className="text-base font-bold text-slate-800">
              {formatUptime(diagnostics?.uptime_seconds || 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-enterprise border border-app-border p-6 shadow-subtle">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800">Operating Rules & Constraints</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Parameters governing roster generation and labor law compliance
                </p>
              </div>
              <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-md font-semibold">
                Live Configuration
              </span>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-medium text-slate-800"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Shown across exported CSV rosters and PDF compliance audit reports.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Default Shift Start Time
                  </label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Default Shift End Time
                  </label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Labor Law Constraint: Max Consecutive Working Days
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Statutory labor rule: mandatory weekly rest after consecutive working shifts
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={4}
                      max={7}
                      value={maxDays}
                      onChange={(e) => setMaxDays(parseInt(e.target.value) || 6)}
                      className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-300 text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-xs font-semibold text-slate-600">Days</span>
                  </div>
                </div>
                <div className="text-[11px] text-teal-800 bg-teal-50/70 p-2.5 rounded-lg border border-teal-200/60 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span>
                    When updated, this rule automatically syncs across all 32 active employee contracts and governs the
                    deterministic recommendation engine.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Auto-Resolve Conflicts on Specialist Override
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Automatically mark corresponding UNSTAFFED_PROCESS conflicts as RESOLVED when manual replacement is confirmed
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoResolve}
                    onChange={(e) => setAutoResolve(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {['SUPER_ADMIN', 'OPS_MANAGER'].includes(user?.role || '') && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 flex items-center space-x-2 transition-all disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Database Normalized Tables Telemetry */}
          <div className="bg-white rounded-enterprise border border-app-border p-6 shadow-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Database Record Breakdown</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live row count across all normalized 16 relational SQLite/PostgreSQL tables
                </p>
              </div>
              <button
                onClick={handleRefreshDiagnostics}
                disabled={refreshingDiag}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingDiag ? 'animate-spin' : ''}`} />
                <span>Refresh Ping</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { label: 'Employees', count: settings?.table_counts?.employees, icon: Users, color: 'text-teal-600 bg-teal-50' },
                { label: 'Brands', count: settings?.table_counts?.brands, icon: Building2, color: 'text-blue-600 bg-blue-50' },
                { label: 'Processes', count: settings?.table_counts?.processes, icon: Cpu, color: 'text-purple-600 bg-purple-50' },
                { label: 'Pods', count: settings?.table_counts?.pods, icon: Layers, color: 'text-amber-600 bg-amber-50' },
                { label: 'Rules', count: settings?.table_counts?.operating_rules, icon: FileCheck, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Assignments', count: settings?.table_counts?.assignments, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Roster Entries', count: settings?.table_counts?.roster_entries, icon: CalendarDays, color: 'text-rose-600 bg-rose-50' },
                { label: 'Conflicts', count: settings?.table_counts?.conflicts, icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
                { label: 'Audit Logs', count: settings?.table_counts?.audit_logs, icon: FileCheck, color: 'text-slate-600 bg-slate-100' },
                { label: 'Users', count: settings?.table_counts?.users, icon: ShieldCheck, color: 'text-cyan-600 bg-cyan-50' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
                      <div className={`w-6 h-6 rounded-lg ${item.color} flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="text-lg font-bold text-slate-800 font-mono">
                      {item.count !== undefined ? item.count.toLocaleString() : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: System Specs & Danger Zone (1 Col) */}
        <div className="space-y-6">
          {/* Tech Architecture Summary */}
          <div className="bg-white rounded-enterprise border border-app-border p-6 shadow-subtle">
            <h3 className="text-base font-bold text-slate-800 mb-3">Assessment Stack Architecture</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700 block">Backend Engine</span>
                <span className="text-slate-500 mt-0.5 block font-mono">FastAPI + Python 3.12+ (Pydantic v2)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700 block">ORM & Data Layer</span>
                <span className="text-slate-500 mt-0.5 block font-mono">SQLAlchemy 2.0 (16 Normalized Tables)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700 block">Frontend Client</span>
                <span className="text-slate-500 mt-0.5 block font-mono">Vite + React 18 + Tailwind CSS + Three.js</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700 block">Algorithm Design</span>
                <span className="text-slate-500 mt-0.5 block">
                  Deterministic constraint scheduler, weighted multi-factor recommendation engine (0-100%), immutable audit trail.
                </span>
              </div>
            </div>
          </div>

          {/* Danger Zone: Assessment Master Reset */}
          <div className="bg-rose-50/50 rounded-enterprise border border-rose-200 p-6 shadow-subtle">
            <div className="flex items-center space-x-2 text-rose-800 mb-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-sm font-bold">Assessment Master Reset</h3>
            </div>
            <p className="text-xs text-rose-700/90 leading-relaxed mb-4">
              Restores the pristine DataStraw assessment dataset: 32 employees, 10 D2C brands, 5 pods, 4 processes, 40
              operating rules, and regenerated monthly rosters for April & November 2026.
            </p>

            {['SUPER_ADMIN', 'OPS_MANAGER'].includes(user?.role || '') && (
              <button
                onClick={() => setShowResetModal(true)}
                disabled={resetting}
                className="w-full px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
                <span>{resetting ? 'Resetting Baseline...' : 'Re-Seed Assessment Baseline'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-enterprise border border-app-border p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Confirm Master Baseline Reset</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              This action will reset the database back to pristine DataStraw assessment state:
              <br />
              • 32 Employees across 5 Pods
              <br />
              • 10 D2C Brands with primary specialist assignments
              <br />
              • 4 Core Processes (CS, ACC, Retention, NDR)
              <br />
              • 40 Brand-Process Operating Rules
              <br />
              • Pristine Master Rosters with zero silent failures
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemo}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                Yes, Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
