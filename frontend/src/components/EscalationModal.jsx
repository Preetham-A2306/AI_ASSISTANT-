import React, { useState } from 'react';
import { X, Send, Database, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { apiRequest } from '../services/api.js';

export function EscalationModal({ escalation, onClose, onSuccess }) {
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('Company Policies');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!escalation) return null;

  const handleResolve = async (saveToKB) => {
    if (!answer.trim()) {
      setError('Please provide a helpful answer before resolving.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiRequest(`/escalations/${escalation.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          answer: answer.trim(),
          saveToKB,
          category: category.trim() || 'General HR Policy',
          department: escalation.department
        })
      });

      onSuccess?.(saveToKB);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit response.');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldAlert className="modal-icon text-amber" size={22} />
            <div>
              <h3>Answer Escalated Question</h3>
              <p className="modal-subtitle">Review inquiry from {escalation.employeeName} ({escalation.department})</p>
            </div>
          </div>
          <button className="icon-btn-close" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-alert error">{error}</div>}

          <div className="escalation-detail-card">
            <div className="detail-meta">
              <span className="badge badge-dept">{escalation.department}</span>
              <span className="meta-time">
                <Clock size={12} />
                {new Date(escalation.timestamp).toLocaleString()}
              </span>
            </div>
            <h4 className="inquiry-text">"{escalation.question}"</h4>
            {escalation.reason && (
              <p className="inquiry-reason">
                <b>Escalation Reason:</b> {escalation.reason}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="hr-answer">
              HR Official Answer <span className="req">*</span>
            </label>
            <textarea
              id="hr-answer"
              rows={5}
              className="form-textarea"
              placeholder="Provide an accurate, policy-grounded answer for the employee..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="kb-category">Knowledge Base Category (if saving globally)</label>
            <select
              id="kb-category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              <option value="Company Policies">Company Policies</option>
              <option value="Remote Work & Relocation">Remote Work & Relocation</option>
              <option value="Benefits & Compensation">Benefits & Compensation</option>
              <option value="IT & Security">IT & Security</option>
              <option value="Office Guidelines">Office Guidelines</option>
              <option value="Engineering Practices">Engineering Practices</option>
            </select>
          </div>

          <div className="kb-decision-box">
            <div className="decision-header">
              <Database size={18} className="text-blue" />
              <b>Save this answer to the approved Knowledge Base for future employees?</b>
            </div>
            <p className="decision-desc">
              If saved, future employees asking similar questions will automatically receive this approved answer via the AI assistant. If not saved, the answer will only be visible to {escalation.employeeName}.
            </p>

            <div className="decision-actions">
              <button
                type="button"
                className="btn btn-success"
                onClick={() => handleResolve(true)}
                disabled={submitting || !answer.trim()}
              >
                <CheckCircle size={16} />
                <span>Save to Knowledge Base</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleResolve(false)}
                disabled={submitting || !answer.trim()}
              >
                <span>Do Not Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
