import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import type { Pod, Employee, Brand, Process } from '../types/management';
import CircularCarousel from '../components/reactbits/CircularCarousel';
import {
  UserCheck,
  Shield,
  Users,
  Building2,
  Cpu,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Play,
  Pause,
  Layers,
  Search,
} from 'lucide-react';

interface PodsTeamsPageProps {
  onNavigate?: (moduleName: string) => void;
}

const POD_IMAGE_MAP: Record<string, string> = {
  'POD-LIFESTYLE': '/images/pod-alpha.jpg',
  'POD-BEAUTY': '/images/pod-beta.jpg',
  'POD-FOOD': '/images/pod-gamma.jpg',
  'POD-ELECTRONICS': '/images/pod-delta.jpg',
  'POD-HOME': '/images/pod-epsilon.jpg',
};

const getPodImage = (code: string, id: number): string => {
  if (POD_IMAGE_MAP[code]) return POD_IMAGE_MAP[code];
  const byId = ['/images/pod-alpha.jpg', '/images/pod-beta.jpg', '/images/pod-gamma.jpg', '/images/pod-delta.jpg', '/images/pod-epsilon.jpg'];
  return byId[(id - 1) % 5] || '/images/pod-alpha.jpg';
};

export const PodsTeamsPage: React.FC<PodsTeamsPageProps> = ({ onNavigate }) => {
  const [pods, setPods] = useState<Pod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carousel & Selection State
  const [selectedPodIndex, setSelectedPodIndex] = useState(0);
  const [autoplayState, setAutoplayState] = useState<'drift' | 'off'>('drift');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const explorerRef = useRef<HTMLDivElement>(null);

  const fetchPodsAndStaff = async () => {
    setIsLoading(true);
    try {
      const [podRes, empRes, brandRes, procRes, confRes] = await Promise.all([
        api.get<Pod[]>('/pods'),
        api.get<Employee[]>('/employees'),
        api.get<Brand[]>('/brands').catch(() => ({ data: [] })),
        api.get<Process[]>('/processes').catch(() => ({ data: [] })),
        api.get<any[]>('/conflicts').catch(() => ({ data: [] })),
      ]);
      setPods(podRes.data || []);
      setEmployees(empRes.data || []);
      setBrands(brandRes.data || []);
      setProcesses(procRes.data || []);
      setConflicts(confRes.data || []);
    } catch (err) {
      console.error('Failed to load pods and staff', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPodsAndStaff();
  }, []);

  // Map database pods into CircularCarousel items
  const carouselItems = useMemo(() => {
    if (!pods || pods.length === 0) return [];
    return pods.map((pod) => {
      const nameParts = pod.name.split('(');
      const shortTitle = nameParts[0].trim();
      const category = nameParts[1] ? nameParts[1].replace(')', '').trim() : pod.code;
      return {
        src: getPodImage(pod.code, pod.id),
        alt: `${pod.name} workforce operations card`,
        title: shortTitle,
        subtitle: `${category} · ${pod.employee_count} Specialists`,
        podId: pod.id,
        podCode: pod.code,
      };
    });
  }, [pods]);

  const selectedPod = pods[selectedPodIndex] || pods[0];

  // Calculated properties for selected pod
  const selectedPodEmployees = useMemo(() => {
    if (!selectedPod) return [];
    return employees.filter((e) => e.pod_id === selectedPod.id);
  }, [selectedPod, employees]);

  const selectedPodBrands = useMemo(() => {
    if (!selectedPod) return [];
    return brands.filter((b) => b.pod_id === selectedPod.id);
  }, [selectedPod, brands]);

  const selectedPodProcesses = useMemo(() => {
    if (!selectedPod) return [];
    const procSet = new Set<string>();
    // From brands process rules
    selectedPodBrands.forEach((b) => {
      b.process_rules?.forEach((r) => {
        if (r.process_name) procSet.add(r.process_name);
      });
    });
    // From employee assigned brands
    selectedPodEmployees.forEach((e) => {
      e.assigned_brands?.forEach((ab) => {
        if (ab.process_name) procSet.add(ab.process_name);
      });
    });
    return Array.from(procSet);
  }, [selectedPod, selectedPodBrands, selectedPodEmployees]);

  const selectedPodConflicts = useMemo(() => {
    if (!selectedPod) return [];
    const empIds = new Set(selectedPodEmployees.map((e) => e.id));
    const brandIds = new Set(selectedPodBrands.map((b) => b.id));
    return conflicts.filter(
      (c) => (!c.is_resolved && empIds.has(c.employee_id)) || (!c.is_resolved && brandIds.has(c.brand_id))
    );
  }, [selectedPod, selectedPodEmployees, selectedPodBrands, conflicts]);

  // Filtered employees for the search inside the inspector
  const filteredPodEmployees = useMemo(() => {
    if (!staffSearchQuery.trim()) return selectedPodEmployees;
    const q = staffSearchQuery.toLowerCase();
    return selectedPodEmployees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q)
    );
  }, [selectedPodEmployees, staffSearchQuery]);

  const handlePodChange = (index: number) => {
    if (index >= 0 && index < pods.length) {
      setSelectedPodIndex(index);
    }
  };

  const handlePodSelect = (_item: any, index: number) => {
    if (index >= 0 && index < pods.length) {
      setSelectedPodIndex(index);
    }
  };

  const handleNavigateToPlanner = (podId: number) => {
    try {
      localStorage.setItem('rosteriq_selected_pod_filter', String(podId));
    } catch {
      // Ignore storage errors
    }
    if (onNavigate) {
      onNavigate('Roster Planner');
    }
  };

  const handleFocusPodInExplorer = (podIndex: number) => {
    setSelectedPodIndex(podIndex);
    explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[11px] font-bold tracking-widest text-app-primaryAccent uppercase">
              Operations & Pod Architecture
            </span>
            <span className="text-xs text-app-border">/</span>
            <span className="text-xs text-app-secondaryText">5 Autonomous Pods</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-app-primaryText tracking-tight">
            Operational Pods & Teams
          </h1>
          <p className="text-sm text-app-secondaryText mt-1 max-w-2xl">
            Autonomous operational units overseen by pod leads, managing dedicated cross-functional brand pods and multi-skilled workforce allocations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1E2226] text-app-primaryText border border-[#23262A] inline-flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-app-primaryAccent" />
            <span>Scoped RBAC Governance</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: OPERATIONAL EXPLORER (React Bits CircularCarousel)              */}
      {/* ========================================================================= */}
      <section
        ref={explorerRef}
        className="bg-app-card rounded-enterprise border border-[#23262A] shadow-card overflow-hidden"
      >
        {/* Explorer Header */}
        <div className="px-6 py-5 border-b border-[#23262A] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#151719]">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-app-primaryAccent flex items-center justify-center text-[#FFFDF8] shadow-sm">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-app-primaryText tracking-tight">
                Operational Explorer
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/60 uppercase">
                3D Kinetic Carousel
              </span>
            </div>
            <p className="text-xs text-app-secondaryText mt-1">
              Explore how our workforce is organized across operational pods. Drag, scroll or click any card to inspect live assignments.
            </p>
          </div>

          {/* Autoplay & Interaction Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoplayState(autoplayState === 'drift' ? 'off' : 'drift')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#151719] hover:bg-[#1E2226] border border-[#23262A] text-app-primaryText transition-colors flex items-center space-x-1.5"
              title={autoplayState === 'drift' ? 'Pause automatic carousel rotation' : 'Resume automatic carousel drift'}
            >
              {autoplayState === 'drift' ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-app-primaryAccent" />
                  <span>Pause Motion</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-app-primaryAccent" />
                  <span>Auto Drift</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3D Circular Carousel Stage */}
        <div className="relative w-full h-[400px] sm:h-[450px] bg-[#0C0D0E] flex items-center justify-center overflow-hidden border-b border-[#23262A]">
          {isLoading ? (
            <div className="text-center text-sm text-app-secondaryText flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-app-primaryAccent border-t-transparent rounded-full animate-spin" />
              <span>Loading 3D Operational Pod Explorer...</span>
            </div>
          ) : carouselItems.length > 0 ? (
            <div className="w-full h-full relative">
              <CircularCarousel
                items={carouselItems}
                preset="cylinder"
                intro="rise"
                cardWidth={220}
                aspectRatio={0.75}
                gap={24}
                curve={1}
                tilt={6}
                perspective={900}
                autoplay={autoplayState}
                speed={0.6}
                draggable={true}
                momentum={0.88}
                snap={true}
                pauseOnHover={true}
                focusOnClick={true}
                depthFade={0.35}
                fadeColor="#0C0D0E"
                innerShade={0.12}
                cornerRadius={16}
                captions={true}
                onChange={handlePodChange}
                onItemClick={handlePodSelect}
              />
            </div>
          ) : (
            <div className="text-xs text-app-secondaryText italic">No operational pods registered in database.</div>
          )}
        </div>

        {/* Direct Pod Selector Bar */}
        <div className="px-6 py-3.5 bg-[#151719] border-b border-[#23262A] flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-semibold text-app-secondaryText flex items-center space-x-1.5">
            <span>Select Pod:</span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto py-1 max-w-full">
            {pods.map((pod, idx) => {
              const isSelected = idx === selectedPodIndex;
              const shortName = pod.name.split('(')[0].trim();
              return (
                <button
                  key={pod.id}
                  onClick={() => handlePodSelect(null, idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 border flex-shrink-0 ${
                    isSelected
                      ? 'bg-app-primaryAccent text-white border-app-primaryAccent shadow-sm'
                      : 'bg-[#0C0D0E] text-app-primaryText border-[#23262A] hover:bg-[#1E2226]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                  <span>{shortName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#1E2226] text-app-secondaryText'
                    }`}
                  >
                    {pod.employee_count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPERATIONAL POD INSPECTOR (Detailed Live Information)                      */}
        {/* ========================================================================= */}
        {selectedPod && (
          <div className="p-6 md:p-8 space-y-6">
            {/* Inspector Title & Action Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#23262A]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1E2226] text-app-primaryText border border-[#23262A]">
                    {selectedPod.code}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-app-primaryText">
                    {selectedPod.name}
                  </h3>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#56866B] animate-pulse" title="Active Pod" />
                </div>
                <p className="text-xs text-app-secondaryText mt-1">
                  {selectedPod.description || 'Specialized cross-functional operations unit managing brand delivery and SLA targets.'}
                </p>
              </div>

              {/* Quick Action Button: View Pod in Planner */}
              <button
                onClick={() => handleNavigateToPlanner(selectedPod.id)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-app-primaryAccent hover:bg-app-primaryAccentHover text-white text-xs font-semibold shadow-sm transition-all flex-shrink-0"
              >
                <span>View Pod Roster in Planner</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 4-Column Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Pod Lead */}
              <div className="p-4 rounded-xl bg-[#151719] border border-[#23262A] space-y-2">
                <span className="text-[10px] font-bold text-app-secondaryText uppercase tracking-wider block">
                  Designated Pod Lead
                </span>
                {selectedPod.lead ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-app-sidebar text-app-secondaryAccent font-bold text-sm flex items-center justify-center border border-[#2D3C4A] flex-shrink-0">
                      {selectedPod.lead.full_name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-sm text-app-primaryText truncate">
                        {selectedPod.lead.full_name}
                      </div>
                      <div className="text-[11px] text-app-primaryAccent truncate">
                        {selectedPod.lead.email}
                      </div>
                      <div className="text-[10px] text-app-secondaryText font-mono">
                        {selectedPod.lead.employee_code} · {selectedPod.lead.designation}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-app-secondaryText italic">No pod lead assigned</span>
                )}
              </div>

              {/* Card 2: Workforce Allocation */}
              <div className="p-4 rounded-xl bg-[#151719] border border-[#23262A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-app-secondaryText uppercase tracking-wider">
                    Workforce Allocation
                  </span>
                  <Users className="w-4 h-4 text-app-primaryAccent" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-app-primaryText">
                    {selectedPodEmployees.length}
                  </span>
                  <span className="text-xs text-app-secondaryText">active specialists</span>
                </div>
                <div className="text-[11px] text-[#56866B] flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% Assigned to Brands</span>
                </div>
              </div>

              {/* Card 3: Managed Brand Accounts */}
              <div className="p-4 rounded-xl bg-[#151719] border border-[#23262A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-app-secondaryText uppercase tracking-wider">
                    Client Brands Portfolio
                  </span>
                  <Building2 className="w-4 h-4 text-app-primaryAccent" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-app-primaryText">
                    {selectedPodBrands.length}
                  </span>
                  <span className="text-xs text-app-secondaryText">managed brands</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedPodBrands.map((b) => (
                    <span
                      key={b.id}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E2226] text-app-primaryText font-medium"
                    >
                      {b.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 4: Process Matrix & Operational SLA */}
              <div className="p-4 rounded-xl bg-[#151719] border border-[#23262A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-app-secondaryText uppercase tracking-wider">
                    Active Processes & SLA
                  </span>
                  <Cpu className="w-4 h-4 text-app-primaryAccent" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-app-primaryAccent">
                    {selectedPodProcesses.length}
                  </span>
                  <span className="text-xs text-app-secondaryText">
                    of {processes.length || selectedPodProcesses.length} process streams
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="font-medium text-app-secondaryText">Operational SLA:</span>
                  <span className="font-bold text-[#56866B]">98.2%</span>
                </div>
                <div className="text-[10px] flex items-center space-x-1">
                  {selectedPodConflicts.length > 0 ? (
                    <span className="text-app-warning font-semibold flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{selectedPodConflicts.length} active coverage warnings</span>
                    </span>
                  ) : (
                    <span className="text-[#56866B] font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>0 unresolved constraints</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active Processes Tag Bar */}
            {selectedPodProcesses.length > 0 && (
              <div className="p-3 rounded-xl bg-[#0C0D0E] border border-[#23262A] flex items-center flex-wrap gap-2 text-xs">
                <span className="font-bold text-app-primaryText text-[11px] uppercase tracking-wider mr-1">
                  Active Process Coverage:
                </span>
                {selectedPodProcesses.map((proc, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-[#151719] text-app-primaryText border border-[#23262A] font-medium text-xs flex items-center space-x-1.5 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-app-primaryAccent" />
                    <span>{proc}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Detailed Staff Directory for Selected Pod */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-app-primaryText text-sm uppercase tracking-wide">
                    Assigned Pod Specialists ({selectedPodEmployees.length})
                  </h4>
                  <span className="text-xs text-app-secondaryText">· Full Database Records</span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-app-secondaryText" />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Search pod staff..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#151719] border border-[#23262A] text-xs text-app-primaryText placeholder-app-secondaryText focus:outline-none focus:ring-1 focus:ring-app-primaryAccent"
                  />
                </div>
              </div>

              {/* Employees Table */}
              <div className="overflow-x-auto rounded-xl border border-[#23262A] bg-[#151719]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#151719] border-b border-[#23262A] text-[11px] text-app-secondaryText uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Employee</th>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3">Assigned Brands & Roles</th>
                      <th className="py-2.5 px-3">Off Preference</th>
                      <th className="py-2.5 px-3">Max Stretch</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border/60">
                    {filteredPodEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-app-secondaryText italic">
                          No specialists found matching query in this pod.
                        </td>
                      </tr>
                    ) : (
                      filteredPodEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-[#0C0D0E]/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-app-primaryText">{emp.full_name}</div>
                            <div className="text-[10px] text-app-secondaryText font-mono">
                              {emp.employee_code} · {emp.email}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-app-primaryText">{emp.designation}</td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {emp.assigned_brands && emp.assigned_brands.length > 0 ? (
                                emp.assigned_brands.map((ab, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E2226] text-app-primaryText border border-[#23262A] flex items-center space-x-1"
                                    title={`${ab.brand_name} - ${ab.process_name} (${ab.assignment_type})`}
                                  >
                                    <span className="font-semibold">{ab.brand_name}</span>
                                    <span className="opacity-60 font-mono">· {ab.assignment_type}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-app-secondaryText italic text-[11px]">General Pool</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-app-secondaryText font-medium">
                            {emp.default_off_pref || 'Sunday'}
                          </td>
                          <td className="py-3 px-3 text-app-secondaryText font-mono">
                            {emp.max_consecutive_days || 6} days
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#56866B] bg-[#DCE7DC] px-2 py-0.5 rounded-full border border-[#A4B9A9]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#56866B]" />
                              <span>{emp.employment_status || 'ACTIVE'}</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: ALL OPERATIONAL PODS GRID (Retained and Enhanced)              */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-app-primaryText tracking-tight">
              All Operational Pods ({pods.length})
            </h2>
            <p className="text-xs text-app-secondaryText">
              Enterprise pod cards with real-time staff count, designated lead, and quick 3D focus.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-app-secondaryText">
              Loading operational pods and team structures...
            </div>
          ) : (
            pods.map((pod, podIdx) => {
              const podEmployees = employees.filter((e) => e.pod_id === pod.id);
              const isSelected = podIdx === selectedPodIndex;

              return (
                <div
                  key={pod.id}
                  className={`bg-app-card rounded-enterprise border p-6 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between ${
                    isSelected ? 'border-app-primaryAccent ring-1 ring-app-primaryAccent' : 'border-[#23262A]'
                  }`}
                >
                  <div>
                    {/* Pod Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E2226] text-app-primaryText border border-[#23262A] uppercase font-semibold">
                          {pod.code}
                        </span>
                        <h3 className="font-bold text-app-primaryText text-lg mt-1.5">{pod.name}</h3>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#56866B] animate-pulse mt-1" />
                    </div>

                    <p className="text-xs text-app-secondaryText mb-4 line-clamp-2">
                      {pod.description || 'Specialized operational pod supporting client engagements.'}
                    </p>

                    {/* Pod Lead Banner */}
                    <div className="p-3.5 rounded-xl bg-[#151719] border border-[#23262A] mb-4">
                      <span className="text-[10px] font-bold text-app-secondaryText uppercase tracking-wider block mb-1.5">
                        Designated Pod Lead
                      </span>
                      {pod.lead ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-app-sidebar text-app-secondaryAccent font-bold text-xs flex items-center justify-center flex-shrink-0 border border-[#2D3C4A]">
                            {pod.lead.full_name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-bold text-sm text-app-primaryText truncate">
                              {pod.lead.full_name}
                            </div>
                            <div className="text-[11px] text-app-primaryAccent truncate">{pod.lead.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-app-secondaryText italic">No pod lead assigned</span>
                      )}
                    </div>

                    {/* Pod Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#0C0D0E] border border-[#23262A] text-center">
                        <div className="text-base font-bold text-app-primaryAccent">{pod.employee_count}</div>
                        <div className="text-[11px] text-app-secondaryText">Staff Members</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0C0D0E] border border-[#23262A] text-center">
                        <div className="text-base font-bold text-app-primaryText">{pod.brand_count}</div>
                        <div className="text-[11px] text-app-secondaryText">Managed Brands</div>
                      </div>
                    </div>

                    {/* Team Members List Preview */}
                    <div>
                      <span className="text-[11px] font-semibold text-app-secondaryText uppercase tracking-wider block mb-2">
                        Active Team Members ({podEmployees.length})
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {podEmployees.slice(0, 5).map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between text-xs py-1 border-b border-[#23262A]/40 last:border-0"
                          >
                            <span className="font-medium text-app-primaryText truncate">{e.full_name}</span>
                            <span className="text-[10px] text-app-secondaryText font-mono">{e.employee_code}</span>
                          </div>
                        ))}
                        {podEmployees.length > 5 && (
                          <div className="text-[11px] text-app-secondaryText italic pt-1">
                            +{podEmployees.length - 5} more pod members
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Inspect in Explorer & Operational Badge */}
                  <div className="pt-4 border-t border-[#23262A] mt-4 flex items-center justify-between text-xs text-app-secondaryText">
                    <span className="text-[#56866B] font-semibold flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Pod Operational</span>
                    </span>

                    <button
                      onClick={() => handleFocusPodInExplorer(podIdx)}
                      className="text-xs font-semibold text-app-primaryAccent hover:underline flex items-center space-x-1"
                    >
                      <span>Inspect in 3D</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
