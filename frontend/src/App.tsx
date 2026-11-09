import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
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
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-app-primaryAccent flex items-center justify-center text-white font-bold text-2xl animate-pulse shadow-lg">
          R
        </div>
        <p className="text-sm font-semibold text-app-primaryText tracking-wide">
          Loading RosterIQ Operations...
        </p>
      </div>
    );
  }

  if (!token || !user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-app-bg flex overflow-hidden">
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
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

          {/* Placeholder for modules coming in later phases */}
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
            <div className="bg-white rounded-enterprise border border-app-border p-12 text-center shadow-subtle">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-app-primaryText">{currentModule}</h3>
              <p className="text-sm text-app-secondaryText max-w-md mx-auto mt-2">
                This module connects to Approvals, Analytics, and Notifications coming in Phases 11 through 14.
              </p>
              <button
                onClick={() => setCurrentModule('Roster Planner')}
                className="mt-6 px-4 py-2 rounded-xl bg-app-primaryAccent text-white text-xs font-semibold shadow-md shadow-teal-500/20"
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
      <MainApp />
    </AuthProvider>
  );
}
