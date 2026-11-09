import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Brand, Pod } from '../types/management';
import {
  Users,
  Search,
  Filter,
  Eye,
  Edit2,
  X,
  Sparkles,
} from 'lucide-react';

export const BrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPod, setSelectedPod] = useState<string>('ALL');
  const [resourceFilter, setResourceFilter] = useState<'ALL' | 'SINGLE' | 'MULTI'>('ALL');
  const [viewingBrand, setViewingBrand] = useState<Brand | null>(null);
  const [editingRule, setEditingRule] = useState<Brand['process_rules'][0] | null>(null);
  const [editRuleType, setEditRuleType] = useState<Brand['process_rules'][0]['rule_type']>('EXCEPT_SUNDAYS_AND_HOLIDAYS');
  const [editHeadcount, setEditHeadcount] = useState<number>(1);
  const [ruleUpdateSuccess, setRuleUpdateSuccess] = useState<string | null>(null);

  const startEditRule = (rule: Brand['process_rules'][0]) => {
    setEditingRule(rule);
    setEditRuleType(rule.rule_type);
    setEditHeadcount(rule.min_headcount);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      await api.put(`/rules/${editingRule.id}`, {
        rule_type: editRuleType,
        min_headcount: editHeadcount,
      });
      setRuleUpdateSuccess(`Operating rule updated!`);
      setTimeout(() => setRuleUpdateSuccess(null), 3000);
      setEditingRule(null);
      
      const res = await api.get<Brand[]>('/brands');
      setBrands(res.data);
      if (viewingBrand) {
        const updated = res.data.find((b) => b.id === viewingBrand.id);
        if (updated) setViewingBrand(updated);
      }
    } catch (err) {
      alert('Failed to update operating rule.');
    }
  };

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const [brandRes, podRes] = await Promise.all([
        api.get<Brand[]>('/brands'),
        api.get<Pod[]>('/pods'),
      ]);
      setBrands(brandRes.data);
      setPods(podRes.data);
    } catch (err) {
      console.error('Failed to load brands', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      brand.name.toLowerCase().includes(search.toLowerCase()) ||
      brand.code.toLowerCase().includes(search.toLowerCase()) ||
      (brand.client_name && brand.client_name.toLowerCase().includes(search.toLowerCase()));

    const matchesPod =
      selectedPod === 'ALL' || (brand.pod_id && brand.pod_id.toString() === selectedPod);

    const matchesResource =
      resourceFilter === 'ALL' ||
      (resourceFilter === 'SINGLE' && brand.is_single_resource) ||
      (resourceFilter === 'MULTI' && !brand.is_single_resource);

    return matchesSearch && matchesPod && matchesResource;
  });

  const singleResourceCount = brands.filter((b) => b.is_single_resource).length;
  const multiResourceCount = brands.filter((b) => !b.is_single_resource).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-primaryText">D2C Brand Management</h1>
          <p className="text-sm text-app-secondaryText mt-0.5">
            Client accounts, operating calendars, process rules, and staffing patterns.
          </p>
        </div>

        <div className="inline-flex items-center space-x-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>80% Single-Resource / 20% Multi-Resource Enforced</span>
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Total D2C Brands</div>
          <div className="text-2xl font-bold text-app-primaryText mt-1">{brands.length}</div>
          <div className="text-[11px] text-app-secondaryText mt-0.5">Active client engagements</div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Single-Resource Brands</div>
          <div className="text-2xl font-bold text-teal-600 mt-1">{singleResourceCount}</div>
          <div className="text-[11px] text-teal-700 font-medium mt-0.5">
            {brands.length > 0 ? `${Math.round((singleResourceCount / brands.length) * 100)}% of client portfolio` : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">Multi-Resource Brands</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{multiResourceCount}</div>
          <div className="text-[11px] text-blue-700 font-medium mt-0.5">
            {brands.length > 0 ? `${Math.round((multiResourceCount / brands.length) * 100)}% high volume` : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-app-secondaryText">365-Day Operations</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {brands.filter((b) => b.process_rules.some((r) => r.rule_type === 'EVERY_DAY_365')).length}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">Includes Sundays & Holidays</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-enterprise border border-app-border shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-app-secondaryText absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands or corporate client..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-app-border text-sm text-app-primaryText placeholder-app-secondaryText focus:outline-none focus:ring-2 focus:ring-app-primaryAccent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Resource Model Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => setResourceFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                resourceFilter === 'ALL' ? 'bg-white shadow-sm font-semibold text-app-primaryText' : 'text-slate-600'
              }`}
            >
              All ({brands.length})
            </button>
            <button
              onClick={() => setResourceFilter('SINGLE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                resourceFilter === 'SINGLE' ? 'bg-teal-600 text-white font-semibold shadow-sm' : 'text-slate-600'
              }`}
            >
              80% Single ({singleResourceCount})
            </button>
            <button
              onClick={() => setResourceFilter('MULTI')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                resourceFilter === 'MULTI' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600'
              }`}
            >
              20% Multi ({multiResourceCount})
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-app-secondaryText" />
            <select
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-app-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-app-primaryAccent"
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

      {/* Brands Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-app-secondaryText">
            Loading D2C brands and operating rules...
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="col-span-full text-center py-12 text-app-secondaryText">
            No brands found matching criteria.
          </div>
        ) : (
          filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="bg-white rounded-enterprise border border-app-border p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                {/* Brand Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 font-bold text-base flex items-center justify-center border border-teal-100 flex-shrink-0">
                      {brand.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-app-primaryText text-base leading-tight">
                        {brand.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {brand.code} · {brand.pod_name?.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                      brand.is_single_resource
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {brand.is_single_resource ? 'Dedicated Agent' : 'Multi-Resource'}
                  </span>
                </div>

                <p className="text-xs text-app-secondaryText line-clamp-1 mb-3">
                  Client: {brand.client_name || 'Direct Brand Enterprise'}
                </p>

                {/* Assigned Workforce */}
                <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Assigned Staff ({brand.assigned_employees.length})</span>
                    <span className="text-[10px] text-teal-600 font-bold">
                      {brand.assigned_count} Primary
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {brand.assigned_employees.slice(0, 3).map((emp, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800 flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.full_name}</span>
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            emp.assignment_type === 'PRIMARY'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {emp.process_name.split(' ')[0]} ({emp.assignment_type})
                        </span>
                      </div>
                    ))}
                    {brand.assigned_employees.length > 3 && (
                      <div className="text-[11px] text-slate-500 italic pt-1">
                        +{brand.assigned_employees.length - 3} additional specialist(s)
                      </div>
                    )}
                  </div>
                </div>

                {/* Operating Rules Preview */}
                <div className="space-y-1 mb-4">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Operating Calendars
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {brand.process_rules.map((rule) => (
                      <span
                        key={rule.id}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          rule.rule_type === 'EVERY_DAY_365'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {rule.process_code}: {rule.rule_type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="pt-3 border-t border-app-border flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  {brand.process_rules.length} Configured Rules
                </span>
                <button
                  onClick={() => setViewingBrand(brand)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Brand Detail Modal */}
      {viewingBrand && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-app-border max-w-2xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setViewingBrand(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 font-bold text-xl flex items-center justify-center flex-shrink-0 border border-teal-100">
                {viewingBrand.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-app-primaryText">{viewingBrand.name}</h3>
                <p className="text-xs text-app-secondaryText">{viewingBrand.client_name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border">
                    {viewingBrand.code}
                  </span>
                  <span className="text-[11px] text-teal-700 font-medium">
                    {viewingBrand.pod_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Operating Rules Table */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Process Operating Schedules & Headcount Requirements
              </h4>
              <div className="border border-app-border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-app-border text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Process</th>
                      <th className="py-2.5 px-3">Operating Rule</th>
                      <th className="py-2.5 px-3">Min Headcount</th>
                      <th className="py-2.5 px-3">Shift Hours</th>
                      <th className="py-2.5 px-3 text-right">Configure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {viewingBrand.process_rules.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {r.process_name} ({r.process_code})
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-medium text-[10px] ${
                              r.rule_type === 'EVERY_DAY_365'
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r.rule_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-teal-600">{r.min_headcount} agent(s)</td>
                        <td className="py-2 px-3 text-slate-600">
                          {r.shift_start_time} - {r.shift_end_time}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => startEditRule(r)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-colors"
                            title="Edit operating calendar & headcount"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ruleUpdateSuccess && (
                <div className="mt-2 text-xs font-semibold text-emerald-600">
                  ✓ {ruleUpdateSuccess}
                </div>
              )}

              {/* Inline Rule Editor Form */}
              {editingRule && (
                <form onSubmit={handleSaveRule} className="mt-3 p-3.5 rounded-xl bg-teal-50/50 border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-900 text-xs">
                      Configuring Rule: {editingRule.process_name}
                    </span>
                    <button type="button" onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Operating Calendar Rule</label>
                      <select
                        value={editRuleType}
                        onChange={(e) => setEditRuleType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-app-border bg-white text-xs"
                      >
                        <option value="EVERY_DAY_365">365-Day Operations (Sundays & Holidays ON)</option>
                        <option value="EXCEPT_PUBLIC_HOLIDAYS">Daily Operations (Public Holidays OFF)</option>
                        <option value="EXCEPT_SUNDAYS_AND_HOLIDAYS">Mon-Sat (Sundays & Holidays OFF)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Required Daily Min Headcount</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={editHeadcount}
                        onChange={(e) => setEditHeadcount(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-app-border bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingRule(null)}
                      className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-teal-600 text-white font-semibold text-xs shadow-sm hover:bg-teal-700"
                    >
                      Save Operating Rule
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Assigned Staff */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Assigned Team Members ({viewingBrand.assigned_employees.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {viewingBrand.assigned_employees.map((emp, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl border border-app-border bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{emp.full_name}</div>
                      <div className="text-[10px] text-slate-500">
                        {emp.designation} · {emp.process_name}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        emp.assignment_type === 'PRIMARY'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {emp.assignment_type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-app-border flex justify-end">
              <button
                onClick={() => setViewingBrand(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
