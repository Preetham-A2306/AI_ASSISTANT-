# OnboardAI — AI Employee Onboarding Assistant

A reliable, full-stack, enterprise-grade AI Employee Onboarding platform. Designed to eliminate repetitive HR questions, provide grounded company policy answers with citations, manage first-week onboarding checklists, and seamlessly escalate unanswered inquiries to HR with a two-way knowledge base feedback loop.

---

## Key Features

1. **"Who Are You?" First Screen**:
   - Clean, role-first landing experience presenting two distinct pathways: **New Employee** and **HR / HR Administrator**.
   - Strict role-based navigation and authentication routing.

2. **Employee Login & Department Enforcement**:
   - Requires Employee ID, Password, and Department.
   - Department selector is mandatory and strictly verified against the user's account to prevent unauthorized cross-department data leakage.
   - Automatically logs login events, records daily attendance/activity ("Active today"), and updates HR company metrics.

3. **HR Administrator Login**:
   - Dedicated login for People Operations and HR Administrators with department selection.
   - Strict backend token-based authorization blocking employee bypass attempts (403 Forbidden).

4. **Employee Onboarding Command Center**:
   - Personalized workspace displaying Employee Name, Role, Department, Start Date, and completion percentage.
   - Interactive 5-day onboarding checklist with real-time backend persistence.
   - Notifications drawer for personal HR escalation updates.
   - Dedicated "My HR Questions" tracking view.

5. **Grounded AI Knowledge Assistant**:
   - Answers questions strictly using uploaded company documents and HR-approved knowledge base entries.
   - Provides clear source citations (e.g., `Engineering_Code_Review_Process.md § Pull Request Review` or `HR Approved: Remote Work`).
   - Powered by Google Gemini (`gemini-flash-lite-latest`) with deterministic fallback answering if offline.
   - Never hallucinates unverified company policies.

6. **Automatic HR Escalation (Zero-Click)**:
   - When documentation is missing, confidence is below the retrieval threshold, or questions involve sensitive HR topics (e.g. salary, compensation, personal contracts):
     - The AI automatically files an escalation ticket with status `Pending`.
     - No manual second "Submit to HR" button required from the employee.
     - Real-time notifications created for both HR and the employee.

7. **HR Queue & Knowledge Base Feedback Loop**:
   - HR reviews pending escalations with employee context, department, and timestamp.
   - HR inputs official response and is prompted:
     `"Save this answer to the approved Knowledge Base for future employees?"`
     `[ Save to Knowledge Base ]` / `[ Do Not Save ]`
   - If saved, the answer is immediately indexed so future employees asking similar questions receive the approved answer directly from the AI assistant.

8. **Semantic & Token FAQ Clustering**:
   - Groups related questions (e.g. *"What are the office timings?"*, *"When does the office open?"*, *"What time does the office start?"*) into single analytical clusters.
   - Displays frequency counts, breakdown by departments asking, and last asked date.

9. **Live Employee Activity & Department Analytics**:
   - Real-time calculations: Total Employees, Active Today (logged in during current calendar day), Not Active Today (no login recorded today).
   - Department breakdown cards and visual distribution bars showing headcount and activity status.

---

## Project Architecture

