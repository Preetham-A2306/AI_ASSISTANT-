import React from 'react';
import { UserCheck, ShieldCheck, ChevronRight, Sparkles, Building2, Briefcase } from 'lucide-react';

export function RoleSelectPage({ onSelectRole }) {
  return (
    <div className="landing-screen">
      <div className="landing-card">
        <div className="landing-header">
          <div className="landing-badge">
            <Sparkles size={16} />
            <span>Enterprise AI Assistant</span>
          </div>
          <h1 className="landing-title">Welcome to OnboardAI</h1>
          <p className="landing-subtitle">
            AI-powered enterprise knowledge, personalized onboarding workflows, and grounded HR assistance.
          </p>
        </div>

        <div className="role-selection-section">
          <h2 className="role-prompt">Who are you?</h2>
          <p className="role-subprompt">Select your role to access your dedicated workspace:</p>

          <div className="role-grid">
            <button
              className="role-card role-card-employee"
              onClick={() => onSelectRole('employee')}
            >
              <div className="role-icon-circle emp-circle">
                <Briefcase size={28} />
              </div>
              <div className="role-content">
                <span className="role-tag">Onboarding Workspace</span>
                <h3>New Employee</h3>
                <p>
                  Access your personal checklist, ask policy questions to the AI assistant, and view HR updates.
                </p>
              </div>
              <div className="role-arrow">
                <ChevronRight size={20} />
              </div>
            </button>

            <button
              className="role-card role-card-hr"
              onClick={() => onSelectRole('hr')}
            >
              <div className="role-icon-circle hr-circle">
                <Building2 size={28} />
              </div>
              <div className="role-content">
                <span className="role-tag">People Operations</span>
                <h3>HR / HR Administrator</h3>
                <p>
                  Manage documents, review escalated questions, monitor employee activity, and analyze FAQ trends.
                </p>
              </div>
              <div className="role-arrow">
                <ChevronRight size={20} />
              </div>
            </button>
          </div>
        </div>

        <div className="landing-footer">
          <span>Reliable · Grounded Retrieval · Role-Based Security</span>
        </div>
      </div>
    </div>
  );
}
