# OnboardAI — AI Employee Onboarding Assistant

OnboardAI is a security-hardened, production-ready AI employee onboarding platform built with Node.js/Express and React (Vite). Designed for high-trust enterprise environments, it automates new hire orientation through grounded company policy Q&A with strict source citations, interactive 5-day milestone checklists, zero-click HR escalations with a bidirectional knowledge base feedback loop, and real-time department activity analytics — all secured with salted scrypt hashing, cryptographic session revocation, strict RBAC, and hand-rolled rate limiting with zero external runtime security dependencies.

---

## Quick Start & Setup

### Prerequisites
- Node.js `>=18.18.0` (enforced via `.nvmrc` and `engines`)
- npm `>=9.0.0`

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/Preetham-A2306/AI_ASSISTANT-.git
cd AI_ASSISTANT-

# Install all workspace dependencies (root, backend, frontend)
npm run install:all
```

### 2. Environment Configuration
Copy the provided `.env.example` in the backend directory:
```bash
cp backend/.env.example backend/.env
```
Configure your environment variables:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secure-random-hmac-secret-min-32-chars
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-lite-latest
FRONTEND_URL=http://localhost:5174
ALLOW_DEMO_RESET=true
DISABLE_RATE_LIMIT=false
```
*(Note: If `GEMINI_API_KEY` is not provided, the application runs deterministically using grounded offline retrieval so all core features and tests remain fully functional).*

### 3. Run Locally
```bash
# Start both backend (port 5000) and frontend (port 5174) concurrently:
npm run dev

# Or run separately:
npm --prefix backend run dev
npm --prefix frontend run dev
```

Visit **http://localhost:5174** in your browser.

---

## Documented Demo Credentials

All demo accounts use the standard password `password123`. Department selection is strictly validated against the user's registered account.

| Role | Employee ID | Name | Department | Documented Password | Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **New Employee** | `EMP-001` | Alex Chen | Engineering | `password123` | Checklist, AI Chat, Personal Escalations |
| **New Employee** | `EMP-002` | Maya Patel | Design | `password123` | Checklist, AI Chat, Personal Escalations |
| **New Employee** | `EMP-003` | James Wilson | Sales | `password123` | Checklist, AI Chat, Personal Escalations |
| **New Employee** | `EMP-004` | Sarah Ahmed | Marketing | `password123` | Checklist, AI Chat, Personal Escalations |
| **New Employee** | `EMP-005` | David Kim | Finance | `password123` | Checklist, AI Chat, Personal Escalations |
| **New Employee** | `EMP-006` | Elena Rostova | Operations | `password123` | Checklist, AI Chat, Personal Escalations |
| **HR Administrator** | `HR-001` | Sarah Jenkins | Human Resources | `password123` | Full HR Admin, Escalation Queue, Docs, Analytics |
| **HR Administrator** | `HR-002` | Michael Scott | People Operations | `password123` | Full HR Admin, Escalation Queue, Docs, Analytics |

---

## 10-Step Demo Walkthrough

1. **Role Selection**: Open `http://localhost:5174`. The welcome screen presents two clear pathways: **New Employee** and **HR / HR Administrator**.
2. **Employee Login**: Select **New Employee**. Click the `Alex Chen (EMP-001)` quick-fill chip (or type `EMP-001`, `password123`, `Engineering`) and click **Continue to Dashboard**.
3. **Interactive Checklist**: Review Alex's Day 1–5 milestone plan. Toggle tasks to observe real-time completion progress tracking with server persistence.
4. **Grounded AI Policy Q&A**: In the AI Chat Assistant, ask: *"What is the code review process?"*. The assistant answers accurately with clickable citations (`Engineering_Code_Review_Process.md § Pull Request Review`).
5. **Zero-Click HR Escalation**: Ask an undocumented question: *"Can I expense my home internet connection?"*. The AI identifies that no approved policy covers this, responds informatively, and automatically files an escalation ticket for HR without requiring a second click.
6. **HR Switch**: Click **Switch Account / Logout** in the navigation bar. Select **HR / Admin**.
7. **HR Authentication**: Click the `Sarah Jenkins (HR-001)` quick-fill chip and sign into the HR Portal.
8. **Resolve Escalation & Knowledge Loop**: In the **Pending Escalations Queue**, locate Alex's internet inquiry. Provide an official resolution: *"Employees can claim up to $50/month for home broadband with an itemized bill"*. Select **[ ✅ Yes, Save for Future Employees ]**.
9. **Verify Knowledge Base Update**: Click **Switch Account**, log in as `Maya Patel (EMP-002)` in `Design`, and ask: *"How much can I claim for home internet?"*. Maya immediately receives the newly approved HR policy answer directly from the AI with citation `HR Approved: Remote Work & Utilities`.
10. **Enterprise Analytics & Document Upload**: Return to the HR Dashboard. Observe live headcount (`7 total employees`), daily active attendance, semantic FAQ clustering, and drag-and-drop a new markdown or PDF policy into the document repository.

