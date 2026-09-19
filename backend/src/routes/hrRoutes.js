import express from 'express';
import { authenticate, requireHR } from '../middleware/auth.js';
import { getCompanyAnalytics, getEmployeeListWithStatus } from '../services/analyticsService.js';
import { groupSimilarQuestions } from '../services/clusteringService.js';
import { getDB } from '../models/db.js';

const router = express.Router();

// Enforce strict HR authorization on all routes in this router
router.use(authenticate, requireHR);

// GET /api/hr/stats
router.get('/stats', (_req, res) => {
  const analytics = getCompanyAnalytics();
  res.json(analytics);
});

// GET /api/hr/employees
router.get('/employees', (_req, res) => {
  const employees = getEmployeeListWithStatus();
  res.json({ employees });
});

// GET /api/hr/departments
router.get('/departments', (_req, res) => {
  const analytics = getCompanyAnalytics();
  res.json({
    departments: analytics.departments,
    overview: analytics.overview
  });
});

// GET /api/hr/question-trends
router.get('/question-trends', (_req, res) => {
  const db = getDB();
  const clusters = groupSimilarQuestions(db.questions || []);
  res.json({
    trends: clusters
  });
});

export default router;
