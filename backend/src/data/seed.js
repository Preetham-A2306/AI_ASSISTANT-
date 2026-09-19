import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getDB, saveDB } from '../models/db.js';
import { hashPassword } from '../utils/password.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function id() {
  return crypto.randomUUID();
}

function clean(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sectionMarkdown(text) {
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

const DEFAULT_USERS = [
  {
    id: 'usr-emp-001',
    employeeId: 'EMP-001',
    name: 'Alex Chen',
    role: 'employee',
    department: 'Engineering',
    jobTitle: 'Frontend Engineer',
    startDate: '2026-09-15',
    password: 'password123',
    avatar: 'AC'
  },
  {
    id: 'usr-emp-002',
    employeeId: 'EMP-002',
    name: 'Maya Patel',
    role: 'employee',
    department: 'Design',
    jobTitle: 'Product Designer',
    startDate: '2026-09-16',
    password: 'password123',
    avatar: 'MP'
  },
  {
    id: 'usr-emp-003',
    employeeId: 'EMP-003',
    name: 'David Kim',
    role: 'employee',
    department: 'Sales',
    jobTitle: 'Account Executive',
    startDate: '2026-09-17',
    password: 'password123',
    avatar: 'DK'
  },
  {
    id: 'usr-emp-004',
    employeeId: 'EMP-004',
    name: 'Sarah Jones',
    role: 'employee',
    department: 'Marketing',
    jobTitle: 'Growth Specialist',
    startDate: '2026-09-18',
    password: 'password123',
    avatar: 'SJ'
  },
  {
    id: 'usr-emp-005',
    employeeId: 'EMP-005',
    name: 'James Wilson',
    role: 'employee',
    department: 'Finance',
    jobTitle: 'Financial Analyst',
    startDate: '2026-09-18',
    password: 'password123',
    avatar: 'JW'
  },
  {
    id: 'usr-emp-006',
    employeeId: 'EMP-006',
    name: 'Elena Rostova',
    role: 'employee',
    department: 'Operations',
    jobTitle: 'Operations Specialist',
    startDate: '2026-09-19',
    password: 'password123',
    avatar: 'ER'
  },
  {
    id: 'usr-hr-001',
    employeeId: 'HR-001',
    name: 'Rachel Green',
    role: 'hr',
    department: 'Human Resources',
    jobTitle: 'Head of People Operations',
    startDate: '2025-01-10',
    password: 'password123',
    avatar: 'RG'
  },
  {
    id: 'usr-hr-002',
    employeeId: 'HR-002',
    name: 'Michael Scott',
    role: 'hr',
    department: 'People Operations',
    jobTitle: 'People Ops Partner',
    startDate: '2025-03-01',
    password: 'password123',
    avatar: 'MS'
  }
];

const ROLE_TASKS = {
  Engineering: [
    { day: 1, title: 'Complete HR onboarding and identity verification', done: true },
    { day: 1, title: 'Set up company email, Slack, and 1Password', done: true },
    { day: 2, title: 'Obtain GitHub repository and AWS sandbox access', done: true },
    { day: 2, title: 'Meet engineering manager for 30-day expectation alignment', done: false },
    { day: 3, title: 'Attend daily engineering standup and introduction', done: false },
    { day: 3, title: 'Review engineering standards and coding conventions', done: false },
    { day: 4, title: 'Read the Code Review and Pull Request Process guide', done: false },
    { day: 4, title: 'Set up local development container and run unit tests', done: false },
    { day: 5, title: 'Pair with onboarding buddy to submit first test PR', done: false }
  ],
  Design: [
    { day: 1, title: 'Complete HR onboarding and compliance training', done: true },
    { day: 1, title: 'Set up Figma workspace and Design System library', done: true },
    { day: 2, title: 'Meet with Lead Product Designer for design roadmap review', done: false },
    { day: 3, title: 'Join weekly design critique session', done: false },
    { day: 4, title: 'Review brand documentation and component guidelines', done: false },
    { day: 5, title: 'Complete initial UX audit of assigned feature area', done: false }
  ],
  Sales: [
    { day: 1, title: 'Complete HR paperwork and benefits overview', done: true },
    { day: 1, title: 'Set up Salesforce CRM and outreach tooling', done: false },
    { day: 2, title: 'Shadow senior account executive on customer discovery call', done: false },
    { day: 3, title: 'Complete product catalog and pricing matrix training', done: false },
    { day: 4, title: 'Review lead qualification workflow and pitch deck', done: false },
    { day: 5, title: 'Conduct mock product demo with sales manager', done: false }
  ]
};

export function seedDemoData(force = false) {
  const db = getDB();

  if (!force && db.users.length > 0 && db.documents.length > 0) {
    return { status: 'already_seeded', users: db.users.length };
  }

  // 1. Users — Hash passwords with salted scrypt
  // Closes CWE-256 / CWE-312: Prevents storing plaintext credentials in the database.
  db.users = DEFAULT_USERS.map(u => ({
    ...u,
    password: hashPassword(u.password)
  }));

  // 2. Onboarding Plans
  db.onboardingPlans = [
    {
      id: 'plan-emp-001',
      employeeId: 'EMP-001',
      name: 'Alex Chen',
      role: 'Engineer',
      department: 'Engineering',
      startDate: '2026-09-15',
      tasks: ROLE_TASKS.Engineering.map(t => ({ id: id(), ...t }))
    },
    {
      id: 'plan-emp-002',
      employeeId: 'EMP-002',
      name: 'Maya Patel',
      role: 'Designer',
      department: 'Design',
      startDate: '2026-09-16',
      tasks: ROLE_TASKS.Design.map(t => ({ id: id(), ...t }))
    },
    {
      id: 'plan-emp-003',
      employeeId: 'EMP-003',
      name: 'David Kim',
      role: 'Sales',
      department: 'Sales',
      startDate: '2026-09-17',
      tasks: ROLE_TASKS.Sales.map(t => ({ id: id(), ...t }))
    },
    {
      id: 'plan-emp-004',
      employeeId: 'EMP-004',
      name: 'Sarah Jones',
      role: 'Marketing',
      department: 'Marketing',
      startDate: '2026-09-18',
      tasks: ROLE_TASKS.Engineering.map(t => ({ id: id(), ...t, title: t.title.replace('engineering', 'marketing') }))
    },
    {
      id: 'plan-emp-005',
      employeeId: 'EMP-005',
      name: 'James Wilson',
      role: 'Finance',
      department: 'Finance',
      startDate: '2026-09-18',
      tasks: ROLE_TASKS.Sales.map(t => ({ id: id(), ...t, title: t.title.replace('Sales', 'Finance') }))
    },
    {
      id: 'plan-emp-006',
      employeeId: 'EMP-006',
      name: 'Elena Rostova',
      role: 'Operations',
      department: 'Operations',
      startDate: '2026-09-19',
      tasks: ROLE_TASKS.Sales.map(t => ({ id: id(), ...t, title: t.title.replace('sales', 'operations') }))
    }
  ];

  // 3. Login Activities (Establish 'Active today' baseline for 2 employees)
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  db.loginActivities = [
    {
      id: id(),
      userId: 'usr-emp-001',
      employeeId: 'EMP-001',
      name: 'Alex Chen',
      role: 'employee',
      department: 'Engineering',
      timestamp: `${today}T08:30:00.000Z`,
      date: today
    },
    {
      id: id(),
      userId: 'usr-emp-002',
      employeeId: 'EMP-002',
      name: 'Maya Patel',
      role: 'employee',
      department: 'Design',
      timestamp: `${today}T09:15:00.000Z`,
      date: today
    },
    {
      id: id(),
      userId: 'usr-emp-003',
      employeeId: 'EMP-003',
      name: 'David Kim',
      role: 'employee',
      department: 'Sales',
      timestamp: `${yesterday}T10:00:00.000Z`,
      date: yesterday
    },
    {
      id: id(),
      userId: 'usr-emp-004',
      employeeId: 'EMP-004',
      name: 'Sarah Jones',
      role: 'employee',
      department: 'Marketing',
      timestamp: `${yesterday}T11:20:00.000Z`,
      date: yesterday
    }
  ];

  // 4. Sample Documents Ingestion
  const candidatePaths = [
    path.resolve(__dirname, '../../../sample-documents'),
    path.resolve(__dirname, '../../sample-documents'),
    path.resolve('../sample-documents'),
    path.resolve('sample-documents')
  ];
  const sampleDocsPath = candidatePaths.find(p => fs.existsSync(p));
  if (sampleDocsPath && fs.existsSync(sampleDocsPath)) {
    db.documents = [];
    db.chunks = [];

    const files = fs.readdirSync(sampleDocsPath);
    for (const file of files) {
      if (!/\.(md|txt)$/i.test(file)) continue;

      const content = clean(fs.readFileSync(path.join(sampleDocsPath, file), 'utf8'));
      if (!content) continue;

      const docId = id();
      const parts = sectionMarkdown(content);
      const chunks = [];

      for (let i = 0; i < parts.length; i += 3) {
        const group = parts.slice(i, i + 3);
        chunks.push({
          id: id(),
          documentId: docId,
          documentTitle: file,
          section: group[0][0] || 'General',
          text: group.map(p => p[1]).join('\n')
        });
      }

      db.documents.push({
        id: docId,
        title: file,
        category: 'Company Policies',
        uploadDate: new Date().toISOString(),
        type: 'MD',
        chunks: chunks.length,
        status: 'Indexed'
      });

      db.chunks.push(...chunks);
    }
  }

  // 5. Approved Knowledge Base
  db.knowledgeBase = [
    {
      id: 'kb-001',
      title: 'Company Core Working Hours',
      content: 'Core business hours across all offices are 10:00 AM to 4:00 PM local time. Flexible arrival between 8:00 AM and 10:00 AM is supported with manager alignment.',
      category: 'Workplace Guidelines',
      sourceType: 'HR Approved',
      sourceDocument: 'HR Handbook FAQ',
      department: 'All',
      approvedBy: 'Rachel Green',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      status: 'Approved'
    },
    {
      id: 'kb-002',
      title: 'Health & Wellness Stipend Eligibility',
      content: 'All full-time employees are eligible for a $75/month wellness subsidy reimbursable through Expensify under the "Health & Wellness" category.',
      category: 'Benefits',
      sourceType: 'HR Approved',
      sourceDocument: 'HR Benefits Summary',
      department: 'All',
      approvedBy: 'Rachel Green',
      createdAt: '2026-09-05T12:00:00.000Z',
      updatedAt: '2026-09-05T12:00:00.000Z',
      status: 'Approved'
    }
  ];

  // 6. Escalations (1 Pending escalation so HR Queue is immediately active for testing)
  db.escalations = [
    {
      id: 'esc-001',
      question: 'Can I work remotely from another country during my trial period?',
      employeeId: 'EMP-001',
      employeeName: 'Alex Chen',
      department: 'Engineering',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      reason: 'Cross-border remote work policy requires HR approval',
      status: 'Pending',
      priority: 'Normal',
      hrAnswer: null,
      resolvedAt: null,
      resolvedBy: null,
      savedToKB: false
    }
  ];

  // 7. Initial Questions for Analytics
  db.questions = [
    {
      id: id(),
      question: 'How do I submit a code review?',
      employeeId: 'EMP-001',
      employeeName: 'Alex Chen',
      department: 'Engineering',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      escalated: false,
      sourceDocuments: ['Engineering_Code_Review_Process.md']
    },
    {
      id: id(),
      question: 'Where can I read the code review process?',
      employeeId: 'EMP-001',
      employeeName: 'Alex Chen',
      department: 'Engineering',
      timestamp: new Date(Date.now() - 7100000).toISOString(),
      escalated: false,
      sourceDocuments: ['Engineering_Code_Review_Process.md']
    },
    {
      id: id(),
      question: 'How do I claim expense reimbursement?',
      employeeId: 'EMP-002',
      employeeName: 'Maya Patel',
      department: 'Design',
      timestamp: new Date(Date.now() - 6500000).toISOString(),
      escalated: false,
      sourceDocuments: ['Expense_Reimbursement_Policy.md']
    },
    {
      id: id(),
      question: 'Can I claim conference expenses?',
      employeeId: 'EMP-003',
      employeeName: 'David Kim',
      department: 'Sales',
      timestamp: new Date(Date.now() - 5400000).toISOString(),
      escalated: false,
      sourceDocuments: ['Expense_Reimbursement_Policy.md']
    },
    {
      id: id(),
      question: 'Can I work remotely from another country during my trial period?',
      employeeId: 'EMP-001',
      employeeName: 'Alex Chen',
      department: 'Engineering',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      escalated: true,
      sourceDocuments: []
    }
  ];

  // 8. Notifications
  db.notifications = [
    {
      id: id(),
      recipientId: 'EMP-001',
      recipientRole: 'employee',
      title: 'Question forwarded to HR',
      message: 'Your question regarding working remotely from another country has been forwarded to HR.',
      type: 'escalation_created',
      read: false,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      relatedId: 'esc-001'
    },
    {
      id: id(),
      recipientId: 'HR-001',
      recipientRole: 'hr',
      title: 'New escalation from Alex Chen',
      message: 'Alex Chen (Engineering) asked: "Can I work remotely from another country during my trial period?"',
      type: 'escalation_created',
      read: false,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      relatedId: 'esc-001'
    }
  ];

  // 9. Chat Messages
  db.chatMessages = [
    {
      id: id(),
      employeeId: 'EMP-001',
      role: 'user',
      content: 'How do I submit a code review?',
      sources: [],
      escalation: false,
      timestamp: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: id(),
      employeeId: 'EMP-001',
      role: 'assistant',
      content: 'According to the Engineering Code Review Process, pull requests require at least one approving review before merging. Ensure your branch is rebased on main and all CI checks pass.',
      sources: [
        {
          documentTitle: 'Engineering_Code_Review_Process.md',
          section: 'Pull Request Review',
          score: 0.85
        }
      ],
      escalation: false,
      timestamp: new Date(Date.now() - 7195000).toISOString()
    }
  ];

  // 10. Activities
  db.activities = [
    {
      id: id(),
      text: 'Question escalated: Can I work remotely from another country during my trial period?',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: id(),
      text: 'Alex Chen (Engineering) logged in',
      timestamp: `${today}T08:30:00.000Z`
    },
    {
      id: id(),
      text: 'Maya Patel (Design) logged in',
      timestamp: `${today}T09:15:00.000Z`
    }
  ];

  saveDB();
  return { status: 'seeded', users: db.users.length, documents: db.documents.length };
}
