import express from 'express';
import crypto from 'crypto';
import { getDB, saveDB } from '../models/db.js';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

function id() {
  return crypto.randomUUID();
}

// GET /api/knowledge - Retrieve approved knowledge base items
router.get('/', (_req, res) => {
  const db = getDB();
  res.json({
    items: (db.knowledgeBase || []).filter(item => item.status === 'Approved')
  });
});

// POST /api/knowledge - Create knowledge base item (HR only)
router.post('/', authenticate, requireHR, (req, res) => {
  const db = getDB();
  const { title, content, category, department } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const now = new Date().toISOString();
  const item = {
    id: id(),
    title: title.trim(),
    content: content.trim(),
    category: category || 'Company Knowledge',
    sourceType: 'HR Approved',
    sourceDocument: 'Manual HR Entry',
    department: department || 'All',
    approvedBy: req.user.name,
    createdAt: now,
    updatedAt: now,
    status: 'Approved'
  };

  db.knowledgeBase.unshift(item);

  db.activities.unshift({
    id: id(),
    text: `Knowledge base item created: "${item.title}"`,
    timestamp: now
  });

  saveDB();

  res.status(201).json({ item });
});

// DELETE /api/knowledge/:id - Remove item (HR only)
router.delete('/:id', authenticate, requireHR, (req, res) => {
  const db = getDB();
  db.knowledgeBase = (db.knowledgeBase || []).filter(item => item.id !== req.params.id);
  saveDB();
  res.json({ ok: true });
});

export default router;
