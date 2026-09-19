import express from 'express';
import crypto from 'crypto';
import { getDB, saveDB } from '../models/db.js';
import { authenticate, requireSelfOrHR } from '../middleware/auth.js';
import { retrieveKnowledge, isSensitive } from '../services/retrievalService.js';
import { generateGroundedAnswer } from '../services/aiService.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();

function id() {
  return crypto.randomUUID();
}

// POST /api/chat - Strictly authenticated to prevent cross-employee identity spoofing
router.post('/', authenticate, async (req, res) => {
  try {
    const rawQuestion = (req.body.question || '').trim();
    if (!rawQuestion) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const db = getDB();

    // Authenticated user context
    const employeeId = req.user.employeeId;
    const employeeName = req.user.name;
    const department = req.user.department;

    const sensitive = isSensitive(rawQuestion);
    let results = [];
    let answerObj = null;
    let shouldEscalate = false;
    let escalationReason = '';

    if (sensitive) {
      shouldEscalate = true;
      escalationReason = 'Question involves confidential HR matters (e.g. salary, compensation, personal contract) requiring private HR handling.';
      answerObj = {
        answer: "This inquiry involves confidential HR or compensation matters that require direct review by People Operations. I've automatically forwarded your question to HR so they can follow up with you privately.",
        escalate: true,
        reason: escalationReason
      };
    } else {
      results = retrieveKnowledge(rawQuestion);

      if (!results || results.length === 0) {
        shouldEscalate = true;
        escalationReason = 'No matching information found in current approved company documents or HR knowledge base.';
        answerObj = {
          answer: "I couldn't find an approved company policy that answers this question. I've automatically forwarded your question to HR so they can provide an accurate answer.",
          escalate: true,
          reason: escalationReason
        };
      } else {
        answerObj = await generateGroundedAnswer(rawQuestion, results);
        if (answerObj.escalate) {
          shouldEscalate = true;
          escalationReason = answerObj.reason || 'Information not sufficiently covered in approved company documents.';
        }
      }
    }

    let createdEscalationId = null;

    // Automatic HR Escalation (No second manual button required from employee)
    if (shouldEscalate) {
      createdEscalationId = id();

      const newEscalation = {
        id: createdEscalationId,
        question: rawQuestion,
        employeeId,
        employeeName,
        department,
        timestamp: new Date().toISOString(),
        reason: escalationReason,
        status: 'Pending',
        priority: sensitive ? 'High' : 'Normal',
        hrAnswer: null,
        resolvedAt: null,
        resolvedBy: null,
        savedToKB: false
      };

      db.escalations.push(newEscalation);

      // Create notifications for HR and Employee
      createNotification({
        recipientId: 'HR',
        recipientRole: 'hr',
        title: `New Escalation: ${employeeName} (${department})`,
        message: `Employee asked: "${rawQuestion}"`,
        type: 'escalation_created',
        relatedId: createdEscalationId
      });

      createNotification({
        recipientId: employeeId,
        recipientRole: 'employee',
        title: 'Question Forwarded to HR',
        message: `Your inquiry ("${rawQuestion.slice(0, 45)}...") has been escalated to HR for review.`,
        type: 'escalation_created',
        relatedId: createdEscalationId
      });

      db.activities.unshift({
        id: id(),
        text: `Question escalated: ${rawQuestion}`,
        timestamp: new Date().toISOString()
      });
    }

    // Persist Question Record for Analytics
    db.questions.push({
      id: id(),
      question: rawQuestion,
      employeeId,
      employeeName,
      department,
      timestamp: new Date().toISOString(),
      escalated: shouldEscalate,
      sourceDocuments: results.map(r => r.documentTitle)
    });

    // Format Sources
    const formattedSources = results.map(r => ({
      documentId: r.documentId,
      documentTitle: r.documentTitle,
      section: r.section,
      sourceType: r.sourceType || 'Document',
      score: Number(r.score.toFixed(3))
    }));

    // Persist Chat History for Employee
    db.chatMessages.push({
      id: id(),
      employeeId,
      role: 'user',
      content: rawQuestion,
      timestamp: new Date().toISOString()
    });

    db.chatMessages.push({
      id: id(),
      employeeId,
      role: 'assistant',
      content: answerObj.answer,
      sources: formattedSources,
      escalation: shouldEscalate,
      escalationId: createdEscalationId,
      reason: escalationReason,
      timestamp: new Date().toISOString()
    });

    saveDB();

    res.json({
      answer: answerObj.answer,
      escalation: shouldEscalate,
      escalationId: createdEscalationId,
      reason: escalationReason,
      question: rawQuestion,
      sources: formattedSources
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: error.message || 'Chat service encountered an internal error.'
    });
  }
});

// GET /api/chat/history/:employeeId - Protected with requireSelfOrHR
router.get('/history/:employeeId', authenticate, requireSelfOrHR('employeeId'), (req, res) => {
  const db = getDB();
  const targetId = req.params.employeeId;

  const messages = (db.chatMessages || []).filter(
    m => m.employeeId === targetId || m.employeeId === req.user.name
  );

  res.json({ messages });
});

export default router;
