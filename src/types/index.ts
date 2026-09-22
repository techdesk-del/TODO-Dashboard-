export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type TaskPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export type TaskStatus = 
  | 'Queued' 
  | 'In Progress' 
  | 'Review' 
  | 'Done' 
  | 'On Hold' 
  | 'Escalated' 
  | 'Cancelled';

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
  scheduledDate: string; // YYYY-MM-DD
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
  holdReason?: string;
  escalationReason?: string;
  escalatedTo?: string;
  cancellationReason?: string;
  carryForwardCount?: number;
  aiMetadata?: {
    rawTranscript?: string;
    extractionLatencyMs?: number;
    source?: 'voice_whisper' | 'text_nlp' | 'manual';
    confidenceScore?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  taskId?: string;
  taskTitle?: string;
  action: 'CREATED' | 'UPDATED' | 'REOPENED' | 'CANCELLED' | 'ESCALATED' | 'CARRIED_FORWARD' | 'EXPORTED' | 'LOGIN' | 'CONFIG_CHANGED';
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  actor: string;
  actorRole: Role;
  ipAddress: string;
  deviceInfo: string;
  notes?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  managerId?: string;
  status: 'ACTIVE' | 'PENDING_HR' | 'ON_LEAVE' | 'DEACTIVATED';
  avatar: string;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  velocity: number;
}

export interface SystemConfig {
  emailScheduleTime: string; // '08:30 AM'
  workingDays: string[];
  lockoutThreshold: number; // 5 attempts
  lockoutDurationMinutes: number; // 15 mins
  retentionDays: number; // 365
  versionBaseline: string; // 'v2.4.0'
  masterLists: {
    projects: string[];
    departments: string[];
    locations: string[];
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
