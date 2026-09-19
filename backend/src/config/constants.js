// Configurable departments, roles, and system constants
export const EMPLOYEE_DEPARTMENTS = [
  'Engineering',
  'Design',
  'Sales',
  'Marketing',
  'Finance',
  'Human Resources',
  'Operations',
  'Other'
];

export const HR_DEPARTMENTS = [
  'Human Resources',
  'People Operations',
  'Administration'
];

export const ROLES = {
  EMPLOYEE: 'employee',
  HR: 'hr'
};

export const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'what', 'when', 'where', 'which', 'how', 'why',
  'who', 'can', 'could', 'would', 'should', 'does', 'did', 'are', 'is', 'was',
  'were', 'have', 'has', 'had', 'this', 'that', 'these', 'those', 'from', 'into',
  'about', 'tell', 'please', 'give', 'there', 'their', 'your', 'you', 'our',
  'company', 'need', 'want', 'know', 'me', 'my', 'i', 'to', 'of', 'in', 'on',
  'at', 'a', 'an', 'be', 'it', 'as', 'or', 'if', 'do'
]);

export const SENSITIVE_PATTERNS = [
  /\bsalary\b/i,
  /\bbonus\b/i,
  /\bcompensation\b/i,
  /\bpay(?:roll)?\b/i,
  /\bemployment contract\b/i,
  /\bpersonal hr\b/i,
  /\bbank account\b/i,
  /\bperformance rating\b/i,
  /\btermination\b/i,
  /\bfiring\b/i,
  /\bdisciplinary\b/i,
  /\bharassment complaint\b/i
];

export const DEFAULT_ROLE_TASKS = {
  Engineering: [
    { day: 1, title: 'Complete HR onboarding and identity verification', done: true },
    { day: 1, title: 'Set up company email, Slack, and 1Password', done: true },
    { day: 2, title: 'Obtain GitHub repository and cloud workspace access', done: false },
    { day: 2, title: 'Meet engineering manager for 30-day goal alignment', done: false },
    { day: 3, title: 'Attend daily engineering standup and team introductions', done: false },
    { day: 3, title: 'Review coding standards and repository architecture', done: false },
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
    { day: 1, title: 'Set up CRM, email templates, and outreach tooling', done: false },
    { day: 2, title: 'Shadow senior account executive on customer discovery call', done: false },
    { day: 3, title: 'Complete product catalog and pricing matrix training', done: false },
    { day: 4, title: 'Review lead qualification workflow and pitch deck', done: false },
    { day: 5, title: 'Conduct mock product demo with sales manager', done: false }
  ],
  Marketing: [
    { day: 1, title: 'Complete HR paperwork and benefits overview', done: true },
    { day: 1, title: 'Set up analytics dashboards, social handles, and CMS', done: true },
    { day: 2, title: 'Review quarterly marketing calendar and brand guidelines', done: false },
    { day: 3, title: 'Attend cross-functional campaign briefing', done: false },
    { day: 4, title: 'Review customer personas and copy stylebook', done: false },
    { day: 5, title: 'Draft first campaign asset with onboarding buddy', done: false }
  ],
  Default: [
    { day: 1, title: 'Complete HR onboarding and compliance verification', done: true },
    { day: 1, title: 'Set up company email, Slack, and communication tools', done: true },
    { day: 2, title: 'Meet team lead for 30-day expectation alignment', done: false },
    { day: 3, title: 'Review department workflows and standard operating procedures', done: false },
    { day: 4, title: 'Shadow teammate on core operational workflows', done: false },
    { day: 5, title: 'Complete 1-week onboarding check-in with manager', done: false }
  ]
};

