import express from 'express';
import crypto from 'crypto';
import { getDB, saveDB } from '../models/db.js';
import { EMPLOYEE_DEPARTMENTS, HR_DEPARTMENTS, DEFAULT_ROLE_TASKS } from '../config/constants.js';
import { createToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/auth/departments
router.get('/departments', (_req, res) => {
  res.json({
    employeeDepartments: EMPLOYEE_DEPARTMENTS,
    hrDepartments: HR_DEPARTMENTS
  });
});

// GET /api/auth/demo-accounts - For hackathon testing and demo fill buttons (no passwords returned)
router.get('/demo-accounts', (_req, res) => {
  const db = getDB();
  const demoEmployees = db.users
    .filter(u => u.role === 'employee')
    .map(u => ({
      employeeId: u.employeeId,
      name: u.name,
      department: u.department,
      jobTitle: u.jobTitle
    }));

  const demoHR = db.users
    .filter(u => u.role === 'hr')
    .map(u => ({
      employeeId: u.employeeId,
      name: u.name,
      department: u.department,
      jobTitle: u.jobTitle
    }));

  res.json({
    employees: demoEmployees,
    hr: demoHR
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { role, employeeId, password, department, name } = req.body;

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
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // Find user by employeeId or name matching the requested role
  let user = db.users.find(
    u => (u.employeeId.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId) && u.role === role
  );

  let isNewRegistration = false;

  if (!user) {
    if (role === 'hr') {
      return res.status(401).json({
        error: `No HR Administrator account found with ID "${employeeId}".`
      });
    }

    // Role is employee: Auto-register new employee upon first login/onboarding
    isNewRegistration = true;
    const formattedId = employeeId.trim().toUpperCase();
    const displayName = (name && name.trim()) 
      ? name.trim() 
      : (formattedId.startsWith('EMP') ? `Employee ${formattedId}` : employeeId.trim());
    
    const initials = displayName
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'EM';

    user = {
      id: `usr-emp-${crypto.randomUUID().slice(0, 8)}`,
      employeeId: formattedId,
      name: displayName,
      role: 'employee',
      department: department.trim(),
      jobTitle: `${department.trim()} Specialist`,
      startDate: today,
      createdDate: now,
      password: password.trim(),
      avatar: initials,
      loginCount: 1,
      firstLogin: now,
      lastLogin: now,
      lastActive: now
    };

    db.users.push(user);

    // Create personalized onboarding plan for the new employee
    const taskTemplates = DEFAULT_ROLE_TASKS[department.trim()] || DEFAULT_ROLE_TASKS.Default;
    const plan = {
      id: `plan-${user.employeeId.toLowerCase()}`,
      employeeId: user.employeeId,
      name: user.name,
      role: user.jobTitle,
      department: user.department,
      startDate: user.startDate,
      tasks: taskTemplates.map(t => ({
        id: crypto.randomUUID(),
        day: t.day,
        title: t.title,
        done: Boolean(t.done),
        completedAt: t.done ? now : null
      }))
    };
    db.onboardingPlans.push(plan);
  } else {
    // Existing user: check credentials
    if (user.password !== password.trim()) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Validate department compatibility
    if (user.department.toLowerCase() !== department.trim().toLowerCase()) {
      return res.status(400).json({
        error: `Department mismatch: Account ${user.employeeId} belongs to "${user.department}", but you selected "${department}".`
      });
    }

    user.lastLogin = now;
    user.lastActive = now;
    user.loginCount = (user.loginCount || 1) + 1;
  }

  // Record login activity event for analytics
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
    text: isNewRegistration 
      ? `New employee ${user.name} (${user.department}) registered and logged in`
      : `${user.name} (${user.department}) logged in`,
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
