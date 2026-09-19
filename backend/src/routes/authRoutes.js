import express from 'express';
import crypto from 'crypto';
import { getDB, saveDB } from '../models/db.js';
import { EMPLOYEE_DEPARTMENTS, HR_DEPARTMENTS, DEFAULT_ROLE_TASKS } from '../config/constants.js';
import { createToken, authenticate, revokeToken } from '../middleware/auth.js';
import { verifyPassword, hashPassword, burnPasswordTiming } from '../utils/password.js';
import { rateLimit, boundedString } from '../middleware/security.js';

const router = express.Router();

// Closes CWE-307: Rate limit login attempts to 8 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

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
router.post('/login', loginLimiter, (req, res) => {
  const role = boundedString(req.body.role, 20);
  const employeeId = boundedString(req.body.employeeId, 50);
  const password = boundedString(req.body.password, 200);
  const department = boundedString(req.body.department, 80);
  const name = boundedString(req.body.name, 100);

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
    if (role === 'hr' || !name || !name.trim()) {
      // Security: Burn equivalent scrypt timing on non-existent accounts and return identical error string
      // Closes CWE-208: Prevents account enumeration via timing discrepancy or distinct error messages
      burnPasswordTiming(password.trim());
      return res.status(401).json({
        error: 'Incorrect employee ID or password.'
      });
    }

    // Role is employee with name: Auto-register new employee upon first onboarding
    isNewRegistration = true;
    const formattedId = employeeId.trim().toUpperCase();
    const displayName = name.trim();
    
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
      password: hashPassword(password.trim()),
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
    // Existing user: check credentials using timing-safe scrypt verification
    // Closes CWE-208 / CWE-385: Prevents side-channel timing attacks
    const isValid = verifyPassword(password.trim(), user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect employee ID or password.' });
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
// Closes CWE-613: Authenticate and genuinely revoke presented session token
router.post('/logout', authenticate, (req, res) => {
  revokeToken(req.token);
  res.json({ ok: true, message: 'Successfully logged out and session revoked.' });
});

export default router;
