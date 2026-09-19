import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  AlertTriangle,
  TrendingUp,
  FileText,
  Database,
  Upload,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  Plus,
  Search,
  RefreshCw,
  X,
  UserCheck,
  UserX,
  HelpCircle,
  Activity
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { EscalationModal } from '../components/EscalationModal.jsx';

export function HrDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [questionTrends, setQuestionTrends] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [knowledgeItems, setKnowledgeItems] = useState([]);

  // Search filter states
  const [empSearch, setEmpSearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');

  // Modal states
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Manual KB entry modal
  const [showAddKb, setShowAddKb] = useState(false);
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');
  const [kbCategory, setKbCategory] = useState('Company Policies');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        employeesRes,
        departmentsRes,
        escalationsRes,
        trendsRes,
        docsRes,
        kbRes
      ] = await Promise.all([
        apiRequest('/hr/stats').catch(() => null),
        apiRequest('/hr/employees').catch(() => ({ employees: [] })),
        apiRequest('/hr/departments').catch(() => ({ departments: [] })),
        apiRequest('/escalations').catch(() => ({ escalations: [] })),
        apiRequest('/hr/question-trends').catch(() => ({ trends: [] })),
        apiRequest('/documents').catch(() => ({ documents: [] })),
        apiRequest('/knowledge').catch(() => ({ items: [] }))
      ]);

      if (statsRes) setStats(statsRes);
      if (employeesRes?.employees) setEmployees(employeesRes.employees);
      if (departmentsRes?.departments) setDepartments(departmentsRes.departments);
      if (escalationsRes?.escalations) setEscalations(escalationsRes.escalations);
      if (trendsRes?.trends) setQuestionTrends(trendsRes.trends);
      if (docsRes?.documents) setDocuments(docsRes.documents);
      if (kbRes?.items) setKnowledgeItems(kbRes.items);
    } catch (err) {
      console.error('Failed to load HR data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Upload document
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'Company Policies');

    try {
      await apiRequest('/documents/upload', {
        method: 'POST',
        body: formData
      });
      setUploadSuccess(`"${file.originalname}" parsed, chunked, and indexed successfully.`);
      loadAllData();
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  // Delete document
  const handleDeleteDoc = async (id, title) => {
    if (!window.confirm(`Delete document "${title}" and its indexed chunks?`)) return;
    try {
      await apiRequest(`/documents/${id}`, { method: 'DELETE' });
      loadAllData();
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  };

  // Add KB item manually
  const handleAddKbItem = async (e) => {
    e.preventDefault();
    if (!kbTitle.trim() || !kbContent.trim()) return;

    try {
      await apiRequest('/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          title: kbTitle.trim(),
          content: kbContent.trim(),
          category: kbCategory
        })
      });
      setShowAddKb(false);
      setKbTitle('');
      setKbContent('');
      loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to save knowledge item.');
    }
  };

  const pendingEscalations = escalations.filter(e => e.status === 'Pending');

  // Relative time helper for Section 15
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'recently';
    const now = Date.now();
    const past = new Date(timestamp).getTime();
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  };

  const getDeptIcon = (deptName) => {
    switch (deptName?.toLowerCase()) {
      case 'engineering': return '👨‍💻';
      case 'design': return '🎨';
      case 'sales': return '📈';
      case 'marketing': return '📣';
      case 'finance': return '💼';
      case 'human resources': return '👥';
      case 'operations': return '⚙️';
      default: return '🏢';
    }
  };

  // Filtered lists
  const filteredEmployees = employees.filter(emp => {
    const q = empSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.jobTitle?.toLowerCase().includes(q)
    );
  });

  const filteredEscalations = escalations.filter(esc => {
    const q = queueSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      esc.question?.toLowerCase().includes(q) ||
      esc.employeeName?.toLowerCase().includes(q) ||
      esc.department?.toLowerCase().includes(q)
    );
  });

  const filteredDocs = documents.filter(doc => {
    const q = docSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.category?.toLowerCase().includes(q) ||
      doc.type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="workspace-container">
      {/* Tab Navigation */}
      <div className="tab-navigation hr-nav">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="nav-emoji">🏠</span>
          <span>Dashboard</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <span className="nav-emoji">👥</span>
          <span>Employees ({employees.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <span className="nav-emoji">📊</span>
          <span>Analytics</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <span className="nav-emoji">🚨</span>
          <span>HR Questions</span>
          {pendingEscalations.length > 0 && (
            <span className="tab-counter pending-counter">{pendingEscalations.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <span className="nav-emoji">📈</span>
          <span>FAQ Trends</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <span className="nav-emoji">📚</span>
          <span>Documents ({documents.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
          onClick={() => setActiveTab('knowledge')}
        >
          <span className="nav-emoji">📖</span>
          <span>Knowledge Base ({knowledgeItems.length})</span>
        </button>
      </div>

      {/* Top Banner: Good Morning, HR! (Requirement 10) */}
      <div className="welcome-banner hr-welcome-banner">
        <div className="welcome-text">
          <div className="eyebrow-pill">
            <Sparkles size={13} />
            <span>ENTERPRISE PEOPLE OPERATIONS</span>
          </div>
          <h2>👋 Good Morning, HR!</h2>
          <p className="welcome-sub">Here's what's happening with your employees today.</p>
        </div>
        <div className="welcome-quick-actions">
          <button className="btn btn-outline-white" onClick={loadAllData} disabled={loading} title="Refresh live data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Syncing...' : 'Sync Data'}</span>
          </button>
          <button className="btn btn-primary-light-btn" onClick={() => setActiveTab('queue')}>
            <span>Review Escalations</span>
            <AlertTriangle size={14} />
          </button>
        </div>
      </div>

      {/* 4 Premium SaaS Metrics Cards (Requirement 10) */}
      <div className="metrics-grid stats-overview-grid">
        <div className="metric-card card-accent-indigo">
          <div className="metric-header">
            <span className="metric-icon-wrap indigo-bg">👥</span>
            <span className="metric-title">Total Employees</span>
          </div>
          <div className="metric-val text-indigo">{stats?.overview?.totalEmployees ?? employees.length}</div>
          <span className="metric-meta">Unique registered employee accounts</span>
        </div>

        <div className="metric-card card-accent-emerald">
          <div className="metric-header">
            <span className="metric-icon-wrap emerald-bg">🟢</span>
            <span className="metric-title">Active Today</span>
          </div>
          <div className="metric-val text-emerald">{stats?.overview?.activeToday ?? 0}</div>
          <span className="metric-meta">Logged in today ({new Date().toLocaleDateString('en-GB')})</span>
        </div>

        <div className="metric-card card-accent-slate">
          <div className="metric-header">
            <span className="metric-icon-wrap slate-bg">⚪</span>
            <span className="metric-title">Not Active Today</span>
          </div>
          <div className="metric-val text-muted">{stats?.overview?.notActiveToday ?? 0}</div>
          <span className="metric-meta">Total Employees − Active Today</span>
        </div>

        <div className="metric-card card-accent-amber">
          <div className="metric-header">
            <span className="metric-icon-wrap amber-bg">❓</span>
            <span className="metric-title">Pending Questions</span>
          </div>
          <div className="metric-val text-amber">{pendingEscalations.length}</div>
          <span className="metric-meta">Awaiting official HR answers</span>
        </div>

        <div className="metric-card card-accent-violet">
          <div className="metric-header">
            <span className="metric-icon-wrap violet-bg">📖</span>
            <span className="metric-title">Approved Knowledge</span>
          </div>
          <div className="metric-val text-violet">{knowledgeItems.length}</div>
          <span className="metric-meta">Verified policy entries for AI</span>
        </div>

        <div className="metric-card card-accent-cyan">
          <div className="metric-header">
            <span className="metric-icon-wrap cyan-bg">📚</span>
            <span className="metric-title">Company Documents</span>
          </div>
          <div className="metric-val text-cyan">{documents.length}</div>
          <span className="metric-meta">Indexed for grounded retrieval</span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          <div className="two-column-grid">
            {/* Department Headcount & Activity Snapshot (Requirement 14) */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>📊 Department Distribution & Activity</h3>
                  <p className="panel-subtitle">Total headcount and active login breakdown per sector</p>
                </div>
                <button className="btn-link" onClick={() => setActiveTab('departments')}>
                  Full Breakdown →
                </button>
              </div>

              <div className="dept-bars-list">
                {departments
                  .filter(d => d.total > 0)
                  .map(dept => {
                    const activePct = dept.total > 0 ? Math.round((dept.activeToday / dept.total) * 100) : 0;
                    return (
                      <div key={dept.department} className="dept-bar-row">
                        <div className="dept-bar-labels">
                          <span className="dept-name">
                            <span className="dept-emoji-prefix">{getDeptIcon(dept.department)}</span>
                            <b>{dept.department}</b>
                          </span>
                          <span className="dept-counts">
                            <b>{dept.total} employees</b> · <span className="text-green font-semibold">{dept.activeToday} active today</span> · <span className="text-muted">{dept.notActiveToday} inactive</span>
                          </span>
                        </div>
                        <div className="dept-bar-track">
                          <div className="dept-bar-fill active-fill" style={{ width: `${activePct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Pending HR Questions Queue Preview */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>🚨 Pending HR Questions ({pendingEscalations.length})</h3>
                  <p className="panel-subtitle">Inquiries forwarded automatically by AI assistant</p>
                </div>
                <button className="btn-link" onClick={() => setActiveTab('queue')}>
                  Open Queue →
                </button>
              </div>

              <div className="compact-escalation-list">
                {!pendingEscalations.length ? (
                  <div className="empty-panel-box">
                    <span className="empty-emoji">🎉</span>
                    <p>No pending HR questions.</p>
                    <small>All employee questions are currently resolved!</small>
                  </div>
                ) : (
                  pendingEscalations.slice(0, 3).map(esc => (
                    <div key={esc.id} className="compact-esc-item">
                      <div className="compact-esc-info">
                        <b>{esc.employeeName} ({esc.department})</b>
                        <p className="compact-question-text">"{esc.question}"</p>
                        <small className="compact-time">
                          <Clock size={11} />
                          {getRelativeTime(esc.timestamp)}
                        </small>
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setSelectedEscalation(esc)}
                      >
                        Answer
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Employee Activity Stream (Requirement 15) */}
          <div className="panel-card full-width-panel">
            <div className="panel-header">
              <div>
                <h3>⚡ Recent Employee Activity</h3>
                <p className="panel-subtitle">Live real-time login and onboarding activity from backend records</p>
              </div>
              <span className="badge-counter-total">{(stats?.recentActivities || []).length} events</span>
            </div>

            <div className="activity-feed-list">
              {!(stats?.recentActivities || []).length ? (
                <div className="empty-panel-box">
                  <span className="empty-emoji">🟢</span>
                  <p>No activity records logged yet today.</p>
                </div>
              ) : (
                (stats?.recentActivities || []).slice(0, 6).map((act, idx) => (
                  <div key={act.id || idx} className="activity-feed-item">
                    <div className="activity-icon-bullet">
                      <span className="activity-bullet-dot" />
                    </div>
                    <div className="activity-content">
                      <span className="activity-text">{act.text}</span>
                      <small className="activity-relative-time">{getRelativeTime(act.timestamp)}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>👥 Company Employee Directory</h2>
              <p>Roster of unique registered employees with live daily activity status and onboarding completion.</p>
            </div>
            <div className="roster-metrics">
              <span className="badge badge-active">🟢 {stats?.overview?.activeToday ?? 0} Active today</span>
              <span className="badge badge-inactive">⚪ {stats?.overview?.notActiveToday ?? 0} Not active today</span>
            </div>
          </div>

          {/* Search Bar (Requirement 20) */}
          <div className="table-search-bar">
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="🔎 Search employees by name, ID, department, or role..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
              />
              {empSearch && (
                <button className="clear-search-btn" onClick={() => setEmpSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="search-results-count">Showing {filteredEmployees.length} of {employees.length} employees</span>
          </div>

          <div className="table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Start Date</th>
                  <th>Daily Activity</th>
                  <th>Onboarding Progress</th>
                </tr>
              </thead>
              <tbody>
                {!filteredEmployees.length ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      <span className="empty-search-emoji">🔎</span>
                      <p>No employees match "{empSearch}".</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <div className="table-user-cell">
                          <div className="cell-avatar">{emp.avatar || emp.name.slice(0, 2).toUpperCase()}</div>
                          <span className="cell-name">{emp.name}</span>
                        </div>
                      </td>
                      <td><code>{emp.employeeId}</code></td>
                      <td>
                        <span className="badge badge-dept">
                          {getDeptIcon(emp.department)} {emp.department}
                        </span>
                      </td>
                      <td>{emp.jobTitle}</td>
                      <td>{emp.startDate}</td>
                      <td>
                        <span className={`status-pill ${emp.isActiveToday ? 'pill-active' : 'pill-inactive'}`}>
                          <span className="status-dot" />
                          {emp.isActiveToday ? 'Active today' : 'Not active today'}
                        </span>
                      </td>
                      <td>
                        <div className="table-progress-cell">
                          <div className="cell-progress-track">
                            <div className="cell-progress-fill" style={{ width: `${emp.onboardingProgress}%` }} />
                          </div>
                          <span className="cell-progress-text">{emp.onboardingProgress}% ({emp.completedTasks}/{emp.totalTasks})</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS (Requirement 14) */}
      {activeTab === 'departments' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>📊 Department Headcount & Activity Analytics</h2>
              <p>Real-time department distribution and daily employee login tracking from backend database.</p>
            </div>
          </div>

          <div className="department-cards-grid">
            {departments.map(dept => (
              <div key={dept.department} className="dept-summary-card">
                <div className="dept-card-top">
                  <div className="dept-card-title-row">
                    <span className="dept-large-emoji">{getDeptIcon(dept.department)}</span>
                    <h3>{dept.department}</h3>
                  </div>
                  <span className="dept-headcount-badge">{dept.total} {dept.total === 1 ? 'employee' : 'employees'}</span>
                </div>

                <div className="dept-breakdown-row">
                  <div className="breakdown-stat">
                    <span className="stat-label">🟢 Active today</span>
                    <b className="text-green">{dept.activeToday}</b>
                  </div>
                  <div className="breakdown-stat">
                    <span className="stat-label">⚪ Not active today</span>
                    <b className="text-muted">{dept.notActiveToday}</b>
                  </div>
                </div>

                <div className="dept-card-track">
                  <div
                    className="dept-card-fill"
                    style={{
                      width: dept.total > 0 ? `${Math.round((dept.activeToday / dept.total) * 100)}%` : '0%'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HR QUEUE (ESCALATIONS) */}
      {activeTab === 'queue' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>🚨 Pending HR Questions Queue</h2>
              <p>Review and answer employee inquiries that require official human HR confirmation.</p>
            </div>
            <span className="badge badge-amber">{pendingEscalations.length} Pending Actions</span>
          </div>

          {/* Search Bar for Queue */}
          <div className="table-search-bar">
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="🔎 Search questions by keyword, employee, or department..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
              />
              {queueSearch && (
                <button className="clear-search-btn" onClick={() => setQueueSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="queue-list">
            {!filteredEscalations.length ? (
              <div className="empty-state">
                <span className="empty-emoji">🎉</span>
                <p>No pending HR questions.</p>
                <small>All employee questions are resolved and up to date.</small>
              </div>
            ) : (
              filteredEscalations.map(esc => (
                <div key={esc.id} className={`queue-card ${esc.status === 'Resolved' ? 'resolved-card' : 'pending-card'}`}>
                  <div className="queue-card-top">
                    <div className="queue-emp-meta">
                      <b>{esc.employeeName}</b>
                      <span className="badge badge-dept">{getDeptIcon(esc.department)} {esc.department}</span>
                      <span className="esc-time">
                        <Clock size={12} />
                        {getRelativeTime(esc.timestamp)}
                      </span>
                    </div>
                    <span className={`status-badge ${esc.status === 'Resolved' ? 'badge-resolved' : 'badge-pending'}`}>
                      {esc.status === 'Resolved' ? '✅ Resolved' : '🔴 Pending HR'}
                    </span>
                  </div>

                  <h3 className="queue-question">"{esc.question}"</h3>

                  {esc.reason && (
                    <p className="queue-reason">
                      <b>Reason:</b> {esc.reason}
                    </p>
                  )}

                  {esc.status === 'Resolved' ? (
                    <div className="queue-resolved-box">
                      <div className="resolved-header">
                        <CheckCircle2 size={16} className="text-green" />
                        <span>Resolved by {esc.resolvedBy || 'HR'}:</span>
                        {esc.savedToKB && <span className="kb-badge-saved">✓ Saved to Knowledge Base</span>}
                      </div>
                      <p>{esc.hrAnswer}</p>
                    </div>
                  ) : (
                    <div className="queue-action-row">
                      <button
                        className="btn btn-primary"
                        onClick={() => setSelectedEscalation(esc)}
                      >
                        <Send size={16} />
                        <span>Provide Answer & Decision</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: QUESTION TRENDS */}
      {activeTab === 'trends' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>📈 Frequently Asked Questions & Semantic Trends</h2>
              <p>Clustered question analytics grouping related inquiries across departments to identify policy gaps.</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Question Topic / Cluster</th>
                  <th>Times Asked</th>
                  <th>Departments Inquiring</th>
                  <th>Last Asked</th>
                  <th>Escalated</th>
                </tr>
              </thead>
              <tbody>
                {!questionTrends.length ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">No questions recorded yet.</td>
                  </tr>
                ) : (
                  questionTrends.map((trend, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="trend-topic-cell">
                          <b>{trend.topic}</b>
                          {trend.questions?.length > 1 && (
                            <small className="trend-variations">
                              Variations: {trend.questions.slice(0, 3).map(q => `"${q}"`).join(', ')}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="count-pill">{trend.count} {trend.count === 1 ? 'time' : 'times'}</span>
                      </td>
                      <td>
                        <div className="dept-chips-wrap">
                          {Object.entries(trend.departments || {}).map(([dept, c]) => (
                            <span key={dept} className="dept-chip-count">
                              {getDeptIcon(dept)} {dept}: <b>{c}</b>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{new Date(trend.lastAsked).toLocaleDateString()}</td>
                      <td>
                        {trend.escalated ? (
                          <span className="badge badge-amber">Yes</span>
                        ) : (
                          <span className="badge badge-green">Grounded</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: DOCUMENTS (Requirement 19) */}
      {activeTab === 'documents' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>📚 Company Document Management</h2>
              <p>Upload PDF, Markdown, or TXT policy documents. Documents are parsed and indexed into searchable chunks.</p>
            </div>
            <label className="btn btn-primary upload-btn-label">
              <Upload size={16} />
              <span>{uploadingDoc ? 'Uploading & Indexing...' : 'Upload Document'}</span>
              <input
                type="file"
                hidden
                accept=".pdf,.md,.txt"
                onChange={handleFileUpload}
                disabled={uploadingDoc}
              />
            </label>
          </div>

          {uploadSuccess && <div className="form-alert success">{uploadSuccess}</div>}
          {uploadError && <div className="form-alert error">{uploadError}</div>}

          {/* Drag & Drop Upload Zone (Requirement 19) */}
          <div className="drag-drop-upload-zone">
            <input
              type="file"
              id="file-drop-input"
              className="file-drop-hidden"
              accept=".pdf,.md,.txt"
              onChange={handleFileUpload}
              disabled={uploadingDoc}
            />
            <label htmlFor="file-drop-input" className="drop-zone-label">
              <div className="upload-icon-circle">
                <Upload size={28} />
              </div>
              <h3>📤 Drag & Drop your company document</h3>
              <p>or browse from your local device</p>
              <div className="supported-formats-pills">
                <span className="format-pill">PDF</span>
                <span className="format-pill">Markdown (.md)</span>
                <span className="format-pill">Plain Text (.txt)</span>
              </div>
              <small className="file-size-note">Maximum file size: 8 MB</small>
            </label>
          </div>

          {/* Search Bar for Documents */}
          <div className="table-search-bar">
            <div className="search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="🔎 Search documents by title, category, or file format..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
              />
              {docSearch && (
                <button className="clear-search-btn" onClick={() => setDocSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Chunks Indexed</th>
                  <th>Upload Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!filteredDocs.length ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      <span className="empty-search-emoji">📚</span>
                      <p>No company documents uploaded yet.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => (
                    <tr key={doc.id}>
                      <td><b>{doc.title}</b></td>
                      <td>{doc.category || 'Company Knowledge'}</td>
                      <td><span className="filetype-badge">{doc.type}</span></td>
                      <td>{doc.chunks} chunks</td>
                      <td>{new Date(doc.uploadDate).toLocaleDateString()}</td>
                      <td>
                        <span className="status-pill pill-active">
                          <span className="status-dot" />
                          {doc.status || 'Indexed'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-btn-delete"
                          onClick={() => handleDeleteDoc(doc.id, doc.title)}
                          title="Delete document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>📖 Approved Knowledge Base</h2>
              <p>Central repository of officially approved HR answers and company policies used for AI answering.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAddKb(!showAddKb)}>
              <Plus size={16} />
              <span>Add Knowledge Entry</span>
            </button>
          </div>

          {showAddKb && (
            <div className="panel-card form-panel">
              <h3>Create Approved Knowledge Entry</h3>
              <form onSubmit={handleAddKbItem} className="auth-form">
                <div className="form-group">
                  <label htmlFor="kb-new-title">Question / Topic Title <span className="req">*</span></label>
                  <input
                    id="kb-new-title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Health and Wellness Stipend Policy"
                    value={kbTitle}
                    onChange={(e) => setKbTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="kb-new-category">Category</label>
                  <select
                    id="kb-new-category"
                    className="form-select"
                    value={kbCategory}
                    onChange={(e) => setKbCategory(e.target.value)}
                  >
                    <option value="Company Policies">Company Policies</option>
                    <option value="Benefits & Wellness">Benefits & Wellness</option>
                    <option value="Remote Work Guidelines">Remote Work Guidelines</option>
                    <option value="Office Guidelines">Office Guidelines</option>
                    <option value="IT & Security">IT & Security</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="kb-new-content">Approved Official Answer <span className="req">*</span></label>
                  <textarea
                    id="kb-new-content"
                    rows={4}
                    className="form-textarea"
                    placeholder="Provide the exact approved policy details..."
                    value={kbContent}
                    onChange={(e) => setKbContent(e.target.value)}
                    required
                  />
                </div>
                <div className="form-btn-row">
                  <button type="submit" className="btn btn-primary">Save to Knowledge Base</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddKb(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="kb-cards-grid">
            {!knowledgeItems.length ? (
              <div className="empty-state">
                <span className="empty-emoji">📖</span>
                <p>No knowledge base entries yet.</p>
              </div>
            ) : (
              knowledgeItems.map(item => (
                <div key={item.id} className="kb-entry-card">
                  <div className="kb-card-top">
                    <span className="badge badge-dept">{item.category || 'Policy'}</span>
                    <span className="badge badge-kb-source">{item.sourceType || 'HR Approved'}</span>
                  </div>
                  <h3 className="kb-title">{item.title}</h3>
                  <p className="kb-content">{item.content}</p>
                  <div className="kb-footer">
                    <small>Approved by {item.approvedBy || 'HR'} · {new Date(item.createdAt).toLocaleDateString()}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Escalation Answer Modal */}
      {selectedEscalation && (
        <EscalationModal
          escalation={selectedEscalation}
          onClose={() => setSelectedEscalation(null)}
          onSuccess={() => {
            setSelectedEscalation(null);
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
