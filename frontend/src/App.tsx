import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { LandingPage } from './pages/Landing';
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

import type { UserRole } from './types/auth';

const MODULE_ROLE_ACCESS: Record<string, UserRole[]> = {
  Overview: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  'Roster Planner': ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  Employees: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  Brands: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  Processes: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  'Pods & Teams': ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  'Resource Allocation': ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  'Leave & Availability': ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  'Holidays & Calendar': ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  'Conflicts & Alerts': ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  Approvals: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD'],
  'Analytics & Reports': ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD'],
  Notifications: ['SUPER_ADMIN', 'OPS_MANAGER', 'POD_LEAD', 'EMPLOYEE'],
  Settings: ['SUPER_ADMIN', 'OPS_MANAGER'],
};

const isLoginHash = (hash: string) => hash === '#login' || hash === '#/login';
const isProtectedHash = (hash: string) => hash === '#dashboard' || hash === '#/dashboard';

const MainApp: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const [currentModule, setCurrentModule] = useState('Overview');
  const [wasAuthenticated, setWasAuthenticated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [publicView, setPublicView] = useState<'landing' | 'login'>(() => {
    if (typeof window !== 'undefined' && (isLoginHash(window.location.hash) || isProtectedHash(window.location.hash))) {
      return 'login';
    }
    return 'landing';
  });

  // Sync hash changes for direct deep linking (#/login, #login, #/dashboard, or #/landing)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (isLoginHash(hash)) {
        setPublicView('login');
      } else if (isProtectedHash(hash)) {
        if (!token || !user) {
          window.location.hash = '#/login';
          setPublicView('login');
        }
      } else if (hash === '#landing' || hash === '#/landing' || !hash) {
        setPublicView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [token, user]);

  // Keep URL hash & module state aligned with authentication transitions
  useEffect(() => {
    if (isLoading) return;

    if (token && user) {
      setWasAuthenticated(true);
      if (isLoginHash(window.location.hash) || !window.location.hash) {
        window.history.replaceState(null, '', '#/dashboard');
      }
      // Enforce role permission on currentModule when user or role changes
      const allowedRoles = MODULE_ROLE_ACCESS[currentModule];
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        setCurrentModule('Overview');
      }
    } else {
      if (wasAuthenticated || isProtectedHash(window.location.hash)) {
        setWasAuthenticated(false);
        setCurrentModule('Overview');
        setPublicView('login');
        if (!isLoginHash(window.location.hash)) {
          window.history.replaceState(null, '', '#/login');
        }
      }
    }
  }, [isLoading, token, user, wasAuthenticated, currentModule]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-[#14B8A6] flex items-center justify-center text-white font-bold text-2xl animate-pulse shadow-lg shadow-teal-500/25 border border-white/10">
          R
        </div>
        <p className="text-sm font-semibold text-[#A0AAB5] tracking-wider uppercase font-mono">
          Loading RosterIQ Operations Matrix...
        </p>
      </div>
    );
  }

  // Unauthenticated State: Route between New Public Landing Page and Login Page
  if (!token || !user) {
    if (publicView === 'login') {
      return (
        <Login
          onBackToLanding={() => {
            window.location.hash = '#/landing';
            setPublicView('landing');
          }}
        />
      );
    }
    return (
      <div className="relative z-10 min-h-screen h-screen overflow-y-auto">
        <LandingPage
          onLogin={() => {
            window.location.hash = '#/login';
            setPublicView('login');
          }}
          isAuthenticated={false}
        />
      </div>
    );
  }

  const allowedRoles = MODULE_ROLE_ACCESS[currentModule];
  const activeModule = !allowedRoles || allowedRoles.includes(user.role) ? currentModule : 'Overview';

  // Authenticated State: Full RosterIQ Operations Suite
  return (
    <div className="authenticated-app min-h-screen text-[#F5F7FA] flex overflow-hidden relative selection:bg-teal-500/30 selection:text-white">
      {/* Collapsible Left Navigation Sidebar */}
      <div className="relative z-20 flex-shrink-0">
        <Sidebar
          currentModule={activeModule}
          onSelectModule={setCurrentModule}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative z-10">
        <Navbar currentModule={activeModule} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {/* Dynamic Module Rendering */}
          {activeModule === 'Roster Planner' && <RosterPlannerPage />}
          {activeModule === 'Employees' && <EmployeesPage />}
          {activeModule === 'Brands' && <BrandsPage />}
          {activeModule === 'Processes' && <ProcessesPage />}
          {activeModule === 'Pods & Teams' && <PodsTeamsPage onNavigate={setCurrentModule} />}
          {activeModule === 'Resource Allocation' && <ResourceAllocationPage />}
          {activeModule === 'Leave & Availability' && <LeaveAvailabilityPage />}
          {activeModule === 'Holidays & Calendar' && <HolidaysCalendarPage />}
          {activeModule === 'Conflicts & Alerts' && <ConflictsAlertsPage />}
          {activeModule === 'Approvals' && <ApprovalsPage />}
          {activeModule === 'Analytics & Reports' && <AnalyticsReportsPage />}
          {activeModule === 'Notifications' && <NotificationsPage onNavigate={setCurrentModule} />}
          {activeModule === 'Overview' && <OverviewPage onNavigate={setCurrentModule} />}
          {activeModule === 'Settings' && <SettingsPage />}

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
          ].includes(activeModule) && (
            <div className="glass-card rounded-enterprise p-12 text-center shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-teal-950/50 text-teal-400 flex items-center justify-center mx-auto mb-4 border border-teal-800/40">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">{activeModule}</h3>
              <p className="text-sm text-[#A0AAB5] max-w-md mx-auto mt-2">
                This module connects to Approvals, Analytics, and Notifications within RosterIQ.
              </p>
              <button
                onClick={() => setCurrentModule('Roster Planner')}
                className="btn-primary mt-6 px-4 py-2 text-xs"
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
      <div className="relative isolate min-h-screen bg-[#050505] text-[#F5F7FA] overflow-hidden selection:bg-teal-500/30 selection:text-white">
        {/* Layer 2: Shared Full-Screen 3D Topology Mesh Background (Backend-Managed) */}
        <TopologyMesh subtle={true} />

        {/* Layer 3+: Active Application Content */}
        <MainApp />
      </div>
    </AuthProvider>
  );
}
