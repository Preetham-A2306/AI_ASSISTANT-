import express from 'express';
import crypto from 'crypto';
import { getDB, saveDB } from '../models/db.js';
import { authenticate, requireSelfOrHR } from '../middleware/auth.js';
import { getNotificationsForUser } from '../services/notificationService.js';

const router = express.Router();

// Apply auth middleware to all employee routes
router.use(authenticate);

// GET /api/employee/profile
router.get('/profile', (req, res) => {
  res.json({
    profile: req.user
  });
});

// GET /api/employee/checklist
router.get('/checklist', (req, res) => {
  const db = getDB();
  let plan = db.onboardingPlans.find(
    p => p.employeeId === req.user.employeeId || p.name === req.user.name
  );

  if (!plan) {
    // Auto-create standard onboarding plan if missing
    plan = {
      id: crypto.randomUUID(),
      employeeId: req.user.employeeId,
      name: req.user.name,
      role: req.user.jobTitle || 'Employee',
      department: req.user.department,
      startDate: req.user.startDate || new Date().toISOString().slice(0, 10),
      tasks: [
        { id: crypto.randomUUID(), day: 1, title: 'Complete HR onboarding documentation', done: false },
        { id: crypto.randomUUID(), day: 1, title: 'Set up corporate email & 2FA security', done: false },
        { id: crypto.randomUUID(), day: 2, title: 'Meet team lead & review week 1 priorities', done: false },
        { id: crypto.randomUUID(), day: 3, title: 'Set up department workspace and credentials', done: false },
        { id: crypto.randomUUID(), day: 4, title: 'Read company handbook and compliance policy', done: false },
        { id: crypto.randomUUID(), day: 5, title: 'Attend first weekly team sync', done: false }
      ]
    };
    db.onboardingPlans.push(plan);
    saveDB();
  }

  const completed = (plan.tasks || []).filter(t => t.done).length;
  const total = (plan.tasks || []).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({
    plan,
    stats: {
      completed,
      total,
      remaining: Math.max(0, total - completed),
      progress
    }
  });
});

// PATCH /api/employee/checklist/:taskId
router.patch('/checklist/:taskId', (req, res) => {
  const db = getDB();
  const plan = db.onboardingPlans.find(
    p => p.employeeId === req.user.employeeId || p.name === req.user.name
  );

  if (!plan) {
    return res.status(404).json({ error: 'Onboarding checklist not found.' });
  }

  const task = (plan.tasks || []).find(t => t.id === req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  task.done = typeof req.body.done === 'boolean' ? req.body.done : !task.done;
  task.completedAt = task.done ? new Date().toISOString() : null;

  saveDB();

  const completed = plan.tasks.filter(t => t.done).length;
  const total = plan.tasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({
    plan,
    stats: {
      completed,
      total,
      remaining: Math.max(0, total - completed),
      progress
    }
  });
});

// GET /api/employee/notifications
router.get('/notifications', (req, res) => {
  const notifications = getNotificationsForUser(req.user);
  res.json({ notifications });
});

// PATCH /api/employee/notifications/:id/read
router.patch('/notifications/:id/read', (req, res) => {
  const db = getDB();
  const notification = db.notifications.find(n => n.id === req.params.id);

  if (notification) {
    notification.read = true;
    saveDB();
  }

  res.json({ ok: true });
});

// GET /api/employee/escalations
router.get('/escalations', (req, res) => {
  const db = getDB();
  const personalEscalations = db.escalations.filter(
    e => e.employeeId === req.user.employeeId || e.employeeName === req.user.name
  );
  res.json({ escalations: personalEscalations });
});

export default router;
