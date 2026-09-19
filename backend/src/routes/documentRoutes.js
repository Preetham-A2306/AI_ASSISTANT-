import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { getDB, saveDB } from '../models/db.js';
import { upload } from '../middleware/upload.js';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

function id() {
  return crypto.randomUUID();
}

function clean(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Closes CWE-73 / CWE-116: Sanitize uploaded filenames to prevent header/log injection or XSS
function sanitizeFilename(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'document.txt';
  const base = path.basename(rawName);
  const cleaned = base.replace(/[^A-Za-z0-9._ -]/g, '').trim();
  return cleaned.slice(0, 150) || 'document.txt';
}

async function extractText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') {
    try {
      const buffer = fs.readFileSync(file.path);
      const parsed = await pdfParse(buffer);
      const text = clean(parsed.text || '');
      if (!text) {
        const err = new Error('The uploaded PDF contains no extractable text. Scanned documents require OCR.');
        err.status = 400;
        throw err;
      }
      return text;
    } catch (err) {
      // Closes CWE-703: Return 400 for corrupted, encrypted, or unreadable PDFs rather than crashing with 500
      const error = new Error(err.status === 400 ? err.message : 'Unable to read PDF file. It may be corrupt, password-protected, or unscannable.');
      error.status = 400;
      throw error;
    }
  }
  return clean(fs.readFileSync(file.path, 'utf8'));
}

function sectionText(text) {
  const lines = text.split('\n');
  let currentSection = 'Document Overview';
  const parts = [];

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      currentSection = line.replace(/^#{1,6}\s+/, '').trim();
    }
    if (line.trim()) {
      parts.push([currentSection, line]);
    }
  }

  return parts;
}

// Enforce strict HR authorization on all document management routes
router.use(authenticate, requireHR);

// GET /api/documents
router.get('/', (_req, res) => {
  const db = getDB();
  res.json({ documents: db.documents || [] });
});

// POST /api/documents/upload - HR file upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF, Markdown (.md), or Plain Text (.txt) file.' });
    }

    const text = await extractText(req.file);
    if (!text) {
      throw new Error('Uploaded document contains no readable text.');
    }

    const safeTitle = sanitizeFilename(req.file.originalname);
    const parts = sectionText(text);
    const documentId = id();
    const chunks = [];

    for (let i = 0; i < parts.length; i += 4) {
      const group = parts.slice(i, i + 4);
      chunks.push({
        id: id(),
        documentId,
        documentTitle: safeTitle,
        section: group[0][0] || 'General',
        text: group.map(item => item[1]).join('\n')
      });
    }

    const doc = {
      id: documentId,
      title: safeTitle,
      category: req.body.category || 'Company Knowledge',
      uploadDate: new Date().toISOString(),
      type: path.extname(req.file.originalname).slice(1).toUpperCase() || 'TXT',
      chunks: chunks.length,
      status: 'Indexed'
    };

    const db = getDB();
    db.documents.unshift(doc);
    db.chunks.push(...chunks);

    db.activities.unshift({
      id: id(),
      text: `Document uploaded: ${doc.title}`,
      timestamp: new Date().toISOString()
    });

    saveDB();

    // Clean up temporary upload file
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ document: doc });
  } catch (error) {
    console.error('Document upload error:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    const status = (typeof error.status === 'number' && error.status >= 400 && error.status < 500) ? error.status : 400;
    res.status(status).json({
      error: error.message || 'Failed to parse and index the document.'
    });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const db = getDB();
  const documentId = req.params.id;

  const targetDoc = db.documents.find(d => d.id === documentId);
  db.documents = db.documents.filter(doc => doc.id !== documentId);
  db.chunks = db.chunks.filter(chunk => chunk.documentId !== documentId);

  if (targetDoc) {
    db.activities.unshift({
      id: id(),
      text: `Document deleted: ${targetDoc.title}`,
      timestamp: new Date().toISOString()
    });
  }

  saveDB();
  res.json({ ok: true });
});

export default router;
