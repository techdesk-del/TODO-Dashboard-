import { Task, TeamMember, AuditLogEntry, SystemConfig } from '@/types';

export const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: 'mem-1',
    name: 'Akash Das',
    email: 'akash.das@urbangaon.com',
    role: 'SUPER_ADMIN',
    department: 'Sales & Growth',
    designation: 'Workspace Lead & Director',
    status: 'ACTIVE',
    avatar: 'AD',
    totalTasks: 3,
    completedTasks: 1,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 96.5,
  },
  {
    id: 'mem-2',
    name: 'Alex Rivera',
    email: 'alex.rivera@urbangaon.com',
    role: 'EMPLOYEE',
    department: 'DevOps & DB',
    designation: 'Senior DevOps & Cloud Infrastructure Lead',
    status: 'ACTIVE',
    avatar: 'AR',
    totalTasks: 4,
    completedTasks: 0,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 94.8,
  },
  {
    id: 'mem-3',
    name: 'Tech Leads',
    email: 'tech.leads@urbangaon.com',
    role: 'MANAGER',
    department: 'Product & Tech',
    designation: 'Engineering Management',
    status: 'ACTIVE',
    avatar: 'TL',
    totalTasks: 3,
    completedTasks: 1,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 91.2,
  },
  {
    id: 'mem-4',
    name: 'Finance Team',
    email: 'finance@urbangaon.com',
    role: 'EMPLOYEE',
    department: 'Finance',
    designation: 'Accounts & Billing',
    status: 'ACTIVE',
    avatar: 'FT',
    totalTasks: 2,
    completedTasks: 1,
    activeTasks: 1,
    overdueTasks: 0,
    velocity: 100.0,
  },
  {
    id: 'mem-5',
    name: 'Priya Sharma',
    email: 'priya.sharma@urbangaon.com',
    role: 'EMPLOYEE',
    department: 'Design & UI',
    designation: 'Design Lead',
    status: 'ACTIVE',
    avatar: 'PS',
    totalTasks: 3,
    completedTasks: 1,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 89.0,
  },
  {
    id: 'mem-6',
    name: 'Rahul Verma',
    email: 'rahul.verma@urbangaon.com',
    role: 'EMPLOYEE',
    department: 'Frontend Engineering',
    designation: 'Frontend Engineer',
    status: 'ACTIVE',
    avatar: 'RV',
    totalTasks: 2,
    completedTasks: 0,
    activeTasks: 2,
    overdueTasks: 1,
    velocity: 82.5,
  },
  {
    id: 'mem-7',
    name: 'Legal Team',
    email: 'legal@urbangaon.com',
    role: 'EMPLOYEE',
    department: 'Legal Team',
    designation: 'Compliance & Contracts',
    status: 'ACTIVE',
    avatar: 'LT',
    totalTasks: 2,
    completedTasks: 2,
    activeTasks: 0,
    overdueTasks: 0,
    velocity: 98.0,
  }
];

