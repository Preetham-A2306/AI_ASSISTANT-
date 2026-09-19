import express from 'express';
import crypto from 'crypto';
import { getDB, saveDB } from '../models/db.js';
import { EMPLOYEE_DEPARTMENTS, HR_DEPARTMENTS } from '../config/constants.js';
import { createToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/auth/departments
router.get('/departments', (_req, res) => {
  res.json({
    employeeDepartments: EMPLOYEE_DEPARTMENTS,
    hrDepartments: HR_DEPARTMENTS
  });
});

// GET /api/auth/demo-accounts - For hackathon testing and demo fill buttons
router.get('/demo-accounts', (_req, res) => {
  const db = getDB();
  const demoEmployees = db.users
    .filter(u => u.role === 'employee')
    .map(u => ({
      employeeId: u.employeeId,
      name: u.name,
      department: u.department,
      jobTitle: u.jobTitle,
      password: 'password123'
    }));

  const demoHR = db.users
    .filter(u => u.role === 'hr')
    .map(u => ({
      employeeId: u.employeeId,
      name: u.name,
      department: u.department,
      jobTitle: u.jobTitle,
      password: 'password123'
    }));

  res.json({
    employees: demoEmployees,
    hr: demoHR
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { role, employeeId, password, department } = req.body;

  if (!role || !['employee', 'hr'].includes(role)) {
    return res.status(400).json({ error: 'Valid role (New Employee or HR) must be specified.' });
  }

  if (!employeeId || !employeeId.trim()) {
    return res.status(400).json({ error: 'Employee ID is required.' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  if (!department || !department.trim()) {
    return res.status(400).json({ error: 'Department selection is mandatory.' });
  }

  const db = getDB();
  const cleanId = employeeId.trim().toLowerCase();

  // Find user by employeeId or name matching the requested role
  const user = db.users.find(
    u => (u.employeeId.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId) && u.role === role
  );

  if (!user) {
    return res.status(401).json({
      error: `No ${role === 'hr' ? 'HR Administrator' : 'Employee'} account found with ID "${employeeId}".`
    });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  // Validate department compatibility
  if (user.department.toLowerCase() !== department.trim().toLowerCase()) {
    return res.status(400).json({
      error: `Department mismatch: Account ${user.employeeId} belongs to "${user.department}", but you selected "${department}".`
    });
  }

  // Record login event for analytics
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const activityRecord = {
    id: crypto.randomUUID(),
    userId: user.id,
    employeeId: user.employeeId,
    name: user.name,
    role: user.role,
    department: user.department,
    timestamp: now,
    date: today
  };

  db.loginActivities.unshift(activityRecord);

  db.activities.unshift({
    id: crypto.randomUUID(),
    text: `${user.name} (${user.department}) logged in`,
    timestamp: now
  });

  saveDB();

  // Generate auth session token
  const token = createToken(user);

  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      role: user.role,
      department: user.department,
      jobTitle: user.jobTitle,
      startDate: user.startDate,
      avatar: user.avatar
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    ok: true,
    user: req.user
  });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

export default router;
