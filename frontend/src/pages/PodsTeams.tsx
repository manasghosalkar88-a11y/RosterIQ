import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Pod, Employee } from '../types/management';
import { UserCheck, Shield } from 'lucide-react';

export const PodsTeamsPage: React.FC = () => {
  const [pods, setPods] = useState<Pod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPodsAndStaff = async () => {
    setIsLoading(true);
    try {
      const [podRes, empRes] = await Promise.all([
        api.get<Pod[]>('/pods'),
        api.get<Employee[]>('/employees'),
      ]);
      setPods(podRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error('Failed to load pods and staff', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPodsAndStaff();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-primaryText">Operational Pods & Teams</h1>
          <p className="text-sm text-app-secondaryText mt-0.5">
            5 operational pods overseen by pod leads, managing cross-functional brand teams.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>Pod-Level Scoping & Oversight</span>
        </span>
      </div>

      {/* Pod Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-app-secondaryText">
            Loading operational pods and team structures...
          </div>
        ) : (
          pods.map((pod) => {
            const podEmployees = employees.filter((e) => e.pod_id === pod.id);

            return (
              <div
                key={pod.id}
                className="bg-white rounded-enterprise border border-app-border p-6 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Pod Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase font-semibold">
                        {pod.code}
                      </span>
                      <h3 className="font-bold text-app-primaryText text-lg mt-1.5">{pod.name}</h3>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mt-1" />
                  </div>

                  <p className="text-xs text-app-secondaryText mb-4 line-clamp-2">
                    {pod.description || 'Specialized operational pod supporting client engagements.'}
                  </p>

                  {/* Pod Lead Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Designated Pod Lead
                    </span>
                    {pod.lead ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 text-teal-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {pod.lead.full_name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-sm text-app-primaryText truncate">
                            {pod.lead.full_name}
                          </div>
                          <div className="text-[11px] text-teal-600 truncate">{pod.lead.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No pod lead assigned</span>
                    )}
                  </div>

                  {/* Pod Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-100 text-center">
                      <div className="text-base font-bold text-teal-700">{pod.employee_count}</div>
                      <div className="text-[11px] text-slate-500">Staff Members</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                      <div className="text-base font-bold text-blue-700">{pod.brand_count}</div>
                      <div className="text-[11px] text-slate-500">Managed Brands</div>
                    </div>
                  </div>

                  {/* Team Members List Preview */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Active Team Members ({podEmployees.length})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {podEmployees.slice(0, 5).map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0"
                        >
                          <span className="font-medium text-slate-700 truncate">{e.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{e.employee_code}</span>
                        </div>
                      ))}
                      {podEmployees.length > 5 && (
                        <div className="text-[11px] text-slate-400 italic pt-1">
                          +{podEmployees.length - 5} more pod members
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-app-border mt-4 flex items-center justify-between text-xs text-app-secondaryText">
                  <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Operational Pod Active</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
