// scratch/test-flowchart8.js
// SDE-3 & CEO Automated Test Suite for Flowchart 8: "Multi-Assignee Task Flow"

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 EXECUTING SDE-3 & CEO FLOWCHART 8 TEST SUITE: MULTI-ASSIGNEE FLOW');
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

  // ── TEST 1: Task created with multiple assignees & status "Not Started" ──
  console.log('--- TEST 1: Task Created with Multiple Assignees (Status: Not Started) ---');
  const taskId = `fc8-task-${Date.now()}`;
  const initialAssignees = [
    { id: 'mem-alex', name: 'Alex Rivera', role: 'EMPLOYEE', department: 'AI & IT', status: 'Not Started', email: 'alex.rivera@urbangaon.com' },
    { id: 'mem-elena', name: 'Elena Rostova', role: 'EMPLOYEE', department: 'AI & IT', status: 'Not Started', email: 'elena.rostova@urbangaon.com' },
    { id: 'mem-marcus', name: 'Marcus Chen', role: 'EMPLOYEE', department: 'AI & IT', status: 'Not Started', email: 'marcus.chen@urbangaon.com' },
  ];

  try {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: taskId,
        title: 'Multi-Tenant Cluster Migration',
        scheduledDate: tomorrowStr,
        priority: 'HIGH',
        department: 'AI & IT',
        project: 'High Availability Infrastructure',
        location: 'Jaipur',
        status: 'Not Started',
        creator: {
          id: 'emp-rahul',
          name: 'Rahul Sharma',
          email: 'rahul.sharma@urbangaon.com',
          role: 'EMPLOYEE',
        },
        assignees: initialAssignees,
      }),
    });
    const data = await res.json();
    assert(res.status === 201, 'HTTP 201 Created for multi-assignee task');
    assert(data.data.status === 'Not Started', 'Task status is initially "Not Started"');
    assert(data.data.assignees.length === 3, 'Exactly 3 assignees saved in task');
    assert(data.data.assignees.every(a => a.status === 'Not Started'), 'All 3 assignees have status "Not Started"');
  } catch (err) {
    assert(false, `Test 1 error: ${err.message}`);
  }

  // ── TEST 2: Each Assignee sees it in "Assigned to Me" ──
  console.log('\n--- TEST 2: Visibility in "Assigned to Me" for Each Assignee ---');
  try {
    for (const a of initialAssignees) {
      const qRes = await fetch(`${BASE_URL}/api/tasks?assignedTo=${a.id}`);
      const qData = await qRes.json();
      const found = (qData.data || []).some(t => t.id === taskId);
      assert(found, `Task appears in "Assigned to" query for ${a.name} (${a.id})`);
    }
  } catch (err) {
    assert(false, `Test 2 error: ${err.message}`);
  }

  // ── TEST 3: Assignee 1 updates status to In Progress -> Overall: In Process ──
  console.log('\n--- TEST 3: Assignee Updates Status to In Progress -> Overall: In Process ---');
  try {
    const patchRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-name': 'Alex Rivera' },
      body: JSON.stringify({
        assignees: [
          { ...initialAssignees[0], status: 'In Progress' },
          initialAssignees[1],
          initialAssignees[2],
        ],
      }),
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, 'HTTP 200 for individual assignee update');
    assert(patchData.data.status === 'In Progress', `Overall status resolved to 'In Progress' (got: ${patchData.data.status})`);
    assert(patchData.data.progressPercent === 0, 'Progress percent is 0% since 0 are Done');
  } catch (err) {
    assert(false, `Test 3 error: ${err.message}`);
  }

  // ── TEST 4: Some completed, some pending? -> Overall: Partially Completed ──
  console.log('\n--- TEST 4: Some Completed, Some Pending -> Overall: Partially Completed ---');
  try {
    const patchRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-name': 'Alex Rivera' },
      body: JSON.stringify({
        assignees: [
          { ...initialAssignees[0], status: 'Done', completedAt: new Date().toISOString() },
          { ...initialAssignees[1], status: 'In Progress' },
          initialAssignees[2],
        ],
      }),
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, 'HTTP 200 for completion of Assignee 1');
    assert(patchData.data.status === 'Partially Completed', `Overall status resolved to 'Partially Completed' (got: ${patchData.data.status})`);
    assert(patchData.data.progressPercent === 33, `Progress percent is 33% (1 of 3 done) (got: ${patchData.data.progressPercent}%)`);
  } catch (err) {
    assert(false, `Test 4 error: ${err.message}`);
  }

  // ── TEST 5: Any Overdue with no reason? -> Overall: Pending Notice ──
  console.log('\n--- TEST 5: Overdue without Reason -> Overall: Pending Notice ---');
  try {
    const patchRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledDate: yesterdayStr, // Backdated!
        pastDueReason: '', // No reason provided!
        assignees: [
          { ...initialAssignees[0], status: 'Done' },
          { ...initialAssignees[1], status: 'In Progress' },
          initialAssignees[2],
        ],
      }),
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, 'HTTP 200 for overdue without reason');
    assert(patchData.data.status === 'Pending Notice', `Overall status resolved to 'Pending Notice' (got: ${patchData.data.status})`);
  } catch (err) {
    assert(false, `Test 5 error: ${err.message}`);
  }

  // ── TEST 6: Any On Hold? -> Overall: On Hold ──
  console.log('\n--- TEST 6: Any Assignee On Hold -> Overall: On Hold ---');
  try {
    const patchRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledDate: tomorrowStr, // Normal future date
        assignees: [
          { ...initialAssignees[0], status: 'Done' },
          { ...initialAssignees[1], status: 'On Hold', remarks: 'Awaiting client token approval' },
          initialAssignees[2],
        ],
      }),
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, 'HTTP 200 for On Hold update');
    assert(patchData.data.status === 'On Hold', `Overall status resolved to 'On Hold' (got: ${patchData.data.status})`);
  } catch (err) {
    assert(false, `Test 6 error: ${err.message}`);
  }

  // ── TEST 7: Any Escalated to Senior? -> Overall: Escalated ──
  console.log('\n--- TEST 7: Any Assignee Escalated -> Overall: Escalated ---');
  try {
    const patchRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignees: [
          { ...initialAssignees[0], status: 'Done' },
          { ...initialAssignees[1], status: 'Escalated', remarks: 'Blocker: DB schema mismatch' },
          initialAssignees[2],
        ],
      }),
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, 'HTTP 200 for Escalation update');
    assert(patchData.data.status === 'Escalated', `Overall status resolved to 'Escalated' (got: ${patchData.data.status})`);
  } catch (err) {
    assert(false, `Test 7 error: ${err.message}`);
  }

  // ── TEST 8: All completed or cancelled? -> Overall: Completed (Done) ──
  console.log('\n--- TEST 8: All Completed or Cancelled -> Overall: Completed (Done) ---');
  try {
    const patchRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignees: [
          { ...initialAssignees[0], status: 'Done' },
          { ...initialAssignees[1], status: 'Done' },
          { ...initialAssignees[2], status: 'Cancelled', remarks: 'Component waived by Director' },
        ],
      }),
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, 'HTTP 200 for full completion');
    assert(patchData.data.status === 'Done', `Overall status resolved to 'Done' (got: ${patchData.data.status})`);
    assert(patchData.data.progressPercent === 100, `Progress percent is 100% (got: ${patchData.data.progressPercent}%)`);
  } catch (err) {
    assert(false, `Test 8 error: ${err.message}`);
  }

  // ── TEST 9: Assignee left or resigned? Creator/Admin reassign or close ──
  console.log('\n--- TEST 9: Assignee Left/Resigned -> Reassign with Notes ---');
  const shiftTaskId = `fc8-shift-${Date.now()}`;
  try {
    await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: shiftTaskId,
        title: 'Core Billing Architecture Refactor',
        scheduledDate: tomorrowStr,
        priority: 'NORMAL',
        department: 'AI & IT',
        project: 'UrbanGaon 2.0 Roadmap',
        location: 'Jaipur',
        status: 'Not Started',
        creator: { id: 'emp-rahul', name: 'Rahul Sharma', email: 'rahul.sharma@urbangaon.com', role: 'EMPLOYEE' },
        assignees: [
          { id: 'mem-elena', name: 'Elena Rostova', role: 'EMPLOYEE', department: 'AI & IT', status: 'In Progress' },
        ],
      }),
    });

    // Reassign Elena (departing) to Marcus with mandatory notes
    const reassignRes = await fetch(`${BASE_URL}/api/tasks/${shiftTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-name': 'Rahul Sharma' },
      body: JSON.stringify({
        assignees: [
          {
            id: 'mem-marcus',
            name: 'Marcus Chen',
            email: 'marcus.chen@urbangaon.com',
            role: 'EMPLOYEE',
            department: 'AI & IT',
            status: 'Not Started',
            remarks: 'Reassigned from Elena Rostova: Employee resigned/shifted to external project.',
          }
        ],
        auditAction: 'REASSIGNED',
        auditNotes: 'Reassigned Elena Rostova to Marcus Chen due to team departure under Flowchart 8 protocol.',
      }),
    });
    const reassignData = await reassignRes.json();
    assert(reassignRes.status === 200, 'HTTP 200 for Reassignment');
    assert(reassignData.data.assignees[0].id === 'mem-marcus', 'Successor Marcus Chen successfully assigned');
    assert(reassignData.data.assignees[0].remarks.includes('resigned'), 'Mandatory remarks preserved in assignee document');
  } catch (err) {
    assert(false, `Test 9 error: ${err.message}`);
  }

  // ── TEST 10: Audit Log Records Each Change ──
  console.log('\n--- TEST 10: Audit Log Verification ---');
  try {
    const auditRes = await fetch(`${BASE_URL}/api/audit`);
    const auditData = await auditRes.json();
    assert(auditRes.status === 200, 'HTTP 200 from /api/audit');
    const logs = (auditData.data || []).filter(l => l.taskId === taskId || l.taskId === shiftTaskId);
    assert(logs.length >= 2, `Audit entries found for multi-assignee mutations (found: ${logs.length})`);
    assert(logs.some(l => l.action === 'STATUS_CHANGE' || l.action === 'UPDATED' || l.action === 'REASSIGNED'), 'Audit logs captured status changes and reassignments');
  } catch (err) {
    assert(false, `Test 10 error: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
