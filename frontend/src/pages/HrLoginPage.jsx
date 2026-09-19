import React, { useState, useEffect } from 'react';
import { Building2, ArrowLeft, LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../services/authContext.jsx';
import { apiRequest } from '../services/api.js';

export function HrLoginPage({ onBack }) {
  const { login } = useAuth();

  const [employeeId, setEmployeeId] = useState('HR-001');
  const [password, setPassword] = useState('password123');
  const [department, setDepartment] = useState('Human Resources');
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
      <div className="login-card">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Change Role</span>
        </button>

        <div className="login-header">
          <div className="login-badge hr-badge">
            <Building2 size={20} />
          </div>
          <h2>HR Administrator Sign In</h2>
          <p>Access the people operations command center and analytics portal.</p>
        </div>

        {error && (
          <div className="form-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="hr-id">HR / Admin ID <span className="req">*</span></label>
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

          <div className="form-group">
            <label htmlFor="hr-dept">Department <span className="req">*</span></label>
            <select
              id="hr-dept"
              className="form-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={submitting}
              required
            >
              <option value="">Select your department</option>
              {departmentsList.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="hr-pw">Password <span className="req">*</span></label>
            <input
              id="hr-pw"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            <LogIn size={18} />
            <span>{submitting ? 'Authenticating...' : 'Sign In as HR Administrator'}</span>
          </button>
        </form>

        {demoHR.length > 0 && (
          <div className="demo-accounts-box">
            <div className="demo-title">
              <Sparkles size={14} />
              <span>Quick Demo HR Login:</span>
            </div>
            <div className="demo-buttons">
              {demoHR.map(hr => (
                <button
                  key={hr.employeeId}
                  type="button"
                  className="demo-chip hr-demo-chip"
                  onClick={() => fillDemoHr(hr)}
                >
                  <b>{hr.name}</b>
                  <small>({hr.department} · {hr.employeeId})</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
