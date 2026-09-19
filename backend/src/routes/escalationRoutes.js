import express from 'express';
import crypto from 'crypto';
import { getDB, saveDB } from '../models/db.js';
import { authenticate, requireHR } from '../middleware/auth.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();

function id() {
  return crypto.randomUUID();
}

// GET /api/escalations - Role-aware listing
router.get('/', authenticate, (req, res) => {
  const db = getDB();

  if (req.user.role === 'hr') {
    return res.json({ escalations: db.escalations || [] });
  }

  // Employee only sees their own escalations
  const personal = (db.escalations || []).filter(
    e => e.employeeId === req.user.employeeId || e.employeeName === req.user.name
  );
  res.json({ escalations: personal });
});

// POST /api/escalations - Create escalation (authenticated)
router.post('/', authenticate, (req, res) => {
  const db = getDB();
  const { question, reason } = req.body;

  const escalation = {
    id: id(),
    question: question || '',
    employeeId: req.user.employeeId,
    employeeName: req.user.name,
    department: req.user.department,
    timestamp: new Date().toISOString(),
    reason: reason || 'Information unavailable in company documentation',
    status: 'Pending',
    priority: 'Normal',
    hrAnswer: null,
    resolvedAt: null,
    resolvedBy: null,
    savedToKB: false
  };

  db.escalations.unshift(escalation);

  db.activities.unshift({
    id: id(),
    text: `Question escalated: ${escalation.question}`,
    timestamp: escalation.timestamp
  });

  saveDB();

  res.status(201).json({ escalation });
});

// POST /api/escalations/:id/answer - HR answers an escalated question with saveToKB option
router.post('/:id/answer', authenticate, requireHR, (req, res) => {
  const db = getDB();
  const escalation = (db.escalations || []).find(e => e.id === req.params.id);

  if (!escalation) {
    return res.status(404).json({ error: 'Escalation not found.' });
  }

  const { answer, saveToKB = false, category = 'General HR Policy' } = req.body;

  if (!answer || !answer.trim()) {
    return res.status(400).json({ error: 'Answer content is required.' });
  }

  const cleanAnswer = answer.trim();
  const now = new Date().toISOString();

  // 1. Resolve escalation
  escalation.status = 'Resolved';
  escalation.hrAnswer = cleanAnswer;
  escalation.resolvedAt = now;
  escalation.resolvedBy = req.user.name;
  escalation.savedToKB = Boolean(saveToKB);

  // 2. Notify the employee
  createNotification({
    recipientId: escalation.employeeId,
    recipientRole: 'employee',
    title: 'HR Answered Your Question',
    message: `HR responded to your question: "${escalation.question.slice(0, 40)}..."`,
    type: 'escalation_resolved',
    relatedId: escalation.id
  });

  // 3. Append to employee's chat history so they see the resolution
  db.chatMessages.push({
    id: id(),
    employeeId: escalation.employeeId,
    role: 'assistant',
    content: `[HR Response from ${req.user.name}]: ${cleanAnswer}`,
    sources: [
      {
        documentTitle: 'HR Approved Direct Response',
        section: `Escalation #${escalation.id.slice(0, 8)}`,
        sourceType: 'HR Direct Answer',
        score: 1.0
      }
    ],
    escalation: false,
    timestamp: now
  });

  // 4. Save to global Knowledge Base if requested
  let createdKBItem = null;
  if (saveToKB) {
    createdKBItem = {
      id: id(),
      title: escalation.question,
      content: cleanAnswer,
      category,
      sourceType: 'HR Approved',
      sourceDocument: `HR Resolution (${req.user.name})`,
      department: escalation.department || 'All',
      approvedBy: req.user.name,
      createdAt: now,
      updatedAt: now,
      status: 'Approved'
    };

    db.knowledgeBase.unshift(createdKBItem);

    db.activities.unshift({
      id: id(),
      text: `HR Knowledge Base updated: "${escalation.question.slice(0, 45)}"`,
      timestamp: now
    });
  }

  db.activities.unshift({
    id: id(),
    text: `Escalation resolved by ${req.user.name} for ${escalation.employeeName}`,
    timestamp: now
  });

  saveDB();

  res.json({
    ok: true,
    escalation,
    savedToKB: Boolean(saveToKB),
    knowledgeItem: createdKBItem
  });
});

// PATCH /api/escalations/:id - Generic status update (HR only)
router.patch('/:id', authenticate, requireHR, (req, res) => {
  const db = getDB();
  const escalation = (db.escalations || []).find(item => item.id === req.params.id);

  if (!escalation) {
    return res.status(404).json({ error: 'Escalation not found' });
  }

  if (req.body.status) escalation.status = req.body.status;
  if (req.body.answer) escalation.hrAnswer = req.body.answer;

  saveDB();

  res.json({ escalation });
});

export default router;
