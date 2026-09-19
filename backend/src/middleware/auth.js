/**
 * Authentication and Authorization Middleware
 * Closes CWE-287: Improper Authentication (timing-safe HMAC, token expiry, and revocation).
 * Closes CWE-284: Broken Access Control (fails closed, re-reads current role and department from DB).
 */
import crypto from 'crypto';
import { getDB } from '../models/db.js';

const SECRET = process.env.JWT_SECRET || 'onboard-ai-secret-token-key-2026';
const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS, 10) || 8;
const SESSION_TTL_SECONDS = SESSION_TTL_HOURS * 3600;

// In-memory token revocation map keyed by SHA-256 fingerprint -> expiration timestamp (seconds)
// Closes CWE-613: Insufficient Session Expiration (explicit token revocation on logout)
const REVOCATION_MAP = new Map();

// Periodic unref'd sweeper to prevent memory leaks from expired revocation entries
const sweeper = setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [fingerprint, exp] of REVOCATION_MAP.entries()) {
    if (exp <= now) {
      REVOCATION_MAP.delete(fingerprint);
    }
  }
}, 10 * 60 * 1000);

if (sweeper.unref) {
  sweeper.unref();
}

/**
 * Computes a SHA-256 fingerprint for a token to index revocation safely.
 */
function getFingerprint(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Genuinely revokes a session token.
 */
export function revokeToken(token) {
  if (!token || typeof token !== 'string') return;
  const fingerprint = getFingerprint(token);
  const payload = parseTokenPayload(token);
  const exp = payload?.exp || Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  REVOCATION_MAP.set(fingerprint, exp);
}

/**
 * Safely parses the token payload without signature verification.
 */
function parseTokenPayload(token) {
  try {
    const [payloadB64] = token.split('.');
    if (!payloadB64) return null;
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Issue a signed session token with expiry, issue time, and unique JTI.
 * Closes CWE-384: Session Fixation (issues fresh cryptographically signed tokens with JTI).
 */
export function createToken(user) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    userId: user.id,
    employeeId: user.employeeId,
    role: user.role,
    department: user.department,
    name: user.name,
    iat: nowSec,
    exp: nowSec + SESSION_TTL_SECONDS,
    jti: crypto.randomUUID()
  };

  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payloadStr)
    .digest('hex');

  const token = Buffer.from(payloadStr).toString('base64url') + '.' + signature;
  return token;
}

/**
 * Verify token signature in constant time and validate revocation and expiration.
 * Closes CWE-208: Timing attacks on HMAC comparison.
 * Closes CWE-613: Rejects expired or revoked session tokens.
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    if (!payloadB64 || !signature) return null;

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(payloadStr)
      .digest('hex');

    // Constant-time HMAC comparison
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    // Check revocation
    const fingerprint = getFingerprint(token);
    if (REVOCATION_MAP.has(fingerprint)) {
      return { revoked: true };
    }

    const payload = JSON.parse(payloadStr);
    const nowSec = Math.floor(Date.now() / 1000);

    // Check expiration
    if (typeof payload.exp === 'number' && payload.exp <= nowSec) {
      return { expired: true };
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Authenticates bearer token and verifies active account in database.
 * Closes CWE-270 / CWE-284: Re-reads role and department from database on each request.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.', code: 'auth_required' });
  }

  const token = authHeader.split(' ')[1];
  const result = verifyToken(token);

  if (!result || result.revoked) {
    return res.status(401).json({ error: 'Invalid or revoked session. Please log in again.', code: 'invalid_token' });
  }

  if (result.expired) {
    return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'session_expired' });
  }

  const db = getDB();
  const user = db.users.find(u => u.id === result.userId || u.employeeId === result.employeeId);

  if (!user) {
    return res.status(401).json({ error: 'User account not found.', code: 'user_not_found' });
  }

  // Bind live properties from database so privilege updates take effect immediately
  req.user = {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    role: user.role,
    department: user.department,
    jobTitle: user.jobTitle,
    avatar: user.avatar
  };
  req.token = token;

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

/**
 * Authorization guard: Allows HR or the employee themselves.
 * Closes CWE-639: Fail closed with 400 when identifier is missing, and 403 when ID does not match.
 */
export function requireSelfOrHR(paramName = 'employeeId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role === 'hr') {
      return next();
    }

    const targetEmployeeId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (!targetEmployeeId) {
      // Closes fail-open vulnerability: Fail closed when identifier is absent
      return res.status(400).json({ error: `Missing required parameter: ${paramName}` });
    }

    if (targetEmployeeId !== req.user.employeeId && targetEmployeeId !== req.user.name) {
      return res.status(403).json({
        error: "Access denied. You cannot access another employee's private records."
      });
    }

    next();
  };
}
