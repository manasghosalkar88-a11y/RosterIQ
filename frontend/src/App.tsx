import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { TopologyMesh } from './components/3d/TopologyMesh';
import { EmployeesPage } from './pages/Employees';
import { BrandsPage } from './pages/Brands';
import { ProcessesPage } from './pages/Processes';
import { PodsTeamsPage } from './pages/PodsTeams';
import { ResourceAllocationPage } from './pages/ResourceAllocation';
import { LeaveAvailabilityPage } from './pages/LeaveAvailability';
import { HolidaysCalendarPage } from './pages/HolidaysCalendar';
import { RosterPlannerPage } from './pages/RosterPlanner';
import { ConflictsAlertsPage } from './pages/ConflictsAlerts';
import { ApprovalsPage } from './pages/Approvals';
import { AnalyticsReportsPage } from './pages/AnalyticsReports';
import { OverviewPage } from './pages/Overview';
import { NotificationsPage } from './pages/Notifications';
import { SettingsPage } from './pages/Settings';
import { Shield } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const [currentModule, setCurrentModule] = useState('Overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-[#397C70] flex items-center justify-center text-white font-bold text-2xl animate-pulse shadow-lg shadow-teal-500/25 border border-white/10">
          R
        </div>
        <p className="text-sm font-semibold text-[#A0AAB5] tracking-wider uppercase font-mono">
          Loading RosterIQ Operations Matrix...
        </p>
      </div>
    );
  }

  if (!token || !user) {
    return <Login />;
  }

  return (
    <div className="authenticated-app min-h-screen text-[#F5F7FA] flex overflow-hidden relative selection:bg-teal-500/30 selection:text-white">
      {/* Collapsible Left Navigation Sidebar */}
      <div className="relative z-20 flex-shrink-0">
        <Sidebar
          currentModule={currentModule}
          onSelectModule={setCurrentModule}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative z-10">
        <Navbar currentModule={currentModule} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {/* Dynamic Module Rendering */}
          {currentModule === 'Roster Planner' && <RosterPlannerPage />}
          {currentModule === 'Employees' && <EmployeesPage />}
          {currentModule === 'Brands' && <BrandsPage />}
          {currentModule === 'Processes' && <ProcessesPage />}
          {currentModule === 'Pods & Teams' && <PodsTeamsPage onNavigate={setCurrentModule} />}
          {currentModule === 'Resource Allocation' && <ResourceAllocationPage />}
          {currentModule === 'Leave & Availability' && <LeaveAvailabilityPage />}
          {currentModule === 'Holidays & Calendar' && <HolidaysCalendarPage />}
          {currentModule === 'Conflicts & Alerts' && <ConflictsAlertsPage />}
          {currentModule === 'Approvals' && <ApprovalsPage />}
          {currentModule === 'Analytics & Reports' && <AnalyticsReportsPage />}
          {currentModule === 'Notifications' && <NotificationsPage onNavigate={setCurrentModule} />}
          {currentModule === 'Overview' && <OverviewPage onNavigate={setCurrentModule} />}
          {currentModule === 'Settings' && <SettingsPage />}

          {/* Fallback for undefined routes */}
          {![
            'Overview',
            'Roster Planner',
            'Employees',
            'Brands',
            'Processes',
            'Pods & Teams',
            'Resource Allocation',
            'Leave & Availability',
            'Holidays & Calendar',
            'Conflicts & Alerts',
            'Approvals',
            'Analytics & Reports',
            'Notifications',
            'Settings',
          ].includes(currentModule) && (
            <div className="glass-card rounded-enterprise p-12 text-center shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-teal-950/50 text-teal-400 flex items-center justify-center mx-auto mb-4 border border-teal-800/40">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">{currentModule}</h3>
              <p className="text-sm text-[#A0AAB5] max-w-md mx-auto mt-2">
                This module connects to Approvals, Analytics, and Notifications within RosterIQ.
              </p>
              <button
                onClick={() => setCurrentModule('Roster Planner')}
                className="mt-6 px-4 py-2 rounded-xl bg-[#397C70] hover:bg-[#2D6359] text-white text-xs font-semibold shadow-neumorph-btn transition-all"
              >
                Go to Roster Planner
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <div className="relative min-h-screen bg-[#050505] text-[#F5F7FA] overflow-hidden selection:bg-teal-500/30 selection:text-white">
        {/* Shared Full-Screen 3D Topology Mesh Background (Parametric MOBIUS / WAVE / HELIX / CYLINDER) */}
        <TopologyMesh subtle={true} />
        <MainApp />
      </div>
    </AuthProvider>
  );
}
