import React from 'react';
import { Bell, Check, Clock, X } from 'lucide-react';
import { apiRequest } from '../services/api.js';

export function NotificationPopover({ notifications = [], onClose, onRefresh }) {
  const markAsRead = async (id) => {
    try {
      await apiRequest(`/employee/notifications/${id}/read`, { method: 'PATCH' });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  return (
    <div className="notification-popover">
      <div className="popover-header">
        <div className="popover-title">
          <Bell size={16} />
          <span>Notifications</span>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="unread-badge">
              {notifications.filter(n => !n.read).length} new
            </span>
          )}
        </div>
        <button className="icon-btn-close" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="popover-list">
        {!notifications.length ? (
          <div className="empty-notifications">
            <p>No notifications at this time.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
              <div className="notification-content">
                <b>{n.title}</b>
                <p>{n.message}</p>
                <small>
                  <Clock size={12} />
                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
              {!n.read && (
                <button
                  className="btn-mark-read"
                  title="Mark as read"
                  onClick={() => markAsRead(n.id)}
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
