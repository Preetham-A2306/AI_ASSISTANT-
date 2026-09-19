import { getDB } from './src/models/db.js';
import { seedDemoData } from './src/data/seed.js';
import { getCompanyAnalytics } from './src/services/analyticsService.js';
import app from './src/server.js';
import http from 'http';

async function runEmployeeCountVerification() {
  console.log('--- STARTING CRITICAL EMPLOYEE COUNT & FIRST LOGIN VERIFICATION ---');

  // Reset demo seed so test is pristine
  seedDemoData(true);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5066, resolve));

  const request = async (path, options = {}) => {
    const res = await fetch(`http://127.0.0.1:5066${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  try {
    // 1. Check baseline stats via HR login
    const hrLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        role: 'hr',
        employeeId: 'HR-001',
        password: 'password123',
        department: 'Human Resources'
      })
    });
    const hrToken = hrLogin.data.token;
    if (!hrToken) throw new Error('HR login failed');

    const baselineStats = await request('/api/hr/stats', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const initialTotal = baselineStats.data.overview.totalEmployees;
    const initialActive = baselineStats.data.overview.activeToday;
    console.log(`✓ Baseline: Total Employees = ${initialTotal}, Active Today = ${initialActive}`);

    // 2. TEST 1: Existing employee login
    const emp1Login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        role: 'employee',
        employeeId: 'EMP-001',
        password: 'password123',
        department: 'Engineering'
      })
    });
    if (emp1Login.status !== 200) throw new Error('EMP-001 login failed');

    const afterEmp1Stats = await request('/api/hr/stats', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    if (afterEmp1Stats.data.overview.totalEmployees !== initialTotal) {
      throw new Error(`TEST 1 Failed: Total employees changed on existing login (${afterEmp1Stats.data.overview.totalEmployees} !== ${initialTotal})`);
    }
    console.log(`✓ TEST 1 PASSED: Existing employee login preserved total employee count at ${initialTotal}`);

    // 3. TEST 2: Genuinely new employee login
    const newEmpId = 'EMP-NEW-999';
    const newEmpName = 'Priya Sharma';
    const newEmpDept = 'Design';

    const newEmpLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        role: 'employee',
        employeeId: newEmpId,
        password: 'password123',
        department: newEmpDept,
        name: newEmpName
      })
    });
    if (newEmpLogin.status !== 200) throw new Error(`New employee registration failed: ${JSON.stringify(newEmpLogin.data)}`);
    console.log(`✓ New employee registration succeeded: ${newEmpLogin.data.user.name} (${newEmpLogin.data.user.employeeId})`);

    const afterNewEmpStats = await request('/api/hr/stats', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const expectedNewTotal = initialTotal + 1;
    if (afterNewEmpStats.data.overview.totalEmployees !== expectedNewTotal) {
      throw new Error(`TEST 2 Failed: Expected total ${expectedNewTotal}, got ${afterNewEmpStats.data.overview.totalEmployees}`);
    }
    const designDept = afterNewEmpStats.data.departments.find(d => d.department === 'Design');
    if (!designDept || designDept.total <= 0) {
      throw new Error('TEST 2 Failed: Department stats did not reflect new employee');
    }
    console.log(`✓ TEST 2 PASSED: Total employees increased by exactly 1 to ${expectedNewTotal}. Design department total = ${designDept.total}`);

    // 4. TEST 3: Repeated login by same new employee
    const repeatLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        role: 'employee',
        employeeId: newEmpId,
        password: 'password123',
        department: newEmpDept
      })
    });
    if (repeatLogin.status !== 200) throw new Error('Repeated login failed');

    const afterRepeatStats = await request('/api/hr/stats', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    if (afterRepeatStats.data.overview.totalEmployees !== expectedNewTotal) {
      throw new Error(`TEST 3 Failed: Total employees changed on repeated login (${afterRepeatStats.data.overview.totalEmployees} !== ${expectedNewTotal})`);
    }
    console.log(`✓ TEST 3 PASSED: Repeated login by same new employee did NOT increase count (remains ${expectedNewTotal})`);

    // 5. TEST 4: Source of truth check in database
    const db = getDB();
    const dbEmployeesCount = db.users.filter(u => u.role === 'employee').length;
    if (dbEmployeesCount !== expectedNewTotal) {
      throw new Error(`TEST 4 Failed: db.users count mismatch (${dbEmployeesCount} !== ${expectedNewTotal})`);
    }
    console.log(`✓ TEST 4 PASSED: Database source of truth confirmed (${dbEmployeesCount} unique employees)`);

    console.log('\n--- ALL CRITICAL EMPLOYEE COUNT TESTS PASSED (4/4) ---\n');
  } finally {
    server.close();
  }
}

runEmployeeCountVerification().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