export const INITIAL_TASKS: Task[] = [
  // Tuesday, 15 September 2026 (Slide 4, Slide 8, Slide 10)
  {
    id: 'task-101',
    title: 'Database Migration (v12 to v14)',
    scheduledDate: '2026-09-15',
    time: '05:00 PM',
    priority: 'HIGH',
    status: 'In Progress',
    progressPercent: 85,
    isJustAdded: true,
    department: 'DevOps & DB',
    project: 'Core Infrastructure',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-2',
        name: 'Alex Rivera',
        email: 'alex.rivera@urbangaon.com',
        department: 'DevOps & DB',
        designation: 'Senior DevOps & Cloud Infrastructure Lead',
        avatar: 'AR',
        status: 'In Progress',
        remarks: 'PostgreSQL master cluster replication & zero-downtime cutover scripts verified'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    aiMetadata: {
      rawTranscript: 'Schedule database migration today at 5:00 PM assigned to Alex Rivera on high priority',
      extractionLatencyMs: 94,
      source: 'voice_whisper',
      confidenceScore: 0.99
    },
    createdAt: '2026-09-15T09:12:00Z',
    updatedAt: '2026-09-15T09:12:18Z'
  },
  {
    id: 'task-102',
    title: 'Client proposal final presentation',
    scheduledDate: '2026-09-15',
    time: '03:30 PM',
    priority: 'URGENT',
    status: 'In Progress',
    progressPercent: 70,
    department: 'Sales & Growth',
    project: 'Enterprise Expansion',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-1',
        name: 'Akash Das',
        email: 'akash.das@urbangaon.com',
        department: 'Sales & Growth',
        designation: 'Workspace Lead & Director',
        avatar: 'AD',
        status: 'In Progress',
        remarks: 'Executive deck finalized with ROI metrics'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T08:30:00Z',
    updatedAt: '2026-09-15T11:45:00Z'
  },
  {
    id: 'task-103',
    title: 'Pay office electricity and server bills',
    scheduledDate: '2026-09-15',
    time: '02:00 PM',
    priority: 'HIGH',
    status: 'Queued',
    progressPercent: 40,
    department: 'Finance',
    project: 'Operations & Facilities',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-4',
        name: 'Finance Team',
        email: 'finance@urbangaon.com',
        department: 'Finance',
        designation: 'Accounts & Billing',
        avatar: 'FT',
        status: 'Queued',
        remarks: 'Awaiting secondary OTP authorization from director'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: '2026-09-15T08:00:00Z'
  },
  {
    id: 'task-104',
    title: 'Vendor contract renewal review',
    scheduledDate: '2026-09-15',
    time: '11:30 AM',
    priority: 'NORMAL',
    status: 'Done',
    progressPercent: 100,
    department: 'Legal Team',
    project: 'Compliance & Contracts',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-7',
        name: 'Legal Team',
        email: 'legal@urbangaon.com',
        department: 'Legal Team',
        designation: 'Compliance & Contracts',
        avatar: 'LT',
        status: 'Done',
        completedAt: '2026-09-15T11:25:00Z',
        remarks: 'Clause 8 and 14 amendments approved and digitally signed'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T07:45:00Z',
    updatedAt: '2026-09-15T11:25:00Z'
  },

  // Wednesday, 16 September 2026 (Slide 7)
  {
    id: 'task-105',
    title: 'Product architecture roadmap meeting',
    scheduledDate: '2026-09-16',
    time: '10:00 AM',
    priority: 'HIGH',
    status: 'Queued',
    progressPercent: 10,
    department: 'Product & Tech',
    project: 'UrbanGaon 2.0 Roadmap',
    location: 'Virtual / Google Meet',
    assignees: [
      {
        id: 'mem-3',
        name: 'Tech Leads',
        email: 'tech.leads@urbangaon.com',
        department: 'Product & Tech',
        designation: 'Engineering Management',
        avatar: 'TL',
        status: 'Queued'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-14T14:00:00Z',
    updatedAt: '2026-09-14T14:00:00Z'
  },
  {
    id: 'task-106',
    title: 'Quarterly marketing budget sign-off',
    scheduledDate: '2026-09-16',
    time: '04:00 PM',
    priority: 'NORMAL',
    status: 'Queued',
    progressPercent: 25,
    department: 'Sales & Growth',
    project: 'Growth Strategy Q3',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-1',
        name: 'Akash Das',
        email: 'akash.das@urbangaon.com',
        department: 'Sales & Growth',
        designation: 'Workspace Lead & Director',
        avatar: 'AD',
        status: 'Queued'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-14T16:20:00Z',
    updatedAt: '2026-09-14T16:20:00Z'
  },

  // Alex Rivera's Other Assigned Deliverables (Slide 10)
  {
    id: 'task-107',
    title: 'AWS RDS Automated Snapshot & Failover Drill',
    scheduledDate: '2026-09-16',
    time: '11:00 AM',
    priority: 'HIGH',
    status: 'Queued',
    progressPercent: 30,
    department: 'DevOps & DB',
    project: 'High Availability Infrastructure',
    location: 'Cloud Infrastructure',
    assignees: [
      {
        id: 'mem-2',
        name: 'Alex Rivera',
        email: 'alex.rivera@urbangaon.com',
        department: 'DevOps & DB',
        designation: 'Senior DevOps & Cloud Infrastructure Lead',
        avatar: 'AR',
        status: 'Queued',
        remarks: 'Simulating cross-region multi-AZ failover recovery'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-14T10:00:00Z',
    updatedAt: '2026-09-14T10:00:00Z'
  },
  {
    id: 'task-108',
    title: 'API Gateway Rate Limiting & NGINX Tuning',
    scheduledDate: '2026-09-18',
    time: '03:00 PM',
    priority: 'NORMAL',
    status: 'Queued',
    progressPercent: 15,
    department: 'DevOps & DB',
    project: 'Security & DDoS Shielding',
    location: 'Edge Network',
    assignees: [
      {
        id: 'mem-2',
        name: 'Alex Rivera',
        email: 'alex.rivera@urbangaon.com',
        department: 'DevOps & DB',
        designation: 'Senior DevOps & Cloud Infrastructure Lead',
        avatar: 'AR',
        status: 'Queued',
        remarks: 'Configuring Redis token-bucket rate limiter for DDOS mitigation'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-14T11:00:00Z',
    updatedAt: '2026-09-14T11:00:00Z'
  },
  {
    id: 'task-109',
    title: 'Docker Container Security Patch & Vulnerability Scan',
    scheduledDate: '2026-09-22',
    time: '05:00 PM',
    priority: 'NORMAL',
    status: 'Queued',
    progressPercent: 0,
    department: 'DevOps & DB',
    project: 'SecOps Audit',
    location: 'Production Cluster',
    assignees: [
      {
        id: 'mem-2',
        name: 'Alex Rivera',
        email: 'alex.rivera@urbangaon.com',
        department: 'DevOps & DB',
        designation: 'Senior DevOps & Cloud Infrastructure Lead',
        avatar: 'AR',
        status: 'Queued',
        remarks: 'Running Trivy and updating Alpine base images across microservices'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Akash Das',
      email: 'akash.das@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-14T12:00:00Z',
    updatedAt: '2026-09-14T12:00:00Z'
  },

  // Additional deliverables across teams (Slide 9 CEO view: 42 active tasks, blockers)
  {
    id: 'task-110',
    title: 'Design System Figma Component Token Sync',
    scheduledDate: '2026-09-18',
    time: '04:00 PM',
    priority: 'NORMAL',
    status: 'In Progress',
    progressPercent: 65,
    department: 'Design & UI',
    project: 'Design Systems',
    assignees: [
      {
        id: 'mem-5',
        name: 'Priya Sharma',
        email: 'priya.sharma@urbangaon.com',
        department: 'Design & UI',
        designation: 'Design Lead',
        avatar: 'PS',
        status: 'In Progress'
      }
    ],
    creator: { id: 'mem-3', name: 'Tech Leads', email: 'tech.leads@urbangaon.com', role: 'MANAGER' },
    createdAt: '2026-09-14T09:00:00Z',
    updatedAt: '2026-09-15T10:00:00Z'
  },
  {
    id: 'task-111',
    title: 'Frontend Hydration Optimization (Zero Unused JS)',
    scheduledDate: '2026-09-17',
    time: '01:30 PM',
    priority: 'HIGH',
    status: 'On Hold',
    holdReason: 'Blocked waiting for Next.js 15 Turbopack edge bundle validation',
    progressPercent: 50,
    department: 'Frontend Engineering',
    project: 'Core Web Vitals',
    assignees: [
      {
        id: 'mem-6',
        name: 'Rahul Verma',
        email: 'rahul.verma@urbangaon.com',
        department: 'Frontend Engineering',
        designation: 'Frontend Engineer',
        avatar: 'RV',
        status: 'On Hold',
        remarks: 'Waiting for Turbopack edge bundle bugfix release'
      }
    ],
    creator: { id: 'mem-3', name: 'Tech Leads', email: 'tech.leads@urbangaon.com', role: 'MANAGER' },
    createdAt: '2026-09-14T10:30:00Z',
    updatedAt: '2026-09-15T09:30:00Z'
  },
  {
    id: 'task-112',
    title: 'Monthly Statutory Tax & GST Filing Reconciliation',
    scheduledDate: '2026-09-19',
    time: '05:30 PM',
    priority: 'URGENT',
    status: 'Escalated',
    escalationReason: 'Vendor invoice mismatches requiring CEO sign-off before filing deadline',
    escalatedTo: 'Akash Das',
    progressPercent: 60,
    department: 'Finance',
    project: 'Compliance',
    assignees: [
      {
        id: 'mem-4',
        name: 'Finance Team',
        email: 'finance@urbangaon.com',
        department: 'Finance',
        designation: 'Accounts & Billing',
        avatar: 'FT',
        status: 'Escalated'
      }
    ],
    creator: { id: 'mem-4', name: 'Finance Team', email: 'finance@urbangaon.com', role: 'EMPLOYEE' },
    createdAt: '2026-09-14T15:00:00Z',
    updatedAt: '2026-09-15T08:00:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-09-15T09:12:00Z',
    taskId: 'task-101',
    taskTitle: 'Database Migration (v12 to v14)',
    action: 'CREATED',
    fieldChanged: 'Task Created via Voice AI',
    oldValue: 'None',
    newValue: 'Scheduled for 2026-09-15 at 05:00 PM (Alex Rivera - HIGH)',
    actor: 'Akash Das',
    actorRole: 'SUPER_ADMIN',
    ipAddress: '103.21.244.18',
    deviceInfo: 'Chrome 128 / macOS Executive Console',
    notes: 'Parsed accurately via Whisper Stream in 94ms'
  },
  {
    id: 'audit-002',
    timestamp: '2026-09-15T09:14:32Z',
    taskId: 'task-101',
    taskTitle: 'Database Migration (v12 to v14)',
    action: 'UPDATED',
    fieldChanged: 'Scheduled Time',
    oldValue: '05:00 PM',
    newValue: '06:00 PM',
    actor: 'Akash Das',
    actorRole: 'SUPER_ADMIN',
    ipAddress: '103.21.244.18',
    deviceInfo: 'Chrome 128 / Inline Editor',
    notes: 'Inline task edit 1-click update applied'
  },
  {
    id: 'audit-003',
    timestamp: '2026-09-15T08:30:00Z',
    action: 'CONFIG_CHANGED',
    fieldChanged: 'Morning Reminder Digest Dispatch',
    oldValue: 'Pending',
    newValue: 'Dispatched to 7 active staff members',
    actor: 'System Automated Cron',
    actorRole: 'SUPER_ADMIN',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Vercel Edge Cron Runner (08:30 AM)',
    notes: 'Personalized digest emails generated for 7 staff members'
  },
  {
    id: 'audit-004',
    timestamp: '2026-09-15T00:05:00Z',
    action: 'CARRIED_FORWARD',
    fieldChanged: 'Automated Nightly Carry-Forward',
    oldValue: 'Uncompleted tasks scan',
    newValue: '0 uncompleted tasks carried forward (100% resolution)',
    actor: 'System Automated Cron',
    actorRole: 'SUPER_ADMIN',
    ipAddress: '127.0.0.1',
    deviceInfo: 'MongoDB Nightly Rollover Worker',
    notes: 'Automated 00:05 AM maintenance check completed'
  }
];

export const INITIAL_SYSTEM_CONFIG: SystemConfig = {
  emailScheduleTime: '08:30 AM',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  lockoutThreshold: 5,
  lockoutDurationMinutes: 15,
  retentionDays: 365,
  versionBaseline: 'v2.4.0-Production',
  masterLists: {
    projects: [
      'Core Infrastructure',
      'Enterprise Expansion',
      'UrbanGaon 2.0 Roadmap',
      'Growth Strategy Q3',
      'Design Systems',
      'High Availability Infrastructure',
      'Operations & Facilities',
      'Compliance & Contracts'
    ],
    departments: [
      'DevOps & DB',
      'Product & Tech',
      'Sales & Growth',
      'Design & UI',
      'Finance',
      'Legal Team',
      'Frontend Engineering'
    ],
    locations: [
      'Bangalore HQ',
      'Cloud Infrastructure',
      'Edge Network',
      'Virtual / Remote',
      'Delhi Hub'
    ]
  }
};
