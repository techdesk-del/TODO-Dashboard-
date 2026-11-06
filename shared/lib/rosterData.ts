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
    name: 'Mr. Sukh Sagar',
    email: 'ceo@urbangaon.com',
    aliases: ['sukhsagar.bhati@urbangaon.com', 'sukhsagar@urbangaon.com', 'ceo@urbangaon.com'],
    role: 'SUPER_ADMIN',
    department: 'Founder',
    designation: 'Founder',
    avatar: 'MS',
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
    id: 'mem-4',
    name: 'Ayaz Khilji',
    email: 'ayaz.khilji@urbangaon.com',
    aliases: ['ayaz@urbangaon.com', 'ayaz.civil@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Civil',
    designation: 'Civil Project Lead',
    avatar: 'AK',
    totalTasks: 3,
    completedTasks: 1,
    activeTasks: 2,
    overdueTasks: 0,
    velocity: 95.0,
    defaultPassword: '123',
  },
  {
    id: 'UG00010',
    name: 'Shyamsunder Varma',
    email: 'legal@urbangaon.com',
    aliases: ['shyamsunder.varma@urbangaon.com', 'shyamsunder@urbangaon.com'],
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
    email: 'accounts@urbangaon.com',
    aliases: ['pratap@urbangaon.com', 'pratap.accounts@urbangaon.com'],
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
    email: 'purchase@urbangaon.com',
    aliases: ['utkarsh.pandey@urbangaon.com', 'utkarsh@urbangaon.com'],
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
    email: 'frontdesk@urbangaon.com',
    aliases: ['kanchan.jain@urbangaon.com', 'kanchan@urbangaon.com'],
    role: 'EMPLOYEE',
    department: 'Front Desk',
    designation: 'Front Desk Specialist',
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
    email: 'pareekrekha471@gmail.com',
    aliases: ['rekha.pareek@urbangaon.com', 'dr.rekha.pareek@urbangaon.com', 'dr.rekha@urbangaon.com'],
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

  // Explicit check for CEO ID (mem-1), official CEO emails, CEO name, or CEO designation
  if (id === 'mem-1' || OFFICIAL_CEO_EMAILS.has(email)) {
    return true;
  }
  if (name.includes('sukh sagar') || name.includes('sukhsagar')) {
    return true;
  }
  if (designation === 'FOUNDER' || designation === 'CEO' || designation === 'CHIEF EXECUTIVE OFFICER (CEO)' || designation === 'CHIEF EXECUTIVE OFFICER') {
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

/**
 * Strictly validates whether the active user has access to view the Immutable Audit Trail.
 * Per Executive Governance: Strictly restricted to CEO Sir (Mr. Sukh Sagar Singh Bhati) and Aakash Das ONLY.
 * All regular employees, managers, and general administrators are strictly excluded.
 */
export function canViewAuditTrail(user?: { id?: string; email?: string; designation?: string; role?: string; name?: string } | null): boolean {
  if (!user) return false;
  return isStrictCeo(user);
}

/**
 * Canonical Master Departments recognized across the entire UrbanGaon enterprise system.
 */
export const CANONICAL_DEPARTMENTS = [
  'Civil',
  'Sales',
  'AI & IT',
  'Talent',
  'Purchase',
  'Legal',
  'Accounts',
  'Front Desk'
] as const;

export type CanonicalDepartment = typeof CANONICAL_DEPARTMENTS[number];

/**
 * Enterprise deterministic department resolver:
 * Analyzes any team member object, user object, email, id, role, or raw department string
 * and maps it in real time to the official Master Department.
 */
export function getCanonicalDepartment(
  input?: { department?: string; designation?: string; role?: string; email?: string; id?: string; name?: string } | string | null
): string {
  if (!input) return 'General Operations';

  let rawDept = '';
  let rawDesig = '';
  let rawEmail = '';
  let rawId = '';
  let rawRole = '';

  if (typeof input === 'string') {
    rawDept = input.toLowerCase().trim();
  } else {
    rawDept = (input.department || '').toLowerCase().trim();
    rawDesig = (input.designation || '').toLowerCase().trim();
    rawEmail = (input.email || '').toLowerCase().trim();
    rawId = (input.id || '').trim();
    rawRole = (input.role || '').toUpperCase().trim();
  }

  // 1. Legal & Land Documentation (Legal Team, Counsel, Compliance, Contracts, Shyamsunder Varma)
  if (
    rawDept.includes('legal') ||
    rawDept.includes('law') ||
    rawDept.includes('compliance') ||
    rawDept.includes('contract') ||
    rawDesig.includes('legal') ||
    rawDesig.includes('counsel') ||
    rawDesig.includes('compliance') ||
    rawEmail.includes('legal') ||
    rawEmail.includes('shyamsunder') ||
    rawId === 'UG00010' ||
    rawId === 'mem-5'
  ) {
    return 'Legal';
  }

  // 2. AI & IT Operations (Software, Systems, Cloud, Tech, Developers, Aakash Das)
  if (
    rawDept.includes('ai') ||
    rawDept.includes('tech') ||
    rawDept.includes('software') ||
    rawDept.includes('developer') ||
    rawDept.includes('engineer') ||
    rawDept.includes('it') ||
    rawDesig.includes('ai') ||
    rawDesig.includes('tech') ||
    rawDesig.includes('developer') ||
    rawDesig.includes('software') ||
    rawDesig.includes('engineer') ||
    rawEmail.includes('techdesk') ||
    rawEmail.includes('aakash') ||
    rawId === 'mem-12'
  ) {
    return 'AI & IT';
  }

  // 3. Purchase & Procurement (Purchase, Procurement, Vendor Management, Utkarsh, Ravindra)
  if (
    rawDept.includes('purchase') ||
    rawDept.includes('procure') ||
    rawDept.includes('vendor') ||
    rawDept.includes('supply') ||
    rawDesig.includes('purchase') ||
    rawDesig.includes('procurement') ||
    rawEmail.includes('purchase') ||
    rawEmail.includes('utkarsh') ||
    rawEmail.includes('ravindra') ||
    rawId === 'mem-7' ||
    rawId === 'EMP 2026'
  ) {
    return 'Purchase';
  }

  // 4. Talent & HR Operations (Talent Team, HR, Hiring, Rekha, Sharmila, Satya)
  if (
    rawDept.includes('talent') ||
    rawDept.includes('hr') ||
    rawDept.includes('people') ||
    rawDesig.includes('talent') ||
    rawDesig.includes('hr') ||
    rawEmail.includes('talent') ||
    rawEmail.includes('rekha') ||
    rawEmail.includes('sharmila') ||
    rawEmail.includes('satya') ||
    rawId === 'mem-9' ||
    rawId === 'mem-10' ||
    rawId === 'mem-11'
  ) {
    return 'Talent';
  }

  // 5. Sales & Business Acquisition (Sales, BD, Growth, Client Outreach, Yudhister, Sanjay)
  if (
    rawDept.includes('sale') ||
    rawDept.includes('client') ||
    rawDept.includes('market') ||
    rawDept.includes('growth') ||
    rawDesig.includes('sale') ||
    rawEmail.includes('sales') ||
    rawEmail.includes('yudhister') ||
    rawEmail.includes('sanjay') ||
    rawId === 'mem-2'
  ) {
    return 'Sales';
  }

  // 6. Civil & Site Infrastructure (Civil, Construction, Site, Architecture, Ayaz, Vishvendra)
  if (
    rawDept.includes('civil') ||
    rawDept.includes('site') ||
    rawDept.includes('const') ||
    rawDept.includes('infra') ||
    rawDesig.includes('civil') ||
    rawEmail.includes('civil') ||
    rawEmail.includes('ayaz') ||
    rawEmail.includes('vishvendra') ||
    rawId === 'mem-4' ||
    rawId === 'usr-1791978627510-808'
  ) {
    return 'Civil';
  }

  // 7. Accounts & Finance (Accounts, Finance, Tax, Billing, Audit, Pratap)
  if (
    rawDept.includes('account') ||
    rawDept.includes('finance') ||
    rawDept.includes('tax') ||
    rawDept.includes('audit') ||
    rawDept.includes('billing') ||
    rawDesig.includes('account') ||
    rawEmail.includes('account') ||
    rawEmail.includes('pratap') ||
    rawId === 'mem-6'
  ) {
    return 'Accounts';
  }

  // 8. Front Desk (Reception, Visitor, Front Desk Specialist, Kanchan)
  if (
    rawDept.includes('front') ||
    rawDept.includes('desk') ||
    rawDept.includes('reception') ||
    rawDesig.includes('front') ||
    rawDesig.includes('reception') ||
    rawEmail.includes('frontdesk') ||
    rawEmail.includes('kanchan') ||
    rawId === 'mem-8'
  ) {
    return 'Front Desk';
  }

  // CEO / Founder Fallback
  if (
    rawDept.includes('founder') ||
    rawDesig.includes('founder') ||
    rawEmail.includes('ceo') ||
    rawEmail.includes('sukhsagar') ||
    rawId === 'mem-1'
  ) {
    return 'Founder';
  }

  // Exact Match Fallback
  const exact = CANONICAL_DEPARTMENTS.find(d => d.toLowerCase() === rawDept);
  if (exact) return exact;

  return typeof input === 'string' && input.trim() ? input.trim() : 'General Operations';
}

/**
 * Resolves the canonical project corresponding to a department or employee role.
 */
export function getCanonicalProject(departmentOrUser?: any): string {
  const dept = getCanonicalDepartment(departmentOrUser);
  switch (dept) {
    case 'Legal':
      return 'Legal & Land Documentation';
    case 'AI & IT':
      return 'IT & Digital Systems';
    case 'Purchase':
      return 'Procurement & Materials';
    case 'Talent':
      return 'HR & Talent Operations';
    case 'Sales':
      return 'Sales & Client Acquisition';
    case 'Civil':
      return 'Site Development & Civil';
    case 'Accounts':
      return 'Finance & Accounts';
    case 'Front Desk':
      return 'Front Desk';
    case 'Founder':
      return 'General Operations';
    default:
      return 'General Operations';
  }
}




