import React, { useState, useEffect } from 'react';
import { Building2, ArrowLeft, LogIn, Sparkles, AlertCircle, Eye, EyeOff, Shield, Lock, BarChart3 } from 'lucide-react';
import { useAuth } from '../services/authContext.jsx';
import { apiRequest } from '../services/api.js';

export function HrLoginPage({ onBack }) {
  const { login } = useAuth();

  const [employeeId, setEmployeeId] = useState('HR-001');
  const [password, setPassword] = useState('password123');
  const [department, setDepartment] = useState('Human Resources');
  const [showPassword, setShowPassword] = useState(false);
  const [departmentsList, setDepartmentsList] = useState([
    'Human Resources',
    'People Operations',
    'Administration'
  ]);
  const [demoHR, setDemoHR] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/auth/departments')
      .then(res => {
        if (res.hrDepartments) {
          setDepartmentsList(res.hrDepartments);
        }
      })
      .catch(() => {});

    apiRequest('/auth/demo-accounts')
      .then(res => {
        if (res.hr) {
          setDemoHR(res.hr);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!employeeId.trim()) {
      setError('HR Administrator ID is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (!department) {
      setError('Department must be selected.');
      return;
    }

    setSubmitting(true);
    try {
      await login({
        role: 'hr',
        employeeId: employeeId.trim(),
        password: password.trim(),
        department
      });
    } catch (err) {
      setError(err.message || 'HR login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoHr = (hr) => {
    setEmployeeId(hr.employeeId);
    setPassword('password123');
    setDepartment(hr.department);
    setError('');
  };

  return (
    <div className="landing-screen">
      <div className="login-card hr-login-theme">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Switch Role</span>
        </button>

        <div className="login-header">
          <div className="login-badge hr-badge">
            <span className="login-emoji">👋</span>
          </div>
          <h2>Welcome HR!</h2>
          <p className="login-subtext">Manage your people, knowledge and onboarding experience.</p>
        </div>

        {error && (
          <div className="form-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="hr-id">
              <span className="label-icon">🆔</span> HR Administrator ID <span className="req">*</span>
            </label>
            <div className="input-with-icon">
              <span className="input-prefix-icon"><Shield size={16} /></span>
              <input
                id="hr-id"
                type="text"
                className="form-input"
                placeholder="e.g. HR-001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="hr-dept">
              <span className="label-icon">🏢</span> Department <span className="req">*</span>
            </label>
            <div className="input-with-icon">
              <span className="input-prefix-icon"><Building2 size={16} /></span>
              <select
                id="hr-dept"
                className="form-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={submitting}
                required
              >
                <option value="">Select HR Division</option>
                {departmentsList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="hr-pw">
              <span className="label-icon">🔐</span> Password <span className="req">*</span>
            </label>
            <div className="input-with-icon password-input-wrap">
              <span className="input-prefix-icon"><Lock size={16} /></span>
              <input
                id="hr-pw"
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

          <button type="submit" className="btn btn-secondary btn-full btn-submit-auth" disabled={submitting}>
            {submitting ? (
              <>
                <span className="btn-spinner" />
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <>
                <BarChart3 size={18} />
                <span>📊 Open HR Dashboard</span>
              </>
            )}
          </button>
        </form>

        {demoHR.length > 0 && (
          <div className="demo-accounts-box">
            <div className="demo-title">
              <Sparkles size={14} />
              <span>Quick Demo Fill (HR Administrators):</span>
            </div>
            <div className="demo-buttons">
              {demoHR.map(hr => (
                <button
                  key={hr.employeeId}
                  type="button"
                  className="demo-chip hr-chip"
                  onClick={() => fillDemoHr(hr)}
                >
                  <span className="chip-name">{hr.name}</span>
                  <span className="chip-dept">{hr.department} · {hr.employeeId}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
