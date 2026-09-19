import crypto from 'crypto';
import { getDB } from '../models/db.js';

const SESSIONS = new Map();
const SECRET = process.env.JWT_SECRET || 'onboard-ai-secret-token-key-2026';

export function createToken(user) {
  const payload = {
    userId: user.id,
    employeeId: user.employeeId,
    role: user.role,
    department: user.department,
    name: user.name,
    timestamp: Date.now()
  };

  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payloadStr)
    .digest('hex');

  const token = Buffer.from(payloadStr).toString('base64url') + '.' + signature;
  SESSIONS.set(token, payload);
  return token;
}

export function verifyToken(token) {
  if (!token) return null;

  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(payloadStr)
      .digest('hex');

    if (signature !== expectedSig) {
      return null;
    }

    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  const db = getDB();
  const user = db.users.find(u => u.id === payload.userId || u.employeeId === payload.employeeId);

  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    role: user.role,
    department: user.department,
    jobTitle: user.jobTitle,
    avatar: user.avatar
  };

  next();
}

export function requireHR(req, res, next) {
  if (!req.user || req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Access denied. HR Administrator access required.' });
  }
  next();
}

export function requireEmployee(req, res, next) {
  if (!req.user || req.user.role !== 'employee') {
    return res.status(403).json({ error: 'Access denied. Employee access required.' });
  }
  next();
}

export function requireSelfOrHR(paramName = 'employeeId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role === 'hr') {
      return next();
    }

    const targetEmployeeId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (targetEmployeeId && targetEmployeeId !== req.user.employeeId && targetEmployeeId !== req.user.name) {
      return res.status(403).json({
        error: 'Access denied. You cannot access another employee\'s private records.'
      });
    }

    next();
  };
}
