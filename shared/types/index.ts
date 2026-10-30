export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type TaskPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export type TaskStatus = 
  | 'Not Started'
  | 'Queued' 
  | 'In Progress' 
  | 'Review' 
  | 'Done' 
  | 'On Hold' 
  | 'Escalated' 
  | 'Cancelled'
  | 'Partially Completed'
  | 'Pending Notice';

export interface AssigneeInfo {
  id: string;
  name: string;
  email: string;
  department: string;
  designation?: string;
  avatar?: string;
  status: TaskStatus;
  completedAt?: string;
  remarks?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  scheduledDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD (Target Due Date / Deadline)
  time: string; // '05:00 PM'
  priority: TaskPriority;
  status: TaskStatus;
  assignees: AssigneeInfo[];
  creator: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  department: string;
  project?: string;
  location?: string;
  progressPercent?: number; // e.g. 85 for Alex Rivera's DB migration
  isJustAdded?: boolean;
  isOverdue?: boolean;
  isPendingNoReason?: boolean;
  overdueFlaggedAt?: string;
  overdueNotifiedAt?: string;
  overdueDays?: number;
  pastDueReason?: string;
  delayReason?: string;
  delayReasonSubmittedAt?: string;
  delayReasonApproved?: boolean;
  notes?: string;
  inputMethod?: 'Speak' | 'Type';
  holdReason?: string;
  escalationReason?: string;
  escalatedTo?: string;
  escalatedToId?: string;
  escalatedAt?: string;
  escalationSlaHours?: number;
  autoEscalatedToManager?: boolean;
  seniorAdvisoryComment?: string;
  seniorResolutionNote?: string;
  seniorReturnReason?: string;
  originalAssigneeNotified?: boolean;
  cancellationReason?: string;
  carryForwardCount?: number;
  aiMetadata?: {
    rawTranscript?: string;
    extractionLatencyMs?: number;
    source?: 'voice_whisper' | 'text_nlp' | 'manual';
    confidenceScore?: number;
  };
  editedByAdmin?: boolean;
  requiresCeoApproval?: boolean;
  pendingCeoApproval?: boolean;
  ceoApprovalRequestedAt?: string;
  ceoApprovalRequestedBy?: string;
  ceoApprovedAt?: string;
  ceoApprovedBy?: string;
  ceoRejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  taskId?: string;
  taskTitle?: string;
  action: 'CREATED' | 'UPDATED' | 'REOPENED' | 'CANCELLED' | 'ESCALATED' | 'CARRIED_FORWARD' | 'EXPORTED' | 'LOGIN' | 'CONFIG_CHANGED' | 'DELETED' | 'APPROVAL' | 'REJECTED' | 'STATUS_CHANGE' | 'REASSIGNED';
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  actor: string;
  actorRole: Role;
  ipAddress: string;
  deviceInfo: string;
  notes?: string;
  isColdStorage?: boolean;
  coldStorageAt?: string;
  retentionPolicyYears?: number;
}

export type NotificationEventType =
  | 'TASK_ASSIGNED'
  | 'TASK_ESCALATED'
  | 'TASK_REOPENED'
  | 'TASK_CANCELLED'
  | 'REASON_STATUS_CHANGED'
  | 'DAILY_REMINDER'
  | 'WEEKLY_DIGEST'
  | 'CHRONIC_DELAY'
  | 'CONFIG_ROLLBACK'
  | 'DATA_RETENTION'
  | 'STAFF_LEAVE_ALERT'
  | 'STAFF_RETURN_FROM_LEAVE';

export interface InAppNotification {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  title: string;
  message: string;
  type: NotificationEventType;
  taskId?: string;
  read: boolean;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  eventType: NotificationEventType;
  subject: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  attempts: number;
  lastError?: string;
  taskId?: string;
  addedToAdminSummary?: boolean;
  deliveredAt?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  department: string;
  designation: string;
  managerId?: string;
  manager?: string;
  managerEmail?: string;
  status: 'ACTIVE' | 'PENDING_HR' | 'ON_LEAVE' | 'DEACTIVATED' | 'Pending First Login';
  avatar: string;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  velocity: number;
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveAction?: 'AUTO_EXTEND' | 'FLAG_ADMIN';
  leaveNotes?: string;
  updatedAt?: string;
}

export interface SystemConfig {
  emailScheduleTime: string; // '08:30 AM'
  workingDays: string[];
  holidaysActive?: boolean;
  lockoutThreshold: number; // 5 attempts
  lockoutDurationMinutes: number; // 15 mins
  sessionTimeoutMinutes?: number; // 60 mins
  passwordRules?: {
    minLength: number;
    requireSpecialChars: boolean;
    requireNumbers: boolean;
  };
  retentionDays: number; // 365
  auditRetentionDays?: number; // 730
  versionBaseline: string; // 'v2.4.0'
  previousVersionBaseline?: string;
  previousConfigSnapshot?: Partial<SystemConfig>; // Flowchart 24: Previous version snapshot kept for rollback
  requireDualSuperAdminApproval?: boolean;
  pendingApproval?: {
    id: string;
    requestedBy: string;
    requestedAt: string;
    targetVersion: string;
    changesSummary: string;
    configSnapshot: Partial<SystemConfig>;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
  rolePermissions?: Record<string, string[]>;
  customStatuses?: { label: string; mappedTo: TaskStatus; color?: string }[];
  exportRoles?: {
    canExportAllTasks: Role[];
    canExportAuditLogs: Role[];
    canExportReports: Role[];
  };
  masterLists: {
    projects: string[];
    departments: string[];
    locations: string[];
    directReportingLines?: { manager: string; reportees: string[] }[];
  };
}

export interface ParsedVoiceEntity {
  title: string;
  scheduledDate: string; // e.g. '2026-09-15'
  time: string; // e.g. '05:00 PM'
  priority: TaskPriority;
  assigneeName: string;
  department?: string;
  latencyMs: number;
  confidence: number;
}
