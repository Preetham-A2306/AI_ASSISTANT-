import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve('src/data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

const EMPTY_DB = {
  users: [],
  loginActivities: [],
  documents: [],
  chunks: [],
  knowledgeBase: [],
  questions: [],
  escalations: [],
  chatMessages: [],
  notifications: [],
  onboardingPlans: [],
  activities: []
};

let dbInstance = null;

export function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
      dbInstance = structuredClone(EMPTY_DB);
      return dbInstance;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf8');
    if (!raw.trim()) {
      dbInstance = structuredClone(EMPTY_DB);
      return dbInstance;
    }

    const parsed = JSON.parse(raw);

    // Merge with defaults to ensure all required arrays exist
    dbInstance = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      loginActivities: Array.isArray(parsed.loginActivities) ? parsed.loginActivities : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      chunks: Array.isArray(parsed.chunks) ? parsed.chunks : [],
      knowledgeBase: Array.isArray(parsed.knowledgeBase) ? parsed.knowledgeBase : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      escalations: Array.isArray(parsed.escalations) ? parsed.escalations : [],
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      onboardingPlans: Array.isArray(parsed.onboardingPlans)
        ? parsed.onboardingPlans
        : Array.isArray(parsed.hires)
          ? parsed.hires.map(h => ({
              id: h.id || crypto.randomUUID(),
              employeeId: h.employeeId || h.name || 'Alex',
              name: h.name || 'Alex',
              role: h.role || 'Engineer',
              department: h.department || 'Engineering',
              startDate: h.startDate || '2026-09-19',
              tasks: Array.isArray(h.tasks) ? h.tasks : []
            }))
          : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : []
    };

    return dbInstance;
  } catch (error) {
    console.error('Database load error:', error);
    dbInstance = structuredClone(EMPTY_DB);
    return dbInstance;
  }
}

export function getDB() {
  if (!dbInstance) {
    loadDB();
  }
  return dbInstance;
}

export function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbInstance || EMPTY_DB, null, 2));
  } catch (error) {
    console.error('Database save error:', error);
  }
}