```
AI-Onboarding-Assistant/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── constants.js          # Configurable departments, roles, stop words
│   │   ├── data/
│   │   │   ├── db.json               # Zero-config persisted JSON database
│   │   │   └── seed.js               # Realistic demo seeding (users, sample docs, tasks)
│   │   ├── middleware/
│   │   │   ├── auth.js               # Token auth, role guard, ownership validation
│   │   │   └── upload.js             # Multer config (PDF, MD, TXT validation)
│   │   ├── models/
│   │   │   └── db.js                 # Safe DB loading, mutating, and saving layer
│   │   ├── routes/
│   │   │   ├── authRoutes.js         # Login, department validation, demo credentials
│   │   │   ├── employeeRoutes.js     # Profile, checklist toggle, notifications
│   │   │   ├── hrRoutes.js           # Analytics, employee roster, department stats
│   │   │   ├── documentRoutes.js     # Upload, list, chunking, delete
│   │   │   ├── chatRoutes.js         # Grounded AI answering & auto-escalation
│   │   │   ├── escalationRoutes.js   # HR queue resolution & save-to-KB logic
│   │   │   └── knowledgeRoutes.js    # Knowledge base queries & manual entries
│   │   ├── services/
│   │   │   ├── aiService.js          # Gemini integration with grounded system instruction
│   │   │   ├── retrievalService.js   # Document chunks + approved KB multi-source search
│   │   │   ├── clusteringService.js  # Semantic/token similarity FAQ clustering
│   │   │   ├── analyticsService.js   # Active today & department analytics engine
│   │   │   └── notificationService.js# Push alerts for employees & HR
│   │   └── server.js                 # Express server entry point & backward-compat routes
│   ├── .env.example
│   ├── package.json
│   ├── test_api.js                   # Automated unit/integration test suite
│   └── test_server_http.js           # End-to-end HTTP integration test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Header with role badge, profile, notifications, logout
│   │   │   ├── NotificationPopover.jsx# Personal alerts dropdown
│   │   │   └── EscalationModal.jsx   # HR answer dialog with "Save to KB" choice
│   │   ├── pages/
│   │   │   ├── RoleSelectPage.jsx    # "Who are you?" first screen
│   │   │   ├── EmployeeLoginPage.jsx # Employee login with department validation
│   │   │   ├── HrLoginPage.jsx       # HR login with department selector
│   │   │   ├── EmployeeDashboard.jsx # Personalized employee onboarding command center
│   │   │   └── HrDashboard.jsx       # 7-tab HR Enterprise management center
│   │   ├── services/
│   │   │   ├── api.js                # Authenticated fetch wrapper
│   │   │   └── authContext.jsx       # Auth state provider and session management
│   │   ├── index.css                 # Clean enterprise styling
│   │   └── main.jsx                  # React 19 root entry
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── sample-documents/                 # Realistic sample company policies (Markdown)
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+ (tested on Node.js v24.20.0)
- npm

### 1. Configure Environment Variables
Copy `.env.example` in `backend/`:
```bash
cd backend
cp .env.example .env
```
Inside `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-lite-latest
PORT=5000
FRONTEND_URL=http://localhost:5174
RETRIEVAL_THRESHOLD=0.15
MAX_UPLOAD_MB=8
JWT_SECRET=onboard-ai-jwt-secret-replace-in-production
```

### 2. Install Dependencies
From the project root:
```bash
npm --prefix backend install
npm --prefix frontend install
```

### 3. Start Backend Server
```bash
cd backend
npm run dev
# Or: node src/server.js
```
The backend starts on `http://localhost:5000`.

### 4. Start Frontend Application
In a separate terminal:
```bash
cd frontend
npm run dev
```
Open `http://localhost:5174` in your browser.

---

## Demo Credentials (Pre-Seeded)

The login screen includes **Quick Demo Fill** buttons for instant one-click testing:

### Employees:
| Name | Employee ID | Department | Password |
|---|---|---|---|
| **Alex Chen** | `EMP-001` | Engineering | `password123` |
| **Maya Patel** | `EMP-002` | Design | `password123` |
| **David Kim** | `EMP-003` | Sales | `password123` |
| **Sarah Jones** | `EMP-004` | Marketing | `password123` |
| **James Wilson** | `EMP-005` | Finance | `password123` |
| **Elena Rostova**| `EMP-006` | Operations | `password123` |

### HR Administrators:
| Name | HR / Admin ID | Department | Password |
|---|---|---|---|
| **Rachel Green** | `HR-001` | Human Resources | `password123` |
| **Michael Scott** | `HR-002` | People Operations | `password123` |

---

