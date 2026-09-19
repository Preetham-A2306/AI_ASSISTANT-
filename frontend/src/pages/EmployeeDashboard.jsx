import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  CheckCircle2,
  Circle,
  MessageSquare,
  FileText,
  Send,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../services/authContext.jsx';
import { apiRequest } from '../services/api.js';

export function EmployeeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'checklist' | 'chat' | 'escalations'

  // Checklist state
  const [plan, setPlan] = useState(null);
  const [checklistStats, setChecklistStats] = useState({ completed: 0, total: 0, remaining: 0, progress: 0 });

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef(null);

  // Escalations state
  const [escalations, setEscalations] = useState([]);

  // Load checklist and initial data
  const loadChecklist = async () => {
    try {
      const res = await apiRequest('/employee/checklist');
      if (res.plan) {
        setPlan(res.plan);
        setChecklistStats(res.stats || { completed: 0, total: 0, remaining: 0, progress: 0 });
      }
    } catch (err) {
      console.error('Failed to load checklist:', err);
    }
  };

  const loadChatHistory = async () => {
    if (!user) return;
    try {
      const res = await apiRequest(`/chat/history/${user.employeeId}`);
      if (res.messages) {
        setMessages(
          res.messages.map(m => ({
            role: m.role,
            content: m.content,
            sources: m.sources || [],
            escalation: m.escalation,
            reason: m.reason,
            timestamp: m.timestamp
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const loadEscalations = async () => {
    try {
      const res = await apiRequest('/employee/escalations');
      setEscalations(res.escalations || []);
    } catch (err) {
      console.error('Failed to load escalations:', err);
    }
  };

  useEffect(() => {
    loadChecklist();
    loadChatHistory();
    loadEscalations();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Toggle checklist task
  const handleToggleTask = async (taskId) => {
    if (!plan) return;
    try {
      const task = plan.tasks.find(t => t.id === taskId);
      const res = await apiRequest(`/employee/checklist/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: !task?.done })
      });
      if (res.plan) {
        setPlan(res.plan);
        setChecklistStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Send message to AI Assistant
  const handleSendMessage = async (textToSend) => {
    const question = (textToSend || inputQuestion).trim();
    if (!question || isSending) return;

    setInputQuestion('');
    setIsSending(true);

    const userMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage, { role: 'loading' }]);

    try {
      const res = await apiRequest('/chat', {
        method: 'POST',
        body: JSON.stringify({
          question,
          employeeId: user.employeeId,
          employee: user.name,
          department: user.department
        })
      });

      const assistantMessage = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources || [],
        escalation: res.escalation,
        reason: res.reason,
        escalationId: res.escalationId,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev.filter(m => m.role !== 'loading'), assistantMessage]);
      loadEscalations();
    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => m.role !== 'loading'),
        {
          role: 'assistant',
          content: 'The assistant service could not be reached right now. Please check backend connection.',
          escalation: true,
          reason: err.message,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const sampleQuestions = [
    'How do I submit a code review?',
    'What are the core office working hours?',
    'How do I claim expense reimbursement?',
    'What is the company salary revision policy?'
  ];

  return (
    <div className="workspace-container">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          <CheckCircle2 size={18} />
          <span>My Checklist</span>
          {checklistStats.remaining > 0 && (
            <span className="tab-counter">{checklistStats.remaining}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={18} />
          <span>AI Knowledge Assistant</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'escalations' ? 'active' : ''}`}
          onClick={() => setActiveTab('escalations')}
        >
          <AlertTriangle size={18} />
          <span>My HR Questions</span>
          {escalations.filter(e => e.status === 'Pending').length > 0 && (
            <span className="tab-counter pending-counter">
              {escalations.filter(e => e.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          {/* Welcome Command Banner */}
          <div className="welcome-banner">
            <div className="welcome-text">
              <span className="eyebrow-tag">ONBOARDING COMMAND CENTER</span>
              <h2>Welcome to the team, {user?.name}!</h2>
              <p>
                Role: <b>{user?.jobTitle || 'Team Member'}</b> · Department: <b>{user?.department}</b> · Start Date: <b>{user?.startDate}</b>
              </p>
            </div>
            <div className="progress-card">
              <div className="progress-number">{checklistStats.progress}%</div>
              <div className="progress-label">First-Week Completed</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${checklistStats.progress}%` }} />
              </div>
            </div>
          </div>

          {/* Quick Action & Stat Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-title">Completed Tasks</span>
              <div className="metric-val text-green">{checklistStats.completed}</div>
              <span className="metric-meta">of {checklistStats.total} total items</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">Remaining Tasks</span>
              <div className="metric-val text-amber">{checklistStats.remaining}</div>
              <span className="metric-meta">Scheduled for this week</span>
            </div>
            <div className="metric-card">
              <span className="metric-title">HR Inquiries</span>
              <div className="metric-val text-blue">{escalations.length}</div>
              <span className="metric-meta">
                {escalations.filter(e => e.status === 'Resolved').length} resolved · {escalations.filter(e => e.status === 'Pending').length} pending
              </span>
            </div>
          </div>

          {/* Dual Panel Grid */}
          <div className="two-column-grid">
            {/* Checklist Overview Panel */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>First-Week Tasks</h3>
                  <p className="panel-subtitle">Review and check off your onboarding milestones</p>
                </div>
                <button className="btn-link" onClick={() => setActiveTab('checklist')}>
                  View All ({checklistStats.total}) →
                </button>
              </div>
              <div className="compact-task-list">
                {!plan?.tasks?.length ? (
                  <p className="empty-text">No checklist generated yet.</p>
                ) : (
                  plan.tasks.slice(0, 4).map(task => (
                    <div
                      key={task.id}
                      className={`task-row ${task.done ? 'task-done' : ''}`}
                      onClick={() => handleToggleTask(task.id)}
                    >
                      <button className="checkbox-btn" aria-label="Toggle task">
                        {task.done ? (
                          <CheckCircle2 size={18} className="text-green" />
                        ) : (
                          <Circle size={18} className="text-gray" />
                        )}
                      </button>
                      <div className="task-info">
                        <span className="task-day">Day {task.day}</span>
                        <span className="task-title">{task.title}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Assistant Quick Access Panel */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>Ask AI Onboarding Assistant</h3>
                  <p className="panel-subtitle">Grounded in verified company policies and guidelines</p>
                </div>
                <button className="btn-link" onClick={() => setActiveTab('chat')}>
                  Open Chat →
                </button>
              </div>
              <div className="quick-chat-preview">
                <p className="ai-intro-text">
                  Have a question about code reviews, office hours, benefits, or expense claims? The assistant searches approved company knowledge instantly.
                </p>
                <div className="sample-prompts-grid">
                  {sampleQuestions.slice(0, 3).map((q, idx) => (
                    <button
                      key={idx}
                      className="prompt-chip"
                      onClick={() => {
                        setActiveTab('chat');
                        handleSendMessage(q);
                      }}
                    >
                      <span>{q}</span>
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Inquiries & HR Responses Panel */}
          <div className="panel-card" style={{ marginTop: '1.5rem' }}>
            <div className="panel-header">
              <div>
                <h3>Recent Questions & HR Responses</h3>
                <p className="panel-subtitle">Track the status of your policy inquiries and official HR answers</p>
              </div>
              <button className="btn-link" onClick={() => setActiveTab('escalations')}>
                All HR Questions ({escalations.length}) →
              </button>
            </div>

            <div className="compact-escalation-list">
              {!escalations.length ? (
                <div className="empty-panel" style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <HelpCircle size={24} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No questions escalated yet. Ask the AI Assistant above anytime you have a question!</p>
                </div>
              ) : (
                escalations.slice(0, 3).map(esc => (
                  <div key={esc.id} className="compact-esc-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="compact-esc-info" style={{ flex: 1, marginRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className={`status-badge ${esc.status === 'Resolved' ? 'badge-resolved' : 'badge-pending'}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                          {esc.status === 'Resolved' ? '✓ HR Answered' : '⏳ Pending HR'}
                        </span>
                        <small style={{ color: '#94a3b8' }}>{new Date(esc.timestamp).toLocaleDateString()}</small>
                      </div>
                      <p style={{ margin: '0 0 0.25rem', fontWeight: '500', color: '#1e293b', fontSize: '0.925rem' }}>"{esc.question}"</p>
                      {esc.status === 'Resolved' && esc.hrAnswer && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#059669', fontStyle: 'italic' }}>
                          <b>HR:</b> {esc.hrAnswer.slice(0, 100)}{esc.hrAnswer.length > 100 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setActiveTab('escalations')}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>Personalized Onboarding Checklist</h2>
              <p>Tailored 5-day ramp up plan for your role as <b>{user?.jobTitle}</b> in <b>{user?.department}</b>.</p>
            </div>
            <div className="progress-summary">
              <b>{checklistStats.completed} / {checklistStats.total} Completed</b>
              <span>({checklistStats.progress}%)</span>
            </div>
          </div>

          <div className="full-task-list">
            {!plan?.tasks?.length ? (
              <div className="empty-state">Loading your onboarding plan...</div>
            ) : (
              [1, 2, 3, 4, 5].map(dayNum => {
                const dayTasks = plan.tasks.filter(t => t.day === dayNum);
                if (!dayTasks.length) return null;
                return (
                  <div key={dayNum} className="day-group">
                    <h3 className="day-header">Day {dayNum} Milestone</h3>
                    <div className="day-tasks-box">
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          className={`full-task-row ${task.done ? 'task-done' : ''}`}
                          onClick={() => handleToggleTask(task.id)}
                        >
                          <button className="checkbox-btn">
                            {task.done ? (
                              <CheckCircle2 size={20} className="text-green" />
                            ) : (
                              <Circle size={20} className="text-gray" />
                            )}
                          </button>
                          <div className="task-content">
                            <span className="task-title">{task.title}</span>
                            {task.done && task.completedAt && (
                              <small className="completed-timestamp">
                                Completed {new Date(task.completedAt).toLocaleDateString()}
                              </small>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI ASSISTANT */}
      {activeTab === 'chat' && (
        <div className="chat-container">
          <div className="chat-messages-scroll">
            {messages.length === 0 ? (
              <div className="chat-empty-intro">
                <div className="ai-icon-circle">
                  <Sparkles size={32} />
                </div>
                <h3>Company Knowledge Assistant</h3>
                <p>
                  Ask any question about company policies, setup procedures, or employee benefits. Answers are strictly grounded in approved documentation.
                </p>

                <div className="prompt-suggestions">
                  <span className="suggestions-title">Try asking:</span>
                  <div className="suggestions-list">
                    {sampleQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        className="suggestion-bubble"
                        onClick={() => handleSendMessage(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={`chat-message-row ${m.role === 'user' ? 'msg-user' : 'msg-ai'}`}>
                  {m.role === 'loading' ? (
                    <div className="ai-bubble loading-bubble">
                      <Sparkles size={16} className="animate-spin" />
                      <span>Searching approved company knowledge...</span>
                    </div>
                  ) : m.role === 'user' ? (
                    <div className="user-bubble">{m.content}</div>
                  ) : (
                    <div className="ai-response-wrap">
                      <div className="ai-bubble">
                        <p>{m.content}</p>

                        {/* Automatic Escalation Banner */}
                        {m.escalation && (
                          <div className="escalation-alert-card">
                            <div className="escalation-alert-header">
                              <ShieldAlert size={18} className="text-amber" />
                              <b>Automatically Forwarded to HR</b>
                            </div>
                            <p>
                              {m.reason || "We couldn't confirm this in existing documentation. An escalation ticket has been generated for HR review."}
                            </p>
                            <span className="escalation-status-tag">Status: Pending HR Answer</span>
                          </div>
                        )}

                        {/* Citations List */}
                        {m.sources && m.sources.length > 0 && (
                          <div className="citations-box">
                            <div className="citations-header">
                              <FileText size={14} />
                              <span>Approved Sources & Citations:</span>
                            </div>
                            <div className="citations-list">
                              {m.sources.map((s, sIdx) => (
                                <div key={sIdx} className="citation-chip">
                                  <span className="citation-doc">{s.documentTitle}</span>
                                  {s.section && <span className="citation-section">§ {s.section}</span>}
                                  {s.sourceType && <span className="citation-type">{s.sourceType}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <small className="message-time">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Box */}
          <form
            className="chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              className="chat-input"
              placeholder="Ask anything about company onboarding, policies, or setup..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isSending}
            />
            <button
              type="submit"
              className="btn btn-primary btn-send"
              disabled={isSending || !inputQuestion.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: MY HR QUESTIONS & ESCALATIONS */}
      {activeTab === 'escalations' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>My HR Questions & Escalations</h2>
              <p>Track questions automatically forwarded to People Operations and view HR responses.</p>
            </div>
          </div>

          <div className="escalations-list">
            {!escalations.length ? (
              <div className="empty-state">
                <HelpCircle size={32} className="text-gray" />
                <p>No escalated questions yet.</p>
                <small>Any question the AI cannot confirm is automatically sent here for HR review.</small>
              </div>
            ) : (
              escalations.map(esc => (
                <div key={esc.id} className="escalation-card">
                  <div className="escalation-top">
                    <span className={`status-badge ${esc.status === 'Resolved' ? 'badge-resolved' : 'badge-pending'}`}>
                      {esc.status}
                    </span>
                    <span className="esc-time">
                      <Clock size={12} />
                      {new Date(esc.timestamp).toLocaleDateString()} at {new Date(esc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="esc-question">"{esc.question}"</h3>

                  {esc.status === 'Resolved' && esc.hrAnswer ? (
                    <div className="hr-answer-box">
                      <div className="hr-answer-header">
                        <CheckCircle2 size={16} className="text-green" />
                        <b>Answer from HR ({esc.resolvedBy || 'HR Administrator'}):</b>
                      </div>
                      <p className="hr-answer-text">{esc.hrAnswer}</p>
                      {esc.savedToKB && (
                        <span className="kb-badge-saved">
                          ✓ Saved to Company Knowledge Base
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="hr-pending-box">
                      <Clock size={16} className="text-amber" />
                      <span>Forwarded to HR team. An HR partner will review and provide an official response.</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
