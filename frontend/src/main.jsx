import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

import { AuthProvider, useAuth } from './services/authContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { RoleSelectPage } from './pages/RoleSelectPage.jsx';
import { EmployeeLoginPage } from './pages/EmployeeLoginPage.jsx';
import { HrLoginPage } from './pages/HrLoginPage.jsx';
import { EmployeeDashboard } from './pages/EmployeeDashboard.jsx';
import { HrDashboard } from './pages/HrDashboard.jsx';
import { Navbar } from './components/Navbar.jsx';

function AppContent() {
  const { isAuthenticated, role, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null); // null | 'employee' | 'hr'

  if (loading) {
    return (
      <div className="app-loading-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading OnboardAI...</p>
      </div>
    );
  }

  // Authenticated State
  if (isAuthenticated) {
    return (
      <div className="app-layout">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Navbar />
        <main id="main-content" tabIndex={-1} className="app-main">
          {role === 'hr' ? <HrDashboard /> : <EmployeeDashboard />}
        </main>
      </div>
    );
  }

  // Unauthenticated State: Role selection screen
  if (!selectedRole) {
    return <RoleSelectPage onSelectRole={setSelectedRole} />;
  }

  if (selectedRole === 'employee') {
    return <EmployeeLoginPage onBack={() => setSelectedRole(null)} />;
  }

  return <HrLoginPage onBack={() => setSelectedRole(null)} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />
          <div className="ambient-grid" />
        </div>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')).render(<App />);