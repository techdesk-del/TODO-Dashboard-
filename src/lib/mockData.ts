import { Task, TeamMember, AuditLogEntry, SystemConfig } from '@/types';
import { INITIAL_MEMBERS_DATA } from './rosterData';

export const INITIAL_MEMBERS: TeamMember[] = INITIAL_MEMBERS_DATA;

export const INITIAL_TASKS: Task[] = [
  // Tuesday, 15 September 2026
  {
    id: 'task-101',
    title: 'Commercial Project Site Inspection & Civil Structure Audit',
    scheduledDate: '2026-09-15',
    time: '05:00 PM',
    priority: 'HIGH',
    status: 'In Progress',
    progressPercent: 85,
    isJustAdded: true,
    department: 'Civil',
    project: 'Core Infrastructure',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-4',
        name: 'Ayaz',
        email: 'ayaz@urbangaon.com',
        department: 'Civil',
        designation: 'Civil Project Lead',
        avatar: 'AY',
        status: 'In Progress',
        remarks: 'Phase 2 structural beam stability checked and drone site scan completed.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    aiMetadata: {
      rawTranscript: 'Schedule site inspection today at 5:00 PM assigned to Ayaz on high priority',
      extractionLatencyMs: 94,
      source: 'voice_whisper',
      confidenceScore: 0.99
    },
    createdAt: '2026-09-15T09:12:00Z',
    updatedAt: '2026-09-15T09:12:18Z'
  },
  {
    id: 'task-102',
    title: 'Enterprise Client Proposal & Sales Strategy Review',
    scheduledDate: '2026-09-15',
    time: '03:30 PM',
    priority: 'URGENT',
    status: 'In Progress',
    progressPercent: 70,
    department: 'Sales',
    project: 'Enterprise Expansion',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-2',
        name: 'Yudhister Tiwari',
        email: 'yudhister.tiwari@urbangaon.com',
        department: 'Sales',
        designation: 'Sales Lead',
        avatar: 'YT',
        status: 'In Progress',
        remarks: 'Executive sales pitch deck finalized with ROI metrics and Q3 targets.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T08:30:00Z',
    updatedAt: '2026-09-15T11:45:00Z'
  },
  {
    id: 'task-103',
    title: 'Monthly Financial Audit & Vendor Invoice Settlement',
    scheduledDate: '2026-09-15',
    time: '02:00 PM',
    priority: 'HIGH',
    status: 'Queued',
    progressPercent: 40,
    department: 'Accounts',
    project: 'Operations & Facilities',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-6',
        name: 'Pratap',
        email: 'pratap@urbangaon.com',
        department: 'Accounts',
        designation: 'Accounts & Finance Lead',
        avatar: 'PR',
        status: 'Queued',
        remarks: 'Reconciliation of ledger entries pending final CEO endorsement.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: '2026-09-15T08:00:00Z'
  },
  {
    id: 'task-104',
    title: 'Vendor Contract Renewal & Regulatory Compliance Review',
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
        id: 'mem-5',
        name: 'Shyam Sunder Varma',
        email: 'shyamsunder.varma@urbangaon.com',
        department: 'Legal Team',
        designation: 'Legal Counsel & Compliance Head',
        avatar: 'SV',
        status: 'Done',
        completedAt: '2026-09-15T11:25:00Z',
        remarks: 'Clauses 8 and 14 amendments approved and digitally signed.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T07:45:00Z',
    updatedAt: '2026-09-15T11:25:00Z'
  },

  // Wednesday, 16 September 2026
  {
    id: 'task-105',
    title: 'Procurement Bidding & Raw Material Purchase Finalization',
    scheduledDate: '2026-09-16',
    time: '04:00 PM',
    priority: 'HIGH',
    status: 'In Progress',
    progressPercent: 60,
    department: 'Purchase Department',
    project: 'Core Infrastructure',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-7',
        name: 'Utkarsh Pandey',
        email: 'utkarsh.pandey@urbangaon.com',
        department: 'Purchase Department',
        designation: 'Purchase & Procurement Lead',
        avatar: 'UP',
        status: 'In Progress',
        remarks: 'Vendor quotation comparison matrix assembled for review.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T14:00:00Z',
    updatedAt: '2026-09-15T16:00:00Z'
  },
  {
    id: 'task-106',
    title: 'Senior Leadership Hiring & Talent Acquisition Drive',
    scheduledDate: '2026-09-16',
    time: '02:30 PM',
    priority: 'HIGH',
    status: 'Queued',
    progressPercent: 30,
    department: 'Talent Team',
    project: 'Enterprise Expansion',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-9',
        name: 'Dr. Rekha Pareek',
        email: 'rekha.pareek@urbangaon.com',
        department: 'Talent Team',
        designation: 'Talent Acquisition & HR Lead',
        avatar: 'RP',
        status: 'Queued',
        remarks: 'Candidate shortlisting completed for round 2 technical interviews.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T15:20:00Z',
    updatedAt: '2026-09-15T15:20:00Z'
  },
  {
    id: 'task-107',
    title: 'Administrative Desk Protocol & Office Operations Review',
    scheduledDate: '2026-09-16',
    time: '11:00 AM',
    priority: 'NORMAL',
    status: 'Done',
    progressPercent: 100,
    department: 'Admin Desk',
    project: 'Operations & Facilities',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-8',
        name: 'Kanchan Jain',
        email: 'kanchan.jain@urbangaon.com',
        department: 'Admin Desk',
        designation: 'Admin Desk Lead',
        avatar: 'KJ',
        status: 'Done',
        completedAt: '2026-09-16T10:55:00Z',
        remarks: 'Facilities checklist and visitor access log audit concluded.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T16:00:00Z',
    updatedAt: '2026-09-16T10:55:00Z'
  },

  // Thursday, 17 September 2026
  {
    id: 'task-108',
    title: 'Sales Territory Outreach & Lead Conversion Campaign',
    scheduledDate: '2026-09-17',
    time: '03:00 PM',
    priority: 'HIGH',
    status: 'In Progress',
    progressPercent: 50,
    department: 'Sales',
    project: 'Enterprise Expansion',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-3',
        name: 'Sanjay Choudhary',
        email: 'sanjay.choudhary@urbangaon.com',
        department: 'Sales',
        designation: 'Sales Executive',
        avatar: 'SC',
        status: 'In Progress',
        remarks: 'Top 20 enterprise leads contacted; demo scheduled for next week.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-16T09:00:00Z',
    updatedAt: '2026-09-16T09:00:00Z'
  },
  {
    id: 'task-109',
    title: 'Organizational Culture & Employee Performance Workshop',
    scheduledDate: '2026-09-17',
    time: '01:30 PM',
    priority: 'NORMAL',
    status: 'In Progress',
    progressPercent: 45,
    department: 'Talent Team',
    project: 'Enterprise Expansion',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-10',
        name: 'Dr. Sharmila Yadav',
        email: 'sharmila.yadav@urbangaon.com',
        department: 'Talent Team',
        designation: 'Talent Management & Development Lead',
        avatar: 'SY',
        status: 'In Progress',
        remarks: 'Modules 1 through 3 prepared; appraisal rubric aligned with CEO expectations.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-16T10:30:00Z',
    updatedAt: '2026-09-16T10:30:00Z'
  },
  {
    id: 'task-110',
    title: 'Onboarding Documentation & Employee Register Verification',
    scheduledDate: '2026-09-17',
    time: '10:00 AM',
    priority: 'NORMAL',
    status: 'Queued',
    progressPercent: 20,
    department: 'Talent Team',
    project: 'Operations & Facilities',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-11',
        name: 'Satya Singh',
        email: 'satya.singh@urbangaon.com',
        department: 'Talent Team',
        designation: 'Talent Operations Specialist',
        avatar: 'SS',
        status: 'Queued',
        remarks: 'New joinee dossier and compliance files in review.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-16T11:00:00Z',
    updatedAt: '2026-09-16T11:00:00Z'
  },
  {
    id: 'task-111',
    title: 'Enterprise Growth Targets & Revenue Projection Alignment',
    scheduledDate: '2026-09-15',
    time: '10:00 AM',
    priority: 'URGENT',
    status: 'Done',
    progressPercent: 100,
    department: 'Sales',
    project: 'Enterprise Expansion',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-2',
        name: 'Yudhister Tiwari',
        email: 'yudhister.tiwari@urbangaon.com',
        department: 'Sales',
        designation: 'Sales Lead',
        avatar: 'YT',
        status: 'Done',
        completedAt: '2026-09-15T09:50:00Z',
        remarks: 'Revenue milestones aligned with CEO directives and Q3 enterprise budget.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T07:00:00Z',
    updatedAt: '2026-09-15T09:50:00Z'
  },
  {
    id: 'task-112',
    title: 'Deploy Gemini Voice AI Engine & IT Infrastructure Security Audit',
    scheduledDate: '2026-09-15',
    time: '04:30 PM',
    priority: 'HIGH',
    status: 'In Progress',
    progressPercent: 90,
    department: 'AI & IT',
    project: 'Core Infrastructure',
    location: 'Bangalore HQ',
    assignees: [
      {
        id: 'mem-12',
        name: 'Aakash Das',
        email: 'aakash.das@urbangaon.com',
        department: 'AI & IT',
        designation: 'AI & IT Officer',
        avatar: 'AD',
        status: 'In Progress',
        remarks: 'Gemini NLP entity parser latency optimized to <180ms; zero-trust network config active.'
      }
    ],
    creator: {
      id: 'mem-1',
      name: 'Mr. Sukh Sagar Singh Bhati',
      email: 'ceo@urbangaon.com',
      role: 'SUPER_ADMIN'
    },
    createdAt: '2026-09-15T08:15:00Z',
    updatedAt: '2026-09-15T11:30:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-09-15T09:12:00Z',
    taskId: 'task-101',
    taskTitle: 'Commercial Project Site Inspection & Civil Structure Audit',
    action: 'CREATED',
    fieldChanged: 'Task Created via Voice AI',
    oldValue: 'None',
    newValue: 'Scheduled for 2026-09-15 at 05:00 PM (Ayaz - HIGH)',
    actor: 'Mr. Sukh Sagar Singh Bhati',
    actorRole: 'SUPER_ADMIN',
    ipAddress: '103.21.244.18',
    deviceInfo: 'Executive Console / Chrome 128',
    notes: 'Parsed accurately via Whisper Stream in 94ms'
  },
  {
    id: 'audit-002',
    timestamp: '2026-09-15T09:14:32Z',
    taskId: 'task-102',
    taskTitle: 'Enterprise Client Proposal & Sales Strategy Review',
    action: 'UPDATED',
    fieldChanged: 'Assignee Allocation',
    oldValue: 'Unassigned',
    newValue: 'Assigned to Yudhister Tiwari (Sales Lead)',
    actor: 'Mr. Sukh Sagar Singh Bhati',
    actorRole: 'SUPER_ADMIN',
    ipAddress: '103.21.244.18',
    deviceInfo: 'Executive Console / Chrome 128',
    notes: 'Sales directive dispatched'
  },
  {
    id: 'audit-003',
    timestamp: '2026-09-15T08:30:00Z',
    action: 'CONFIG_CHANGED',
    fieldChanged: 'Morning Reminder Digest Dispatch',
    oldValue: 'Pending',
    newValue: 'Dispatched to 11 active staff members',
    actor: 'System Automated Cron',
    actorRole: 'SUPER_ADMIN',
    ipAddress: '127.0.0.1',
    deviceInfo: 'Vercel Edge Cron Runner (08:30 AM)',
    notes: 'Personalized digest emails generated for 11 staff members'
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
      'Leadership & CEO Desk',
      'AI & IT',
      'Sales',
      'Civil',
      'Legal Team',
      'Accounts',
      'Purchase Department',
      'Admin Desk',
      'Talent Team'
    ],
    locations: [
      'Bangalore HQ',
      'Site Operations',
      'Delhi Hub',
      'Corporate Office',
      'Virtual / Remote'
    ]
  }
};
