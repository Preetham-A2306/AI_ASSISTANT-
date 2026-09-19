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
  ExternalLink,
  Copy,
  Check,
  ArrowDown,
  Building2,
  Calendar,
  Briefcase,
  TrendingUp,
  Bot
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
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatBottomRef = useRef(null);
  const chatScrollRef = useRef(null);

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

  const handleChatScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Copy assistant response
  const handleCopyAnswer = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
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
          content: 'The assistant service could not be reached right now. Please check your network or backend server connection.',
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
    'What are the core working hours?',
    'How do I claim expense reimbursement?',
    'What is the company salary revision policy?'
  ];

  const pendingEscalationsCount = escalations.filter(e => e.status === 'Pending').length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '15 September 2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="workspace-container">
      {/* SaaS Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="nav-emoji">🏠</span>
          <span>Overview</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          <span className="nav-emoji">📋</span>
          <span>My Checklist</span>
          {checklistStats.remaining > 0 && (
            <span className="tab-counter">{checklistStats.remaining}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="nav-emoji">🤖</span>
          <span>AI Assistant</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'escalations' ? 'active' : ''}`}
          onClick={() => setActiveTab('escalations')}
        >
          <span className="nav-emoji">🚨</span>
          <span>My HR Questions</span>
          {pendingEscalationsCount > 0 && (
            <span className="tab-counter pending-counter">{pendingEscalationsCount}</span>
          )}
        </button>
      </div>

      {/* Top Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <div className="eyebrow-pill">
            <Sparkles size={13} />
            <span>PERSONALIZED ONBOARDING WORKSPACE</span>
          </div>
          <h2>👋 Welcome, {user?.name}!</h2>
          <p className="welcome-sub">
            Let's get you set up for success in <b>{user?.department}</b>. You have completed <b>{checklistStats.completed} of {checklistStats.total}</b> onboarding milestones.
          </p>
        </div>
        <div className="welcome-quick-actions">
          <button className="btn btn-outline-white" onClick={() => setActiveTab('checklist')}>
            <span>View Tasks</span>
            <ChevronRight size={15} />
          </button>
          <button className="btn btn-primary-light-btn" onClick={() => setActiveTab('chat')}>
            <span>Ask AI Assistant</span>
            <Sparkles size={15} />
          </button>
        </div>
      </div>

      {/* 4 Premium Summary Cards (Requirement 6) */}
      <div className="metrics-grid employee-metrics-grid">
        <div className="metric-card card-accent-indigo">
          <div className="metric-header">
            <span className="metric-icon-wrap indigo-bg">📋</span>
            <span className="metric-title">Onboarding Progress</span>
          </div>
          <div className="metric-val text-indigo">{checklistStats.progress}%</div>
          <div className="mini-progress-track">
            <div className="mini-progress-fill" style={{ width: `${checklistStats.progress}%` }} />
          </div>
          <span className="metric-meta">{checklistStats.completed} of {checklistStats.total} tasks completed</span>
        </div>

        <div className="metric-card card-accent-violet">
          <div className="metric-header">
            <span className="metric-icon-wrap violet-bg">🗓️</span>
            <span className="metric-title">Start Date</span>
          </div>
          <div className="metric-val text-violet">{formatDate(user?.startDate)}</div>
          <span className="metric-meta">Official first working day</span>
        </div>

        <div className="metric-card card-accent-cyan">
          <div className="metric-header">
            <span className="metric-icon-wrap cyan-bg">🏢</span>
            <span className="metric-title">Department</span>
          </div>
          <div className="metric-val text-dark">{user?.department}</div>
          <span className="metric-meta">{user?.jobTitle || 'Team Member'}</span>
        </div>

        <div className="metric-card card-accent-emerald">
          <div className="metric-header">
            <span className="metric-icon-wrap emerald-bg">💬</span>
            <span className="metric-title">AI Assistant</span>
          </div>
          <div className="metric-val text-emerald">Available</div>
          <span className="metric-meta">🟢 24/7 Grounded Answers</span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          <div className="two-column-grid">
            {/* Checklist Overview Card */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h3>📋 Onboarding Milestones Checklist</h3>
                  <p className="panel-subtitle">
                    {checklistStats.completed} of {checklistStats.total} tasks completed ({checklistStats.progress}%)
                  </p>
                </div>
                <button className="btn-link" onClick={() => setActiveTab('checklist')}>
                  Full Checklist →
                </button>
              </div>

              <div className="overview-tasks-preview">
                {plan?.tasks?.slice(0, 4).map(task => (
                  <div
                    key={task.id}
                    className={`preview-task-item ${task.done ? 'task-done' : ''}`}
                    onClick={() => handleToggleTask(task.id)}
                  >
                    <button className="task-checkbox-btn" aria-label="Toggle task">
                      {task.done ? (
                        <CheckCircle2 size={18} className="text-green" />
                      ) : (
                        <Circle size={18} className="text-gray" />
                      )}
                    </button>
                    <span className="preview-task-title">{task.title}</span>
                    <span className={`task-badge ${task.done ? 'badge-done' : 'badge-pending'}`}>
                      {task.done ? '✅ Completed' : '☐ Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Assistant Quick Launcher Card */}
            <div className="panel-card ai-launcher-card">
              <div className="panel-header">
                <div>
                  <h3>🤖 AI Knowledge Assistant</h3>
                  <p className="panel-subtitle">Grounded in verified company policies & HR documents</p>
                </div>
                <button className="btn-link" onClick={() => setActiveTab('chat')}>
                  Open Chat →
                </button>
              </div>

              <div className="ai-launcher-body">
                <p className="launcher-desc">
                  Have a question about leave, expense reimbursement, equipment setup, or daily standups? Ask our assistant for instant, policy-verified answers.
                </p>
                <div className="quick-suggestions-wrap">
                  <span className="quick-sugg-label">Popular Questions:</span>
                  <div className="suggestions-list">
                    {sampleQuestions.slice(0, 3).map((q, idx) => (
                      <button
                        key={idx}
                        className="suggestion-bubble"
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendMessage(q);
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Inquiries & HR Responses Panel */}
          <div className="panel-card full-width-panel">
            <div className="panel-header">
              <div>
                <h3>🚨 Recent Questions & HR Responses</h3>
                <p className="panel-subtitle">Inquiries escalated to People Operations and resolved answers</p>
              </div>
              <button className="btn-link" onClick={() => setActiveTab('escalations')}>
                All Escalations ({escalations.length}) →
              </button>
            </div>

            <div className="overview-escalations-list">
              {!escalations.length ? (
                <div className="empty-panel-box">
                  <span className="empty-emoji">💬</span>
                  <p>No questions forwarded to HR yet.</p>
                  <small>When a question cannot be answered by indexed documents, it will automatically appear here.</small>
                </div>
              ) : (
                escalations.slice(0, 3).map(esc => (
                  <div key={esc.id} className="overview-esc-card">
                    <div className="overview-esc-top">
                      <span className={`status-badge ${esc.status === 'Resolved' ? 'badge-resolved' : 'badge-pending'}`}>
                        {esc.status === 'Resolved' ? '✅ Resolved' : '⏳ Pending HR'}
                      </span>
                      <span className="esc-date">
                        {new Date(esc.timestamp).toLocaleDateString()} at {new Date(esc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="esc-body">
                      <b>Question:</b> "{esc.question}"
                    </div>
                    {esc.status === 'Resolved' && esc.hrAnswer ? (
                      <div className="esc-hr-response">
                        <span className="hr-tag">HR Response:</span>
                        <p>{esc.hrAnswer}</p>
                      </div>
                    ) : (
                      <div className="esc-pending-note">
                        <Clock size={13} />
                        <span>Awaiting review by People Operations.</span>
                      </div>
                    )}
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
              <h2>📋 Your 5-Day Onboarding Milestones</h2>
              <p>Track and complete your first-week onboarding responsibilities.</p>
            </div>
            <div className="header-stat-chip">
              <span className="chip-counter">{checklistStats.completed} of {checklistStats.total} tasks completed</span>
              <span className="chip-pct">({checklistStats.progress}%)</span>
            </div>
          </div>

          <div className="checklist-full-list">
            {!plan || !plan.tasks || plan.tasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-emoji">📋</span>
                <p>No onboarding checklist assigned yet.</p>
              </div>
            ) : (
              [1, 2, 3, 4, 5].map(dayNum => {
                const dayTasks = plan.tasks.filter(t => t.day === dayNum);
                if (!dayTasks.length) return null;
                const completedInDay = dayTasks.filter(t => t.done).length;
                const allDone = completedInDay === dayTasks.length;

                return (
                  <div key={dayNum} className={`day-group-card ${allDone ? 'day-complete' : ''}`}>
                    <div className="day-header-row">
                      <div className="day-title-wrap">
                        <span className="day-number-badge">Day {dayNum}</span>
                        <h3>Milestone Objectives</h3>
                      </div>
                      <span className="day-completion-tag">
                        {completedInDay}/{dayTasks.length} Done
                      </span>
                    </div>

                    <div className="day-tasks-box">
                      {dayTasks.map(task => {
                        let statusText = '☐ Pending';
                        let statusClass = 'task-pending-status';
                        if (task.done) {
                          statusText = '✅ Completed';
                          statusClass = 'task-completed-status';
                        } else if (dayNum === 1 || completedInDay > 0) {
                          statusText = '⏳ In Progress';
                          statusClass = 'task-progress-status';
                        }

                        return (
                          <div
                            key={task.id}
                            className={`full-task-row ${task.done ? 'task-done' : ''}`}
                            onClick={() => handleToggleTask(task.id)}
                          >
                            <button className="checkbox-btn" aria-label="Toggle status">
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
                                  ✓ Completed {new Date(task.completedAt).toLocaleDateString()}
                                </small>
                              )}
                            </div>
                            <span className={`status-pill ${statusClass}`}>{statusText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI ASSISTANT (Requirement 8) */}
      {activeTab === 'chat' && (
        <div className="chat-container">
          <div className="chat-top-header">
            <div className="ai-status-indicator">
              <div className="ai-avatar-badge">
                <Bot size={20} />
              </div>
              <div className="ai-header-info">
                <h3>🤖 AI Assistant</h3>
                <span className="ai-sub-badge">🟢 Online · Grounded Retrieval</span>
              </div>
            </div>
          </div>

          <div
            className="chat-messages-scroll"
            ref={chatScrollRef}
            onScroll={handleChatScroll}
          >
            {messages.length === 0 ? (
              <div className="chat-welcome-card">
                <div className="welcome-avatar-circle">
                  <Bot size={36} />
                </div>
                <h3>Hi {user?.name}! 👋</h3>
                <p className="welcome-intro-text">
                  I'm your <b>AI Onboarding Assistant</b>. You can ask me anything about:
                </p>

                <div className="welcome-topics-grid">
                  <div className="topic-chip">🏢 Company policies</div>
                  <div className="topic-chip">💻 Workplace setup</div>
                  <div className="topic-chip">📚 Documents</div>
                  <div className="topic-chip">👥 Teams & culture</div>
                  <div className="topic-chip">📅 Onboarding steps</div>
                  <div className="topic-chip">❓ First-week questions</div>
                </div>

                <div className="prompt-suggestions">
                  <span className="suggestions-title">💡 Try asking one of these:</span>
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
                      <Sparkles size={16} className="animate-spin text-indigo" />
                      <span>🤖 AI is thinking... Searching approved company knowledge...</span>
                    </div>
                  ) : m.role === 'user' ? (
                    <div className="user-message-wrap">
                      <div className="user-bubble">{m.content}</div>
                      <div className="msg-avatar user-avatar-badge">
                        {user?.avatar || 'ME'}
                      </div>
                    </div>
                  ) : (
                    <div className="ai-message-wrap">
                      <div className="msg-avatar ai-avatar-badge">
                        <Bot size={18} />
                      </div>
                      <div className="ai-bubble-box">
                        <div className="ai-bubble-content">
                          <p>{m.content}</p>

                          {/* Automatic Zero-Click Escalation Banner */}
                          {m.escalation && (
                            <div className="escalation-alert-card">
                              <div className="escalation-alert-header">
                                <ShieldAlert size={18} className="text-amber" />
                                <b>⚠️ Question Forwarded to HR</b>
                              </div>
                              <p>
                                {m.reason || "I couldn't find a reliable answer in the company knowledge base. Your question has been forwarded to HR."}
                              </p>
                              <span className="escalation-status-tag">Status: 🔴 Pending HR Answer</span>
                            </div>
                          )}

                          {/* Approved Sources & Citations */}
                          {m.sources && m.sources.length > 0 && (
                            <div className="citations-box">
                              <div className="citations-header">
                                <FileText size={14} />
                                <span>Approved Citations:</span>
                              </div>
                              <div className="citations-list">
                                {m.sources.map((s, sIdx) => {
                                  const isHRApproved = s.documentTitle?.includes('HR Approved') || s.sourceType === 'HR Approved Knowledge';
                                  return (
                                    <div key={sIdx} className={`citation-chip ${isHRApproved ? 'kb-citation' : 'doc-citation'}`}>
                                      <span className="citation-icon">{isHRApproved ? '✅' : '📚'}</span>
                                      <span className="citation-doc">
                                        {isHRApproved ? 'Approved HR Knowledge' : `Source: ${s.documentTitle}`}
                                      </span>
                                      {s.section && <span className="citation-section">§ {s.section}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons & timestamp */}
                        <div className="ai-bubble-footer">
                          <span className="message-time">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            className="btn-copy-msg"
                            onClick={() => handleCopyAnswer(m.content, idx)}
                            title="Copy response"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check size={13} className="text-green" />
                                <span className="text-green">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Floating Scroll-to-bottom button */}
          {showScrollBottom && (
            <button className="btn-scroll-bottom" onClick={scrollToBottom} title="Scroll to latest">
              <ArrowDown size={16} />
              <span>Scroll to latest</span>
            </button>
          )}

          {/* Chat Input Bar */}
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
              placeholder="Ask anything about company policies, benefits, code review, or setup..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isSending}
            />
            <button
              type="submit"
              className="btn btn-primary btn-send"
              disabled={isSending || !inputQuestion.trim()}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: MY HR QUESTIONS */}
      {activeTab === 'escalations' && (
        <div className="dashboard-content">
          <div className="section-header-card">
            <div>
              <h2>🚨 My Escalated HR Questions</h2>
              <p>Inquiries automatically forwarded to People Operations with verified HR answers.</p>
            </div>
            <span className="badge-counter-total">{escalations.length} total inquiries</span>
          </div>

          <div className="escalations-list">
            {!escalations.length ? (
              <div className="empty-state">
                <span className="empty-emoji">🎉</span>
                <p>No escalated questions.</p>
                <small>When a question is forwarded to HR, you can monitor its resolution status right here.</small>
              </div>
            ) : (
              escalations.map(esc => (
                <div key={esc.id} className="escalation-card">
                  <div className="escalation-top">
                    <span className={`status-badge ${esc.status === 'Resolved' ? 'badge-resolved' : 'badge-pending'}`}>
                      {esc.status === 'Resolved' ? '✅ Resolved by HR' : '🔴 Pending HR Answer'}
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
                        <b>Official Answer from People Operations ({esc.resolvedBy || 'HR Partner'}):</b>
                      </div>
                      <p className="hr-answer-text">{esc.hrAnswer}</p>
                      {esc.savedToKB && (
                        <span className="kb-badge-saved">
                          ✓ Saved to Company Knowledge Base for all employees
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="hr-pending-box">
                      <Clock size={16} className="text-amber" />
                      <span>Forwarded to HR. A People Operations partner will review and provide an answer here.</span>
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
