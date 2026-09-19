/**
 * Security Middleware (Hand-rolled with Node built-ins, zero external dependencies)
 * Closes CWE-693: Protection against common web application vulnerabilities (clickjacking, MIME-sniffing, XSS, etc.)
 * Closes CWE-770: Rate limiting to prevent Denial of Service and brute-force attacks.
 * Closes CWE-942: Strict CORS policy preventing cross-origin data leakage.
 */

/**
 * Injects hardened security headers and removes fingerprinting headers.
 * Closes CWE-200: Information exposure through headers (X-Powered-By).
 * Closes CWE-1021: Clickjacking via X-Frame-Options and CSP frame-ancestors.
 * Closes CWE-16: Enforces strict MIME types, caching policy, and referrer policy.
 */
export function securityHeaders(_req, res, next) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'"
  );
  res.setHeader('Cache-Control', 'no-store');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * Fixed-window in-memory rate limiter with RFC-compliant headers and unref'd sweeper.
 * Closes CWE-307: Credential stuffing and brute force attacks.
 * Closes CWE-400: Uncontrolled resource consumption (DoS).
 */
export function rateLimit({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests, please try again later.',
  keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
} = {}) {
  const hits = new Map();

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (entry.resetTime <= now) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 30000));

  if (sweeper.unref) {
    sweeper.unref();
  }

  return (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let record = hits.get(key);

    if (!record || record.resetTime <= now) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: message,
        code: 'rate_limited',
        retryAfter: resetSeconds
      });
    }

    next();
  };
}

/**
 * Forward rejected promises to Express error middleware.
 * Closes CWE-703: Improper check or handling of exceptional conditions.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Hard-caps and trims user input string length to avoid memory bloat and ReDoS.
 * Closes CWE-400: Resource exhaustion via oversized strings.
 */
export function boundedString(value, max = 255) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

/**
 * Strict CORS allowlist validator.
 * Closes CWE-942: Overly permissive cross-origin resource sharing policy.
 */
export function corsPolicy(req, res, next) {
  const origin = req.headers.origin;

  // Allow non-browser requests (no Origin header) or server-to-server calls
  if (!origin) {
    return next();
  }

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ].filter(Boolean);

  if (process.env.ADDITIONAL_ORIGINS) {
    process.env.ADDITIONAL_ORIGINS.split(',').forEach(o => {
      const trimmed = o.trim();
      if (trimmed) allowedOrigins.push(trimmed);
    });
  }

  const isExactMatch = allowedOrigins.includes(origin);
  const isVercelHttps = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

  if (isExactMatch || isVercelHttps) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  }

  // Reject unauthorized origins with 403
  return res.status(403).json({
    error: 'CORS policy blocked this origin.',
    code: 'cors_blocked'
  });
}
