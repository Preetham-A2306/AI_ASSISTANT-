import app from './src/server.js';

let server;

async function runHttpTests() {
  const PORT = 5055;
  server = app.listen(PORT, async () => {
    const BASE = `http://localhost:${PORT}/api`;
    console.log(`Test server running on port ${PORT}...`);

    try {
      // 1. Health check
      const healthRes = await fetch(`${BASE}/health`);
      const health = await healthRes.json();
      if (!health.ok) throw new Error('Health check failed');
      console.log('✓ HTTP 1: Health check OK');

      // 2. Department mismatch failure
      const badLoginRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'employee',
          employeeId: 'EMP-001',
          password: 'password123',
          department: 'Sales' // Mismatched!
        })
      });
      if (badLoginRes.status !== 400) throw new Error(`Expected 400 for dept mismatch, got ${badLoginRes.status}`);
      const badLoginData = await badLoginRes.json();
      console.log('✓ HTTP 2: Department mismatch blocked with 400:', badLoginData.error);

      // 3. Employee login success
      const empLoginRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'employee',
          employeeId: 'EMP-001',
          password: 'password123',
          department: 'Engineering'
        })
      });
      const empLoginData = await empLoginRes.json();
      if (!empLoginData.token) throw new Error('No token returned');
      const empToken = empLoginData.token;
      console.log('✓ HTTP 3: Employee login succeeded, token issued');

      // 4. Employee unauthorized access to HR route
      const forbiddenRes = await fetch(`${BASE}/hr/stats`, {
        headers: { Authorization: `Bearer ${empToken}` }
      });
      if (forbiddenRes.status !== 403) throw new Error(`Expected 403 Forbidden for employee accessing HR stats, got ${forbiddenRes.status}`);
      console.log('✓ HTTP 4: Backend blocked employee access to /api/hr/stats with 403 Forbidden');

      // 5. HR login success
      const hrLoginRes = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'hr',
          employeeId: 'HR-001',
          password: 'password123',
          department: 'Human Resources'
        })
      });
      const hrLoginData = await hrLoginRes.json();
      const hrToken = hrLoginData.token;
      console.log('✓ HTTP 5: HR login succeeded');

      // 6. HR access to stats
      const statsRes = await fetch(`${BASE}/hr/stats`, {
        headers: { Authorization: `Bearer ${hrToken}` }
      });
      const stats = await statsRes.json();
      if (!stats.overview || typeof stats.overview.totalEmployees !== 'number') {
        throw new Error('Stats failed');
      }
      console.log(`✓ HTTP 6: HR accessed /api/hr/stats successfully: ${stats.overview.totalEmployees} employees, ${stats.overview.activeToday} active today`);

      // 7. Grounded chat query (with citations, no escalation)
      const chatDocRes = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${empToken}`
        },
        body: JSON.stringify({
          question: 'How do I submit a code review?'
        })
      });
      const chatDocData = await chatDocRes.json();
      if (chatDocData.escalation || !chatDocData.sources.length) {
        throw new Error('Expected grounded answer with sources');
      }
      console.log(`✓ HTTP 7: Grounded AI answer returned with ${chatDocData.sources.length} sources (escalation: ${chatDocData.escalation})`);

      // 8. Automatic escalation on missing policy / sensitive HR question
      const chatEscRes = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${empToken}`
        },
        body: JSON.stringify({
          question: 'What is the company policy for pet alligators in the office?'
        })
      });
      const chatEscData = await chatEscRes.json();
      if (!chatEscData.escalation || !chatEscData.escalationId) {
        throw new Error('Expected automatic escalation with escalationId');
      }
      console.log(`✓ HTTP 8: Undocumented question automatically escalated to HR (Escalation ID: ${chatEscData.escalationId})`);

      // 9. HR answers escalation and saves to Knowledge Base
      const answerRes = await fetch(`${BASE}/escalations/${chatEscData.escalationId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hrToken}`
        },
        body: JSON.stringify({
          answer: 'Pet alligators and exotic animals are strictly prohibited on company premises for safety reasons.',
          saveToKB: true,
          category: 'Office Safety & Pets'
        })
      });
      const answerData = await answerRes.json();
      if (!answerData.ok || !answerData.savedToKB) {
        throw new Error('HR answer with saveToKB failed');
      }
      console.log('✓ HTTP 9: HR resolved escalation and saved answer to Knowledge Base');

      // 10. Another employee asks the same question -> retrieved from Knowledge Base!
      const chatAgainRes = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${empToken}`
        },
        body: JSON.stringify({
          question: 'Can I bring pet alligators to the office?'
        })
      });
      const chatAgainData = await chatAgainRes.json();
      if (chatAgainData.escalation || !chatAgainData.sources.some(s => s.sourceType === 'HR Approved')) {
        throw new Error('Expected retrieval from HR approved Knowledge Base');
      }
      console.log('✓ HTTP 10: Future employee question successfully answered from newly approved HR Knowledge Base!');

      console.log('\n--- ALL HTTP API TESTS PASSED SUCCESSFULLY ---');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('HTTP test failed:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runHttpTests();
