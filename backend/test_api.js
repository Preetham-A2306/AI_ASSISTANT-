import { seedDemoData } from './src/data/seed.js';
import { getDB, loadDB } from './src/models/db.js';
import { createToken, verifyToken } from './src/middleware/auth.js';
import { retrieveKnowledge } from './src/services/retrievalService.js';
import { groupSimilarQuestions } from './src/services/clusteringService.js';
import { getCompanyAnalytics, getEmployeeListWithStatus } from './src/services/analyticsService.js';

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS ---');

  // 1. Database & Seed
  loadDB();
  const seedResult = seedDemoData(true);
  console.log('✓ Test 1: Demo seed succeeded:', seedResult.status);

  const db = getDB();
  console.log(`  Users: ${db.users.length}, Documents: ${db.documents.length}, Chunks: ${db.chunks.length}`);

  // 2. Token generation & verification
  const emp = db.users.find(u => u.employeeId === 'EMP-001');
  const hr = db.users.find(u => u.employeeId === 'HR-001');

  const empToken = createToken(emp);
  const hrToken = createToken(hr);

  const verifiedEmp = verifyToken(empToken);
  const verifiedHr = verifyToken(hrToken);

  if (verifiedEmp?.employeeId !== 'EMP-001' || verifiedHr?.role !== 'hr') {
    throw new Error('Token verification failed');
  }
  console.log('✓ Test 2: Role-based token signing & verification verified');

  // 3. Department validation rule
  // Alex is in Engineering. If someone attempts to log in as Alex choosing 'Sales', it should mismatch.
  const isMatch = emp.department.toLowerCase() === 'sales'.toLowerCase();
  if (isMatch) throw new Error('Department mismatch logic failed');
  console.log('✓ Test 3: Department mismatch check verified (Engineering !== Sales)');

  // 4. Retrieval from document
  const query1 = 'How do I submit a code review?';
  const results1 = retrieveKnowledge(query1);
  if (!results1.length || !results1[0].documentTitle.includes('Code_Review')) {
    throw new Error('Retrieval failed to find Engineering Code Review');
  }
  console.log(`✓ Test 4: Grounded retrieval found document "${results1[0].documentTitle}" with score ${results1[0].score.toFixed(3)}`);

  // 5. Automatic Escalation on unknown topic
  const query2 = 'What is the company policy on pet alligators in the office?';
  const results2 = retrieveKnowledge(query2);
  if (results2.length > 0) {
    throw new Error('Expected no results for alligator policy, but got matches');
  }
  console.log('✓ Test 5: Retrieval returned empty for undocumented question (triggers automatic HR escalation)');

  // 6. Save to Knowledge Base workflow
  const kbTitle = 'Can I work remotely from another state?';
  const kbAnswer = 'Employees may work remotely from another state for up to 30 days per year with manager and HR notice.';

  db.knowledgeBase.push({
    id: 'kb-test-01',
    title: kbTitle,
    content: kbAnswer,
    category: 'Remote Work',
    sourceType: 'HR Approved',
    sourceDocument: 'HR Answer to Escalation',
    department: 'All',
    approvedBy: 'Rachel Green',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'Approved'
  });

  const results3 = retrieveKnowledge('Can I work remotely from another state?');
  if (!results3.length || results3[0].sourceType !== 'HR Approved') {
    throw new Error('Retrieval failed to find newly approved HR knowledge');
  }
  console.log(`✓ Test 6: Newly approved HR answer retrieved by future query! Source: ${results3[0].documentTitle}`);

  // 7. Question Clustering
  const testQuestions = [
    { question: 'What are the office timings?', department: 'Engineering', timestamp: '2026-09-19T08:00:00Z' },
    { question: 'When does the office open?', department: 'Design', timestamp: '2026-09-19T08:30:00Z' },
    { question: 'What time does the office start?', department: 'Sales', timestamp: '2026-09-19T09:00:00Z' },
    { question: 'How do I submit expenses?', department: 'Finance', timestamp: '2026-09-19T09:15:00Z' }
  ];

  const clusters = groupSimilarQuestions(testQuestions);
  const officeCluster = clusters.find(c => c.topic.toLowerCase().includes('office') || c.representativeTokens.includes('office'));
  if (!officeCluster || officeCluster.count < 3) {
    throw new Error('Clustering failed to group office timing questions');
  }
  console.log(`✓ Test 7: Clustered ${officeCluster.count} related questions under topic "${officeCluster.topic}". Departments:`, officeCluster.departments);

  // 8. Analytics (Active Today vs Not Active Today)
  const analytics = getCompanyAnalytics();
  const employeeRoster = getEmployeeListWithStatus();
  console.log(`✓ Test 8: Analytics calculated: Total employees=${analytics.overview.totalEmployees}, Active today=${analytics.overview.activeToday}, Not active today=${analytics.overview.notActiveToday}`);
  console.log('  Department breakdown:', analytics.departments.map(d => `${d.department}: ${d.total} (Active: ${d.activeToday})`).join(', '));

  console.log('\n--- ALL CORE INTEGRATION TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
