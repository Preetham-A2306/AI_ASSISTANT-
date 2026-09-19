import { getDB } from '../models/db.js';
import { EMPLOYEE_DEPARTMENTS } from '../config/constants.js';

export function getCompanyAnalytics() {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  // Filter only regular employees (excluding HR administrators from employee roster counts)
  const employees = db.users.filter(u => u.role === 'employee');
  const totalEmployees = employees.length;

  // Active today: employees with a login event today
  const activeEmployeeIdsToday = new Set(
    db.loginActivities
      .filter(act => (act.date === today || (act.timestamp && act.timestamp.startsWith(today))) && act.role === 'employee')
      .map(act => act.employeeId)
  );

  const activeTodayCount = employees.filter(emp => activeEmployeeIdsToday.has(emp.employeeId)).length;
  const notActiveTodayCount = Math.max(0, totalEmployees - activeTodayCount);

  // Department analytics: Total, Active Today, Not Active Today
  const departmentMap = {};

  for (const dept of EMPLOYEE_DEPARTMENTS) {
    departmentMap[dept] = {
      department: dept,
      total: 0,
      activeToday: 0,
      notActiveToday: 0
    };
  }

  for (const emp of employees) {
    const dept = emp.department || 'Other';
    if (!departmentMap[dept]) {
      departmentMap[dept] = {
        department: dept,
        total: 0,
        activeToday: 0,
        notActiveToday: 0
      };
    }

    departmentMap[dept].total++;
    if (activeEmployeeIdsToday.has(emp.employeeId)) {
      departmentMap[dept].activeToday++;
    } else {
      departmentMap[dept].notActiveToday++;
    }
  }

  // Onboarding progress statistics
  let onboardingInProgressCount = 0;
  let onboardingCompletedCount = 0;

  for (const emp of employees) {
    const plan = db.onboardingPlans.find(p => p.employeeId === emp.employeeId || p.name === emp.name);
    if (!plan || !plan.tasks || plan.tasks.length === 0) {
      onboardingInProgressCount++;
      continue;
    }

    const totalTasks = plan.tasks.length;
    const completedTasks = plan.tasks.filter(t => t.done).length;

    if (completedTasks === totalTasks && totalTasks > 0) {
      onboardingCompletedCount++;
    } else {
      onboardingInProgressCount++;
    }
  }

  // Escalations breakdown
  const pendingEscalations = db.escalations.filter(e => e.status === 'Pending').length;
  const resolvedEscalations = db.escalations.filter(e => e.status === 'Resolved').length;

  return {
    overview: {
      totalEmployees,
      activeToday: activeTodayCount,
      notActiveToday: notActiveTodayCount,
      totalDepartments: Object.values(departmentMap).filter(d => d.total > 0).length,
      pendingEscalations,
      resolvedEscalations,
      totalQuestionsAsked: db.questions.length,
      knowledgeBaseCount: db.knowledgeBase.length,
      documentsCount: db.documents.length,
      onboardingInProgress: onboardingInProgressCount,
      onboardingCompleted: onboardingCompletedCount
    },
    departments: Object.values(departmentMap),
    recentActivities: (db.activities || []).slice(0, 15)
  };
}

export function getEmployeeListWithStatus() {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  const activeEmployeeIdsToday = new Set(
    db.loginActivities
      .filter(act => (act.date === today || (act.timestamp && act.timestamp.startsWith(today))) && act.role === 'employee')
      .map(act => act.employeeId)
  );

  return db.users
    .filter(u => u.role === 'employee')
    .map(emp => {
      const plan = db.onboardingPlans.find(p => p.employeeId === emp.employeeId || p.name === emp.name);
      const totalTasks = plan?.tasks?.length || 0;
      const completedTasks = plan?.tasks?.filter(t => t.done).length || 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const isActiveToday = activeEmployeeIdsToday.has(emp.employeeId);

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        jobTitle: emp.jobTitle || 'Employee',
        startDate: emp.startDate,
        avatar: emp.avatar,
        activityStatus: isActiveToday ? 'Active today' : 'Not active today',
        isActiveToday,
        onboardingProgress: progress,
        completedTasks,
        totalTasks
      };
    });
}
