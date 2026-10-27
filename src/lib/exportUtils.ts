/**
 * lib/exportUtils.ts — Enterprise Multi-Sheet Excel & CSV Export Engine
 * 
 * Strict Implementation of Flowchart E (Excel / Multi-Sheet Export Flow):
 * 1. Role-based scoping (Employee / Admin / Super Admin)
 * 2. 5 Export Types (Daily, Monthly, Date-wise, Whole tasks, User-wise)
 * 3. Two-Sheet Core Structure:
 *    - Sheet 1: One row per assignee with all task & individual status columns
 *    - Sheet 2: One row per task with overall status and all assignees
 *    - Sheet 3 (Optional Super Admin): Immutable Audit Trail Ledger
 * 4. OWASP Formula Injection Sanitization (cells starting with '=', '+', '-', '@' prepended with `'`)
 * 5. Automatic Audit Trail Logging
 */

import * as XLSX from 'xlsx';
import type { Task, AuditLogEntry, TeamMember, Role } from '@/types';
import { canViewAuditTrail } from '@/lib/rosterData';

export type ExportType = 'DAILY' | 'MONTHLY' | 'DATE_WISE' | 'WHOLE_TASKS' | 'USER_WISE';

export interface ExportFilterOptions {
  exportType: ExportType;
  selectedDate?: string;       // YYYY-MM-DD for DAILY
  selectedMonth?: string;      // YYYY-MM for MONTHLY
  startDate?: string;          // YYYY-MM-DD for DATE_WISE
  endDate?: string;            // YYYY-MM-DD for DATE_WISE
  selectedUserId?: string;     // For USER_WISE
  selectedUserName?: string;
  includeAuditLogs?: boolean;  // Super Admin capability
}

/**
 * Formula Injection Defense (OWASP / Excel Security Standard)
 * Sanitizes any cell string starting with '=', '+', '-', '@', '\t', '\r'
 * by prepending a single quote `'` to neutralize formula execution.
 */
export function sanitizeCellValue(val: unknown): string | number | boolean {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Scopes tasks strictly according to user role permissions:
 * - EMPLOYEE: Only own tasks (assigned to employee OR created by employee)
 * - ADMIN: All enterprise tasks across all departments
 * - SUPER_ADMIN: All enterprise tasks + unrestricted forensics
 */
export function filterTasksByRole(
  allTasks: Task[],
  currentUser: { id: string; name: string; email?: string; role: Role }
): Task[] {
  if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
    return allTasks;
  }
  const cleanEmail = (currentUser.email || '').toLowerCase();
  const cleanName = currentUser.name.toLowerCase();
  const userId = currentUser.id;

  return allTasks.filter(t => {
    const isCreator = t.creator.id === userId || (t.creator.email && t.creator.email.toLowerCase() === cleanEmail);
    const isAssignee = t.assignees.some(a => 
      a.id === userId || 
      (a.email && a.email.toLowerCase() === cleanEmail) ||
      a.name.toLowerCase().includes(cleanName)
    );
    return isCreator || isAssignee;
  });
}

/**
 * Filters scoped tasks based on the 5 Flowchart E export types
 */
export function filterTasksByType(
  tasks: Task[],
  opts: ExportFilterOptions,
  members: TeamMember[]
): Task[] {
  switch (opts.exportType) {
    case 'DAILY': {
      const target = opts.selectedDate || new Date().toISOString().split('T')[0];
      return tasks.filter(t => t.scheduledDate === target);
    }
    case 'MONTHLY': {
      const targetMonth = opts.selectedMonth || new Date().toISOString().slice(0, 7); // YYYY-MM
      return tasks.filter(t => (t.scheduledDate || '').startsWith(targetMonth));
    }
    case 'DATE_WISE': {
      const start = opts.startDate || '1970-01-01';
      const end = opts.endDate || '2099-12-31';
      return tasks.filter(t => t.scheduledDate >= start && t.scheduledDate <= end);
    }
    case 'USER_WISE': {
      if (!opts.selectedUserId && !opts.selectedUserName) return tasks;
      const targetMember = members.find(m => m.id === opts.selectedUserId || m.name === opts.selectedUserName);
      const nameMatch = (targetMember?.name || opts.selectedUserName || '').toLowerCase();
      const emailMatch = (targetMember?.email || '').toLowerCase();
      const idMatch = targetMember?.id || opts.selectedUserId;

      return tasks.filter(t => 
        t.assignees.some(a => 
          (idMatch && a.id === idMatch) ||
          (emailMatch && a.email.toLowerCase() === emailMatch) ||
          (nameMatch && a.name.toLowerCase().includes(nameMatch))
        ) ||
        (t.creator.id === idMatch) ||
        (emailMatch && t.creator.email.toLowerCase() === emailMatch)
      );
    }
    case 'WHOLE_TASKS':
    default:
      return tasks;
  }
}