---

## Security Architecture & Audit Hardening

All security controls were hand-rolled using Node.js built-ins (`crypto`, etc.) with **zero new external runtime dependencies**, ensuring complete offline execution and maximum supply-chain safety.

| Control Area | Implementation Details | Vulnerability Closed |
| :--- | :--- | :--- |
| **Password Storage** | Salted `scrypt` key derivation (`N=16384`, `r=8`, `p=1`, 64-byte key, 16-byte random salt) formatted as `scrypt$16384$<saltHex>$<keyHex>`. Constant-time `crypto.timingSafeEqual` comparison. Automatic migration on DB load. | **CWE-256 / CWE-312 / CWE-208**: Plaintext password exposure in database records, memory dumps, and side-channel timing attacks. |
| **Session Integrity** | HMAC-SHA256 signed bearer tokens with `iat`, 8-hour `exp`, and unique `jti`. Timing-safe HMAC verification. In-memory SHA-256 fingerprint revocation map with periodic sweeper. | **CWE-384 / CWE-613 / CWE-287**: Session fixation, token tampering, and replay of terminated sessions following logout. |
| **RBAC & Authorization** | Re-reads active `role` and `department` from the database on every authenticated request rather than trusting stale claims. `requireSelfOrHR` fails closed with HTTP 400 when identifiers are omitted. Enforced checklist task and notification ownership. | **CWE-639 / CWE-284**: Insecure Direct Object References (IDOR), privilege elevation bypasses, and fail-open authorization gaps. |
| **Brute Force & Enumeration** | Returns identical generic error message (`"Incorrect employee ID or password."`) and burns equivalent scrypt execution time on non-existent accounts. Strict rate limiter enforcing max 8 login attempts per IP per 15 minutes. | **CWE-208 / CWE-307**: Username harvesting via timing/error discrepancy and automated credential stuffing. |
| **CORS Policy** | Strict allowlist validator matching configured `FRONTEND_URL`, localhost development ports, and HTTPS `*.vercel.app` deployments. Unauthorized origins rejected with HTTP 403 `cors_blocked`. | **CWE-942**: Permissive cross-origin resource sharing and cross-origin data exfiltration. |
| **Security Headers** | Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, strict `Content-Security-Policy`, and `Cache-Control: no-store`. Removes `X-Powered-By`. | **CWE-693 / CWE-1021 / CWE-200**: MIME sniffing, clickjacking, browser cache leakage, and server technology fingerprinting. |
| **Input Bounds & Rate Limiting** | JSON body size capped at 1MB. Input fields trimmed and capped (questions capped at 2,000 characters). Global rate limit of 240 req/min and per-user chat limit of 20 req/min. | **CWE-400 / CWE-770**: Denial of service via payload bloat, algorithmic complexity, and upstream AI API exhaustion. |
| **File Upload Hardening** | Filenames sanitized via `path.basename` and regex stripping all non-alphanumeric characters (capped at 150 chars). Wrapped `pdf-parse` returns safe HTTP 400 on corrupt/scanned files instead of 500. Central error handler masks internal paths and stack traces. | **CWE-73 / CWE-209 / CWE-703**: Path traversal in filenames, exception stack trace leakage, and unhandled PDF parsing crashes. |

---

## Known Limitations & Production Architecture

1. **Ephemeral Serverless Storage on `/tmp`**:
   - In serverless deployments (such as Vercel), the JSON file store (`db.json`) operates out of the temporary container directory `/tmp`. While state is retained during the lifecycle of an active container, cold starts spawn a fresh container seeded with initial demo data.
   - *Production Migration Path*: For permanent multi-tenant deployments, replace `backend/src/models/db.js` with PostgreSQL (e.g. Supabase, AWS RDS, Neon) or MongoDB Atlas, and store uploads in Amazon S3 or Cloudflare R2.
2. **In-Memory Rate Limiting & Token Revocation**:
   - The rate limit maps and token revocation registry are stored in local Node.js process memory. In horizontally scaled serverless environments with multiple concurrent execution instances, memory state is instance-isolated.
   - *Production Migration Path*: Use Redis (e.g. Upstash, Redis Cloud) for distributed atomic rate limiting and centralized session blacklisting.
3. **Concurrent Multi-Instance File Writes**:
   - The single-file JSON store is optimized for single-process local development, demonstration, and staging environments. High-concurrency production deployments require ACID database transactions.

---

## Test Suite Inventory

OnboardAI includes three comprehensive, automated test suites (plus specialized employee registration tests) executing **44 automated test assertions** across core algorithms, HTTP APIs, and security controls:

```bash
# Run all test suites
npm test
```

