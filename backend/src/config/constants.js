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
