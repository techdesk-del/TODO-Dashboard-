/**
 * scratch/test-flowchart-retention-complete.js
 * Comprehensive end-to-end test verifying the exact retention and archive flow.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function runTest() {
  console.log('=== VERIFYING DATA RETENTION & ARCHIVE COMPLETE FLOW ===');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI missing in .env.local');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB Atlas.');

  const db = mongoose.connection.db;

  // 1. Seed test data for each of the 4 branches
  const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(); // 400 days ago (> 1 year)
  const auditOldDate = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString(); // 800 days ago (> 2 years)

  // Branch 1: Completed Task
  const testTaskId = `test-ret-task-${Date.now()}`;
  await db.collection('tasks').insertOne({
    id: testTaskId,
    title: 'Old Completed Q3 Audit Task',
    department: 'Finance',
    project: 'Annual Compliance',
    status: 'Done',
    scheduledDate: oldDate.slice(0, 10),
    time: '05:00 PM',
    priority: 'NORMAL',
    assignees: [{ id: 'usr-1', name: 'John Doe', email: 'john@urbangaon.com', status: 'Done' }],
    creator: { id: 'usr-admin', name: 'Admin User', email: 'admin@urbangaon.com', role: 'ADMIN' },
    updatedAt: oldDate,
    createdAt: oldDate,
    isArchived: false
  });
  console.log(`[Test Seed] Created completed task older than 365 days: ${testTaskId}`);

  // Branch 2: Old Audit Log
  const testAuditId = `test-ret-audit-${Date.now()}`;
  await db.collection('auditlogs').insertOne({
    id: testAuditId,
    timestamp: auditOldDate,
    action: 'STATUS_CHANGE',
    actor: 'admin@urbangaon.com',
    actorRole: 'ADMIN',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Chrome / Test Runner',
    isColdStorage: false
  });
  console.log(`[Test Seed] Created audit log older than 730 days: ${testAuditId}`);

  // Branch 3: Old Email Log
  const testEmailId = `test-ret-email-${Date.now()}`;
  await db.collection('email_logs').insertOne({
    id: testEmailId,
    recipientEmail: 'employee@urbangaon.com',
    recipientName: 'Employee Staff',
    eventType: 'DAILY_REMINDER',
    subject: 'Old Morning Digest 2025',
    status: 'DELIVERED',
    attempts: 1,
    createdAt: oldDate
  });
  console.log(`[Test Seed] Created email log older than 365 days: ${testEmailId}`);

  // Branch 4: Inactive User
  const testInactiveUserId = `usr-inactive-${Date.now().toString().slice(-4)}`;
  await db.collection('users').insertOne({
    id: testInactiveUserId,
    name: 'Robert TempStaff',
    email: `robert.${Date.now()}@urbangaon.com`,
    passwordHash: 'dummyhash123',
    role: 'EMPLOYEE',
    department: 'Sales',
    designation: 'Sales Exec',
    status: 'DEACTIVATED',
    isDeactivated: true,
    isAnonymized: false,
    createdAt: oldDate,
    updatedAt: oldDate
  });
  console.log(`[Test Seed] Created inactive user older than 180 days: ${testInactiveUserId}`);

  // 2. Execute Data Retention Engine
  // We can call the compiled/bundled engine or import via ts-node/require or test via HTTP or direct code logic
  console.log('\n--- Executing executeDataRetention() ---');
  // Load retentionEngine via ts-node or run via http against the dev server on localhost:3000
  const http = require('http');
  const postData = JSON.stringify({
    taskRetentionDays: 365,
    auditRetentionDays: 730,
    emailRetentionDays: 365,
    inactiveRetentionDays: 180,
    actor: 'E2E Verification Suite (Flowchart Flow)',
    actorRole: 'SUPER_ADMIN'
  });

  const response = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/retention',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  console.log('API Response:', response);
  if (!response.success) {
    console.error('❌ Retention execution returned failure!');
    process.exit(1);
  }

  // 3. Verify Branch 1: Completed Task moved to archive summary table
  const summaryDoc = await db.collection('archived_tasks_summary').findOne({ taskId: testTaskId });
  if (!summaryDoc) {
    console.error(`❌ FAILED: Task ${testTaskId} was not found in archived_tasks_summary table!`);
    process.exit(1);
  }
  console.log('✅ Branch 1 Verified: Task moved to archived_tasks_summary with summary:', summaryDoc.summary);

  const updatedTask = await db.collection('tasks').findOne({ id: testTaskId });
  if (!updatedTask.isArchived) {
    console.error(`❌ FAILED: Task ${testTaskId} isArchived is not true!`);
    process.exit(1);
  }
  console.log('✅ Branch 1 Verified: Original task is marked isArchived: true.');

  // 4. Verify Branch 2: Audit Log moved to cold storage (7 years policy)
  const coldAudit = await db.collection('auditlogs').findOne({ id: testAuditId });
  if (!coldAudit.isColdStorage || coldAudit.retentionPolicyYears !== 7) {
    console.error(`❌ FAILED: Audit log ${testAuditId} not moved to cold storage with 7-yr policy!`, coldAudit);
    process.exit(1);
  }
  console.log('✅ Branch 2 Verified: Audit log marked isColdStorage: true with 7-year retention policy.');

  // 5. Verify Branch 3: Email log deleted, summary counts preserved
  const deletedEmail = await db.collection('email_logs').findOne({ id: testEmailId });
  if (deletedEmail) {
    console.error(`❌ FAILED: Email log ${testEmailId} was not deleted after 1 year!`);
    process.exit(1);
  }
  console.log('✅ Branch 3 Verified: Email log older than 1 year was successfully purged.');

  const emailSummary = await db.collection('email_log_summaries').find().sort({ purgedAt: -1 }).limit(1).toArray();
  if (emailSummary.length === 0) {
    console.error('❌ FAILED: No record found in email_log_summaries collection!');
    process.exit(1);
  }
  console.log('✅ Branch 3 Verified: Email log summary counts preserved in email_log_summaries table:', {
    period: emailSummary[0].periodLabel,
    totalPurged: emailSummary[0].totalPurged,
    delivered: emailSummary[0].deliveredCount
  });

  // 6. Verify Branch 4: Inactive user anonymised, history kept
  const anonymizedUser = await db.collection('users').findOne({ id: testInactiveUserId });
  if (!anonymizedUser.isAnonymized || !anonymizedUser.name.startsWith('Former Employee')) {
    console.error('❌ FAILED: Inactive user was not anonymized!', anonymizedUser);
    process.exit(1);
  }
  console.log('✅ Branch 4 Verified: Inactive user anonymized personal data:', {
    name: anonymizedUser.name,
    email: anonymizedUser.email,
    isAnonymized: anonymizedUser.isAnonymized
  });

  // 7. Verify Step 5: Audit log entry created
  const latestAudit = await db.collection('auditlogs').findOne({
    fieldChanged: 'Data Retention & Archive Engine (Flowchart 22/25)'
  }, { sort: { timestamp: -1 } });
  if (!latestAudit) {
    console.error('❌ FAILED: Audit log entry was not created for retention execution!');
    process.exit(1);
  }
  console.log('✅ Step 5 Verified: Audit log entry created successfully:', latestAudit.newValue);

  // 8. Verify Step 6: Notify Super Admin of archive run
  const latestNotif = await db.collection('notifications').findOne({
    type: 'DATA_RETENTION'
  }, { sort: { createdAt: -1 } });
  if (!latestNotif) {
    console.error('❌ FAILED: In-App Notification was not dispatched to Super Admin!');
    process.exit(1);
  }
  console.log('✅ Step 6 Verified: Super Admin In-App notification dispatched:', latestNotif.title, 'to', latestNotif.recipientEmail);

  const latestEmailLog = await db.collection('email_logs').findOne({
    eventType: 'DATA_RETENTION'
  }, { sort: { createdAt: -1 } });
  if (!latestEmailLog) {
    console.error('❌ FAILED: Super Admin email dispatch log was not created!');
    process.exit(1);
  }
  console.log('✅ Step 6 Verified: Super Admin email dispatch logged:', latestEmailLog.subject, 'to', latestEmailLog.recipientEmail);

  // Cleanup test artifacts
  await db.collection('tasks').deleteOne({ id: testTaskId });
  await db.collection('archived_tasks_summary').deleteOne({ taskId: testTaskId });
  await db.collection('auditlogs').deleteOne({ id: testAuditId });
  await db.collection('users').deleteOne({ id: testInactiveUserId });
  console.log('\n🧹 Test documents cleaned up.');

  console.log('\n========================================================================');
  console.log('🎉 100% SUCCESS: ENTIRE FLOW IMPLEMENTED & VERIFIED ACROSS ALL 4 BRANCHES!');
  console.log('========================================================================');

  await mongoose.disconnect();
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
