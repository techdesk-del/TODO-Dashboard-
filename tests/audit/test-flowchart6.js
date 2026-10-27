// scratch/test-flowchart6.js
// Rigorous SDE-3 & CEO Verification Suite for Flowchart 6: "Employee - Add Task"

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 EXECUTING SDE-3 & CEO FLOWCHART 6 TEST SUITE: EMPLOYEE ADD TASK');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // ── TEST 1: Mandatory Fields Validation (Missing Title, Due Date, etc.) ──
  console.log('--- TEST 1: Mandatory Fields Enforcement ---');
  try {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Deliberately missing title, project, location, department, etc.
        scheduledDate: tomorrowStr,
      }),
    });
    const data = await res.json();
    assert(res.status === 400, 'HTTP 400 returned when mandatory fields are missing');
    assert(data.success === false, 'data.success === false for incomplete payload');
    assert(Array.isArray(data.missingFields) && data.missingFields.includes('title'), 'missingFields includes "title"');
    assert(data.missingFields.includes('assignees'), 'missingFields includes "assignees"');
  } catch (err) {
    assert(false, `Test 1 failed with error: ${err.message}`);
  }

  // ── TEST 2: Past Due Date Logic (Backdated Task WITHOUT Reason) ──
  console.log('\n--- TEST 2: Backdated Task WITHOUT Justification Reason ---');
  try {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Backdated QA Test Deliverable',
        scheduledDate: yesterdayStr, // In the past!
        priority: 'HIGH',
        department: 'Civil',
        project: 'Core Infrastructure',
        location: 'Jaipur',
        assignees: [{ id: 'mem-1', name: 'Alex Rivera', role: 'EMPLOYEE', email: 'alex.rivera@urbangaon.com' }],
        // pastDueReason is omitted!
      }),
    });
    const data = await res.json();
    assert(res.status === 400, 'HTTP 400 returned when past due reason is omitted');
    assert(data.isPastDue === true, 'Server identified task as isPastDue === true');
    assert(data.missingFields.includes('pastDueReason'), 'missingFields strictly requires "pastDueReason"');
  } catch (err) {
    assert(false, `Test 2 failed with error: ${err.message}`);
  }

  // ── TEST 3: Past Due Date Logic (Backdated Task WITH Valid Reason) ──
  console.log('\n--- TEST 3: Backdated Task WITH Valid Justification Reason ---');
  const pastTaskId = `fc6-past-${Date.now()}`;
  try {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: pastTaskId,
        title: 'Backdated Site Audit with Justification',
        scheduledDate: yesterdayStr,
        priority: 'URGENT',
        department: 'Civil',
        project: 'Core Infrastructure',
        location: 'Jaipur',
        pastDueReason: 'Weekend field audit notes delayed due to heavy rain in sector 4.',
        assignees: [{ id: 'mem-1', name: 'Alex Rivera', role: 'EMPLOYEE', email: 'alex.rivera@urbangaon.com' }],
      }),
    });
    const data = await res.json();
    assert(res.status === 201, 'HTTP 201 Created for backdated task with valid justification');
    assert(data.success === true, 'data.success === true');
    assert(data.data.pastDueReason === 'Weekend field audit notes delayed due to heavy rain in sector 4.', 'pastDueReason saved accurately in MongoDB');
    assert(data.data.status === 'Not Started', 'Initial status strictly set to "Not Started"');
  } catch (err) {
    assert(false, `Test 3 failed with error: ${err.message}`);
  }

  // ── TEST 4: Assignee Partition: Self Only ──
  console.log('\n--- TEST 4: Assignee Partition: Self Only ---');
  const selfTaskId = `fc6-self-${Date.now()}`;
  try {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selfTaskId,
        title: 'Draft Quarterly OKRs (Self Assigned)',
        scheduledDate: tomorrowStr,
        priority: 'NORMAL',
        department: 'AI & IT',
        project: 'UrbanGaon 2.0 Roadmap',
        location: 'Jaipur',
        creator: {
          id: 'emp-rahul',
          name: 'Rahul Sharma',
          email: 'rahul.sharma@urbangaon.com',
          role: 'EMPLOYEE',
        },
        assignees: [{
          id: 'emp-rahul',
          name: 'Rahul Sharma',
          email: 'rahul.sharma@urbangaon.com',
          role: 'EMPLOYEE',
          department: 'AI & IT',
          status: 'Not Started',
        }],
        inputMethod: 'Type',
      }),
    });
    const data = await res.json();
    assert(res.status === 201, 'HTTP 201 Created for Self-assigned task');
    assert(data.data.assignees.length === 1, 'Exactly 1 assignee created');
    assert(data.data.assignees[0].id === 'emp-rahul', 'Assignee is self (emp-rahul)');
    assert(data.data.assignees[0].status === 'Not Started', 'Assignee status is "Not Started"');
  } catch (err) {
    assert(false, `Test 4 failed with error: ${err.message}`);
  }

  // ── TEST 5: Assignee Partition: Both (Self & Others) ──
  console.log('\n--- TEST 5: Assignee Partition: Both (Self & Others) ---');
  const bothTaskId = `fc6-both-${Date.now()}`;
  try {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: bothTaskId,
        title: 'Cross-functional Security Architecture Review',
        description: 'End-to-end security penetration audit for mobile and web gateways.',
        scheduledDate: tomorrowStr,
        priority: 'URGENT',
        department: 'AI & IT',
        project: 'High Availability Infrastructure',
        location: 'Jaipur',
        creator: {
          id: 'emp-rahul',
          name: 'Rahul Sharma',
          email: 'rahul.sharma@urbangaon.com',
          role: 'EMPLOYEE',
        },
        assignees: [
          {
            id: 'emp-rahul',
            name: 'Rahul Sharma',
            email: 'rahul.sharma@urbangaon.com',
            role: 'EMPLOYEE',
            department: 'AI & IT',
            status: 'Not Started',
          },
          {
            id: 'mem-2',
            name: 'Elena Rostova',
            email: 'elena.rostova@urbangaon.com',
            role: 'EMPLOYEE',
            department: 'AI & IT',
            status: 'Not Started',
          }
        ],
        inputMethod: 'Speak',
        notes: 'Handover report required by 4 PM on target date.',
      }),
    });
    const data = await res.json();
    assert(res.status === 201, 'HTTP 201 Created for Both (Self & Others)');
    assert(data.data.assignees.length === 2, '2 assignees created in task_assignees array');
    assert(data.data.inputMethod === 'Speak', 'inputMethod "Speak" persisted');
    assert(data.data.status === 'Not Started', 'status is "Not Started"');
  } catch (err) {
    assert(false, `Test 5 failed with error: ${err.message}`);
  }

  // ── TEST 6: Audit Log Entry Created ──
  console.log('\n--- TEST 6: Verification of Audit Log Entry ---');
  try {
    const auditRes = await fetch(`${BASE_URL}/api/audit`);
    const auditData = await auditRes.json();
    assert(auditRes.status === 200, 'HTTP 200 returned from /api/audit');
    const matchingLog = (auditData.data || []).find(l => l.taskId === bothTaskId);
    assert(!!matchingLog, `Audit log entry found for taskId: ${bothTaskId}`);
    if (matchingLog) {
      assert(matchingLog.action === 'CREATED', `Audit log action is 'CREATED' (got: ${matchingLog.action})`);
      assert(matchingLog.actor === 'Rahul Sharma', `Audit log actor is 'Rahul Sharma'`);
    }
  } catch (err) {
    assert(false, `Test 6 failed with error: ${err.message}`);
  }

  // ── TEST 7: Flowchart 6 "Assigned to" and "Assigned by" Queries ──
  console.log('\n--- TEST 7: "Assigned to" & "Assigned by" Server Query Verification ---');
  try {
    // 7a: Assigned To Elena
    const assignedToElena = await fetch(`${BASE_URL}/api/tasks?assignedTo=mem-2`);
    const dataElena = await assignedToElena.json();
    assert(assignedToElena.status === 200, 'HTTP 200 for assignedTo query');
    const elenaFound = (dataElena.data || []).some(t => t.id === bothTaskId);
    assert(elenaFound, 'Task appears in "Assigned to" query for assignee Elena Rostova (mem-2)');

    // 7b: Assigned By Rahul
    const assignedByRahul = await fetch(`${BASE_URL}/api/tasks?assignedBy=emp-rahul`);
    const dataRahul = await assignedByRahul.json();
    assert(assignedByRahul.status === 200, 'HTTP 200 for assignedBy query');
    const rahulCreatedFound = (dataRahul.data || []).some(t => t.id === bothTaskId);
    assert(rahulCreatedFound, 'Task appears in "Assigned by" query for creator Rahul Sharma (emp-rahul)');
  } catch (err) {
    assert(false, `Test 7 failed with error: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
