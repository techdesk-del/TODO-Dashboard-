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
    defaultPassword: '123',
  },
  {
    id: 'mem-12',
    name: 'Aakash Das',
    email: 'techdesk@urbangaon.com',
    aliases: ['aakash.das@urbangaon.com', 'aakash@urbangaon.com', 'it@urbangaon.com', 'akash.das@urbangaon.com'],
    role: 'SUPER_ADMIN',
    department: 'AI & IT Operations',
    designation: 'AI & IT Officer / Super Admin',
    avatar: 'AD',
    totalTasks: 4,
    completedTasks: 2,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 98.0,
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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
    defaultPassword: '123',
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

export const OFFICIAL_AAKASH_EMAILS = new Set([
  'techdesk@urbangaon.com',
  'aakash.das@urbangaon.com',
  'aakash@urbangaon.com',
  'it@urbangaon.com',
  'akash.das@urbangaon.com',
]);

export const OFFICIAL_CEO_EMAILS = new Set([
  'ceo@urbangaon.com',
  'sukhsagar.bhati@urbangaon.com',
  'sukhsagar@urbangaon.com',
]);

/**
 * Validates whether the user is AI & IT Officer / Super Admin Aakash Das (mem-12).
 * Uses exact email and ID matching to prevent unauthorized privilege escalation.
 */
export function isAakashUser(user?: { id?: string; email?: string; name?: string } | null): boolean {
  if (!user) return false;
  const id = (user.id || '').trim();
  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();

  return id === 'mem-12' || OFFICIAL_AAKASH_EMAILS.has(email) || (name === 'aakash das' && OFFICIAL_AAKASH_EMAILS.has(email));
}

/**
 * Strictly checks whether the active user is the Chief Executive Officer (CEO Mr. Sukh Sagar Singh Bhati).
 * Per company executive policy: The CEO exclusively oversees and monitors all employees' deliverables across the company.
 * Direct task creation UI and systems are disabled for the CEO account.
 */
export function isStrictCeo(user?: { id?: string; email?: string; designation?: string; role?: string; name?: string } | null): boolean {
  if (!user) return false;
  const id = (user.id || '').trim();
  const email = (user.email || '').toLowerCase().trim();
  const designation = (user.designation || '').toUpperCase().trim();
  const name = (user.name || '').toLowerCase().trim();

  // Explicit check for CEO ID (mem-1), official CEO emails, or CEO designation
  if (id === 'mem-1' || OFFICIAL_CEO_EMAILS.has(email)) {
    return true;
  }
  if (designation === 'CEO' || designation === 'CHIEF EXECUTIVE OFFICER (CEO)' || designation === 'CHIEF EXECUTIVE OFFICER') {
    return true;
  }
  return false;
}

/**
 * Validates whether a user object has Executive / All-Access privileges (CEO Mr. Sukh Sagar Singh Bhati & Aakash Das).
 */
export function isCeoUser(user?: { id?: string; email?: string; designation?: string; role?: string; name?: string } | null): boolean {
  if (!user) return false;
  if (isAakashUser(user)) return true;
  if (isStrictCeo(user)) return true;
  if (user.role === 'SUPER_ADMIN' && (isAakashUser(user) || isStrictCeo(user))) return true;
  return false;
}


/**
 * Checks whether user belongs to Talent / HR team or has Talent Admin privileges.
 */
export function isTalentUser(user?: { email?: string; department?: string; designation?: string; role?: string; name?: string } | null): boolean {
  if (!user) return false;
  const dept = (user.department || '').toLowerCase();
  const desig = (user.designation || '').toLowerCase();
  const role = (user.role || '').toUpperCase();
  const email = (user.email || '').toLowerCase();
  return (
    dept.includes('talent') ||
    dept.includes('hr') ||
    desig.includes('talent') ||
    desig.includes('hr') ||
    role === 'ADMIN' ||
    email.includes('talent') ||
    email.includes('hr')
  );
}

/**
 * Validates whether user has access to view the 28 Verified Technical Workflows Manual.
 * Restricted strictly to CEO (Mr. Sukh Sagar Singh Bhati / Super Admin / Aakash) and the Talent / HR Team.
 */
export function canAccessWorkflows(user?: { email?: string; department?: string; designation?: string; role?: string; name?: string } | null): boolean {
  if (!user) return false;
  return isCeoUser(user) || isTalentUser(user);
}

/**
 * Validates whether user has access to the Admin & HR Portal.
 * Granted to CEO (Mr. Sukh Sagar Singh Bhati / Super Admin / Aakash), ADMIN role, and ALL members/employees of the Talent / HR Team.
 */
export function canAccessAdminHr(user?: { email?: string; department?: string; designation?: string; role?: string; name?: string } | null): boolean {
  if (!user) return false;
  return isCeoUser(user) || isTalentUser(user) || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
}



