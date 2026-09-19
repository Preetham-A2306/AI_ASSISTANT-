import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Basic middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174'
    ],
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.post('/api/onboarding/generate', (req, res) => {
  const db = getDB();
  const { name = 'Alex', startDate = new Date().toISOString().slice(0, 10), role = 'Engineer', department = 'Engineering' } = req.body;

  let existing = db.onboardingPlans.find(p => p.name === name || p.employeeId === name);
  if (!existing) {
    existing = {
      id: crypto.randomUUID(),
      employeeId: name,
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

app.get('/api/onboarding/:employeeId', (req, res) => {
  const db = getDB();
  const hire = db.onboardingPlans.find(
    p => p.employeeId === req.params.employeeId || p.name === req.params.employeeId
  );
  res.json({ plan: hire || null });
});

app.patch('/api/onboarding/tasks/:taskId', (req, res) => {
  const db = getDB();
  for (const plan of db.onboardingPlans) {
    const task = plan.tasks.find(t => t.id === req.params.taskId);
    if (task) {
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
app.get('/api/dashboard/stats', (_req, res) => {
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

app.get('/api/analytics/questions', (_req, res) => {
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
app.post('/api/demo/seed', (_req, res) => {
  try {
    const result = seedDemoData(true);
    res.json({ ok: true, result });
  } catch (error) {
    console.error('Seed reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'An unexpected server error occurred.'
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