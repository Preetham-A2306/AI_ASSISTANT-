import React, { useState, useEffect } from 'react';
import { Briefcase, ArrowLeft, LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../services/authContext.jsx';
import { apiRequest } from '../services/api.js';

export function EmployeeLoginPage({ onBack }) {
  const { login } = useAuth();

  const [employeeId, setEmployeeId] = useState('EMP-001');
  const [password, setPassword] = useState('password123');
  const [department, setDepartment] = useState('Engineering');
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
    // Fetch dynamic configured departments and demo accounts
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
      setError('Department must be selected.');
      return;
    }

    setSubmitting(true);
    try {
      await login({
        role: 'employee',
        employeeId: employeeId.trim(),
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
    setPassword('password123');
    setDepartment(emp.department);
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
          <div className="login-badge emp-badge">
            <Briefcase size={20} />
          </div>
          <h2>New Employee Sign In</h2>
          <p>Enter your employee credentials and department to access your workspace.</p>
        </div>

        {error && (
          <div className="form-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="emp-id">Employee ID <span className="req">*</span></label>
            <input
              id="emp-id"
              type="text"
              className="form-input"
              placeholder="e.g. EMP-001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="emp-dept">Department <span className="req">*</span></label>
            <select
              id="emp-dept"
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
            <label htmlFor="emp-pw">Password <span className="req">*</span></label>
            <input
              id="emp-pw"
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
            <span>{submitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
          </button>
        </form>

        {demoEmployees.length > 0 && (
          <div className="demo-accounts-box">
            <div className="demo-title">
              <Sparkles size={14} />
              <span>Quick Demo Fill (Hackathon Helpers):</span>
            </div>
            <div className="demo-buttons">
              {demoEmployees.slice(0, 3).map(emp => (
                <button
                  key={emp.employeeId}
                  type="button"
                  className="demo-chip"
                  onClick={() => fillDemoUser(emp)}
                >
                  <b>{emp.name}</b>
                  <small>({emp.department} · {emp.employeeId})</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
