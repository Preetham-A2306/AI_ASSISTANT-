import crypto from 'crypto';
import { getDB, saveDB } from '../models/db.js';

export function createNotification({ recipientId, recipientRole, title, message, type, relatedId }) {
  const db = getDB();
  const notification = {
    id: crypto.randomUUID(),
    recipientId: recipientId || 'all',
    recipientRole: recipientRole || 'employee',
    title,
    message,
    type: type || 'general',
    read: false,
    timestamp: new Date().toISOString(),
    relatedId: relatedId || null
  };

  db.notifications.unshift(notification);
  saveDB();
  return notification;
}

export function getNotificationsForUser(user) {
  const db = getDB();
  return (db.notifications || []).filter(n => {
    if (user.role === 'hr' && (n.recipientRole === 'hr' || n.recipientId === user.employeeId)) {
      return true;
    }
    return n.recipientId === user.employeeId || n.recipientId === user.name;
  });
}
