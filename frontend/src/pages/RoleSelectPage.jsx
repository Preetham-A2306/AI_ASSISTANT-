import React from 'react';
import { ChevronRight, Sparkles, Building2, Briefcase, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function RoleSelectPage({ onSelectRole }) {
  return (
    <div className="landing-screen">
      <div className="landing-card">
        <div className="landing-header">
          <div className="landing-badge">
            <Sparkles size={15} />
            <span>✨ Enterprise AI Onboarding Platform</span>
          </div>
          <h1 className="landing-title">Welcome to OnboardAI</h1>
          <p className="landing-subtitle">
            Grounded enterprise intelligence, personalized onboarding milestones, and seamless HR collaboration.
          </p>
        </div>

        <div className="role-selection-section">
          <div className="role-prompt-wrap">
            <h2 className="role-prompt">Who are you?</h2>
            <p className="role-subprompt">Select your role to access your personalized workspace</p>
          </div>

          <div className="role-grid">
            <button
              className="role-card role-card-employee"
              onClick={() => onSelectRole('employee')}
            >
              <div className="role-card-top">
                <div className="role-icon-circle emp-circle">
                  <span className="role-emoji">👨‍💻</span>
                </div>
                <span className="role-tag">Onboarding Workspace</span>
              </div>
              
              <div className="role-content">
                <h3>New Employee</h3>
                <p className="role-desc">
                  Start your onboarding journey, explore company information and ask the AI assistant.
                </p>
              </div>

              <div className="role-features-list">
                <div className="role-feature-item">
                  <CheckCircle2 size={14} className="feature-icon" />
                  <span>5-Day Onboarding Checklist</span>
                </div>
                <div className="role-feature-item">
                  <CheckCircle2 size={14} className="feature-icon" />
                  <span>Grounded AI Knowledge Assistant</span>
                </div>
                <div className="role-feature-item">
                  <CheckCircle2 size={14} className="feature-icon" />
                  <span>Direct HR Question Escalations</span>
                </div>
              </div>

              <div className="role-card-cta emp-cta">
                <span>Enter Employee Portal</span>
                <ArrowRight size={16} />
              </div>
            </button>

            <button
              className="role-card role-card-hr"
              onClick={() => onSelectRole('hr')}
            >
              <div className="role-card-top">
                <div className="role-icon-circle hr-circle">
                  <span className="role-emoji">👩‍💼</span>
                </div>
                <span className="role-tag">People Operations</span>
              </div>

              <div className="role-content">
                <h3>HR / Admin</h3>
                <p className="role-desc">
                  Manage employees, documents, questions, knowledge and onboarding analytics.
                </p>
              </div>

              <div className="role-features-list">
                <div className="role-feature-item">
                  <CheckCircle2 size={14} className="feature-icon" />
                  <span>Live Employee & Department Analytics</span>
                </div>
                <div className="role-feature-item">
                  <CheckCircle2 size={14} className="feature-icon" />
                  <span>Pending Escalations & KB Feedback Loop</span>
                </div>
                <div className="role-feature-item">
                  <CheckCircle2 size={14} className="feature-icon" />
                  <span>Policy Document Ingestion & RAG Indexing</span>
                </div>
              </div>

              <div className="role-card-cta hr-cta">
                <span>Enter HR Command Center</span>
                <ArrowRight size={16} />
              </div>
            </button>
          </div>
        </div>

        <div className="landing-footer">
          <div className="footer-item">
            <ShieldCheck size={14} />
            <span>Role-Based Access Control</span>
          </div>
          <span className="footer-dot">•</span>
          <div className="footer-item">
            <span>📚 Grounded RAG Architecture</span>
          </div>
          <span className="footer-dot">•</span>
          <div className="footer-item">
            <span>⚡ Zero-Click Escalation</span>
          </div>
        </div>
      </div>
    </div>
  );
}

