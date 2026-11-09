import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type {
  SimulationType,
  SimulationRequest,
  SimulationResultResponse,
  BackupCandidate,
  ScenarioResponse,
  ApplyScenarioResponse,
} from '../../types/simulation';
import type { Employee, Brand, Process } from '../../types/management';
import {
  FlaskConical,
  X,
  Play,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Save,
  RefreshCw,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  Zap,
  Info,
  Check,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface RosterImpactSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  rosterId: number;
  month: number;
  year: number;
  onRosterUpdated?: () => void;
  initialContext?: {
    employeeId?: number;
    employeeName?: string;
    date?: string;
    brandId?: number;
    brandName?: string;
    processId?: number;
    conflictId?: number;
  } | null;
}

export const RosterImpactSimulator: React.FC<RosterImpactSimulatorProps> = ({
  isOpen,
  onClose,
  rosterId,
  month,
  year,
  onRosterUpdated,
  initialContext,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'configure' | 'analysis' | 'backups' | 'scenarios'>('configure');

  // Reference Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  // Simulation Form State
  const [simulationType, setSimulationType] = useState<SimulationType>('EMPLOYEE_ABSENCE');
  const [startDate, setStartDate] = useState<string>(
    initialContext?.date || `${year}-${String(month).padStart(2, '0')}-15`
  );
  const [endDate, setEndDate] = useState<string>(
    initialContext?.date || `${year}-${String(month).padStart(2, '0')}-15`
  );
  const [employeeId, setEmployeeId] = useState<number | undefined>(initialContext?.employeeId);
  const [brandId, setBrandId] = useState<number | undefined>(initialContext?.brandId);
  const [processId, setProcessId] = useState<number | undefined>(initialContext?.processId);
  const [targetEmployeeId, setTargetEmployeeId] = useState<number | undefined>(undefined);
  const [reason, setReason] = useState<string>('Operational schedule change simulation');

  // Simulation Execution State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResultResponse | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupCandidate | null>(null);

  // Saved Scenarios State
  const [savedScenarios, setSavedScenarios] = useState<ScenarioResponse[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');

  // Apply State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyNotes, setApplyNotes] = useState('');

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Load reference datasets
  useEffect(() => {
    if (isOpen) {
      loadReferenceData();
      loadSavedScenarios();
    }
  }, [isOpen, rosterId]);

  // Synchronize initial context when provided
  useEffect(() => {
    if (initialContext) {
      if (initialContext.date) {
        setStartDate(initialContext.date);
        setEndDate(initialContext.date);
      }
      if (initialContext.employeeId) setEmployeeId(initialContext.employeeId);
      if (initialContext.brandId) setBrandId(initialContext.brandId);
      if (initialContext.processId) setProcessId(initialContext.processId);
    }
  }, [initialContext]);

  const loadReferenceData = async () => {
    try {
      const [empRes, brandRes, procRes] = await Promise.all([
        api.get<Employee[]>('/employees'),
        api.get<Brand[]>('/brands'),
        api.get<Process[]>('/processes'),
      ]);
      setEmployees(empRes.data.filter((e) => e.is_active));
      setBrands(brandRes.data.filter((b) => b.is_active));
      setProcesses(procRes.data.filter((p) => p.is_active));
    } catch (err) {
      console.error('Failed to load simulator reference data', err);
    }
  };

  const loadSavedScenarios = async () => {
    setIsLoadingScenarios(true);
    try {
      const res = await api.get<ScenarioResponse[]>('/simulator/scenarios', {
        params: { roster_id: rosterId },
      });
      setSavedScenarios(res.data);
    } catch (err) {
      console.error('Failed to load saved scenarios', err);
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const triggerNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Run deterministic simulation
  const handleRunSimulation = async (customPayload?: Partial<SimulationRequest>) => {
    setIsSimulating(true);
    setSelectedBackup(null);

    try {
      const payload: SimulationRequest = {
        roster_id: rosterId,
        simulation_type: customPayload?.simulation_type || simulationType,
        start_date: customPayload?.start_date || startDate,
        end_date: customPayload?.end_date || endDate || startDate,
        employee_id: customPayload?.employee_id !== undefined ? customPayload.employee_id : employeeId,
        brand_id: customPayload?.brand_id !== undefined ? customPayload.brand_id : brandId,
        process_id: customPayload?.process_id !== undefined ? customPayload.process_id : processId,
        target_employee_id:
          customPayload?.target_employee_id !== undefined ? customPayload.target_employee_id : targetEmployeeId,
        reason: customPayload?.reason || reason,
      };

      const res = await api.post<SimulationResultResponse>('/simulator/simulate', payload);
      setSimulationResult(res.data);
      setActiveTab('analysis');

      // Auto-select top backup candidate if available
      if (res.data.backup_recommendations && res.data.backup_recommendations.length > 0) {
        setSelectedBackup(res.data.backup_recommendations[0]);
      }

      triggerNotification('success', 'In-memory simulation computed deterministically without database changes.');
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Simulation execution failed.';
      triggerNotification('error', detail);
    } finally {
      setIsSimulating(false);
    }
  };

  // Canonical Demonstration Scenario 1: Single-Resource Absence
  const handleLoadDemoSingleResource = () => {
    const glow = brands.find((b) => b.code === 'BRD-GLOW') || brands[0];
    const priya = employees.find((e) => e.employee_code === 'EMP006') || employees.find((e) => e.full_name.includes('Priya')) || employees[0];
    const demoDate = `${year}-${String(month).padStart(2, '0')}-15`;

    setSimulationType('EMPLOYEE_ABSENCE');
    setStartDate(demoDate);
    setEndDate(demoDate);
    if (priya) setEmployeeId(priya.id);
    if (glow) setBrandId(glow.id);
    setReason('Canonical Demo: Single-Resource Specialist (Priya Sharma on GlowBotanics) unavailable on working day');

    handleRunSimulation({
      simulation_type: 'EMPLOYEE_ABSENCE',
      start_date: demoDate,
      end_date: demoDate,
      employee_id: priya?.id,
      brand_id: glow?.id,
      reason: 'Canonical Demo: Single-Resource Specialist (Priya Sharma on GlowBotanics) unavailable on working day',
    });
  };

  // Canonical Demonstration Scenario 2: Multi-Resource Internal Absorption
  const handleLoadDemoMultiResource = () => {
    const urban = brands.find((b) => b.code === 'BRD-URBAN') || brands.find((b) => b.name.includes('Urban')) || brands[0];
    const aditya = employees.find((e) => e.employee_code === 'EMP014') || employees.find((e) => e.full_name.includes('Aditya')) || employees[1];
    const demoDate = `${year}-${String(month).padStart(2, '0')}-15`;

    setSimulationType('EMPLOYEE_ABSENCE');
    setStartDate(demoDate);
    setEndDate(demoDate);
    if (aditya) setEmployeeId(aditya.id);
    if (urban) setBrandId(urban.id);
    setReason('Canonical Demo: Multi-Resource Brand (UrbanKicks) team member absent - peers maintain coverage');

    handleRunSimulation({
      simulation_type: 'EMPLOYEE_ABSENCE',
      start_date: demoDate,
      end_date: demoDate,
      employee_id: aditya?.id,
      brand_id: urban?.id,
      reason: 'Canonical Demo: Multi-Resource Brand (UrbanKicks) team member absent - peers maintain coverage',
    });
  };

  // Save Scenario for Review
  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulationResult) return;
    setIsSavingScenario(true);

    try {
      const payload = {
        roster_id: rosterId,
        name: scenarioName || `${simulationType} Impact Scenario (${startDate})`,
        description: scenarioDescription || reason,
        simulation_type: simulationType,
        parameters: {
          simulation_type: simulationType,
          start_date: startDate,
          end_date: endDate,
          employee_id: employeeId,
          target_employee_id: selectedBackup?.employee_id || targetEmployeeId,
          brand_id: brandId,
          process_id: processId,
          reason,
        },
        impact_summary: {
          coverage_before: simulationResult.coverage_before,
          coverage_after: simulationResult.coverage_after,
          coverage_delta: simulationResult.coverage_delta,
          new_conflicts_count: simulationResult.newly_created_conflicts.length,
          can_absorb_without_replacement: simulationResult.can_absorb_without_replacement,
          top_replacement: selectedBackup?.full_name || null,
        },
      };

      await api.post('/simulator/scenarios', payload);
      triggerNotification('success', 'Scenario saved successfully for operational review.');
      setShowSaveModal(false);
      setScenarioName('');
      setScenarioDescription('');
      loadSavedScenarios();
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.detail || 'Failed to save scenario.');
    } finally {
      setIsSavingScenario(false);
    }
  };

  // Apply Scenario to Live Monthly Roster
  const handleApplyScenario = async () => {
    if (!simulationResult) return;
    setIsApplying(true);

    try {
      const payload = {
        roster_id: rosterId,
        simulation_type: simulationType,
        start_date: startDate,
        end_date: endDate,
        employee_id: employeeId,
        target_employee_id: selectedBackup?.employee_id || targetEmployeeId,
        brand_id: brandId,
        process_id: processId,
        reason: applyNotes || reason || 'Applied via RosterIQ Impact Simulator',
      };

      const res = await api.post<ApplyScenarioResponse>('/simulator/apply', payload);
      setShowApplyModal(false);
      triggerNotification('success', `Scenario applied to live roster! ${res.data.entries_updated} shifts mutated.`);

      if (onRosterUpdated) {
        onRosterUpdated();
      }
      loadSavedScenarios();
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.detail || 'Failed to apply scenario.');
    } finally {
      setIsApplying(false);
    }
  };

  // Apply a previously saved scenario
  const handleApplySavedScenario = async (scenario: ScenarioResponse) => {
    setIsApplying(true);
    try {
      await api.post<ApplyScenarioResponse>(`/simulator/scenarios/${scenario.id}/apply`, {
        notes: `Applied saved scenario #${scenario.id} (${scenario.name})`,
      });
      triggerNotification('success', `Saved scenario #${scenario.id} applied to live roster!`);
      if (onRosterUpdated) {
        onRosterUpdated();
      }
      loadSavedScenarios();
    } catch (err: any) {
      triggerNotification('error', err.response?.data?.detail || 'Failed to apply saved scenario.');
    } finally {
      setIsApplying(false);
    }
  };

  // Reset Simulator
  const handleReset = () => {
    setSimulationResult(null);
    setSelectedBackup(null);
    setActiveTab('configure');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl lg:max-w-3xl bg-[rgba(23,28,34,0.96)] backdrop-blur-[20px] shadow-2xl z-50 border-l border-white/10 flex flex-col transform transition-transform ease-out duration-300 text-[#F5F7FA]">
        {/* Drawer Header */}
        <div className="px-6 py-5 bg-[#0B0E12] border-b border-white/10 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950/60 border border-teal-500/30 flex items-center justify-center shadow-inner">
              <FlaskConical className="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight text-white">RosterIQ Impact Simulator</h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/60 text-[10px] font-mono font-bold uppercase tracking-wider">
                  In-Memory Sandbox
                </span>
              </div>
              <p className="text-xs text-[#A0AAB5] mt-0.5">
                Deterministic what-if modeling • Zero side-effects on live roster until approved
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#727E89] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 bg-[#090B0E] border-b border-white/10 flex items-center justify-between overflow-x-auto">
          <div className="flex space-x-1 py-2">
            <button
              onClick={() => setActiveTab('configure')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'configure'
                  ? 'bg-[rgba(30,36,43,0.92)] text-teal-300 shadow-sm border border-white/10'
                  : 'text-[#A0AAB5] hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. Configure Scenario</span>
            </button>

            <button
              onClick={() => setActiveTab('analysis')}
              disabled={!simulationResult}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'analysis'
                  ? 'bg-[rgba(30,36,43,0.92)] text-teal-300 shadow-sm border border-white/10'
                  : 'text-[#A0AAB5] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Impact Analysis</span>
              {simulationResult && (
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping ml-1" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('backups')}
              disabled={!simulationResult}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'backups'
                  ? 'bg-[rgba(30,36,43,0.92)] text-teal-300 shadow-sm border border-white/10'
                  : 'text-[#A0AAB5] hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>3. Smart Backups</span>
              {simulationResult?.backup_recommendations && simulationResult.backup_recommendations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-teal-950 text-teal-300 border border-teal-800 text-[10px] font-bold">
                  {simulationResult.backup_recommendations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'scenarios'
                  ? 'bg-[rgba(30,36,43,0.92)] text-teal-300 shadow-sm border border-white/10'
                  : 'text-[#A0AAB5] hover:text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Saved Scenarios</span>
              {savedScenarios.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                  {savedScenarios.length}
                </span>
              )}
            </button>
          </div>

          {simulationResult && (
            <button
              onClick={handleReset}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-600 flex items-center space-x-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Toast Notification Banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-sky-50 text-sky-800 border-sky-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CONFIGURE SCENARIO */}
          {activeTab === 'configure' && (
            <div className="space-y-6">
              {/* Quick Assessment Demonstration Bar */}
              <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200/80 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center space-x-2 text-teal-900 font-bold text-xs uppercase tracking-wider mb-2">
                  <Zap className="w-4 h-4 text-teal-600" />
                  <span>One-Click Assessment Demonstrations</span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Pre-configured operational edge cases mandated by the DataStraw Assessment requirements:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleLoadDemoSingleResource}
                    disabled={isSimulating}
                    className="p-3 bg-white hover:bg-teal-50/50 border border-teal-200 rounded-xl text-left transition-all hover:shadow-xs group disabled:opacity-50"
                  >
                    <div className="font-bold text-xs text-slate-800 group-hover:text-teal-700 flex items-center justify-between">
                      <span>⚡ Demo 1: Single-Resource Absence</span>
                      <ChevronRight className="w-3.5 h-3.5 text-teal-500" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Priya Sharma on GlowBotanics unavailable • Orphan gap & smart backup ranking.
                    </p>
                  </button>

                  <button
                    onClick={handleLoadDemoMultiResource}
                    disabled={isSimulating}
                    className="p-3 bg-white hover:bg-sky-50/50 border border-sky-200 rounded-xl text-left transition-all hover:shadow-xs group disabled:opacity-50"
                  >
                    <div className="font-bold text-xs text-slate-800 group-hover:text-sky-700 flex items-center justify-between">
                      <span>⚡ Demo 2: Multi-Resource Absorption</span>
                      <ChevronRight className="w-3.5 h-3.5 text-sky-500" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      UrbanKicks team member absence • Internal absorption by remaining peers.
                    </p>
                  </button>
                </div>
              </div>

              {/* Simulation Parameters Form */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-subtle">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800">Operational Change Parameters</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the change type and affected entity to test before committing to live schedule.
                  </p>
                </div>

                {/* Change Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Operational Change Event Type
                  </label>
                  <select
                    value={simulationType}
                    onChange={(e) => setSimulationType(e.target.value as SimulationType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="EMPLOYEE_ABSENCE">🚨 Sudden Employee Absence (Emergency / Unplanned)</option>
                    <option value="PLANNED_LEAVE">🏖️ Planned Leave Request</option>
                    <option value="COMP_OFF">🎁 Compensatory Off (Comp-Off) Utilization</option>
                    <option value="EMPLOYEE_REASSIGNMENT">🔄 Surgical Employee Shift Reassignment</option>
                    <option value="AVAILABILITY_CHANGE">⚙️ Employee Availability / Off-Day Change</option>
                    <option value="BRAND_RULE_CHANGE">🏢 Brand Operating-Day Rule Change</option>
                    <option value="PROCESS_STAFFING_CHANGE">👥 Process Staffing Minimum Headcount Change</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Start Date</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>End Date (Optional for multi-day)</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Primary Employee Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Employee
                  </label>
                  <select
                    value={employeeId || ''}
                    onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code}) — {emp.designation} [Pod {emp.pod_name || 'N/A'}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Employee (for Reassignment only) */}
                {simulationType === 'EMPLOYEE_REASSIGNMENT' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Replacement Employee (Substitute)
                    </label>
                    <select
                      value={targetEmployeeId || ''}
                      onChange={(e) => setTargetEmployeeId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Select Replacement Candidate --</option>
                      {employees
                        .filter((emp) => emp.id !== employeeId)
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.employee_code}) — {emp.designation}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Brand & Process Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Client Brand (Scope)
                    </label>
                    <select
                      value={brandId || ''}
                      onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- All Assigned Brands --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Process Workflow (Scope)
                    </label>
                    <select
                      value={processId || ''}
                      onChange={(e) => setProcessId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- All Assigned Processes --</option>
                      {processes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Operational Justification */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Operational Justification / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide operational rationale for this simulation scenario..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Submit Run Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleRunSimulation()}
                    disabled={isSimulating}
                    className="w-full py-3 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Play className={`w-4 h-4 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
                    <span>{isSimulating ? 'Computing In-Memory Simulation...' : 'Run Operational Simulation'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPACT ANALYSIS */}
          {activeTab === 'analysis' && simulationResult && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-app-sidebar text-white rounded-2xl p-5 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                      Simulation Executive Summary
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      simulationResult.is_viable
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {simulationResult.is_viable ? 'Viable Scenario' : 'Critical Shortfall Risk'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {simulationResult.executive_summary}
                </p>
              </div>

              {/* Multi-Resource Self Absorption Banner */}
              {simulationResult.can_absorb_without_replacement && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Self-Absorbing Multi-Resource Account Detected
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      {simulationResult.absorption_explanation ||
                        'Remaining active specialists on duty maintain 100% operational coverage. No external replacement is required.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Before and After KPI Comparison Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Coverage Gauge */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-subtle">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Roster Coverage
                  </div>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-lg font-bold text-slate-900">
                      {simulationResult.coverage_before}%
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span
                      className={`text-lg font-bold ${
                        simulationResult.coverage_after >= simulationResult.coverage_before
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {simulationResult.coverage_after}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Delta:{' '}
                    <span
                      className={`font-bold ${
                        simulationResult.coverage_delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {simulationResult.coverage_delta > 0 ? '+' : ''}
                      {simulationResult.coverage_delta}%
                    </span>
                  </div>
                </div>

                {/* Total Conflicts */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-subtle">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Unresolved Conflicts
                  </div>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-lg font-bold text-slate-900">
                      {simulationResult.total_conflicts_before}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span
                      className={`text-lg font-bold ${
                        simulationResult.total_conflicts_after > simulationResult.total_conflicts_before
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {simulationResult.total_conflicts_after}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Delta:{' '}
                    <span
                      className={`font-bold ${
                        simulationResult.conflicts_delta > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {simulationResult.conflicts_delta > 0 ? '+' : ''}
                      {simulationResult.conflicts_delta}
                    </span>
                  </div>
                </div>

                {/* Affected Entities */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-subtle">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Affected Entities
                  </div>
                  <div className="mt-1 text-base font-bold text-slate-800">
                    {simulationResult.affected_employees.length} Staff • {simulationResult.affected_brands.length} Brands
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Across {simulationResult.affected_dates.length} date(s)
                  </div>
                </div>

                {/* Smart Backups Available */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-subtle">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Eligible Backups
                  </div>
                  <div className="mt-1 text-base font-bold text-teal-600">
                    {simulationResult.backup_recommendations.length} Candidates
                  </div>
                  <button
                    onClick={() => setActiveTab('backups')}
                    className="text-[10px] font-bold text-teal-700 hover:underline mt-1 block"
                  >
                    View Ranked Pool &rarr;
                  </button>
                </div>
              </div>

              {/* Affected Brands Breakdown */}
              {simulationResult.affected_brands.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-subtle">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>Brand Operational Coverage Impact</span>
                  </h4>
                  <div className="space-y-2">
                    {simulationResult.affected_brands.map((b) => (
                      <div
                        key={b.brand_id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-900">{b.brand_name}</span>
                            {b.is_single_resource ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                Single-Resource Specialist Account
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                                Multi-Resource Team
                              </span>
                            )}
                          </div>
                          {b.absorption_note && (
                            <p className="text-[11px] text-slate-600 mt-1">{b.absorption_note}</p>
                          )}
                        </div>

                        <div className="text-right flex items-center space-x-2">
                          <div>
                            <div className="text-[11px] font-mono font-bold text-slate-700">
                              {b.coverage_before_pct}% &rarr; {b.coverage_after_pct}%
                            </div>
                            <span
                              className={`text-[10px] font-bold ${
                                b.coverage_delta_pct < 0 ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {b.coverage_delta_pct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Newly Created Conflicts Alert */}
              {simulationResult.newly_created_conflicts.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-subtle">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide mb-3 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Newly Triggered Policy & Coverage Conflicts ({simulationResult.newly_created_conflicts.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {simulationResult.newly_created_conflicts.map((conf, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-900">{conf.title}</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold font-mono">
                            {conf.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{conf.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cascading Effects Callouts */}
              {simulationResult.cascading_effects.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-xs">
                  <div className="font-bold uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Cascading Ripple Effects Across Brands</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] mt-2">
                    {simulationResult.cascading_effects.map((eff, i) => (
                      <li key={i}>{eff}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SMART BACKUP RECOMMENDATIONS */}
          {activeTab === 'backups' && simulationResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Smart Backup Candidate Pool</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ranked candidates evaluated by pod proximity, skill certifications, current workload, and labor laws.
                  </p>
                </div>
                {selectedBackup && (
                  <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200">
                    Selected: {selectedBackup.full_name}
                  </span>
                )}
              </div>

              {simulationResult.can_absorb_without_replacement && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
                  <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>
                    Note: This account is multi-resource and self-absorbs. Selecting a backup below is optional.
                  </span>
                </div>
              )}

              {simulationResult.backup_recommendations.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <UserCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No eligible backup candidates found.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    All candidates in this pod are either currently scheduled or exceed consecutive day limits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {simulationResult.backup_recommendations.map((cand) => {
                    const isSelected = selectedBackup?.employee_id === cand.employee_id;
                    return (
                      <div
                        key={cand.employee_id}
                        onClick={() => setSelectedBackup(cand)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-50/50 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-subtle'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                isSelected
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {cand.suitability_score}%
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900">{cand.full_name}</span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  ({cand.employee_code})
                                </span>
                                <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                  {cand.pod_name}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{cand.designation}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {cand.requires_comp_off && (
                              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                                +1 Comp-Off Credit
                              </span>
                            )}
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-teal-600 border-teal-600 text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {cand.match_reasons.map((r, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-medium"
                            >
                              ✓ {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAVED SCENARIOS */}
          {activeTab === 'scenarios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Saved Scenario Review Log</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Browse previously saved impact scenarios or apply an approved simulation.
                  </p>
                </div>
                <button
                  onClick={loadSavedScenarios}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingScenarios ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {savedScenarios.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Save className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No saved scenarios yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Run a simulation and click "Save Scenario" to preserve it for stakeholder review.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedScenarios.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-900">{sc.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sc.status === 'APPLIED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sc.status === 'SAVED'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {sc.status}
                            </span>
                          </div>
                          {sc.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{sc.description}</p>
                          )}
                        </div>

                        {sc.status !== 'APPLIED' && (
                          <button
                            onClick={() => handleApplySavedScenario(sc)}
                            disabled={isApplying}
                            className="px-3 py-1.5 rounded-xl bg-app-sidebar hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5 text-teal-400" />
                            <span>Apply to Roster</span>
                          </button>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center space-x-3 pt-1 border-t border-slate-100">
                        <span>Created by {sc.created_by_name || 'Operations Lead'}</span>
                        <span>•</span>
                        <span>{new Date(sc.created_at).toLocaleDateString()}</span>
                        {sc.applied_at && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">
                              Applied on {new Date(sc.applied_at).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Close
            </button>

            {simulationResult && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save for Review</span>
              </button>
            )}
          </div>

          {simulationResult && (
            <button
              onClick={() => setShowApplyModal(true)}
              disabled={isApplying}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Scenario to Live Roster</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Save Scenario for Review</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScenario} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Priya Sharma Medical Leave & Backup"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Additional context for operations managers..."
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingScenario}
                  className="px-4 py-2 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSavingScenario ? 'Saving...' : 'Save Scenario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Apply Scenario to Live Roster */}
      {showApplyModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Live Roster Mutation</h3>
                <p className="text-xs text-slate-500">
                  This action will persist the simulated changes to actual monthly schedule records.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Target Shift Date:</span>
                <span className="font-bold text-slate-800">{startDate}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Operation:</span>
                <span className="font-bold text-slate-800">{simulationType}</span>
              </div>
              {selectedBackup && (
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Assigned Replacement:</span>
                  <span className="font-bold text-teal-700">
                    {selectedBackup.full_name} ({selectedBackup.employee_code})
                  </span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Expected Live Coverage:</span>
                <span className="font-bold text-emerald-600">{simulationResult?.coverage_after}%</span>
              </div>
              <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-200">
                ✓ Mandatory constraints will be revalidated • Immutable audit log record created.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Approval Justification (Audit Record)
              </label>
              <input
                type="text"
                value={applyNotes}
                onChange={(e) => setApplyNotes(e.target.value)}
                placeholder="Approved by Operations Manager after simulation review"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyScenario}
                disabled={isApplying}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isApplying ? 'Applying to Live Roster...' : 'Confirm & Apply Scenario'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
