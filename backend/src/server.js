/**
 * Main Application Server — OnboardAI
 * Production hardened with Node built-ins (zero runtime dependencies).
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { loadDB, getDB, saveDB } from './models/db.js';
import { seedDemoData } from './data/seed.js';

import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import escalationRoutes from './routes/escalationRoutes.js';
import knowledgeRoutes from './routes/knowledgeRoutes.js';
import { authenticate, requireHR, requireSelfOrHR } from './middleware/auth.js';
import { securityHeaders, rateLimit, corsPolicy } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Closes CWE-200: Prevent Express technology fingerprinting via X-Powered-By
app.disable('x-powered-by');

// Closes CWE-693 / CWE-1021 / CWE-16: Enforce strict security headers (CSP, nosniff, DENY, etc.)
app.use(securityHeaders);

// Closes CWE-942: Strict CORS allowlist policy for trusted origins
app.use(corsPolicy);

// Closes CWE-770: Global DoS protection with 240 requests/minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  message: 'Too many requests from this address. Please slow down.'
});
app.use(globalLimiter);

// Closes CWE-400: Limit payload size to 1MB to prevent memory exhaustion attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serverless route prefix normalization:
// If request arrives as /auth/login instead of /api/auth/login, prepend /api
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Initialize DB and ensure demo data is seeded
loadDB();
seedDemoData(false);

// Register Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// =====================================================
// HEALTH CHECK
// =====================================================
app.get('/api/health', (_req, res) => {
  const db = getDB();
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    documents: (db.documents || []).length,
    chunks: (db.chunks || []).length,
    users: (db.users || []).length,
    knowledgeItems: (db.knowledgeBase || []).length
  });
});

// =====================================================
// BACKWARD COMPATIBLE ONBOARDING ENDPOINTS
// =====================================================
// Closes CWE-306 / CWE-284: Require authentication and restrict plan generation to self or HR
app.post('/api/onboarding/generate', authenticate, (req, res) => {
  const db = getDB();
  const requestedEmployeeId = req.body.employeeId || req.body.name || req.user.employeeId;

  if (req.user.role !== 'hr' && requestedEmployeeId !== req.user.employeeId && requestedEmployeeId !== req.user.name) {
    return res.status(403).json({ error: 'Access denied. You can only generate onboarding plans for yourself.' });
  }

  const name = req.body.name || req.user.name;
  const startDate = req.body.startDate || new Date().toISOString().slice(0, 10);
  const role = req.body.role || req.user.jobTitle || 'Engineer';
  const department = req.body.department || req.user.department || 'Engineering';

  let existing = db.onboardingPlans.find(p => p.name === name || p.employeeId === requestedEmployeeId);
  if (!existing) {
    existing = {
      id: crypto.randomUUID(),
      employeeId: requestedEmployeeId,
      name,
      role,
      department,
      startDate,
      tasks: [
        { id: crypto.randomUUID(), day: 1, title: 'Complete HR onboarding and identity verification', done: false },
        { id: crypto.randomUUID(), day: 1, title: 'Set up company email, Slack, and 1Password', done: false },
        { id: crypto.randomUUID(), day: 2, title: 'Meet team lead & review 30-day goals', done: false },
        { id: crypto.randomUUID(), day: 3, title: 'Review department guidelines and documentation', done: false },
        { id: crypto.randomUUID(), day: 4, title: 'Configure local workspace and tooling', done: false },
        { id: crypto.randomUUID(), day: 5, title: 'Attend first team sync', done: false }
      ]
    };
    db.onboardingPlans.push(existing);
    saveDB();
  }

  res.json({ plan: existing });
});

app.get('/api/onboarding/:employeeId', authenticate, requireSelfOrHR('employeeId'), (req, res) => {
  const db = getDB();
  const hire = db.onboardingPlans.find(
    p => p.employeeId === req.params.employeeId || p.name === req.params.employeeId
  );
  res.json({ plan: hire || null });
});

// Closes CWE-639: IDOR vulnerability — check onboarding plan ownership before allowing task modifications
app.patch('/api/onboarding/tasks/:taskId', authenticate, (req, res) => {
  const db = getDB();
  for (const plan of db.onboardingPlans) {
    const task = plan.tasks.find(t => t.id === req.params.taskId);
    if (task) {
      if (req.user.role !== 'hr' && plan.employeeId !== req.user.employeeId && plan.name !== req.user.name) {
        return res.status(403).json({
          error: "Access denied. You cannot modify another employee's onboarding tasks."
        });
      }
      task.done = Boolean(req.body.done);
      saveDB();
      return res.json({ plan });
    }
  }
  res.status(404).json({ error: 'Task not found' });
});

// =====================================================
// BACKWARD COMPATIBLE DASHBOARD & ANALYTICS
// =====================================================
app.get('/api/dashboard/stats', authenticate, requireHR, (_req, res) => {
  const db = getDB();
  res.json({
    stats: {
      documents: (db.documents || []).length,
      questions: (db.questions || []).length,
      escalations: (db.escalations || []).filter(item => item.status !== 'Resolved').length,
      newHires: (db.users || []).filter(u => u.role === 'employee').length
    },
    activities: (db.activities || []).slice(0, 10)
  });
});

app.get('/api/analytics/questions', authenticate, requireHR, (_req, res) => {
  const db = getDB();
  const map = {};

  (db.questions || []).forEach(q => {
    const key = (q.question || '').trim().toLowerCase();
    if (!map[key]) {
      map[key] = {
        question: q.question,
        count: 0,
        lastAsked: q.timestamp,
        escalated: false
      };
    }
    map[key].count++;
    map[key].lastAsked = q.timestamp;
    map[key].escalated = map[key].escalated || q.escalated;
  });

  res.json({
    questions: Object.values(map).sort((a, b) => b.count - a.count)
  });
});

// =====================================================
// DEMO SEED / RESET ENDPOINT
// =====================================================
// Closes CWE-284: Require HR authentication and honor ALLOW_DEMO_RESET to prevent unauthenticated data wipes
app.post('/api/demo/seed', authenticate, requireHR, (_req, res) => {
  if (process.env.ALLOW_DEMO_RESET === 'false') {
    return res.status(403).json({ error: 'Demo reset is disabled in this environment.', code: 'seed_disabled' });
  }
  try {
    const result = seedDemoData(true);
    res.json({ ok: true, result });
  } catch (error) {
    console.error('Seed reset error:', error);
    res.status(500).json({ error: 'Failed to reset demo database.' });
  }
});

// Closes CWE-200: Return clean JSON 404 for unknown API endpoints instead of Express default HTML
app.use((req, res) => {
  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found', code: 'not_found' });
  }
  res.status(404).json({ error: 'Resource not found', code: 'not_found' });
});

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================
// Closes CWE-209: Prevent stack traces, system paths, and dependency internals from leaking in 5xx errors
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Max limit is 1MB.', code: 'payload_too_large' });
  }

  const status = typeof err.status === 'number' ? err.status : 500;
  if (status >= 500) {
    console.error('[Internal Server Error]', err);
    return res.status(500).json({ error: 'An internal server error occurred.', code: 'internal_error' });
  }

  return res.status(status).json({
    error: err.message || 'Request failed.',
    code: err.code || 'request_error'
  });
});

// Start listening if run directly
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` AI Onboarding Assistant Server running on port ${PORT}`);
    console.log(` Gemini configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
    console.log(`===================================================`);
  });
}

export default app;