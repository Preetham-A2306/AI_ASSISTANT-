import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';

import { AuthProvider, useAuth } from './services/authContext.jsx';
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
      <div className="app-loading-screen">
        <div className="spinner" />
        <p>Loading OnboardAI...</p>
      </div>
    );
  }

  // Authenticated State
  if (isAuthenticated) {
    return (
      <div className="app-layout">
        <Navbar />
        <main className="app-main">
          {role === 'hr' ? <HrDashboard /> : <EmployeeDashboard />}
        </main>
      </div>
    );
  }

  // Unauthenticated State: Requirement 2 ("Who are you?" first screen)
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
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<App />);