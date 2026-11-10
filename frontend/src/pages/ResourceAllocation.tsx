import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Pod, Brand, Process } from '../types/management';
import {
  Plus,
  Search,
  Filter,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

interface MatrixCell {
  allocation_id: number;
  brand_id: number;
  brand_name: string;
  brand_code: string;
  process_id: number;
  process_name: string;
  process_code: string;
  assignment_type: 'PRIMARY' | 'SECONDARY' | 'BACKUP';
}

interface EmployeeMatrixRow {
  employee_id: number;
  employee_code: string;
  full_name: string;
  designation: string;
  pod_id?: number | null;
  pod_name?: string | null;
  default_off_pref: string;
  primary_brand_count: number;
  backup_brand_count: number;
  assignments: MatrixCell[];
}

export const ResourceAllocationPage: React.FC = () => {
  const [matrix, setMatrix] = useState<EmployeeMatrixRow[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPod, setSelectedPod] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRIMARY' | 'BACKUP'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');
  const [selectedBrandId, setSelectedBrandId] = useState<number | ''>('');
  const [selectedProcId, setSelectedProcId] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<'PRIMARY' | 'BACKUP'>('PRIMARY');
  const [modalError, setModalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [matrixRes, podRes, brandRes, procRes] = await Promise.all([
        api.get<EmployeeMatrixRow[]>('/allocations/matrix'),
        api.get<Pod[]>('/pods'),
        api.get<Brand[]>('/brands'),
        api.get<Process[]>('/processes'),
      ]);
      setMatrix(matrixRes.data);
      setPods(podRes.data);
      setBrands(brandRes.data);
      setProcesses(procRes.data);

      if (matrixRes.data.length > 0 && selectedEmpId === '') {
        setSelectedEmpId(matrixRes.data[0].employee_id);
      }
      if (brandRes.data.length > 0 && selectedBrandId === '') {
        setSelectedBrandId(brandRes.data[0].id);
      }
      if (procRes.data.length > 0 && selectedProcId === '') {
        setSelectedProcId(procRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load resource matrix', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMatrix = matrix.filter((row) => {
    const matchesSearch =
      row.full_name.toLowerCase().includes(search.toLowerCase()) ||
      row.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      row.assignments.some(
        (a) =>
          a.brand_name.toLowerCase().includes(search.toLowerCase()) ||
          a.process_name.toLowerCase().includes(search.toLowerCase())
      );

    const matchesPod =
      selectedPod === 'ALL' || (row.pod_id && row.pod_id.toString() === selectedPod);

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'PRIMARY' && row.primary_brand_count > 0) ||
      (typeFilter === 'BACKUP' && row.backup_brand_count > 0);

    return matchesSearch && matchesPod && matchesType;
  });

  // Calculate Incompatibility Warning for Modal
  const getCompatibilityWarning = () => {
    if (!selectedEmpId || !selectedBrandId) return null;
    const targetEmp = matrix.find((m) => m.employee_id === Number(selectedEmpId));
    const targetBrand = brands.find((b) => b.id === Number(selectedBrandId));
    if (!targetEmp || !targetBrand) return null;

    if (targetEmp.primary_brand_count >= 1 && selectedType === 'PRIMARY') {
      const primaryAssignment = targetEmp.assignments.find((a) => a.assignment_type === 'PRIMARY');
      return `⚠️ Notice: ${targetEmp.full_name} is already designated as Primary on '${primaryAssignment?.brand_name}'. Assigning them as Primary to '${targetBrand.name}' creates concurrent primary responsibilities. Consider assigning as 'BACKUP' instead.`;
    }

    if (targetEmp.pod_id && targetBrand.pod_id && targetEmp.pod_id !== targetBrand.pod_id) {
      return `ℹ️ Cross-Pod Assignment: ${targetEmp.full_name} is in ${targetEmp.pod_name}, whereas ${targetBrand.name} belongs to another pod. This will create a cross-pod operational link.`;
    }

    return null;
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedBrandId || !selectedProcId) {
      setModalError('Please select employee, brand, and process.');
      return;
    }

    try {
      await api.post('/allocations', {
        employee_id: Number(selectedEmpId),
        brand_id: Number(selectedBrandId),
        process_id: Number(selectedProcId),
        assignment_type: selectedType,
        is_active: true,
      });

      setIsModalOpen(false);
      setModalError(null);
      setNotification('Resource allocation successfully saved and validated!');
      setTimeout(() => setNotification(null), 4000);
      fetchData();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to save allocation.');
    }
  };

  const handleDeleteAllocation = async (allocId: number, empName: string, brandName: string) => {
    if (!window.confirm(`Remove assignment for ${empName} on ${brandName}?`)) return;

    try {
      await api.delete(`/allocations/${allocId}`);
      setNotification(`Assignment removed.`);
      setTimeout(() => setNotification(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove assignment.');
    }
  };

  const warning = getCompatibilityWarning();

  return (
    <div className="space-y-6 animate-page-fade">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Resource Allocation Matrix</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Visual Employee → Pod → Brand → Process relationship mapping and cross-training control.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-primary text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Staff to Brand</span>
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center space-x-2.5 shadow-subtle animate-toast">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Total Allocations</div>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">
            {matrix.reduce((acc, row) => acc + row.assignments.length, 0)}
          </div>
          <div className="text-[11px] text-[#2DD4BF] font-medium mt-0.5">Active Staffing Links</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Dedicated Specialists</div>
          <div className="text-2xl font-black text-[#2DD4BF] mt-1">
            {matrix.filter((m) => m.primary_brand_count === 1).length}
          </div>
          <div className="text-[11px] text-[#2DD4BF] font-medium mt-0.5">80% Single-Resource pool</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Cross-Trained Backups</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {matrix.reduce((acc, row) => acc + row.backup_brand_count, 0)}
          </div>
          <div className="text-[11px] text-amber-400 font-medium mt-0.5">Standby for leaves & offs</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Multi-Brand Agents</div>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {matrix.filter((m) => m.primary_brand_count + m.backup_brand_count > 1).length}
          </div>
          <div className="text-[11px] text-blue-400 font-medium mt-0.5">Cross-brand coverage</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4 rounded-2xl border border-[rgba(148,163,184,0.16)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, brand or process..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Assignment Type Filter */}
          <div className="inline-flex rounded-xl bg-[#080D12] p-1 text-xs font-medium border border-[rgba(148,163,184,0.14)]">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'ALL' ? 'bg-[#151D25] shadow-sm font-semibold text-[#F8FAFC]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              All Staff ({matrix.length})
            </button>
            <button
              onClick={() => setTypeFilter('PRIMARY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'PRIMARY' ? 'bg-teal-950/80 text-[#2DD4BF] font-semibold border border-teal-500/40 shadow-sm' : 'text-[#94A3B8] hover:text-[#2DD4BF]'
              }`}
            >
              Primary Only
            </button>
            <button
              onClick={() => setTypeFilter('BACKUP')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === 'BACKUP' ? 'bg-amber-950/80 text-amber-300 font-semibold border border-amber-500/40 shadow-sm' : 'text-[#94A3B8] hover:text-amber-300'
              }`}
            >
              Has Backups
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-[#94A3B8]" />
            <select
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              className="text-xs font-medium bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] rounded-xl px-2.5 py-1.5 focus:border-[#14B8A6]"
            >
              <option value="ALL">All Pods</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Relationship Table */}
      <div className="bg-white rounded-enterprise border border-app-border shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-app-border text-app-secondaryText font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Operational Pod</th>
                <th className="py-3.5 px-4">Weekly Off</th>
                <th className="py-3.5 px-4">Primary Brand Allocations</th>
                <th className="py-3.5 px-4">Standby / Backup Allocations</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-app-secondaryText">
                    Loading allocation matrix...
                  </td>
                </tr>
              ) : filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-app-secondaryText">
                    No matching employee allocations found.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map((row) => {
                  const primaryAssignments = row.assignments.filter((a) => a.assignment_type === 'PRIMARY');
                  const backupAssignments = row.assignments.filter((a) => a.assignment_type === 'BACKUP');

                  return (
                    <tr key={row.employee_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {row.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-app-primaryText text-sm flex items-center space-x-1.5">
                              <span>{row.full_name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {row.employee_code}
                              </span>
                            </div>
                            <div className="text-[11px] text-app-secondaryText">{row.designation}</div>
                          </div>
                        </div>
                      </td>

                      {/* Pod */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {row.pod_name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Weekly Off */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {row.default_off_pref}
                      </td>

                      {/* Primary Allocations */}
                      <td className="py-3 px-4">
                        {primaryAssignments.length === 0 ? (
                          <span className="text-slate-400 text-[11px] italic">None (Floating Staff)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {primaryAssignments.map((a) => (
                              <div
                                key={a.allocation_id}
                                className="group relative inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-medium shadow-2xs"
                              >
                                <span>{a.brand_name.split(' ')[0]}</span>
                                <span className="text-teal-600 font-mono text-[9px] font-bold">[{a.process_code}]</span>
                                <button
                                  onClick={() => handleDeleteAllocation(a.allocation_id, row.full_name, a.brand_name)}
                                  className="text-teal-400 hover:text-rose-600 ml-1 transition-colors"
                                  title="Remove assignment"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Backup Allocations */}
                      <td className="py-3 px-4">
                        {backupAssignments.length === 0 ? (
                          <span className="text-slate-400 text-[11px] italic">No backup roles</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {backupAssignments.map((a) => (
                              <div
                                key={a.allocation_id}
                                className="group relative inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium shadow-2xs"
                              >
                                <span>{a.brand_name.split(' ')[0]}</span>
                                <span className="text-amber-600 font-mono text-[9px] font-bold">[{a.process_code}]</span>
                                <button
                                  onClick={() => handleDeleteAllocation(a.allocation_id, row.full_name, a.brand_name)}
                                  className="text-amber-400 hover:text-rose-600 ml-1 transition-colors"
                                  title="Remove backup assignment"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status indicator */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.primary_brand_count === 1
                              ? 'bg-teal-100 text-teal-800'
                              : row.primary_brand_count > 1
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.primary_brand_count === 1
                            ? 'Dedicated Specialist'
                            : row.primary_brand_count > 1
                            ? 'Multi-Brand Lead'
                            : 'Cross-Trained Backup'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep border border-[rgba(148,163,184,0.22)] shadow-elevated animate-modal max-w-lg w-full p-6 text-[#F8FAFC]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#F8FAFC]">Allocate Resource to Client Account</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-[#2DD4BF] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {warning && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs leading-relaxed flex items-start space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            )}

            <form onSubmit={handleCreateAllocation} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Select Employee *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.2)] text-[#F8FAFC] focus:border-[#14B8A6] focus:outline-none"
                  required
                >
                  {matrix.map((m) => (
                    <option key={m.employee_id} value={m.employee_id}>
                      {m.full_name} ({m.employee_code}) · {m.pod_name || 'No Pod'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#CBD5E1] font-semibold mb-1">Target D2C Brand *</label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.2)] text-[#F8FAFC] focus:border-[#14B8A6] focus:outline-none"
                    required
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.is_single_resource ? 'Single' : 'Multi'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#CBD5E1] font-semibold mb-1">Operational Process *</label>
                  <select
                    value={selectedProcId}
                    onChange={(e) => setSelectedProcId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.2)] text-[#F8FAFC] focus:border-[#14B8A6] focus:outline-none"
                    required
                  >
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Assignment Role Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2 cursor-pointer transition-all ${
                      selectedType === 'PRIMARY'
                        ? 'border-[#14B8A6] bg-[rgba(20,184,166,0.12)] text-[#2DD4BF] font-semibold shadow-sm'
                        : 'border-[rgba(148,163,184,0.16)] bg-[#080D12] text-[#94A3B8]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleType"
                      checked={selectedType === 'PRIMARY'}
                      onChange={() => setSelectedType('PRIMARY')}
                      className="text-[#14B8A6] focus:ring-[#14B8A6]"
                    />
                    <div>
                      <div className="text-xs">Primary Responsible</div>
                      <div className="text-[10px] text-[#94A3B8] font-normal">Dedicated day-to-day staff</div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2 cursor-pointer transition-all ${
                      selectedType === 'BACKUP'
                        ? 'border-amber-500 bg-[rgba(245,158,11,0.12)] text-amber-300 font-semibold shadow-sm'
                        : 'border-[rgba(148,163,184,0.16)] bg-[#080D12] text-[#94A3B8]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleType"
                      checked={selectedType === 'BACKUP'}
                      onChange={() => setSelectedType('BACKUP')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs">Standby Backup</div>
                      <div className="text-[10px] text-[#94A3B8] font-normal">Covers weekly offs & leaves</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-[rgba(148,163,184,0.16)] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-3 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-xs"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
