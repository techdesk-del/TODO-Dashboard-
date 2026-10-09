import { TeamMember, Role } from '@/types';

export interface OfficialEmployeeConfig {
  id: string;
  name: string;
  email: string;
  aliases?: string[];
  role: Role;
  department: string;
  designation: string;
  avatar: string;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  velocity: number;
  defaultPassword?: string;
}

export const OFFICIAL_ROSTER: OfficialEmployeeConfig[] = [
  {
    id: 'mem-1',
    name: 'Mr. Sukh Sagar Singh Bhati',
    email: 'ceo@urbangaon.com',
    aliases: ['sukhsagar.bhati@urbangaon.com', 'sukhsagar@urbangaon.com', 'ceo@urbangaon.com'],
    role: 'SUPER_ADMIN',
    department: 'Leadership & CEO Desk',
    designation: 'CEO',
    avatar: 'SB',
    totalTasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    overdueTasks: 0,
    velocity: 100.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-12',
    name: 'Aakash Das',
    email: 'aakash.das@urbangaon.com',
    aliases: ['aakash@urbangaon.com', 'it@urbangaon.com', 'akash.das@urbangaon.com'],
    role: 'ADMIN',
    department: 'AI & IT Operations',
    designation: 'AI & IT Officer',
    avatar: 'AD',
    totalTasks: 4,
    completedTasks: 2,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 98.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-13',
    name: 'Tech Desk Support',
    email: 'teshdesk@urbangaon.com',
    aliases: ['techdesk@urbangaon.com', 'teshdesk@urbangaon.com', 'techdesk_support@urbangaon.com'],
    role: 'ADMIN',
    department: 'IT & Operations Support',
    designation: 'Tech Desk Officer',
    avatar: 'TD',
    totalTasks: 2,
    completedTasks: 1,
    activeTasks: 1,
    overdueTasks: 0,
    velocity: 99.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-2',
    name: 'Yudhister Tiwari',
    email: 'yudhister.tiwari@urbangaon.com',
    aliases: ['yudhister@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Sales',
    designation: 'Sales Lead',
    avatar: 'YT',
    totalTasks: 4,
    completedTasks: 1,
    activeTasks: 3,
    overdueTasks: 0,
    velocity: 94.5,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-3',
    name: 'Sanjay Choudhary',
    email: 'sanjay.choudhary@urbangaon.com',
    aliases: ['sanjay@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Sales',
    designation: 'Sales Executive',
    avatar: 'SC',
    totalTasks: 3,
    completedTasks: 1,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 92.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-4',
    name: 'Ayaz',
    email: 'ayaz@urbangaon.com',
    aliases: ['ayaz.civil@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Civil',
    designation: 'Civil Project Lead',
    avatar: 'AY',
    totalTasks: 3,
    completedTasks: 1,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 95.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-5',
    name: 'Shyam Sunder Varma',
    email: 'shyamsunder.varma@urbangaon.com',
    aliases: ['shyamsunder@urbangaon.com', 'legal@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Legal Team',
    designation: 'Legal Counsel & Compliance Head',
    avatar: 'SV',
    totalTasks: 2,
    completedTasks: 1,
    activeTasks: 1,
    overdueTasks: 0,
    velocity: 97.5,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-6',
    name: 'Pratap',
    email: 'pratap@urbangaon.com',
    aliases: ['pratap.accounts@urbangaon.com', 'accounts@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Accounts',
    designation: 'Accounts & Finance Lead',
    avatar: 'PR',
    totalTasks: 3,
    completedTasks: 2,
    activeTasks: 1,
    overdueTasks: 0,
    velocity: 98.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-7',
    name: 'Utkarsh Pandey',
    email: 'utkarsh.pandey@urbangaon.com',
    aliases: ['utkarsh@urbangaon.com', 'purchase@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Purchase Department',
    designation: 'Purchase & Procurement Lead',
    avatar: 'UP',
    totalTasks: 3,
    completedTasks: 1,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 93.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-8',
    name: 'Kanchan Jain',
    email: 'kanchan.jain@urbangaon.com',
    aliases: ['kanchan@urbangaon.com', 'admin@urbangaon.com'],
    role: 'ADMIN',
    department: 'Admin Desk',
    designation: 'Admin Desk Lead',
    avatar: 'KJ',
    totalTasks: 3,
    completedTasks: 2,
    activeTasks: 1,
    overdueTasks: 0,
    velocity: 96.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-9',
    name: 'Dr. Rekha Pareek',
    email: 'rekha.pareek@urbangaon.com',
    aliases: ['dr.rekha.pareek@urbangaon.com', 'dr.rekha@urbangaon.com'],
    role: 'MANAGER',
    department: 'Talent Team',
    designation: 'Talent Acquisition & HR Lead',
    avatar: 'RP',
    totalTasks: 3,
    completedTasks: 1,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 95.5,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-10',
    name: 'Dr. Sharmila Yadav',
    email: 'sharmila.yadav@urbangaon.com',
    aliases: ['dr.sharmila.yadav@urbangaon.com', 'dr.sharmila@urbangaon.com'],
    role: 'MANAGER',
    department: 'Talent Team',
    designation: 'Talent Management & Development Lead',
    avatar: 'SY',
    totalTasks: 2,
    completedTasks: 1,
    activeTasks: 1,
    overdueTasks: 0,
    velocity: 94.0,
    defaultPassword: 'password123',
  },
  {
    id: 'mem-11',
    name: 'Satya Singh',
    email: 'satya.singh@urbangaon.com',
    aliases: ['satya@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Talent Team',
    designation: 'Talent Operations Specialist',
    avatar: 'SS',
    totalTasks: 2,
    completedTasks: 1,
    activeTasks: 1,
    overdueTasks: 0,
    velocity: 92.5,
    defaultPassword: 'password123',
  },
];

export const INITIAL_MEMBERS_DATA: TeamMember[] = OFFICIAL_ROSTER.map((emp) => ({
  id: emp.id,
  name: emp.name,
  email: emp.email,
  role: emp.role,
  department: emp.department,
  designation: emp.designation,
  status: 'ACTIVE',
  avatar: emp.avatar,
  totalTasks: emp.totalTasks,
  completedTasks: emp.completedTasks,
  activeTasks: emp.activeTasks,
  overdueTasks: emp.overdueTasks,
  velocity: emp.velocity,
}));

/**
 * Finds an official employee by exact email or alias or partial match
 * Client and Server Safe (Zero Node dependencies)
 */
export function findOfficialEmployeeByEmail(inputEmail: string): OfficialEmployeeConfig | undefined {
  const clean = inputEmail.trim().toLowerCase();
  return OFFICIAL_ROSTER.find(
    (emp) =>
      emp.email.toLowerCase() === clean ||
      (emp.aliases && emp.aliases.some((alias) => alias.toLowerCase() === clean))
  );
}

/**
 * Validates whether a user object belongs strictly to the CEO (Mr. Sukh Sagar Singh Bhati)
 */
export function isCeoUser(user?: { email?: string; designation?: string; role?: string; name?: string } | null): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const designation = (user.designation || '').toUpperCase();
  const name = (user.name || '').toLowerCase();
  return (
    email === 'ceo@urbangaon.com' ||
    designation === 'CEO' ||
    designation === 'CHIEF EXECUTIVE OFFICER (CEO)' ||
    (name.includes('bhati') && (user.role === 'SUPER_ADMIN' || designation.includes('CEO')))
  );
}

