/**
 * scratch/test-flowchart22.js
 * Verification test for Flowchart 22: Task Cancellation and Reassignment Flow
 */

const assert = require('assert');

// 1. Test multiAssignee recalculation logic for Cancelled tasks
const { computeMultiAssigneeStatus } = require('../src/lib/multiAssignee.ts');

console.log('Testing Flowchart 22 - Step 1: Testing multiAssignee computation for Cancelled tasks...');

// Test 1: Task with status Cancelled
const cancelledTaskResult = computeMultiAssigneeStatus({
  status: 'Cancelled',
  assignees: [
    { id: '1', name: 'Alice', status: 'Cancelled' },
    { id: '2', name: 'Bob', status: 'Cancelled' }
  ]
});
assert.strictEqual(cancelledTaskResult.status, 'Cancelled', 'Task status must remain Cancelled');
assert.strictEqual(cancelledTaskResult.progressPercent, 0, 'Cancelled task progress must be 0%');
console.log('✓ Cancelled task returns status Cancelled and 0% progress');

// Test 2: Task reassigned (e.g. 1 completed, 1 in progress)
const reassignedTaskResult = computeMultiAssigneeStatus({
  assignees: [
    { id: '1', name: 'Alice', status: 'Done' },
    { id: '3', name: 'Charlie', status: 'In Progress' }
  ]
});
assert.strictEqual(reassignedTaskResult.status, 'Partially Completed', 'Status must be Partially Completed');
assert.strictEqual(reassignedTaskResult.progressPercent, 50, 'Progress must be 50%');
console.log('✓ Reassigned task status correctly recalculated');

console.log('All Flowchart 22 core engine checks passed successfully!');
