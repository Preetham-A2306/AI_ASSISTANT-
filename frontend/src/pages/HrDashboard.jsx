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
  Plus
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

  return (
    <div className="workspace-container">
      {/* Tab Navigation */}
      <div className="tab-navigation hr-nav">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <Users size={18} />
          <span>Employees ({employees.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building2 size={18} />
          <span>Departments</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <AlertTriangle size={18} />
          <span>HR Queue</span>
          {pendingEscalations.length > 0 && (
            <span className="tab-counter pending-counter">{pendingEscalations.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <TrendingUp size={18} />
          <span>Question Trends</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={18} />
          <span>Documents ({documents.length})</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
          onClick={() => setActiveTab('knowledge')}
        >
          <Database size={18} />
          <span>Knowledge Base ({knowledgeItems.length})</span>
        </button>
      </div>

      {loading && <div className="loading-bar">Refreshing dashboard data...</div>}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          <div className="metrics-grid stats-overview-grid">
            <div className="metric-card">
              <span className="metric-title">Total Employees</span>
              <div className="metric-val">{stats?.overview?.totalEmployees ?? employees.length}</div>
              <span className="metric-meta">Across all company departments</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Active Today</span>
              <div className="metric-val text-green">{stats?.overview?.activeToday ?? 0}</div>
              <span className="metric-meta">Logged in today</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Not Active Today</span>
              <div className="metric-val text-muted">{stats?.overview?.notActiveToday ?? 0}</div>
              <span className="metric-meta">No activity recorded today</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Pending Escalations</span>
              <div className="metric-val text-amber">{pendingEscalations.length}</div>
              <span className="metric-meta">Awaiting HR answer</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Approved Knowledge</span>
              <div className="metric-val text-blue">{knowledgeItems.length}</div>
              <span className="metric-meta">Verified policy entries</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Company Documents</span>
              <div className="metric-val">{documents.length}</div>
              <span className="metric-meta">Parsed & indexed for AI</span>
            </div>
          </div>

          <div className="two-column-grid">
            {/* Department Activity Snapshot */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Department Employee Distribution</h3>
                  <p className="panel-subtitle">Total headcount and active today status per sector</p>
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
                          <span className="dept-name"><b>{dept.department}</b></span>
                          <span className="dept-counts">
                            <b>{dept.total} employees</b> · <span className="text-green">{dept.activeToday} active</span> · <span className="text-muted">{dept.notActiveToday} not active</span>
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
                  <h3>Pending Escalations ({pendingEscalations.length})</h3>
                  <p className="panel-subtitle">Questions requiring official HR answers</p>
                </div>
                <button className="btn-link" onClick={() => setActiveTab('queue')}>
                  Open Queue →
                </button>
              </div>

              <div className="compact-escalation-list">
                {!pendingEscalations.length ? (
                  <div className="empty-panel">
                    <CheckCircle2 size={24} className="text-green" />
                    <p>All employee questions have been resolved!</p>
                  </div>
                ) : (
                  pendingEscalations.slice(0, 3).map(esc => (
                    <div key={esc.id} className="compact-esc-item">
                      <div className="compact-esc-info">
                        <b>{esc.employeeName} ({esc.department})</b>
                        <p>"{esc.question}"</p>
                        <small>{new Date(esc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
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
        </div>
      )}

      {/* TAB 2: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>Company Employee Directory</h2>
              <p>Roster of all company employees with live daily activity status and onboarding completion.</p>
            </div>
            <div className="roster-metrics">
              <span className="badge badge-active">{stats?.overview?.activeToday ?? 0} Active today</span>
              <span className="badge badge-inactive">{stats?.overview?.notActiveToday ?? 0} Not active today</span>
            </div>
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
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div className="table-user-cell">
                        <div className="cell-avatar">{emp.avatar || emp.name.slice(0, 2)}</div>
                        <span className="cell-name">{emp.name}</span>
                      </div>
                    </td>
                    <td><code>{emp.employeeId}</code></td>
                    <td><span className="badge badge-dept">{emp.department}</span></td>
                    <td>{emp.jobTitle}</td>
                    <td>{emp.startDate}</td>
                    <td>
                      <span className={`status-pill ${emp.isActiveToday ? 'pill-active' : 'pill-inactive'}`}>
                        <span className="status-dot" />
                        {emp.activityStatus}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>Department Headcount & Activity Analytics</h2>
              <p>Real-time department distribution and daily employee login tracking.</p>
            </div>
          </div>

          <div className="department-cards-grid">
            {departments.map(dept => (
              <div key={dept.department} className="dept-summary-card">
                <div className="dept-card-top">
                  <h3>{dept.department}</h3>
                  <span className="dept-headcount-badge">{dept.total} {dept.total === 1 ? 'employee' : 'employees'}</span>
                </div>

                <div className="dept-breakdown-row">
                  <div className="breakdown-stat">
                    <span className="stat-label">Active today</span>
                    <b className="text-green">{dept.activeToday}</b>
                  </div>
                  <div className="breakdown-stat">
                    <span className="stat-label">Not active today</span>
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
              <h2>HR Escalations Queue</h2>
              <p>Answer employee questions that the AI assistant could not confidently answer from documents.</p>
            </div>
            <span className="badge badge-amber">{pendingEscalations.length} Pending Actions</span>
          </div>

          <div className="queue-list">
            {!escalations.length ? (
              <div className="empty-state">
                <CheckCircle2 size={36} className="text-green" />
                <p>No escalations in queue.</p>
              </div>
            ) : (
              escalations.map(esc => (
                <div key={esc.id} className={`queue-card ${esc.status === 'Resolved' ? 'resolved-card' : 'pending-card'}`}>
                  <div className="queue-card-top">
                    <div className="queue-emp-meta">
                      <b>{esc.employeeName}</b>
                      <span className="badge badge-dept">{esc.department}</span>
                      <span className="esc-time">
                        <Clock size={12} />
                        {new Date(esc.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <span className={`status-badge ${esc.status === 'Resolved' ? 'badge-resolved' : 'badge-pending'}`}>
                      {esc.status}
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
              <h2>Frequently Asked Questions & Semantic Trends</h2>
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
                              {dept}: <b>{c}</b>
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

      {/* TAB 6: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>Company Document Management</h2>
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
                {!documents.length ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">No documents uploaded yet.</td>
                  </tr>
                ) : (
                  documents.map(doc => (
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
              <h2>Approved Knowledge Base</h2>
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
              <div className="empty-state">No knowledge base entries yet.</div>
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