## Automated Verification & Tests

The project includes two complete automated verification suites:

### 1. Core Logic & Service Test Suite
```bash
cd backend
node test_api.js
```
Verifies:
- Data seeding (Users, Documents, Chunks, KB entries)
- Token-based signing and role authorization
- Department mismatch validation
- Grounded document chunk retrieval
- Automatic escalation on undocumented inquiries
- Save to Knowledge Base workflow & re-query retrieval
- Question clustering across departments
- "Active today" vs "Not active today" calculations

### 2. HTTP End-to-End API Test Suite
```bash
cd backend
node test_server_http.js
```
Verifies live Express HTTP endpoints:
- Health check
- Department mismatch rejection (400 Bad Request)
- Employee login & token issuance
- Employee unauthorized access prevention to HR endpoints (403 Forbidden)
- HR login & access to `/api/hr/stats`
- Grounded AI answering with citations
- Automatic zero-click HR escalation
- HR resolution & Knowledge Base saving
- Future employee retrieval from newly approved knowledge

---

## Hackathon Demonstration Walkthrough (10 Steps)

1. **Initial Screen**:
   - Open `http://localhost:5174/`.
   - Verify the **"Who are you?"** screen displays the two role cards: **New Employee** and **HR / HR Administrator**.

2. **Employee Login**:
   - Click **New Employee**.
   - Notice the Department selector. Click the **Alex Chen** demo chip.
   - Click **Sign In to Workspace**.

3. **Employee Dashboard**:
   - See welcome greeting: *"Welcome to the team, Alex Chen!"*.
   - Check role: Frontend Engineer, Department: Engineering.
   - Navigate to **My Checklist** tab: click a task to toggle completion and see the progress bar update in real-time.

4. **Grounded AI Question with Citations**:
   - Navigate to **AI Knowledge Assistant** tab.
   - Ask: *"How do I submit a code review?"*.
   - Receive an accurate grounded answer with source citation: `Engineering_Code_Review_Process.md`. Notice no HR escalation occurs.

5. **Automatic HR Escalation**:
   - Ask: *"What is the company salary revision policy?"* (or an undocumented question).
   - The assistant answers that this inquiry requires HR review.
   - Notice the **"Automatically Forwarded to HR"** alert card appears with status `Pending HR Answer` — **no second manual submit button needed**.

6. **Sign Out & Switch to HR**:
   - Click **Sign Out** in the top navigation bar.
   - You return to the **"Who are you?"** screen.

7. **HR Administrator Login**:
   - Click **HR / HR Administrator**.
   - Click the **Rachel Green** demo chip.
   - Click **Sign In as HR Administrator**.

8. **HR Dashboard & Live Analytics**:
   - View **Overview**: Notice **Total Employees (6)**, **Active Today (Alex Chen is Active)**, and **Pending Escalations (1)**.
   - View **Employees** tab: see daily activity status ("Active today" vs "Not active today") and onboarding progress bars.
   - View **Departments** tab: see headcount and active distributions.

9. **HR Queue & Knowledge Base Feedback Loop**:
   - Open the **HR Queue** tab.
   - Find Alex Chen's inquiry: *"What is the company salary revision policy?"*.
   - Click **Provide Answer & Decision**.
   - Type an official answer: *"Annual salary and performance revisions are reviewed every November in accordance with our People Operations guidelines."*.
   - Under *"Save this answer to the approved Knowledge Base for future employees?"*, click **[ Save to Knowledge Base ]**.
   - The escalation becomes `Resolved` and marked `✓ Saved to Knowledge Base`.
   - Open the **Knowledge Base** tab to confirm the new entry is approved and listed.

10. **Full-Circle Grounding Confirmation**:
    - Sign out, log back in as another employee (e.g. Maya Patel in Design).
    - Ask: *"When are salary revisions reviewed?"*.
    - The AI assistant now retrieves and answers using the newly approved HR Knowledge Base item!
