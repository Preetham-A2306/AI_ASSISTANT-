import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, Bell, User } from 'lucide-react';
import { useAuth } from '../services/authContext.jsx';
import { NotificationPopover } from './NotificationPopover.jsx';
import { apiRequest } from '../services/api.js';

export function Navbar() {
  const { user, role, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiRequest('/employee/notifications');
      setNotifications(res.notifications || []);
    } catch {
      // Ignore if endpoint not accessible
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="top-navbar">
      <div className="navbar-brand">
        <div className="logo-badge">
          <ShieldCheck size={20} />
        </div>
        <div className="brand-text">
          <span className="brand-title">OnboardAI</span>
          <span className="brand-subtitle">AI Employee Assistant</span>
        </div>
        <span className={`role-pill ${role === 'hr' ? 'hr-pill' : 'emp-pill'}`}>
          {role === 'hr' ? 'HR Administrator' : 'New Employee'}
        </span>
      </div>

      <div className="navbar-user">
        <div className="notification-wrapper">
          <button
            className={`icon-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <NotificationPopover
              notifications={notifications}
              onClose={() => setShowNotifications(false)}
              onRefresh={loadNotifications}
            />
          )}
        </div>

        <div className="user-profile-badge">
          <div className="avatar-circle">
            {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-meta">{user?.department} · {user?.employeeId}</span>
          </div>
        </div>

        <button className="btn-logout" onClick={logout} title="Sign Out">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