### 1. Core Integration Suite (`backend/test_api.js`) — 8/8 Passing
- `✓ Test 1`: Demo database seeding & structure integrity
- `✓ Test 2`: Role-based cryptographic token signing & verification
- `✓ Test 3`: Cross-department mismatch validation logic
- `✓ Test 4`: Grounded semantic retrieval from documents
- `✓ Test 5`: Zero-click automated escalation trigger for undocumented queries
- `✓ Test 6`: Dynamic knowledge base indexing and retrieval of newly approved HR answers
- `✓ Test 7`: Multi-department question clustering under canonical topics
- `✓ Test 8`: Real-time company headcount and active attendance analytics

### 2. HTTP & Security Suite (`backend/test_server_http.js`) — 16/16 Passing
- `✓ HTTP 1`: Server health check & Gemini configuration status
- `✓ HTTP 2`: Department mismatch blocked with HTTP 400
- `✓ HTTP 3`: Employee authentication & bearer token issuance
- `✓ HTTP 4`: Employee access to `/api/hr/stats` blocked with HTTP 403
- `✓ HTTP 5`: HR administrator authentication & token issuance
- `✓ HTTP 6`: HR access to `/api/hr/stats` permitted
- `✓ HTTP 7`: Grounded AI answer generation with verified source citations
- `✓ HTTP 8`: Automatic escalation creation with generated ticket ID
- `✓ HTTP 9`: HR escalation resolution & knowledge base addition
- `✓ HTTP 10`: Retrieval of HR-approved response by subsequent employee inquiry
- `✓ HTTP 11`: No plaintext credentials exposed in `/api/auth/demo-accounts`
- `✓ HTTP 12`: Employee access to document upload endpoint blocked with HTTP 403
- `✓ HTTP 13`: Employee cross-access to other employee chat history blocked with HTTP 403
- `✓ HTTP 14`: HR resolution with "Do Not Save" excluded from global knowledge base
- `✓ HTTP 15`: Employee chat message persistence and history retrieval
- `✓ HTTP 16`: Department-level headcount and daily activity analytics calculation

### 3. Dedicated Security Audit Suite (`backend/test_security.js`) — 16/16 Passing
- `✓ 1`: All stored passwords are salted scrypt hashes — zero plaintext in `db.json`
- `✓ 2`: `verifyPassword` constant-time acceptance and rejection of credentials
- `✓ 3`: Unknown account and wrong password return identical error strings
- `✓ 4`: Tampered token payload rejected with HTTP 401
- `✓ 5`: Expired token rejected with HTTP 401 and `code: "session_expired"`
- `✓ 6`: Revoked token rejected with HTTP 401 following `POST /api/auth/logout`
- `✓ 7`: Unauthenticated and employee calls to `/api/demo/seed` blocked (401/403)
- `✓ 8`: Unauthenticated calls to `/api/onboarding/generate` blocked (401)
- `✓ 9`: Cross-employee checklist task tampering blocked with HTTP 403
- `✓ 10`: Cross-employee notification modification blocked with HTTP 403
- `✓ 11`: `requireSelfOrHR` authorization guard fails closed with HTTP 400 on missing parameters
- `✓ 12`: Login rate limiter triggers HTTP 429 `rate_limited` after 8 failed attempts
- `✓ 13`: Hardened headers (`nosniff`, `DENY`, CSP) present; `X-Powered-By` absent
- `✓ 14`: Disallowed HTTP Origin rejected with HTTP 403 `cors_blocked`
- `✓ 15`: Non-existent API endpoints return JSON 404 rather than HTML
- `✓ 16`: 5xx server error responses masked to prevent stack trace and path leakage

### 4. Employee Count & Dynamic Registration Suite (`backend/test_employee_count.js`) — 4/4 Passing
- `✓ TEST 1`: Existing employee logins preserve unique headcount
- `✓ TEST 2`: Genuinely new employee registration atomically increments unique headcount by +1
- `✓ TEST 3`: Repeated logins by newly registered employees do not duplicate counts
- `✓ TEST 4`: Database source of truth matches aggregate analytics

---

## Deployment Configuration (Vercel)

The project includes an enterprise-ready serverless entrypoint and configuration:
- `api/[...path].js`: Catch-all Express handler routing all `/api/*` traffic to the backend application with original URLs intact.
- `vercel.json`: Fully valid Vercel v2 schema configuring:
  - Frontend build command: `npm --prefix frontend run build`
  - Output directory: `frontend/dist`
  - Serverless function limits: `maxDuration: 30s`, `memory: 1024MB`
  - SPA fallback routing: `"/((?!api/).*)" -> "/index.html"`
  - Immutable caching headers for static assets (`/assets/*`)
  - Strict security headers (`nosniff`, `DENY`, referrer policy)

---

## License
MIT License. Built for enterprise onboarding excellence.