/**
 * Builds the Multi-Sheet Excel Workbook complying with Flowchart E:
 * - Sheet 1: One row per assignee with all task & individual status columns
 * - Sheet 2: One row per task with overall status and all assignees
 * - Sheet 3: (Optional Super Admin) Audit Trail Ledger
 */
export function generateMultiSheetExcelWorkbook(params: {
  tasks: Task[];
  auditLogs?: AuditLogEntry[];
  currentUser: { id: string; name: string; email?: string; role: Role };
  filterOpts: ExportFilterOptions;
  includeAuditLogs?: boolean;
}): { workbook: XLSX.WorkBook; filename: string; totalRowCount: number } {
  const { tasks, auditLogs = [], currentUser, filterOpts, includeAuditLogs } = params;

  // ── Sheet 1: One row per assignee with all task and status columns ──
  const sheet1Rows: Array<Record<string, string | number | boolean>> = [];

  tasks.forEach((task, tIndex) => {
    if (!task.assignees || task.assignees.length === 0) {
      // Unassigned task fallback
      sheet1Rows.push({
        'Row #': sheet1Rows.length + 1,
        'Task ID': sanitizeCellValue(task.id),
        'Task Title': sanitizeCellValue(task.title),
        'Priority': sanitizeCellValue(task.priority),
        'Assignee Name': sanitizeCellValue('Unassigned'),
        'Assignee Email': sanitizeCellValue('N/A'),
        'Assignee Department': sanitizeCellValue(task.department),
        'Assignee Status': sanitizeCellValue(task.status),
        'Assignee Progress %': sanitizeCellValue(task.progressPercent ?? 0),
        'Scheduled Date': sanitizeCellValue(task.scheduledDate),
        'Scheduled Time': sanitizeCellValue(task.time),
        'Project': sanitizeCellValue(task.project || 'General Operations'),
        'Department': sanitizeCellValue(task.department),
        'Hold / Escalation Reason': sanitizeCellValue(task.holdReason || task.escalationReason || ''),
        'Admin Intervention': sanitizeCellValue(task.editedByAdmin ? 'Yes (Edited by Admin)' : 'No'),
        'Created By': sanitizeCellValue(task.creator.name),
        'Created Date': sanitizeCellValue(task.createdAt ? task.createdAt.split('T')[0] : '')
      });
    } else {
      task.assignees.forEach(assignee => {
        sheet1Rows.push({
          'Row #': sheet1Rows.length + 1,
          'Task ID': sanitizeCellValue(task.id),
          'Task Title': sanitizeCellValue(task.title),
          'Priority': sanitizeCellValue(task.priority),
          'Assignee Name': sanitizeCellValue(assignee.name),
          'Assignee Email': sanitizeCellValue(assignee.email || ''),
          'Assignee Designation': sanitizeCellValue(assignee.designation || 'Staff'),
          'Assignee Department': sanitizeCellValue(assignee.department || task.department),
          'Assignee Status': sanitizeCellValue(assignee.status || task.status),
          'Assignee Remarks': sanitizeCellValue(assignee.remarks || ''),
          'Scheduled Date': sanitizeCellValue(task.scheduledDate),
          'Scheduled Time': sanitizeCellValue(task.time),
          'Project': sanitizeCellValue(task.project || 'General Operations'),
          'Overall Task Status': sanitizeCellValue(task.status),
          'Hold / Escalation Reason': sanitizeCellValue(task.holdReason || task.escalationReason || ''),
          'Admin Intervention': sanitizeCellValue(task.editedByAdmin ? 'Yes (Edited by Admin)' : 'No'),
          'Created By': sanitizeCellValue(task.creator.name),
          'Created Date': sanitizeCellValue(task.createdAt ? task.createdAt.split('T')[0] : '')
        });
      });
    }
  });

  // ── Sheet 2: One row per task with overall status and all assignees ──
  const sheet2Rows = tasks.map((task, idx) => {
    const allAssigneesNames = task.assignees.map(a => `${a.name} (${a.status})`).join('; ');
    return {
      'Task #': idx + 1,
      'Task ID': sanitizeCellValue(task.id),
      'Task Title': sanitizeCellValue(task.title),
      'Overall Status': sanitizeCellValue(task.status),
      'Overall Progress %': sanitizeCellValue(task.progressPercent ?? (task.status === 'Done' ? 100 : 0)),
      'Priority': sanitizeCellValue(task.priority),
      'All Assignees & Status': sanitizeCellValue(allAssigneesNames || 'None'),
      'Total Assignees Count': task.assignees.length,
      'Department': sanitizeCellValue(task.department),
      'Project': sanitizeCellValue(task.project || 'General Operations'),
      'Scheduled Date': sanitizeCellValue(task.scheduledDate),
      'Scheduled Time': sanitizeCellValue(task.time),
      'Hold Reason': sanitizeCellValue(task.holdReason || ''),
      'Escalation Reason': sanitizeCellValue(task.escalationReason || ''),
      'Escalated To': sanitizeCellValue(task.escalatedTo || ''),
      'Admin Intervention': sanitizeCellValue(task.editedByAdmin ? 'Yes (Edited by Admin)' : 'No'),
      'Created By': sanitizeCellValue(`${task.creator.name} (${task.creator.role})`),
      'Created At': sanitizeCellValue(task.createdAt || ''),
      'Last Updated': sanitizeCellValue(task.updatedAt || ''),
      'Management Notes': sanitizeCellValue(task.notes || '')
    };
  });

  const wb = XLSX.utils.book_new();

  // Create worksheets
  const ws1 = XLSX.utils.json_to_sheet(sheet1Rows);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Rows);

  // Column width hints
  ws1['!cols'] = [
    { wch: 8 }, { wch: 18 }, { wch: 32 }, { wch: 12 }, { wch: 22 },
    { wch: 26 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 25 },
    { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 30 },
    { wch: 22 }, { wch: 20 }, { wch: 14 }
  ];

  ws2['!cols'] = [
    { wch: 8 }, { wch: 18 }, { wch: 36 }, { wch: 16 }, { wch: 18 },
    { wch: 12 }, { wch: 45 }, { wch: 20 }, { wch: 22 }, { wch: 22 },
    { wch: 14 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 20 },
    { wch: 22 }, { wch: 25 }, { wch: 22 }, { wch: 22 }, { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Sheet1 - Assignee Details');
  XLSX.utils.book_append_sheet(wb, ws2, 'Sheet2 - Task Register');

  // ── Sheet 3: Executive Audit Log Forensics (CEO & Aakash Das Only) ──
  if (canViewAuditTrail(currentUser) && includeAuditLogs && auditLogs.length > 0) {
    const sheet3Rows = auditLogs.map((log, idx) => ({
      'Record #': idx + 1,
      'Log ID': sanitizeCellValue(log.id),
      'Timestamp': sanitizeCellValue(log.timestamp),
      'Action': sanitizeCellValue(log.action),
      'Task ID': sanitizeCellValue(log.taskId || 'SYSTEM-GLOBAL'),
      'Deliverable Title': sanitizeCellValue(log.taskTitle || 'Global Policy'),
      'Field Changed': sanitizeCellValue(log.fieldChanged || ''),
      'Old Value': sanitizeCellValue(log.oldValue || ''),
      'New Value': sanitizeCellValue(log.newValue || ''),
      'Operator (Actor)': sanitizeCellValue(log.actor),
      'Operator Role': sanitizeCellValue(log.actorRole),
      'IP Address': sanitizeCellValue(log.ipAddress),
      'Device Environment': sanitizeCellValue(log.deviceInfo),
      'Compliance Notes': sanitizeCellValue(log.notes || '')
    }));

    const ws3 = XLSX.utils.json_to_sheet(sheet3Rows);
    ws3['!cols'] = [
      { wch: 10 }, { wch: 22 }, { wch: 24 }, { wch: 16 }, { wch: 20 },
      { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 20 },
      { wch: 16 }, { wch: 18 }, { wch: 25 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, ws3, 'Sheet3 - Audit Forensics');
  }

  const dateTag = new Date().toISOString().split('T')[0];
  const typeTag = filterOpts.exportType.toLowerCase();
  const filename = `UrbanGaon_Export_${typeTag}_${dateTag}.xlsx`;

  return {
    workbook: wb,
    filename,
    totalRowCount: sheet1Rows.length
  };
}

/**
 * Triggers the browser file download directly
 */
export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(workbook, filename);
}
