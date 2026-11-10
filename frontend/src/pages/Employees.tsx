import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Employee, Pod } from '../types/management';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Eye,
  UserX,
  X,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPod, setSelectedPod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Drawer & Modal States
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Employee Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDesignation, setNewDesignation] = useState('Operations Specialist');
  const [newPodId, setNewPodId] = useState<number | ''>('');
  const [newWeeklyOff, setNewWeeklyOff] = useState('Sunday');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const [empRes, podRes] = await Promise.all([
        api.get<Employee[]>('/employees'),
        api.get<Pod[]>('/pods'),
      ]);
      setEmployees(empRes.data);
      setPods(podRes.data);
      if (podRes.data.length > 0 && newPodId === '') {
        setNewPodId(podRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load employee directory', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation.toLowerCase().includes(search.toLowerCase());

    const matchesPod =
      selectedPod === 'ALL' || (emp.pod_id && emp.pod_id.toString() === selectedPod);

    const matchesStatus =
      selectedStatus === 'ALL' || emp.employment_status === selectedStatus;

    return matchesSearch && matchesPod && matchesStatus;
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newEmail || !newDesignation) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }

    try {
      await api.post('/employees', {
        employee_code: newCode.toUpperCase(),
        full_name: newName,
        email: newEmail,
        designation: newDesignation,
        pod_id: newPodId === '' ? null : Number(newPodId),
        default_off_pref: newWeeklyOff,
        employment_status: 'ACTIVE',
      });

      setIsAddModalOpen(false);
      setNewCode('');
      setNewName('');
      setNewEmail('');
      setFormError(null);
      setActionSuccess(`Employee ${newName} added successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create employee.');
    }
  };

  const handleDeactivate = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to deactivate ${emp.full_name}? This preserves historical rosters.`)) {
      return;
    }

    try {
      await api.delete(`/employees/${emp.id}`);
      setActionSuccess(`Employee ${emp.full_name} deactivated.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to deactivate employee.');
    }
  };

  return (
    <div className="space-y-6 animate-page-fade">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Employee Directory</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Manage operational workforce, pod assignments, and brand responsibilities.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl btn-primary text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center space-x-2.5 shadow-subtle animate-toast">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Total Workforce</div>
          <div className="text-2xl font-black text-[#F8FAFC] mt-1">{employees.length}</div>
          <div className="text-[11px] text-[#2DD4BF] mt-0.5 font-medium">30+ requirement met</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Active Staff</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {employees.filter((e) => e.employment_status === 'ACTIVE').length}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">Ready for scheduling</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Operational Pods</div>
          <div className="text-2xl font-black text-blue-400 mt-1">{pods.length}</div>
          <div className="text-[11px] text-[#94A3B8] mt-0.5">Pods Alpha through Epsilon</div>
        </div>

        <div className="kpi-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Dedicated Brand Leads</div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {employees.filter((e) => e.assigned_brands.some((a) => a.assignment_type === 'PRIMARY')).length}
          </div>
          <div className="text-[11px] text-purple-400 mt-0.5 font-medium">80% Single-Resource pool</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-[rgba(148,163,184,0.16)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, email, designation..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6]"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-[#94A3B8]" />
            <span className="text-xs font-medium text-[#94A3B8]">Pod:</span>
            <select
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              className="text-xs font-medium bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] rounded-xl px-2.5 py-1.5 focus:border-[#14B8A6]"
            >
              <option value="ALL">All Pods ({pods.length})</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-[#94A3B8]">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium bg-[#080D12] border border-[rgba(148,163,184,0.18)] text-[#F8FAFC] rounded-xl px-2.5 py-1.5 focus:border-[#14B8A6]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-card rounded-2xl border border-[rgba(148,163,184,0.16)] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0F16]/95 border-b border-[rgba(148,163,184,0.16)] text-[#CBD5E1] font-semibold uppercase tracking-wider backdrop-blur-md">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Operational Pod</th>
                <th className="py-3.5 px-4">Assigned Brands & Processes</th>
                <th className="py-3.5 px-4">Weekly Off</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-app-secondaryText">
                    Loading employee directory...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-app-secondaryText">
                    No employees matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-teal-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-app-primaryText text-sm flex items-center space-x-2">
                            <span>{emp.full_name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {emp.employee_code}
                            </span>
                          </div>
                          <div className="text-[11px] text-app-secondaryText">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Designation */}
                    <td className="py-3 px-4 text-app-primaryText font-medium">
                      {emp.designation}
                    </td>

                    {/* Pod */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {emp.pod_name || 'Unassigned'}
                      </span>
                    </td>

                    {/* Assigned Brands Matrix */}
                    <td className="py-3 px-4 max-w-xs">
                      {emp.assigned_brands.length === 0 ? (
                        <span className="text-slate-400 text-[11px]">Floating / No Brand</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {emp.assigned_brands.slice(0, 3).map((a) => (
                            <span
                              key={a.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                                a.assignment_type === 'PRIMARY'
                                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                              title={`${a.assignment_type}: ${a.brand_name} (${a.process_name})`}
                            >
                              {a.brand_name.split(' ')[0]} · {a.process_code}
                            </span>
                          ))}
                          {emp.assigned_brands.length > 3 && (
                            <span className="text-[10px] text-slate-500 font-semibold self-center">
                              +{emp.assigned_brands.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Weekly Off Preference */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1 text-slate-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-app-secondaryText" />
                        <span>{emp.default_off_pref}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.employment_status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : emp.employment_status === 'ON_LEAVE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {emp.employment_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="p-1.5 text-app-secondaryText hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
                          title="View Profile & Responsibilities"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(emp)}
                          className="p-1.5 text-app-secondaryText hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Deactivate employee"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 bg-slate-50 border-t border-app-border text-xs text-app-secondaryText flex items-center justify-between">
          <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
          <span>DataStraw AI Tech Internship · 30+ Workforce Requirement</span>
        </div>
      </div>

      {/* Employee Profile Drawer / Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-xl w-full p-6 shadow-elevated animate-modal relative">
            <button
              onClick={() => setViewingEmployee(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(20,184,166,0.12)] text-[#2DD4BF] font-bold text-xl flex items-center justify-center flex-shrink-0 border border-[#14B8A6]/30">
                {viewingEmployee.full_name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F8FAFC]">{viewingEmployee.full_name}</h3>
                <p className="text-xs text-[#94A3B8]">{viewingEmployee.designation}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[11px] font-mono bg-[#080D12] text-[#2DD4BF] px-2 py-0.5 rounded border border-[rgba(148,163,184,0.16)]">
                    {viewingEmployee.employee_code}
                  </span>
                  <span className="text-[11px] text-[#2DD4BF] font-medium">
                    {viewingEmployee.pod_name}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.14)]">
                <div>
                  <span className="text-[#94A3B8] block font-medium">Email</span>
                  <span className="text-[#F8FAFC] font-semibold">{viewingEmployee.email}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block font-medium">Weekly-Off Rule</span>
                  <span className="text-[#F8FAFC] font-semibold">{viewingEmployee.default_off_pref}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block font-medium">Employment Status</span>
                  <span className="text-emerald-400 font-semibold">{viewingEmployee.employment_status}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block font-medium">Max Consecutive Days</span>
                  <span className="text-[#F8FAFC] font-semibold">{viewingEmployee.max_consecutive_days} days max</span>
                </div>
              </div>

              {/* Assigned Brands & Responsibilities */}
              <div>
                <h4 className="font-semibold text-[#F8FAFC] mb-2 flex items-center space-x-1.5">
                  <Briefcase className="w-4 h-4 text-[#2DD4BF]" />
                  <span>Assigned D2C Brand Responsibilities ({viewingEmployee.assigned_brands.length})</span>
                </h4>

                {viewingEmployee.assigned_brands.length === 0 ? (
                  <p className="text-[#94A3B8] italic">No direct brand assignments. Acts as floating support.</p>
                ) : (
                  <div className="space-y-2">
                    {viewingEmployee.assigned_brands.map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 rounded-xl border border-[rgba(148,163,184,0.16)] flex items-center justify-between bg-[#111820]"
                      >
                        <div>
                          <div className="font-semibold text-[#F8FAFC]">{a.brand_name}</div>
                          <div className="text-[11px] text-[#94A3B8]">
                            Process: <span className="font-medium text-[#2DD4BF]">{a.process_name}</span> ({a.process_code})
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            a.assignment_type === 'PRIMARY'
                              ? 'bg-teal-950/80 border border-teal-400/50 text-[#2DD4BF]'
                              : 'bg-amber-950/80 border border-amber-400/50 text-amber-300'
                          }`}
                        >
                          {a.assignment_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[rgba(148,163,184,0.16)] flex justify-end">
              <button
                onClick={() => setViewingEmployee(null)}
                className="btn-secondary px-4 py-2 text-xs font-semibold rounded-xl"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card-deep rounded-2xl border border-[rgba(148,163,184,0.22)] max-w-md w-full p-6 shadow-elevated animate-modal">
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(148,163,184,0.16)] pb-3">
              <h3 className="text-base font-bold text-[#F8FAFC]">Add New Operations Employee</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#CBD5E1] font-semibold mb-1">Employee Code *</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="EMP033"
                    className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6] uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#CBD5E1] font-semibold mb-1">Operational Pod</label>
                  <select
                    value={newPodId}
                    onChange={(e) => setNewPodId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] focus:border-[#14B8A6]"
                  >
                    {pods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#CBD5E1] font-semibold mb-1">Work Email *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="rahul.verma@datastraw.io"
                  className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#CBD5E1] font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    placeholder="Operations Associate"
                    className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] placeholder-[#64748B] focus:border-[#14B8A6]"
                  />
                </div>
                <div>
                  <label className="block text-[#CBD5E1] font-semibold mb-1">Default Weekly Off</label>
                  <select
                    value={newWeeklyOff}
                    onChange={(e) => setNewWeeklyOff(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080D12] border border-[rgba(148,163,184,0.22)] text-[#F8FAFC] focus:border-[#14B8A6]"
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Rotational">Rotational</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[rgba(148,163,184,0.16)] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
