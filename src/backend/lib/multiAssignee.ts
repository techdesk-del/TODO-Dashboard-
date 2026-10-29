/**
 * lib/multiAssignee.ts
 *
 * Implements the executive decision matrix for Flowchart 8: Multi-Assignee Task Flow
 *
 * Decision tree:
 * 1. All completed or cancelled?
 *    -> Yes: Overall status = Done (Completed)
 *    -> No:
 * 2. Any Escalated to Senior?
 *    -> Yes: Overall status = Escalated
 *    -> No:
 * 3. Any On Hold?
 *    -> Yes: Overall status = On Hold
 *    -> No:
 * 4. Any Overdue with no reason?
 *    -> Yes: Overall status = Pending Notice
 *    -> No:
 * 5. Some completed, some pending?
 *    -> Yes: Overall status = Partially Completed
 *    -> No: Overall status = In Process (or Not Started if all are Not Started)
 *
 * Flowchart 8 requirement:
 * "Show progress like N of 3 completed beside overall status"
 */

import { TaskStatus } from '@/types';

export interface MultiAssigneeComputation {
  status: TaskStatus;
  progressPercent: number;
  completedCount: number;
  totalCount: number;
  progressText: string;
}

export function computeMultiAssigneeStatus(task: {
  assignees?: { id?: string; name?: string; status?: TaskStatus | string }[];
  scheduledDate?: string;
  pastDueReason?: string;
  status?: TaskStatus | string;
  pendingCeoApproval?: boolean;
}): MultiAssigneeComputation {
  const assignees = task.assignees || [];
  const totalCount = assignees.length;

  if (totalCount === 0) {
    const s = (task.status as TaskStatus) || 'Not Started';
    return {
      status: s,
      progressPercent: s === 'Done' ? 100 : 0,
      completedCount: s === 'Done' ? 1 : 0,
      totalCount: 1,
      progressText: s === 'Done' ? '1 of 1 completed' : '0 of 1 completed',
    };
  }

  const completedCount = assignees.filter(a => a.status === 'Done').length;
  const cancelledCount = assignees.filter(a => a.status === 'Cancelled').length;
  const activeCount = totalCount - cancelledCount;
  const effectiveTotal = activeCount > 0 ? activeCount : totalCount;
  const progressPercent = Math.round((completedCount / effectiveTotal) * 100);
  const progressText = `${completedCount} of ${totalCount} completed`;

  // Flowchart 22: Cancelled Task handling (status Cancelled, excluded from performance reports)
  if (task.status === 'Cancelled' || (cancelledCount === totalCount && totalCount > 0 && completedCount === 0)) {
    return {
      status: 'Cancelled',
      progressPercent: 0,
      completedCount: 0,
      totalCount,
      progressText: `0 of ${totalCount} completed (Cancelled)`,
    };
  }

  // If task status is explicitly Done, it is 100% Completed
  if (task.status === 'Done') {
    return {
      status: 'Done',
      progressPercent: 100,
      completedCount: totalCount,
      totalCount,
      progressText: `${totalCount} of ${totalCount} completed`,
    };
  }

  // Executive Governance: Pending CEO Final Approval check (Awaiting Sukh Sagar Sir)
  if (task.status === 'Review' || ((task as any).pendingCeoApproval && task.status !== 'Done')) {
    return {
      status: 'Review',
      progressPercent: completedCount > 0 ? progressPercent : 95,
      completedCount,
      totalCount,
      progressText: `${completedCount} of ${totalCount} submitted (Awaiting CEO Final Approval)`,
    };
  }

  // Flowchart 8 Step 6: All completed or cancelled?
  const allCompletedOrCancelled = assignees.every(a => a.status === 'Done' || a.status === 'Cancelled');
  if (allCompletedOrCancelled && completedCount > 0) {
    return {
      status: 'Done',
      progressPercent: 100,
      completedCount,
      totalCount,
      progressText,
    };
  }

  // Flowchart 8 Step 7: Any Escalated to Senior?
  const anyEscalated = assignees.some(a => a.status === 'Escalated') || task.status === 'Escalated';
  if (anyEscalated) {
    return {
      status: 'Escalated',
      progressPercent,
      completedCount,
      totalCount,
      progressText,
    };
  }

  // Flowchart 8 Step 8: Any On Hold?
  const anyOnHold = assignees.some(a => a.status === 'On Hold') || task.status === 'On Hold';
  if (anyOnHold) {
    return {
      status: 'On Hold',
      progressPercent,
      completedCount,
      totalCount,
      progressText,
    };
  }

  // Flowchart 8 Step 9: Any Overdue with no reason?
  const todayStr = new Date().toISOString().slice(0, 10);
  const isBackdated = Boolean(task.scheduledDate && task.scheduledDate < todayStr);
  const hasNoReason = !task.pastDueReason || !task.pastDueReason.trim();
  const hasPending = assignees.some(a => a.status !== 'Done' && a.status !== 'Cancelled');
  if (isBackdated && hasNoReason && hasPending) {
    return {
      status: 'Pending Notice',
      progressPercent,
      completedCount,
      totalCount,
      progressText,
    };
  }

  // Flowchart 8 Step 10: Some completed, some pending?
  const pendingCount = assignees.filter(a => a.status !== 'Done' && a.status !== 'Cancelled').length;
  if (completedCount > 0 && pendingCount > 0) {
    return {
      status: 'Partially Completed',
      progressPercent,
      completedCount,
      totalCount,
      progressText,
    };
  }

  // Flowchart 8 Step 10 (No): Overall status = In Process (or Not Started if all are Not Started)
  const allNotStarted = assignees.every(a => a.status === 'Not Started');
  if (allNotStarted) {
    return {
      status: 'Not Started',
      progressPercent: 0,
      completedCount: 0,
      totalCount,
      progressText,
    };
  }

  return {
    status: 'In Progress',
    progressPercent,
    completedCount,
    totalCount,
    progressText,
  };
}
