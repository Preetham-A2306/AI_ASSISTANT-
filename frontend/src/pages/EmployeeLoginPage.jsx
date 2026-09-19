import React, { useState, useEffect } from 'react';
import { Briefcase, ArrowLeft, LogIn, Sparkles, AlertCircle, Eye, EyeOff, User, Lock, Building2, Rocket } from 'lucide-react';
import { useAuth } from '../services/authContext.jsx';
import { apiRequest } from '../services/api.js';

export function EmployeeLoginPage({ onBack }) {
  const { login, sessionMessage } = useAuth();

  const [employeeId, setEmployeeId] = useState('EMP-001');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('password123');
  const [department, setDepartment] = useState('Engineering');
  const [showPassword, setShowPassword] = useState(false);
  const [departmentsList, setDepartmentsList] = useState([
    'Engineering',
    'Design',
    'Sales',
    'Marketing',
    'Finance',
    'Human Resources',
    'Operations',
    'Other'
  ]);
  const [demoEmployees, setDemoEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/auth/departments')
      .then(res => {
        if (res.employeeDepartments) {
          setDepartmentsList(res.employeeDepartments);
        }
      })
      .catch(() => {});

    apiRequest('/auth/demo-accounts')
      .then(res => {
        if (res.employees) {
          setDemoEmployees(res.employees);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!employeeId.trim()) {
      setError('Employee ID is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (!department) {
      setError('Department selection is mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      await login({
        role: 'employee',
        employeeId: employeeId.trim(),
        name: name.trim() || undefined,
        password: password.trim(),
        department
      });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoUser = (emp) => {
    setEmployeeId(emp.employeeId);
    setName(emp.name);
    setPassword('password123');
    setDepartment(emp.department);
    setError('');
  };

  return (
    <div className="landing-screen">
      <div className="login-card">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Switch Role</span>
        </button>

        <div className="login-header">
          <div className="login-badge emp-badge">
            <span className="login-emoji" aria-hidden="true">👋</span>
          </div>
          <h2>Welcome Back!</h2>
          <p className="login-subtext">Let's continue your onboarding journey.</p>
        </div>

        {sessionMessage && (
          <div className="form-alert warning" role="alert" aria-live="polite">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{sessionMessage}</span>
          </div>
        )}

        {error && (
          <div className="form-alert error" role="alert" aria-live="assertive">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="emp-id">
              <span className="label-icon">🆔</span> Employee ID <span className="req">*</span>
            </label>
            <div className="input-with-icon">
              <span className="input-prefix-icon"><User size={16} /></span>
              <input
                id="emp-id"
                type="text"
                className="form-input"
                placeholder="e.g. EMP-001 or new ID (e.g. EMP-104)"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <span className="input-helper">First time logging in? Enter your assigned ID to register automatically.</span>
          </div>

          <div className="form-group">
            <label htmlFor="emp-name">
              <span className="label-icon">👤</span> Full Name <span className="opt-tag">(Optional for new hire registration)</span>
            </label>
            <div className="input-with-icon">
              <span className="input-prefix-icon"><User size={16} /></span>
              <input
                id="emp-name"
                type="text"
                className="form-input"
                placeholder="e.g. Alex Chen or Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="emp-dept">
              <span className="label-icon">🏢</span> Department <span className="req">*</span>
            </label>
            <div className="input-with-icon">
              <span className="input-prefix-icon"><Building2 size={16} /></span>
              <select
                id="emp-dept"
                className="form-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="">Select your assigned department</option>
                {departmentsList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="emp-pw">
              <span className="label-icon">🔐</span> Password <span className="req">*</span>
            </label>
            <div className="input-with-icon password-input-wrap">
              <span className="input-prefix-icon"><Lock size={16} /></span>
              <input
                id="emp-pw"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-submit-auth" disabled={submitting}>
            {submitting ? (
              <>
                <span className="btn-spinner" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Rocket size={18} />
                <span>🚀 Continue to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {demoEmployees.length > 0 && (
          <div className="demo-accounts-box">
            <div className="demo-title">
              <Sparkles size={14} />
              <span>Quick Demo Fill (Pre-Seeded Roster):</span>
            </div>
            <div className="demo-buttons">
              {demoEmployees.slice(0, 4).map(emp => (
                <button
                  key={emp.employeeId}
                  type="button"
                  className="demo-chip"
                  onClick={() => fillDemoUser(emp)}
                >
                  <span className="chip-name">{emp.name}</span>
                  <span className="chip-dept">{emp.department} · {emp.employeeId}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
