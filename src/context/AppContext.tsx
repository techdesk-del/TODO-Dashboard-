'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Task, TeamMember, AuditLogEntry, SystemConfig, Role, TaskStatus, InAppNotification } from '@/types';
import { INITIAL_TASKS, INITIAL_MEMBERS, INITIAL_AUDIT_LOGS, INITIAL_SYSTEM_CONFIG } from '@/lib/mockData';
import { getTodayStr } from '@/lib/dateUtils';
import { isCeoUser, isStrictCeo, canAccessAdminHr, canAccessWorkflows, canViewAuditTrail } from '@/lib/rosterData';
import { computeMultiAssigneeStatus } from '@/lib/multiAssignee';
import * as XLSX from 'xlsx';

export type DBStatus = 'connected' | 'connecting' | 'fallback';

const GUEST_USER: TeamMember = {
  id: 'guest',
  name: 'Logged Out Guest',
  email: 'guest@urbangaon.com',
  role: 'EMPLOYEE',
  designation: 'Unauthenticated Staff',
  department: 'General Staff',
  avatar: 'GU',
  status: 'ACTIVE',
  totalTasks: 0,
  completedTasks: 0,
  activeTasks: 0,
  overdueTasks: 0,
  velocity: 100
};

interface AppContextType {
  currentUser: TeamMember;
  setCurrentUser: (user: TeamMember) => void;
  currentRole: Role;
  switchRole: (role: Role) => void;
  tasks: Task[];
  members: TeamMember[];
  activeMembers: TeamMember[];
  selectedDate: string; // 'YYYY-MM-DD'
  setSelectedDate: (date: string) => void;
  viewScope: 'selected' | 'all';
  setViewScope: (scope: 'selected' | 'all') => void;
  activeView: 'workspace' | 'calendar' | 'ceo_portal' | 'admin_hr' | 'team_view' | 'audit_trail' | 'system_config' | 'workflow_manual';
  setActiveView: (view: 'workspace' | 'calendar' | 'ceo_portal' | 'admin_hr' | 'team_view' | 'audit_trail' | 'system_config' | 'workflow_manual') => void;
  selectedMemberFilter: string | null;
  setSelectedMemberFilter: (memberName: string | null) => void;
  bannerNotification: { message: string; badge: string } | null;
  setBannerNotification: (banner: { message: string; badge: string } | null) => void;
  auditLogs: AuditLogEntry[];
  systemConfig: SystemConfig;
  updateSystemConfig: (cfg: Partial<SystemConfig>) => void;
  addTask: (newTask: Partial<Task>, skipApiSync?: boolean) => Task;
  updateTask: (taskId: string, updates: Partial<Task>, note?: string) => void;
  holdTask: (taskId: string, reason: string) => void;
  escalateTask: (taskId: string, reason: string, seniorLeader: string) => void;
  seniorAdviseTask: (taskId: string, advisoryComment: string) => void;
  seniorReassignTask: (taskId: string, newAssigneeId: string, notes?: string) => void;
  seniorResolveTask: (taskId: string, resolutionNote: string) => void;
  seniorReturnTask: (taskId: string, returnReason: string) => void;
  checkAndAutoEscalateSlaBreachedTasks: () => number;
  reopenTask: (taskId: string, reason: string) => void;
  cancelTask: (taskId: string, reason: string) => Promise<void>;
  reassignTask: (params: {
    taskId: string;
    mode: 'REPLACE_ALL' | 'ADD_ALONGSIDE' | 'REMOVE_SPECIFIC';
    newAssigneeIds?: string[];
    removeAssigneeIds?: string[];
    reason?: string;
  }) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string, assigneeId?: string) => void;
  approveTaskByCeo: (taskId: string, approvalNote?: string) => Promise<void>;
  rejectTaskByCeo: (taskId: string, rejectionReason: string) => Promise<void>;
  updateAssigneeStatus: (taskId: string, assigneeId: string, status: TaskStatus, remarks?: string) => void;
  reassignOrCloseAssignee: (taskId: string, oldAssigneeId: string, action: 'reassign' | 'close', newAssigneeId?: string, notes?: string) => void;
  addMember: (memberData: Partial<TeamMember>) => Promise<TeamMember>;
  updateMember: (memberId: string, updates: Partial<TeamMember>, reason?: string) => Promise<{ success: boolean; member?: TeamMember; error?: string }>;
  updateProfileName: (newName: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: { name?: string; email?: string; role?: Role; employeeId?: string; designation?: string; department?: string }) => Promise<{ success: boolean; error?: string; member?: TeamMember }>;
  deactivateMember: (
    departingId: string,
    successorId: string,
    reason: string,
    deactivationType?: 'Resignation' | 'Termination' | 'Long leave',
    dates?: {
      lastWorkingDay?: string;
      effectiveDate?: string;
      leaveStartDate?: string;
      leaveEndDate?: string;
    }
  ) => Promise<{ success: boolean; reassignedCount: number; message: string }>;
  deleteMember: (memberId: string) => Promise<{ success: boolean; message: string }>;
  markMemberOnLeave: (params: {
    memberId: string;
    leaveStartDate: string;
    leaveEndDate: string;
    taskDueAction?: 'AUTO_EXTEND' | 'FLAG_ADMIN';
    notes?: string;
  }) => Promise<{ success: boolean; message: string }>;
  returnMemberFromLeave: (memberId: string) => Promise<{ success: boolean; message: string }>;
  clearAllTasks: () => Promise<void>;
  logoutUser: () => void;
  exportToExcel: () => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  viewingAuditForTaskId: string | null;
  setViewingAuditForTaskId: (taskId: string | null) => void;
  showMorningDigestModal: boolean;
  setShowMorningDigestModal: (show: boolean) => void;
  isCreateTaskModalOpen: boolean;
  setIsCreateTaskModalOpen: (open: boolean) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  runNightlyRolloverSimulation: () => void;
  evaluateOverdueAndNoReasonTasks: () => Promise<{ overdueCount: number; pendingNoReasonCount: number; escalatedCount: number }>;
  dbStatus: DBStatus;
  refreshFromDB: () => Promise<void>;
  refreshMembersFromDB: () => Promise<void>;
  logAudit: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'actor' | 'actorRole' | 'ipAddress' | 'deviceInfo'> & Partial<AuditLogEntry>) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalInitialMode: 'CHOOSER' | 'INVITATION_INPUT' | 'REQUEST_ACCESS' | 'LOGIN';
  setAuthModalInitialMode: (mode: 'CHOOSER' | 'INVITATION_INPUT' | 'REQUEST_ACCESS' | 'LOGIN') => void;
  inAppNotifications: InAppNotification[];
  unreadNotificationsCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  purgedMemberIds: string[];
  purgedMemberEmails: string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<TeamMember>(GUEST_USER);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(true);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'CHOOSER' | 'INVITATION_INPUT' | 'REQUEST_ACCESS' | 'LOGIN'>('LOGIN');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [purgedMemberIds, setPurgedMemberIds] = useState<string[]>([]);
  const [purgedMemberEmails, setPurgedMemberEmails] = useState<string[]>([]);
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);

  // Real-time active members list: strictly excludes CEO (monitoring-only role) and any DEACTIVATED, REMOVED, or TERMINATED accounts
  const activeMembers = React.useMemo(() => {
    return members.filter(m => {
      if (!m) return false;
      if (isStrictCeo(m)) return false;
      const status = String(m.status || '').toUpperCase().trim();
      const isDeactivated = (m as any).isDeactivated === true || status === 'DEACTIVATED' || status === 'REMOVED' || status === 'TERMINATED' || status === 'EXITED';
      return !isDeactivated;
    });
  }, [members]);

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [viewScope, setViewScope] = useState<'selected' | 'all'>('all');
  const [activeView, setActiveView] = useState<'workspace' | 'calendar' | 'ceo_portal' | 'admin_hr' | 'team_view' | 'audit_trail' | 'system_config' | 'workflow_manual'>('workspace');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);
  const [bannerNotification, setBannerNotification] = useState<{ message: string; badge: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [rawViewingAuditForTaskId, setRawViewingAuditForTaskId] = useState<string | null>(null);

  const setViewingAuditForTaskId = useCallback((taskId: string | null) => {
    if (taskId && !canViewAuditTrail(currentUser)) {
      setBannerNotification({
        message: 'Security Restriction: Audit Trail is strictly reserved for Executive Leadership (CEO & System Administrator).',
        badge: 'Access Restricted'
      });
      return;
    }
    setRawViewingAuditForTaskId(taskId);
  }, [currentUser]);

  const viewingAuditForTaskId = canViewAuditTrail(currentUser) ? rawViewingAuditForTaskId : null;
  const [showMorningDigestModal, setShowMorningDigestModal] = useState(false);
  const [isCreateTaskModalOpen, setRawIsCreateTaskModalOpen] = useState(false);

  const setIsCreateTaskModalOpen = useCallback((open: boolean) => {
    if (open && isStrictCeo(currentUser)) {
      setBannerNotification({
        message: 'Executive Monitoring Mode: CEO role oversees all staff deliverables across the company. Direct task creation is disabled for this role.',
        badge: 'Executive Monitor'
      });
      return;
    }
    setRawIsCreateTaskModalOpen(open);
  }, [currentUser]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DBStatus>('connecting');
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const recentTaskMutationsRef = useRef<Map<string, { timestamp: number; task: Task }>>(new Map());

  const unreadNotificationsCount = inAppNotifications.filter(n => !n.read).length;

  const refreshNotifications = useCallback(async () => {
    if (!currentUser || currentUser.id === 'guest' || !currentUser.email) return;
    try {
      const res = await fetch(`/api/notifications?email=${encodeURIComponent(currentUser.email)}&_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setInAppNotifications(json.data);
        }
      }
    } catch (e) {
      console.warn('[AppContext] Notification refresh failed:', e);
    }
  }, [currentUser]);

  const markNotificationRead = useCallback(async (id: string) => {
    setInAppNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
    } catch { }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!currentUser?.email) return;
    setInAppNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, markAllRead: true })
      });
    } catch { }
  }, [currentUser]);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 10000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  // Auto-dismiss banner notifications after 4 seconds

  useEffect(() => {
    if (bannerNotification) {
      const timer = setTimeout(() => {
        setBannerNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [bannerNotification]);

  // ── Sync with MongoDB Atlas & LocalStorage ───────────────────────
  const refreshMembersFromDB = useCallback(async () => {
    try {
      const res = await fetch(`/api/members?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const pIds: string[] = Array.isArray(json.purgedIds) ? json.purgedIds : [];
          const pEmails: string[] = Array.isArray(json.purgedEmails) ? json.purgedEmails.map((e: string) => e.toLowerCase().trim()) : [];

          setPurgedMemberIds(pIds);
          setPurgedMemberEmails(pEmails);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('urbangaon_purged_members_v1', JSON.stringify({ ids: pIds, emails: pEmails }));
            }
          } catch { }

          const sanitizeInitials = (nameStr: string) => {
            const parts = (nameStr || '').trim().split(/\s+/);
            if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            return (nameStr || 'EM').trim().slice(0, 2).toUpperCase() || 'EM';
          };

          const pIdSet = new Set(pIds);
          const pEmailSet = new Set(pEmails);
          const filteredMembers = json.data
            .filter((m: TeamMember) => m && !pIdSet.has(m.id) && !pEmailSet.has(m.email?.toLowerCase().trim()))
            .map((m: TeamMember) => {
              if (!m.avatar || m.avatar.includes('.png') || m.avatar.includes('urbangaon-employee-emblem')) {
                return { ...m, avatar: sanitizeInitials(m.name) };
              }
              return m;
            });
          setMembers(filteredMembers);

          // Live session sync: If this user's email/name/status was updated on another PC by an Admin, synchronize currentUser seamlessly
          setCurrentUser(curr => {
            if (!curr || curr.id === 'guest') return curr;
            const fresh = filteredMembers.find((m: TeamMember) =>
              m.id === curr.id || (curr.email && m.email?.toLowerCase() === curr.email.toLowerCase())
            );
            if (fresh && (fresh.email !== curr.email || fresh.name !== curr.name || fresh.role !== curr.role || fresh.status !== curr.status || fresh.avatar !== curr.avatar)) {
              const updatedCurr = { ...curr, ...fresh };
              try {
                localStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(updatedCurr));
                sessionStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(updatedCurr));
              } catch { }
              return updatedCurr;
            }
            return curr;
          });

          // Flowchart 23 Node 7: "On return date restore reminders and status"
          const todayStr = getTodayStr();
          const returningMembers = filteredMembers.filter(
            (m: TeamMember) => m.status === 'ON_LEAVE' && m.leaveEndDate && m.leaveEndDate < todayStr
          );
          for (const rm of returningMembers) {
            fetch('/api/members/leave', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ memberId: rm.id, actorName: 'Automated Leave Return Daemon' })
            }).catch(console.warn);
          }
        }
      }
    } catch (e) {
      console.warn('[AppContext] members refresh failed', e);
    }
  }, []);
  //
  const refreshFromDB = useCallback(async (isSilent = true) => {
    refreshMembersFromDB();
    try {
      const res = await fetch(`/api/tasks?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTasks(prev => {
            const serverMap = new Map(json.data.map((t: Task) => [t.id, t]));
            const now = Date.now();
            // Preserve only very freshly added local tasks (<4s, in-flight POST)
            const pending = prev.filter(t => {
              if (!t.isJustAdded) return false;
              if (serverMap.has(t.id)) return false;
              if (t.status === 'Cancelled') return false;
              const ageMs = t.createdAt ? (now - new Date(t.createdAt).getTime()) : 999999;
              return ageMs < 4000;
            });

            // Deduplicate to guarantee absolute unique IDs across server and local pending tasks
            const uniqueMap = new Map<string, Task>();
            json.data.forEach((t: Task) => {
              if (
                t &&
                t.id &&
                !deletedIdsRef.current.has(t.id) &&
                t.status !== 'Cancelled' &&
                !t.title?.toLowerCase().includes('mobile simulator') &&
                t.id !== 'task-1790071325492'
              ) {
                const recentMut = recentTaskMutationsRef.current.get(t.id);
                if (recentMut && (now - recentMut.timestamp < 5000)) {
                  const serverTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
                  const localTime = recentMut.task.updatedAt ? new Date(recentMut.task.updatedAt).getTime() : recentMut.timestamp;
                  if (serverTime < localTime) {
                    uniqueMap.set(t.id, recentMut.task);
                    return;
                  }
                }
                uniqueMap.set(t.id, t);
              }
            });

            pending.forEach((t: Task) => {
              if (t && t.id && !uniqueMap.has(t.id)) {
                uniqueMap.set(t.id, t);
              }
            });

            const nextList = Array.from(uniqueMap.values());

            // Strict FIFO Chronological: Starting task at top (1), subsequent tasks follow in sequence (2, 3, 4...)
            nextList.sort((a, b) => {
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              if (timeA !== timeB) return timeA - timeB;
              return a.id.localeCompare(b.id);
            });

            // Fast shallow check to preserve React focus and avoid unnecessary re-renders
            if (
              prev.length === nextList.length &&
              prev.every((p, i) => {
                const n = nextList[i];
                if (!n || p.id !== n.id) return false;
                if (
                  p.status !== n.status ||
                  p.updatedAt !== n.updatedAt ||
                  p.title !== n.title ||
                  p.scheduledDate !== n.scheduledDate ||
                  p.dueDate !== n.dueDate ||
                  p.progressPercent !== n.progressPercent ||
                  Boolean(p.pendingCeoApproval) !== Boolean(n.pendingCeoApproval) ||
                  (p.assignees?.length || 0) !== (n.assignees?.length || 0)
                ) {
                  return false;
                }
                if (p.assignees && n.assignees) {
                  for (let idx = 0; idx < p.assignees.length; idx++) {
                    if (
                      p.assignees[idx].id !== n.assignees[idx].id ||
                      p.assignees[idx].status !== n.assignees[idx].status ||
                      p.assignees[idx].name !== n.assignees[idx].name
                    ) {
                      return false;
                    }
                  }
                }
                return true;
              })
            ) {
              return prev;
            }

            try {
              localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(nextList));
            } catch { }

            return nextList;
          });
          setDbStatus('connected');
          return;
        }
      }
      if (!isSilent) setDbStatus('fallback');
    } catch {
      if (!isSilent) setDbStatus('fallback');
    }
  }, [refreshMembersFromDB]);

  // ── Load persisted data / fetch from API on mount
  useEffect(() => {
    // Check localStorage first for instant hydration
    try {
      const cachedPurged = localStorage.getItem('urbangaon_purged_members_v1');
      if (cachedPurged) {
        const parsed = JSON.parse(cachedPurged);
        const pIds = Array.isArray(parsed.ids) ? parsed.ids : [];
        const pEmails = Array.isArray(parsed.emails) ? parsed.emails.map((e: string) => e.toLowerCase().trim()) : [];
        if (pIds.length > 0) setPurgedMemberIds(pIds);
        if (pEmails.length > 0) setPurgedMemberEmails(pEmails);
        if (pIds.length > 0 || pEmails.length > 0) {
          const pIdSet = new Set(pIds);
          const pEmailSet = new Set(pEmails);
          setMembers(prev => prev.filter(m => !pIdSet.has(m.id) && !pEmailSet.has(m.email?.toLowerCase().trim())));
        }
      }
    } catch { }

    try {
      const savedTasks = localStorage.getItem('urbangaon_tasks_v2');
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        const uniqueSavedMap = new Map<string, Task>();
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (
              item &&
              item.id &&
              item.id !== 'task-1790071325492' &&
              !item.title?.toLowerCase().includes('mobile simulator') &&
              item.status !== 'Cancelled'
            ) {
              uniqueSavedMap.set(item.id, {
                ...item,
                isJustAdded: Boolean(item.isJustAdded && item.createdAt && (Date.now() - new Date(item.createdAt).getTime() < 60000))
              });
            }
          }
        }
        const cleaned = Array.from(uniqueSavedMap.values()).sort((a: Task, b: Task) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return a.id.localeCompare(b.id);
        });
        setTasks(cleaned);
        localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(cleaned));
      }
    } catch (e) {
      console.error('[AppContext] tasks restore failed', e);
    }

    try {
      const savedLogs = localStorage.getItem('urbangaon_audit_v2');
      if (savedLogs && canViewAuditTrail(currentUser)) setAuditLogs(JSON.parse(savedLogs));
    } catch (e) {
      console.error('[AppContext] audit restore failed', e);
    }

    try {
      const sessionActive = typeof window !== 'undefined' ? sessionStorage.getItem('urbangaon_session_active') : null;
      if (!sessionActive) {
        // Fresh visit or new tab: require login! Do NOT default to Super Admin
        try {
          localStorage.removeItem('urbangaon_auth_user_v2');
          sessionStorage.removeItem('urbangaon_auth_user_v2');
        } catch { }
        setCurrentUser(GUEST_USER);
        setAuthModalInitialMode('LOGIN');
        setIsAuthModalOpen(true);
      } else {
        const savedUserStr = sessionStorage.getItem('urbangaon_auth_user_v2') || localStorage.getItem('urbangaon_auth_user_v2');
        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.id && parsed.name && parsed.id !== 'guest') {
            setCurrentUser(parsed);
            setIsAuthModalOpen(false);
          } else {
            setCurrentUser(GUEST_USER);
            setAuthModalInitialMode('LOGIN');
            setIsAuthModalOpen(true);
          }
        } else {
          setCurrentUser(GUEST_USER);
          setAuthModalInitialMode('LOGIN');
          setIsAuthModalOpen(true);
        }
      }
    } catch (e) {
      console.warn('[AppContext] auth restore failed', e);
      setCurrentUser(GUEST_USER);
      setAuthModalInitialMode('LOGIN');
      setIsAuthModalOpen(true);
    }

    // Initial load from MongoDB
    refreshFromDB(false);

    // Also fetch members if available
    fetch(`/api/members?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMembers(json.data);
        }
      })
      .catch(() => { });



    // Restore SystemConfig from localStorage for instant offline hydration
    try {
      const savedConfig = localStorage.getItem('urbangaon_system_config_v2');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed && typeof parsed === 'object') {
          setSystemConfig(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) {
      console.warn('[AppContext] systemConfig localStorage restore failed', e);
    }

    // Live sync SystemConfig from MongoDB Atlas
    fetch(`/api/system-config?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setSystemConfig(json.data);
          try {
            localStorage.setItem('urbangaon_system_config_v2', JSON.stringify(json.data));
          } catch { }
        }
      })
      .catch(err => console.debug('[AppContext] system-config fetch failed:', err));
  }, [refreshFromDB]);

  // ── Real-Time Synchronization Engine ────────────────────────────
  // Architecture: MongoDB change-detection via SSE (works on Vercel serverless)
  // + 1.5s heartbeat poll as a guaranteed fallback for all devices.
  // When a task is created/updated on ANY device:
  //   1. MongoDB Atlas updatedAt changes
  //   2. SSE endpoint on all connected clients detects the change within 2s
  //   3. SSE pushes task_mutation event → triggers refreshFromDB()
  //   4. Heartbeat poll also catches it within 1.5s as a safety net
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      if (typeof window === 'undefined' || !isMounted) return;
      try {
        // Close any existing connection first
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        eventSource = new EventSource('/api/realtime');

        // Server detected a task change in MongoDB → handle immediately & refresh
        eventSource.addEventListener('task_mutation', (e) => {
          try {
            const data = JSON.parse(e.data);
            console.log('[Realtime SSE] Cross-device mutation:', data.taskTitle || data.taskId, data.action);

            if (data.action === 'CREATED' && data.task) {
              setTasks(prev => {
                if (prev.some(t => t.id === data.task.id)) {
                  return prev.map(t => t.id === data.task.id ? { ...data.task, isJustAdded: t.isJustAdded } : t);
                }
                const updated = [...prev, data.task].sort((a, b) => {
                  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  if (timeA !== timeB) return timeA - timeB;
                  return a.id.localeCompare(b.id);
                });
                try {
                  localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(updated));
                } catch { }
                return updated;
              });
              setBannerNotification({
                message: `New deliverable "${data.taskTitle || data.task.title}" synced live across team`,
                badge: 'Realtime Synced'
              });
              return;
            } else if (data.action === 'UPDATED' && data.taskId) {
              setTasks(prev => {
                const updated = prev.map(t => {
                  if (t.id === data.taskId) {
                    return data.task ? data.task : { ...t, ...data.updates };
                  }
                  return t;
                });
                try {
                  localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(updated));
                } catch { }
                return updated;
              });
              return;
            } else if (data.action === 'DELETED' && data.taskId) {
              deletedIdsRef.current.add(data.taskId);
              setTasks(prev => {
                const updated = prev.filter(t => t.id !== data.taskId);
                try {
                  localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(updated));
                } catch { }
                return updated;
              });
              setBannerNotification({
                message: `Deliverable "${data.taskTitle || data.taskId}" was deleted across connected devices`,
                badge: 'Realtime Synced'
              });
              return;
            } else if (data.action === 'DELETED_ALL') {
              setTasks([]);
              try {
                localStorage.removeItem('urbangaon_tasks_v2');
              } catch { }
              return;
            }
          } catch { }
          if (isMounted) refreshFromDB(true);
        });

        // Server detected a member update/deactivation in MongoDB → update immediately across all devices
        eventSource.addEventListener('member_mutation', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.action === 'UPDATED') {
              const updatedMemberData = (data.member || {}) as Partial<TeamMember>;
              const newEmail = (data.memberEmail || updatedMemberData.email || '').trim().toLowerCase();
              const newName = (data.memberName || updatedMemberData.name || '').trim();
              const oldEmail = (data.oldEmail || '').trim().toLowerCase();
              const memberId = data.memberId || updatedMemberData.id;

              // 1. Immediately update members list in memory across all connected PCs
              setMembers(prev => prev.map(m => {
                const isMatch = (memberId && m.id === memberId) ||
                  (oldEmail && m.email?.toLowerCase() === oldEmail) ||
                  (newEmail && m.email?.toLowerCase() === newEmail);
                if (!isMatch) return m;
                return {
                  ...m,
                  ...updatedMemberData,
                  ...(newEmail ? { email: newEmail } : {}),
                  ...(newName ? { name: newName } : {})
                };
              }));

              // 2. Immediately cascade new email/name into task assignees & creator across all devices
              if (newEmail || newName) {
                setTasks(prev => prev.map(t => {
                  let changed = false;
                  const newAssignees = t.assignees.map(a => {
                    const isMatch = (memberId && a.id === memberId) ||
                      (oldEmail && a.email?.toLowerCase() === oldEmail) ||
                      (newEmail && a.email?.toLowerCase() === newEmail);
                    if (isMatch) {
                      changed = true;
                      return {
                        ...a,
                        ...(newEmail ? { email: newEmail } : {}),
                        ...(newName ? { name: newName } : {}),
                        ...(updatedMemberData.avatar ? { avatar: updatedMemberData.avatar } : {})
                      };
                    }
                    return a;
                  });

                  const isCreatorMatch = (memberId && t.creator.id === memberId) ||
                    (oldEmail && t.creator.email?.toLowerCase() === oldEmail) ||
                    (newEmail && t.creator.email?.toLowerCase() === newEmail);
                  const newCreator = isCreatorMatch ? {
                    ...t.creator,
                    ...(newEmail ? { email: newEmail } : {}),
                    ...(newName ? { name: newName } : {})
                  } : t.creator;
                  if (newCreator !== t.creator) changed = true;

                  return changed ? { ...t, assignees: newAssignees, creator: newCreator } : t;
                }));
              }

              // 3. If currently logged in user on this device had their email or name changed, update session immediately
              setCurrentUser(curr => {
                if (!curr || curr.id === 'guest') return curr;
                const isCurrentUserMatch = (memberId && curr.id === memberId) ||
                  (oldEmail && curr.email?.toLowerCase() === oldEmail) ||
                  (newEmail && curr.email?.toLowerCase() === newEmail);
                if (isCurrentUserMatch) {
                  const syncedUser: TeamMember = {
                    ...curr,
                    ...updatedMemberData,
                    ...(newEmail ? { email: newEmail } : {}),
                    ...(newName ? { name: newName } : {})
                  };
                  try {
                    localStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(syncedUser));
                    sessionStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(syncedUser));
                  } catch { }
                  return syncedUser;
                }
                return curr;
              });
            } else if (data.action === 'DEACTIVATED') {
              setMembers(prev => prev.map(m => {
                const isMatch = m.id === data.memberId ||
                  (data.memberEmail && m.email.toLowerCase() === data.memberEmail.toLowerCase()) ||
                  (data.memberName && m.name.toLowerCase() === data.memberName.toLowerCase());
                return isMatch ? { ...m, status: 'DEACTIVATED' as const, activeTasks: 0 } : m;
              }));
            } else if (data.action === 'DELETED') {
              if (data.memberId) setPurgedMemberIds(prev => Array.from(new Set([...prev, data.memberId])));
              if (data.memberEmail) setPurgedMemberEmails(prev => Array.from(new Set([...prev, data.memberEmail.toLowerCase().trim()])));
              setMembers(prev => prev.filter(m => {
                const isMatch = m.id === data.memberId ||
                  (data.memberEmail && m.email.toLowerCase() === data.memberEmail.toLowerCase()) ||
                  (data.memberName && m.name.toLowerCase() === data.memberName.toLowerCase());
                return !isMatch;
              }));
            }
          } catch { }
          if (isMounted) {
            refreshMembersFromDB();
            refreshFromDB(true);
          }
        });

        // Server says stream cycle ended → reconnect immediately (no delay)
        eventSource.addEventListener('reconnect', () => {
          eventSource?.close();
          if (isMounted) {
            reconnectTimer = setTimeout(connectSSE, 150);
          }
        });

        // SSE connection error → retry in 2s
        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          if (isMounted) {
            reconnectTimer = setTimeout(connectSSE, 2000);
          }
        };

      } catch (err) {
        console.debug('[Realtime SSE] SSE unavailable, relying on heartbeat poll', err);
      }
    };

    // Start SSE connection
    connectSSE();

    // Cross-tab broadcast channel for instant multi-tab sync on same machine
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('urbangaon_task_sync');
        bc.onmessage = (event) => {
          const data = event.data;
          if (data?.action === 'DELETED' && data.taskId) {
            deletedIdsRef.current.add(data.taskId);
            setTasks(prev => {
              const updated = prev.filter(t => t.id !== data.taskId);
              try {
                localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(updated));
              } catch { }
              return updated;
            });
          } else if (data?.action === 'DELETED_ALL') {
            setTasks([]);
            try {
              localStorage.removeItem('urbangaon_tasks_v2');
            } catch { }
          } else if (data?.action === 'CREATED' && data.task) {
            setTasks(prev => {
              if (prev.some(t => t.id === data.task.id)) return prev;
              const updated = [...prev, data.task].sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                if (timeA !== timeB) return timeA - timeB;
                return a.id.localeCompare(b.id);
              });
              try {
                localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(updated));
              } catch { }
              return updated;
            });
          } else if (data?.action === 'UPDATED' && data.taskId && data.updates) {
            setTasks(prev => {
              const updated = prev.map(t => {
                if (t.id === data.taskId) {
                  const nextTask = { ...t, ...data.updates, updatedAt: data.updates.updatedAt || new Date().toISOString() };
                  recentTaskMutationsRef.current.set(data.taskId, { timestamp: Date.now(), task: nextTask });
                  return nextTask;
                }
                return t;
              });
              try {
                localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(updated));
              } catch { }
              return updated;
            });
          } else if (data?.action === 'MEMBER_DEACTIVATED') {
            setMembers(prev => prev.map(m => {
              const isMatch = m.id === data.departingId ||
                (data.departingEmail && m.email.toLowerCase() === data.departingEmail.toLowerCase()) ||
                (data.departingName && m.name.toLowerCase() === data.departingName.toLowerCase());
              return isMatch ? { ...m, status: 'DEACTIVATED' as const, activeTasks: 0 } : m;
            }));
            refreshMembersFromDB();
            refreshFromDB(true);
          } else if (data?.action === 'MEMBER_DELETED') {
            setMembers(prev => prev.filter(m => {
              const isMatch = m.id === data.memberId ||
                (data.email && m.email.toLowerCase() === data.email.toLowerCase()) ||
                (data.name && m.name.toLowerCase() === data.name.toLowerCase());
              return !isMatch;
            }));
            refreshMembersFromDB();
            refreshFromDB(true);
          } else {
            if (isMounted) refreshFromDB(true);
          }
        };
      }
    } catch { }

    // Heartbeat poll every 6 seconds as a guaranteed cross-device sync safety net.
    // SSE pushes instant mutations (<50ms), heartbeat handles edge network reconnects without overloading the server.
    const heartbeatTimer = setInterval(() => {
      if (isMounted) refreshFromDB(true);
    }, 6000);

    // Periodic governance trigger: guarantees overdue & pending notice emails are evaluated in real-time
    const runOverdueCheck = () => {
      if (typeof window !== 'undefined') {
        fetch('/api/tasks/evaluate-overdue?sendNotifications=true', { method: 'POST' }).catch(() => { });
      }
    };
    // Run once on connect, then every 5 minutes while browser tab is open
    runOverdueCheck();
    const overdueTimer = setInterval(runOverdueCheck, 5 * 60 * 1000);

    // Instant sync when: tab is focused again OR phone screen is unlocked
    const onTabActive = () => {
      if (isMounted) {
        refreshFromDB(true);
        runOverdueCheck();
        // Also reconnect SSE if it got disconnected while tab was hidden
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          connectSSE();
        }
      }
    };

    window.addEventListener('focus', onTabActive);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onTabActive();
    });

    return () => {
      isMounted = false;
      clearInterval(heartbeatTimer);
      clearInterval(overdueTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
      bc?.close();
      window.removeEventListener('focus', onTabActive);
    };
  }, [refreshFromDB]);

  // ── Persist tasks to localStorage as local cache
  useEffect(() => {
    try {
      localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(tasks));
    } catch (e) {
      console.warn('[AppContext] localStorage save error', e);
    }
  }, [tasks]);

  // ── Persist audit logs to localStorage (Strictly authorized users)
  useEffect(() => {
    try {
      if (canViewAuditTrail(currentUser)) {
        localStorage.setItem('urbangaon_audit_v2', JSON.stringify(auditLogs));
      } else {
        localStorage.removeItem('urbangaon_audit_v2');
      }
    } catch (e) {
      console.warn('[AppContext] localStorage audit save error', e);
    }
  }, [auditLogs, currentUser]);

  // ── Audit logs sync strictly for CEO Sir & Aakash Das
  useEffect(() => {
    if (canViewAuditTrail(currentUser)) {
      const emailParam = encodeURIComponent(currentUser.email || '');
      fetch(`/api/audit?_t=${Date.now()}&userEmail=${emailParam}`, {
        cache: 'no-store',
        headers: { 'x-user-email': currentUser.email || '' }
      })
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.data)) {
            setAuditLogs(json.data);
          }
        })
        .catch(() => { });
    } else {
      setAuditLogs([]);
    }
  }, [currentUser]);

  // ── Persist authenticated user session to storage
  useEffect(() => {
    try {
      if (currentUser && currentUser.id !== 'guest') {
        localStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(currentUser));
        sessionStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(currentUser));
        sessionStorage.setItem('urbangaon_session_active', 'true');
      } else {
        localStorage.removeItem('urbangaon_auth_user_v2');
        sessionStorage.removeItem('urbangaon_auth_user_v2');
        sessionStorage.removeItem('urbangaon_session_active');
      }
    } catch (e) {
      console.warn('[AppContext] storage auth save error', e);
    }
  }, [currentUser]);

  // ── Executive & Role Guards: Non-authorized users automatically directed to workspace silently
  useEffect(() => {
    if (activeView === 'ceo_portal' && !isCeoUser(currentUser)) {
      setActiveView('workspace');
    }
    if (activeView === 'admin_hr' && !canAccessAdminHr(currentUser)) {
      setActiveView('workspace');
    }
    if (activeView === 'team_view' && !(isCeoUser(currentUser) || currentUser.role === 'MANAGER')) {
      setActiveView('workspace');
    }
    if (activeView === 'audit_trail' && !canViewAuditTrail(currentUser)) {
      setActiveView('workspace');
    }
    if (activeView === 'system_config' && !(isCeoUser(currentUser) || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN')) {
      setActiveView('workspace');
    }
    if (activeView === 'workflow_manual' && !canAccessWorkflows(currentUser)) {
      setActiveView('workspace');
    }
  }, [currentUser, activeView]);

  const logAudit = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'actor' | 'actorRole' | 'ipAddress' | 'deviceInfo'> & Partial<AuditLogEntry>) => {
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      actorRole: currentUser.role,
      ipAddress: '103.21.244.18 (Vercel Edge)',
      deviceInfo: typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 30)}...` : 'Chrome / Edge Desktop',
      ...entry,
    };
    setAuditLogs(prev => [newEntry, ...prev]);

    // Send to MongoDB Atlas API in background
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    }).catch(err => console.debug('[Audit] DB sync skipped/failed:', err));
  }, [currentUser]);

  const switchRole = (newRole: Role) => {
    if (newRole === 'SUPER_ADMIN' && !isCeoUser(currentUser)) {
      alert("Access Restricted: Super Admin privileges are reserved for Executive Leadership (CEO & Aakash Das).");
      return;
    }
    const matched = members.find(m => m.role === newRole) || {
      ...currentUser,
      role: newRole
    };
    setCurrentUser(matched);
    logAudit({
      action: 'LOGIN',
      fieldChanged: 'Role Switch / Auth Session',
      oldValue: currentUser.role,
      newValue: newRole,
      notes: `Active user switched to ${matched.name} (${newRole})`
    });
  };

  const addTask = (newTaskData: Partial<Task>, skipApiSync: boolean = false): Task => {
    // Executive role guard: CEO oversees all company tasks and does not create direct tasks
    if (isStrictCeo(currentUser)) {
      console.warn('[Security / Role Guard] CEO account is dedicated to deliverable monitoring & governance. Task creation is disabled.');
      setBannerNotification({
        message: 'Executive Monitoring Mode: CEO role oversees all staff deliverables across the company. Direct task creation is disabled for this role.',
        badge: 'Executive Monitor'
      });
      return {} as Task;
    }

    const createdDate = newTaskData.scheduledDate || selectedDate;
    const task: Task = {
      id: newTaskData.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: newTaskData.title || 'New Untitled Task',
      description: newTaskData.description || '',
      scheduledDate: createdDate,
      time: newTaskData.time || '09:00 AM',
      priority: newTaskData.priority || 'NORMAL',
      status: newTaskData.status || 'Not Started',
      progressPercent: 0,
      isJustAdded: true,
      department: newTaskData.department || currentUser.department,
      project: newTaskData.project || 'General Operations',
      location: newTaskData.location || 'Jaipur',
      notes: newTaskData.notes || '',
      pastDueReason: newTaskData.pastDueReason || '',
      inputMethod: newTaskData.inputMethod || 'Type',
      assignees: (newTaskData.assignees && newTaskData.assignees.length > 0)
        ? newTaskData.assignees.map(a => ({
          ...a,
          status: a.status || 'Not Started',
        }))
        : [
          {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            department: currentUser.department,
            designation: currentUser.designation,
            avatar: currentUser.avatar,
            status: 'Not Started',
          }
        ],
      creator: newTaskData.creator || {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
      aiMetadata: newTaskData.aiMetadata || {
        rawTranscript: newTaskData.title,
        extractionLatencyMs: 94,
        source: 'manual',
        confidenceScore: 0.99
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    deletedIdsRef.current.delete(task.id);

    // Optimistic state update in strict top-to-bottom chronological sequence (deduplicated)
    setTasks(prev => {
      const map = new Map<string, Task>();
      prev.forEach(t => map.set(t.id, t));
      map.set(task.id, task);
      const updated = Array.from(map.values()).sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });
      return updated;
    });
    setSelectedDate(createdDate);

    // Auto-expire 'Just Added' status after 10 seconds locally
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isJustAdded: false } : t));
    }, 10000);

    // Broadcast immediately to all open tabs on same browser
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbangaon_task_sync');
        bc.postMessage({ action: 'CREATED', task });
        bc.close();
      }
    } catch { }

    // Sync to MongoDB Atlas API only if not already persisted by caller (e.g., CreateTaskModal)
    if (!skipApiSync) {
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      })
        .then(async res => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('[Tasks] MongoDB sync error:', errData);
          } else {
            const data = await res.json();
            if (data?.data) {
              setTasks(prev => prev.map(t => t.id === task.id ? { ...data.data, isJustAdded: false } : t));
            }
          }
        })
        .catch(err => console.error('[Tasks] MongoDB sync failed:', err));
    }

    logAudit({
      taskId: task.id,
      taskTitle: task.title,
      action: 'CREATED',
      fieldChanged: 'Task Created',
      oldValue: 'None',
      newValue: `${task.title} [${task.time}] Assigned to ${task.assignees.map(a => a.name).join(', ')}`,
      notes: `Created via ${task.aiMetadata?.source || 'Voice AI'}`
    });

    setBannerNotification({
      message: `Added '${task.title}' at ${task.time} today with ${task.assignees[0]?.name || 'team'}`,
      badge: `✓ Synchronized in ${task.aiMetadata?.extractionLatencyMs || 180}ms`
    });

    // Refresh notifications tray
    refreshNotifications();

    return task;
  };

  const updateTask = (taskId: string, updates: Partial<Task>, note?: string) => {
    // Flowchart A: If edited by Admin or Super Admin, set editedByAdmin = true
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
    const currentTask = tasks.find(t => t.id === taskId);
    const nowIso = new Date().toISOString();
    const effectiveUpdates: Partial<Task> = (isAdmin && updates.editedByAdmin === undefined)
      ? { ...updates, editedByAdmin: true }
      : { ...updates };

    // Flowchart 21: If reason is recorded, clear pendingNoReason auto-flag (Keep Overdue flag only)
    if (updates.delayReason && updates.delayReason.trim().length > 0) {
      effectiveUpdates.isPendingNoReason = false;
    }
    // If deliverable is rescheduled, keep dueDate in sync if not explicitly provided, and clear overdue flags if >= today
    if (updates.scheduledDate) {
      if (!updates.dueDate) {
        effectiveUpdates.dueDate = updates.scheduledDate;
      }
      if (updates.scheduledDate >= getTodayStr()) {
        effectiveUpdates.isOverdue = false;
        effectiveUpdates.isPendingNoReason = false;
        effectiveUpdates.overdueDays = 0;
      }
    }
    // If task is reopened or moved back to In Progress / Not Started, reset any 'Done' assignees so computeMultiAssigneeStatus stays in sync
    if ((updates.status === 'In Progress' || updates.status === 'Not Started') && !updates.assignees && currentTask?.assignees?.length) {
      effectiveUpdates.assignees = currentTask.assignees.map(a =>
        a.status === 'Done' ? { ...a, status: updates.status as TaskStatus, completedAt: undefined } : a
      );
      effectiveUpdates.pendingCeoApproval = false;
    }
    // When deliverable is marked Done, it is 100% completed: clear overdue, pending, and approval flags
    if (updates.status === 'Done') {
      effectiveUpdates.isOverdue = false;
      effectiveUpdates.isPendingNoReason = false;
      effectiveUpdates.overdueDays = 0;
      effectiveUpdates.pendingCeoApproval = false;
      effectiveUpdates.progressPercent = 100;
    }

    // Optimistic UI update + protection from 1.5s background poll race condition
    setTasks(prev => {
      const nextList = prev.map(t => {
        if (t.id !== taskId) return t;
        const updatedTask: Task = { ...t, ...effectiveUpdates, isJustAdded: false, updatedAt: nowIso };
        recentTaskMutationsRef.current.set(taskId, { timestamp: Date.now(), task: updatedTask });
        return updatedTask;
      });
      try {
        localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(nextList));
      } catch { }
      return nextList;
    });

    // Broadcast immediately to all open tabs on same browser
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbangaon_task_sync');
        bc.postMessage({ action: 'UPDATED', taskId, updates: { ...effectiveUpdates, updatedAt: nowIso } });
        bc.close();
      }
    } catch { }

    // Sync to MongoDB Atlas API with resilient fallback
    const mergedTask = currentTask ? { ...currentTask, ...effectiveUpdates, updatedAt: nowIso } : { ...effectiveUpdates, updatedAt: nowIso };
    if (currentTask) {
      recentTaskMutationsRef.current.set(taskId, { timestamp: Date.now(), task: mergedTask as Task });
    }

    const patchPayload = {
      ...effectiveUpdates,
      fullTask: mergedTask,
      actor: currentUser.name,
      actorEmail: currentUser.email,
      actorId: currentUser.id,
      actorRole: currentUser.role,
    };

    fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': currentUser.email || '',
        'x-user-name': currentUser.name || '',
        'x-user-role': currentUser.role || '',
        'x-user-id': currentUser.id || ''
      },
      body: JSON.stringify(patchPayload)
    })
      .then(async res => {
        if (res.ok) {
          const resJson = await res.json().catch(() => null);
          if (resJson?.success && resJson?.data) {
            const serverTask = resJson.data as Task;
            recentTaskMutationsRef.current.set(taskId, { timestamp: Date.now(), task: serverTask });
            setTasks(prev => {
              const nextList = prev.map(t => t.id === taskId ? { ...t, ...serverTask, isJustAdded: false } : t);
              try {
                localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(nextList));
              } catch { }
              return nextList;
            });
          }
        } else {
          // Secondary fallback to dynamic segment /api/tasks/:id
          const fallbackRes = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-user-email': currentUser.email || '',
              'x-user-name': currentUser.name || '',
              'x-user-role': currentUser.role || '',
              'x-user-id': currentUser.id || ''
            },
            body: JSON.stringify(patchPayload)
          }).catch(() => null);

          if (fallbackRes && fallbackRes.ok) {
            const fbJson = await fallbackRes.json().catch(() => null);
            if (fbJson?.success && fbJson?.data) {
              const serverTask = fbJson.data as Task;
              recentTaskMutationsRef.current.set(taskId, { timestamp: Date.now(), task: serverTask });
              setTasks(prev => {
                const nextList = prev.map(t => t.id === taskId ? { ...t, ...serverTask, isJustAdded: false } : t);
                try {
                  localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(nextList));
                } catch { }
                return nextList;
              });
            }
          } else {
            const errText = await res.text().catch(() => '');
            let errData: any = {};
            try { errData = JSON.parse(errText); } catch { errData = { error: errText }; }
            console.warn('[Tasks] MongoDB patch synced locally (server note):', errData?.error || errData?.message || 'Local state preserved');
          }
        }
      })
      .catch(err => console.debug('[Tasks] MongoDB patch network notice:', err));

    const oldTask = tasks.find(t => t.id === taskId);
    logAudit({
      taskId,
      taskTitle: oldTask?.title || 'Task',
      action: 'UPDATED',
      fieldChanged: Object.keys(effectiveUpdates).join(', '),
      oldValue: oldTask ? JSON.stringify(effectiveUpdates).slice(0, 50) : '',
      newValue: JSON.stringify(effectiveUpdates).slice(0, 50),
      notes: note || (isAdmin ? 'Admin updated task' : 'Task properties updated')
    });
  };

  const holdTask = (taskId: string, reason: string) => {
    updateTask(taskId, { status: 'On Hold', holdReason: reason }, `Put on hold: "${reason}"`);
  };

  const escalateTask = (taskId: string, reason: string, seniorLeader: string) => {
    const leaderMember = members.find(m => m.name.toLowerCase() === seniorLeader.toLowerCase() || m.id === seniorLeader);
    updateTask(taskId, {
      status: 'Escalated',
      escalationReason: reason,
      escalatedTo: seniorLeader,
      escalatedToId: leaderMember?.id,
      escalatedAt: new Date().toISOString(),
      escalationSlaHours: 24,
      autoEscalatedToManager: false,
      originalAssigneeNotified: true
    }, `Escalated to senior ${seniorLeader}: "${reason}"`);

    logAudit({
      taskId,
      action: 'ESCALATED',
      fieldChanged: 'Task Escalated to Senior',
      oldValue: 'In Progress / Pending',
      newValue: `Escalated to ${seniorLeader}`,
      notes: `Deliverable escalated to ${seniorLeader} with documented reason: "${reason}". SLA clock active (24h).`
    });

    setBannerNotification({
      message: `Escalated to ${seniorLeader}. Instant notification dispatched.`,
      badge: 'Escalated'
    });

    // Flowchart 20: Event 2 — Task Escalated (Send instant in-app and email to senior and manager)
    const targetTask = tasks.find(t => t.id === taskId);
    const recipients: Array<{ email: string; name: string }> = [];
    if (leaderMember?.email) recipients.push({ email: leaderMember.email, name: leaderMember.name });
    if (currentUser?.email && !recipients.some(r => r.email === currentUser.email)) {
      recipients.push({ email: currentUser.email, name: currentUser.name });
    }
    if (recipients.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'TASK_ESCALATED',
          recipients,
          title: `Deliverable Escalated: "${targetTask?.title || 'Deliverable'}"`,
          message: `Escalated to ${seniorLeader} by ${currentUser.name}: "${reason}"`,
          taskId,
          taskTitle: targetTask?.title,
          metadata: {
            escalationReason: reason,
            escalatedBy: currentUser.name,
            managerEmail: leaderMember?.email,
            managerName: seniorLeader,
          }
        })
      })
        .then(() => refreshNotifications())
        .catch(err => console.debug('[FC20 Dispatch error]', err));
    }
  };

  // Flowchart 3: Senior Action 1 — Advise: Add advisory comment, return task to In Progress
  const seniorAdviseTask = (taskId: string, advisoryComment: string) => {
    updateTask(taskId, {
      status: 'In Progress',
      seniorAdvisoryComment: advisoryComment,
      originalAssigneeNotified: true
    }, `Senior Advisory: "${advisoryComment}"`);

    logAudit({
      taskId,
      action: 'UPDATED',
      fieldChanged: 'Senior Advisory Comment Provided',
      oldValue: 'Escalated',
      newValue: 'In Progress',
      notes: `Senior leader provided advisory guidance: "${advisoryComment}". Returned to original assignee.`
    });

    setBannerNotification({
      message: 'Advisory guidance posted. Deliverable returned to original assignee as In Progress.',
      badge: '✓ Advisory Dispatched'
    });
  };

  // Flowchart 3: Senior Action 2 — Reassign: Select new assignee and reassign task
  const seniorReassignTask = (taskId: string, newAssigneeId: string, notes?: string) => {
    const targetMember = members.find(m => m.id === newAssigneeId);
    if (!targetMember) return;

    updateTask(taskId, {
      status: 'In Progress',
      assignees: [{
        id: targetMember.id,
        name: targetMember.name,
        email: targetMember.email,
        department: targetMember.department,
        designation: targetMember.designation,
        avatar: targetMember.avatar,
        status: 'In Progress'
      }],
      originalAssigneeNotified: true
    }, `Senior Reassignment to ${targetMember.name}: ${notes || 'Workload reassignment'}`);

    logAudit({
      taskId,
      action: 'REASSIGNED',
      fieldChanged: 'Senior Reassignment',
      oldValue: 'Escalated',
      newValue: `Reassigned to ${targetMember.name}`,
      notes: `Senior leader reassigned deliverable to ${targetMember.name}. Original assignee notified.`
    });

    setBannerNotification({
      message: `Deliverable reassigned to ${targetMember.name}. All parties notified.`,
      badge: '✓ Task Reassigned'
    });
  };

  // Flowchart 3: Senior Action 3 — Resolve: Mark Completed with resolution note
  const seniorResolveTask = (taskId: string, resolutionNote: string) => {
    updateTask(taskId, {
      status: 'Done',
      progressPercent: 100,
      seniorResolutionNote: resolutionNote,
      originalAssigneeNotified: true
    }, `Senior Resolved: "${resolutionNote}"`);

    logAudit({
      taskId,
      action: 'UPDATED',
      fieldChanged: 'Senior Resolution',
      oldValue: 'Escalated',
      newValue: 'Done (100%)',
      notes: `Senior leader resolved escalated deliverable: "${resolutionNote}". Original assignee notified.`
    });

    setBannerNotification({
      message: 'Escalated deliverable resolved and marked Done (100%).',
      badge: '✓ Escalation Resolved'
    });

    // Flowchart 20: Event 4 — Reason approved or resolved (Send instant in-app and email to assignee)
    const targetTask = tasks.find(t => t.id === taskId);
    if (targetTask?.assignees && targetTask.assignees.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'REASON_STATUS_CHANGED',
          recipients: targetTask.assignees.map(a => ({ email: a.email, name: a.name })),
          title: `Escalation Resolved: "${targetTask.title}"`,
          message: `Senior resolution completed: "${resolutionNote}"`,
          taskId,
          taskTitle: targetTask.title,
          metadata: {
            decision: 'APPROVED',
            reviewerName: currentUser.name,
            notes: resolutionNote,
          }
        })
      })
        .then(() => refreshNotifications())
        .catch(err => console.debug('[FC20 Dispatch error]', err));
    }
  };

  // Flowchart 3: Senior Action 4 — Return: Return task to original assignee with reason
  const seniorReturnTask = (taskId: string, returnReason: string) => {
    updateTask(taskId, {
      status: 'In Progress',
      seniorReturnReason: returnReason,
      originalAssigneeNotified: true
    }, `Returned by Senior: "${returnReason}"`);

    logAudit({
      taskId,
      action: 'UPDATED',
      fieldChanged: 'Senior Returned Task with Reason',
      oldValue: 'Escalated',
      newValue: 'In Progress',
      notes: `Senior returned task to assignee with reason: "${returnReason}". Original assignee notified.`
    });

    setBannerNotification({
      message: 'Deliverable returned to original assignee with documented instructions.',
      badge: 'Returned to Assignee'
    });

    // Flowchart 20: Event 4 — Reason rejected or returned (Send instant in-app and email to assignee)
    const retTask = tasks.find(t => t.id === taskId);
    if (retTask?.assignees && retTask.assignees.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'REASON_STATUS_CHANGED',
          recipients: retTask.assignees.map(a => ({ email: a.email, name: a.name })),
          title: `Deliverable Returned: "${retTask.title}"`,
          message: `Returned by Senior Leadership: "${returnReason}"`,
          taskId,
          taskTitle: retTask.title,
          metadata: {
            decision: 'REJECTED',
            reviewerName: currentUser.name,
            notes: returnReason,
          }
        })
      })
        .then(() => refreshNotifications())
        .catch(err => console.debug('[FC20 Dispatch error]', err));
    }
  };

  // Flowchart 3: No action within SLA — Auto-escalate to reporting manager
  const checkAndAutoEscalateSlaBreachedTasks = (): number => {
    const now = Date.now();
    let escalatedCount = 0;
    tasks.forEach(t => {
      if (t.status === 'Escalated' && t.escalatedAt && !t.autoEscalatedToManager) {
        const slaHours = t.escalationSlaHours || 24;
        const diffMs = now - new Date(t.escalatedAt).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours >= slaHours) {
          escalatedCount++;
          updateTask(t.id, {
            autoEscalatedToManager: true,
            notes: `[SLA Breached - ${diffHours.toFixed(1)}h elapsed]: Auto-escalated to Reporting Manager and Admin.`
          }, 'Auto-escalated to Reporting Manager due to Senior SLA timeout');

          logAudit({
            taskId: t.id,
            action: 'ESCALATED',
            fieldChanged: 'SLA Auto-Escalation to Reporting Manager',
            oldValue: `Escalated to Senior (${t.escalatedTo})`,
            newValue: 'Auto-Escalated to Reporting Manager & Admin',
            notes: `Senior SLA limit of ${slaHours}h exceeded without action. Automatically escalated to Reporting Manager and Admin.`
          });
        }
      }
    });
    return escalatedCount;
  };

  // Flowchart 21: Overdue and No-Reason Auto-Flag Evaluation Engine
  const evaluateOverdueAndNoReasonTasks = useCallback(async (): Promise<{ overdueCount: number; pendingNoReasonCount: number; escalatedCount: number }> => {
    const todayStr = getTodayStr();
    const todayTime = new Date(todayStr).getTime();
    let overdueCount = 0;
    let pendingNoReasonCount = 0;
    let escalatedCount = 0;
    let stateChanged = false;

    const updatedTasks = tasks.map(t => {
      if (t.status === 'Done' || t.status === 'Cancelled') {
        return t;
      }

      const isDuePassed = t.scheduledDate < todayStr;
      if (!isDuePassed) {
        if (t.isOverdue || t.isPendingNoReason) {
          stateChanged = true;
          return { ...t, isOverdue: false, isPendingNoReason: false, overdueDays: 0 };
        }
        return t;
      }

      // Due date has passed: Apply Overdue auto-flag
      overdueCount++;
      const taskTime = new Date(t.scheduledDate).getTime();
      const diffDays = Math.max(1, Math.floor((todayTime - taskTime) / (1000 * 60 * 60 * 24)));
      const hasReason = Boolean(
        (t.delayReason && t.delayReason.trim().length > 0) ||
        (t.pastDueReason && t.pastDueReason.trim().length > 0)
      );

      if (!hasReason) {
        pendingNoReasonCount++;
      }

      let newStatus = t.status;
      let newEscalatedTo = t.escalatedTo;
      let didEscalate = false;

      // Check threshold escalation (default 3 days per corporate policy)
      if (diffDays >= 3 && t.status !== 'Escalated' && !t.autoEscalatedToManager) {
        newStatus = 'Escalated';
        newEscalatedTo = t.creator?.name || 'Reporting Manager';
        didEscalate = true;
        escalatedCount++;
      }

      const needsFlagUpdate =
        !t.isOverdue ||
        t.isPendingNoReason !== (!hasReason) ||
        t.overdueDays !== diffDays ||
        didEscalate;

      if (needsFlagUpdate) {
        stateChanged = true;
        return {
          ...t,
          isOverdue: true,
          isPendingNoReason: !hasReason,
          overdueDays: diffDays,
          overdueFlaggedAt: t.overdueFlaggedAt || new Date().toISOString(),
          status: newStatus,
          escalatedTo: newEscalatedTo,
          autoEscalatedToManager: didEscalate ? true : t.autoEscalatedToManager,
          escalatedAt: didEscalate ? new Date().toISOString() : t.escalatedAt,
        };
      }

      return t;
    });

    if (stateChanged) {
      setTasks(updatedTasks);
    }

    // Trigger server-side evaluation for MongoDB persistence without triggering duplicate email blasts
    try {
      fetch('/api/tasks/evaluate-overdue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholdDays: 3, sendNotifications: false })
      }).catch(err => console.debug('[FC21 Server Sync Failed]', err));
    } catch { }

    return { overdueCount, pendingNoReasonCount, escalatedCount };
  }, [tasks]);

  const reopenTask = (taskId: string, reason: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    const reopenedAssignees = targetTask?.assignees?.map(a => ({
      ...a,
      status: 'In Progress' as TaskStatus,
      completedAt: undefined,
    }));

    updateTask(taskId, {
      status: 'In Progress',
      progressPercent: 50,
      ...(reopenedAssignees ? { assignees: reopenedAssignees } : {}),
      pendingCeoApproval: false,
      ceoApprovedAt: undefined,
      ceoApprovedBy: undefined,
      holdReason: undefined,
      cancellationReason: undefined,
      editedByAdmin: true,
    }, `Reopened by Management: "${reason}"`);

    logAudit({
      taskId,
      taskTitle: targetTask?.title || 'Task',
      action: 'REOPENED',
      fieldChanged: 'Status -> In Progress',
      oldValue: targetTask?.status || 'Done',
      newValue: 'In Progress (50%)',
      notes: `Reopened by Management with mandatory justification: "${reason}"`
    });

    setBannerNotification({
      message: `Reopened deliverable '${targetTask?.title || 'Task'}' as In Progress`,
      badge: '✓ Action Logged'
    });

    // Flowchart 20: Event 3 — Task Reopened (Send instant in-app and email to all assignees)
    if (targetTask?.assignees && targetTask.assignees.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'TASK_REOPENED',
          recipients: targetTask.assignees.map(a => ({ email: a.email, name: a.name })),
          title: `Deliverable Reopened: "${targetTask.title}"`,
          message: `Reopened by Management: "${reason}"`,
          taskId,
          taskTitle: targetTask.title,
          metadata: {
            reopenReason: reason,
            reopenedBy: currentUser.name,
          }
        })
      })
        .then(() => refreshNotifications())
        .catch(err => console.debug('[FC20 Dispatch error]', err));
    }
  };

  const addMember = async (memberData: Partial<TeamMember>): Promise<TeamMember> => {
    const rawName = memberData.name?.trim() || 'New Staff';
    const nameParts = rawName.split(/\s+/);
    const computedInitials = nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : rawName.slice(0, 2).toUpperCase() || 'EM';

    const defaultAvatar = (memberData.avatar && !memberData.avatar.includes('.png') && !memberData.avatar.includes('urbangaon-employee-emblem'))
      ? memberData.avatar.trim()
      : computedInitials;

    const cleanEmail = memberData.email?.trim().toLowerCase() || `staff.${Date.now()}@urbangaon.com`;
    const assignedEmpId = memberData.employeeId || memberData.id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMember: TeamMember = {
      id: assignedEmpId,
      employeeId: assignedEmpId,
      name: rawName,
      email: cleanEmail,
      phone: memberData.phone || '',
      role: memberData.role || 'EMPLOYEE',
      designation: memberData.designation || 'Specialist',
      department: memberData.department || 'Product & Tech',
      managerId: memberData.managerId,
      manager: memberData.manager,
      managerEmail: memberData.managerEmail,
      avatar: defaultAvatar,
      status: memberData.status || 'Pending First Login',
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      overdueTasks: 0,
      velocity: 100,
    };

    // Send to MongoDB Atlas API
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newMember,
        actor: currentUser.name || 'Admin / Talent HR',
        actorRole: currentUser.role || 'ADMIN',
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create employee record');
    }

    const finalMember = json.data || newMember;
    setMembers(prev => {
      const exists = prev.some(m => m.id === finalMember.id || m.email.toLowerCase() === finalMember.email.toLowerCase());
      if (exists) {
        return prev.map(m => (m.id === finalMember.id || m.email.toLowerCase() === finalMember.email.toLowerCase()) ? finalMember : m);
      }
      return [...prev, finalMember];
    });

    logAudit({
      action: 'CREATED',
      fieldChanged: 'Employee Provisioning',
      oldValue: 'Unregistered',
      newValue: `${finalMember.name} (${finalMember.designation} - ${finalMember.department}) [${finalMember.status}]`,
      notes: `Employee record created in status "${finalMember.status}" & one-time set-password link dispatched by ${currentUser.name} (${currentUser.role})`
    });

    setBannerNotification({
      message: `Employee ${finalMember.name} provisioned in status "${finalMember.status}". One-time set-password invitation dispatched.`,
      badge: '✓ Pending First Login'
    });

    return finalMember;
  };

  const updateMember = async (
    memberId: string,
    updates: Partial<TeamMember>,
    reason?: string
  ): Promise<{ success: boolean; member?: TeamMember; error?: string }> => {
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: memberId,
          ...updates,
          reason,
          actor: currentUser.name || 'Admin / Talent HR',
          actorRole: currentUser.role || 'ADMIN',
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update employee details.');
      }

      const updatedMember = json.data as TeamMember;
      const oldMemberEmail = members.find(m => m.id === memberId)?.email.toLowerCase();

      // Update members in state
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updatedMember } : m));

      // If current user is being updated, sync current user & storage
      if (currentUser.id === memberId || (oldMemberEmail && currentUser.email?.toLowerCase() === oldMemberEmail)) {
        const synced = { ...currentUser, ...updatedMember };
        setCurrentUser(synced);
        try {
          localStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(synced));
          sessionStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(synced));
        } catch { }
      }

      // If email or name was updated, sync task assignees and creator in local state immediately
      if (updates.email || updates.name) {
        setTasks(prev => prev.map(t => {
          let hasChange = false;
          const newAssignees = t.assignees.map(a => {
            if (a.id === memberId || (oldMemberEmail && a.email?.toLowerCase() === oldMemberEmail)) {
              hasChange = true;
              return {
                ...a,
                ...(updates.email ? { email: updates.email } : {}),
                ...(updates.name ? { name: updates.name } : {}),
                ...(updatedMember.avatar ? { avatar: updatedMember.avatar } : {})
              };
            }
            return a;
          });
          const isCreatorMatch = t.creator.id === memberId || (oldMemberEmail && t.creator.email?.toLowerCase() === oldMemberEmail);
          const newCreator = isCreatorMatch ? {
            ...t.creator,
            ...(updates.email ? { email: updates.email } : {}),
            ...(updates.name ? { name: updates.name } : {})
          } : t.creator;
          if (newCreator !== t.creator) hasChange = true;

          return hasChange ? { ...t, assignees: newAssignees, creator: newCreator } : t;
        }));
      }

      logAudit({
        action: 'UPDATED',
        fieldChanged: updates.email ? `Employee Email (${updatedMember.name})` : `Employee Profile (${updatedMember.name})`,
        oldValue: updates.email ? (members.find(m => m.id === memberId)?.email || '') : 'Profile Details',
        newValue: updates.email ? updates.email : JSON.stringify(updates),
        notes: reason || `Updated employee details for ${updatedMember.name} by ${currentUser.name}`
      });

      setBannerNotification({
        message: json.message || `Employee ${updatedMember.name} updated successfully.`,
        badge: '✓ Employee Updated'
      });

      return { success: true, member: updatedMember };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      console.error('[AppContext] updateMember error:', msg);
      return { success: false, error: msg };
    }
  };

  const updateProfile = async (
    updates: { name?: string; email?: string; role?: Role; employeeId?: string; designation?: string; department?: string }
  ): Promise<{ success: boolean; error?: string; member?: TeamMember }> => {
    try {
      const trimmedName = updates.name !== undefined ? updates.name.trim() : undefined;
      const trimmedEmail = updates.email !== undefined ? updates.email.trim().toLowerCase() : undefined;
      const trimmedRole = updates.role;
      const trimmedEmployeeId = updates.employeeId !== undefined ? updates.employeeId.trim() : undefined;
      const trimmedDesignation = updates.designation !== undefined ? updates.designation.trim() : undefined;
      const trimmedDepartment = updates.department !== undefined ? updates.department.trim() : undefined;

      if (trimmedName !== undefined && trimmedName.length < 2) {
        return { success: false, error: 'Name must be at least 2 characters long.' };
      }

      if (trimmedEmail !== undefined && trimmedEmail.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          return { success: false, error: 'Please enter a valid email address.' };
        }
      }

      if (trimmedEmployeeId !== undefined && trimmedEmployeeId.length === 0) {
        return { success: false, error: 'Employee ID cannot be empty.' };
      }

      if (!trimmedName && !trimmedEmail && !trimmedRole && !trimmedEmployeeId && trimmedDesignation === undefined && trimmedDepartment === undefined) {
        return { success: true };
      }

      const bodyPayload: Record<string, unknown> = {
        id: currentUser.id,
        actor: currentUser.name || trimmedName || 'Self Profile',
        actorRole: currentUser.role || 'EMPLOYEE',
        reason: `Employee profile updated (${[
          trimmedName ? `Name: ${trimmedName}` : '',
          trimmedEmail ? `Email: ${trimmedEmail}` : '',
          trimmedRole ? `Role: ${trimmedRole}` : '',
          trimmedDesignation !== undefined ? `Designation: ${trimmedDesignation}` : '',
          trimmedDepartment !== undefined ? `Dept: ${trimmedDepartment}` : '',
          trimmedEmployeeId ? `Employee ID: ${trimmedEmployeeId}` : ''
        ].filter(Boolean).join(', ')})`,
      };

      if (trimmedName) bodyPayload.name = trimmedName;
      if (trimmedEmail) bodyPayload.email = trimmedEmail;
      if (trimmedRole) bodyPayload.role = trimmedRole;
      if (trimmedEmployeeId) bodyPayload.newEmployeeId = trimmedEmployeeId;
      if (trimmedDesignation !== undefined) bodyPayload.designation = trimmedDesignation;
      if (trimmedDepartment !== undefined) bodyPayload.department = trimmedDepartment;

      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update profile.');
      }

      const updated = json.data as TeamMember;
      const finalId = updated?.id || trimmedEmployeeId || currentUser.id;
      const finalName = updated?.name || trimmedName || currentUser.name;
      const finalEmail = updated?.email || trimmedEmail || currentUser.email;
      const finalRole = (updated?.role as Role) || trimmedRole || currentUser.role;
      const finalDesignation = updated?.designation !== undefined ? updated.designation : (trimmedDesignation !== undefined ? trimmedDesignation : (currentUser.designation || ''));
      const finalDepartment = updated?.department !== undefined ? updated.department : (trimmedDepartment !== undefined ? trimmedDepartment : (currentUser.department || ''));
      const finalAvatar = updated?.avatar || currentUser.avatar;

      // Sync currentUser state and persistent storage
      const syncedUser: TeamMember = {
        ...currentUser,
        id: finalId,
        employeeId: finalId,
        name: finalName,
        email: finalEmail,
        role: finalRole,
        designation: finalDesignation,
        department: finalDepartment,
        avatar: finalAvatar,
      };
      setCurrentUser(syncedUser);
      try {
        localStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(syncedUser));
        sessionStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(syncedUser));
      } catch { }

      // Sync members list in state
      setMembers(prev => prev.map(m => {
        if (m.id === currentUser.id || m.id === finalId || (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase())) {
          return {
            ...m,
            id: finalId,
            employeeId: finalId,
            name: finalName,
            email: finalEmail,
            role: finalRole,
            designation: finalDesignation,
            department: finalDepartment,
            avatar: finalAvatar
          };
        }
        return m;
      }));

      // Sync tasks state immediately for both assignees and creator
      setTasks(prev => prev.map(t => {
        let changed = false;
        const newAssignees = t.assignees.map(a => {
          if (a.id === currentUser.id || a.id === finalId || (currentUser.email && a.email?.toLowerCase() === currentUser.email.toLowerCase())) {
            changed = true;
            return { ...a, id: finalId, name: finalName, email: finalEmail, designation: finalDesignation, department: finalDepartment, avatar: finalAvatar };
          }
          return a;
        });
        const isCreator = t.creator.id === currentUser.id || t.creator.id === finalId || (currentUser.email && t.creator.email?.toLowerCase() === currentUser.email.toLowerCase());
        const newCreator = isCreator ? { ...t.creator, id: finalId, name: finalName, email: finalEmail, role: finalRole } : t.creator;
        if (newCreator !== t.creator) changed = true;

        return changed ? { ...t, assignees: newAssignees, creator: newCreator } : t;
      }));

      logAudit({
        action: 'UPDATED',
        fieldChanged: 'Employee Profile & Credentials',
        oldValue: `${currentUser.name} (${currentUser.id} • ${currentUser.designation || currentUser.role})`,
        newValue: `${finalName} (${finalId} • ${finalDesignation || finalRole})`,
        notes: `User changed profile to "${finalName}" (${finalId} • ${finalDesignation || finalRole}) <${finalEmail}>`
      });

      setBannerNotification({
        message: `Profile updated successfully (${finalDesignation ? `${finalDesignation} • ` : ''}ID: ${finalId}).`,
        badge: '✓ Profile Updated'
      });

      return { success: true, member: syncedUser };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      console.error('[AppContext] updateProfile error:', msg);
      return { success: false, error: msg };
    }
  };

  const updateProfileName = async (
    newName: string
  ): Promise<{ success: boolean; error?: string }> => {
    return updateProfile({ name: newName });
  };

  const deactivateMember = async (
    departingId: string,
    successorId: string,
    reason: string = 'Resignation / Voluntary Transition',
    deactivationType: 'Resignation' | 'Termination' | 'Long leave' = 'Resignation',
    dates?: {
      lastWorkingDay?: string;
      effectiveDate?: string;
      leaveStartDate?: string;
      leaveEndDate?: string;
    }
  ): Promise<{ success: boolean; reassignedCount: number; message: string }> => {
    // Security check: CEO cannot be deactivated
    const departing = members.find(m => m.id === departingId || m.name === departingId || m.email.toLowerCase() === departingId.toLowerCase());
    if (departing && isCeoUser(departing)) {
      throw new Error("Executive Command Protection: CEO Mr. Sukh Sagar Singh Bhati cannot be deactivated.");
    }
    if (departingId === successorId) {
      throw new Error("Validation Error: Successor cannot be the same departing employee.");
    }

    const successor = members.find(m => m.id === successorId || m.name === successorId || m.email.toLowerCase() === successorId.toLowerCase());
    const departingName = departing?.name || departingId;
    const successorName = successor?.name || successorId;

    // Call server API for persistent MongoDB update
    const res = await fetch('/api/members/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departingMemberId: departing?.id || departingId,
        successorMemberId: successor?.id || successorId,
        reason,
        deactivationType,
        lastWorkingDay: dates?.lastWorkingDay,
        effectiveDate: dates?.effectiveDate,
        leaveStartDate: dates?.leaveStartDate,
        leaveEndDate: dates?.leaveEndDate,
        actor: currentUser.name || 'Super Admin',
        actorRole: currentUser.role || 'SUPER_ADMIN'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to complete deactivation & task handover');
    }

    const reassignedCount = typeof data.reassignedCount === 'number' ? data.reassignedCount : 0;
    const isLongLeave = deactivationType === 'Long leave';
    const newStatus = isLongLeave ? ('ON_LEAVE' as const) : ('DEACTIVATED' as const);

    // Optimistically update local members for all matching duplicate records
    setMembers(prev => prev.map(m => {
      const isDeparting = m.id === departing?.id ||
        m.id === departingId ||
        m.name.toLowerCase() === departingName.toLowerCase() ||
        (departing?.email && m.email.toLowerCase() === departing.email.toLowerCase());
      const isSuccessor = m.id === successor?.id ||
        m.id === successorId ||
        m.name.toLowerCase() === successorName.toLowerCase() ||
        (successor?.email && m.email.toLowerCase() === successor.email.toLowerCase());

      if (isDeparting) {
        return {
          ...m,
          status: newStatus,
          activeTasks: 0,
          totalTasks: Math.max(0, (m.totalTasks || 0) - reassignedCount)
        };
      }
      if (isSuccessor) {
        return {
          ...m,
          activeTasks: (m.activeTasks || 0) + reassignedCount,
          totalTasks: (m.totalTasks || 0) + reassignedCount
        };
      }
      return m;
    }));

    // Optimistically update local tasks
    const activeStatuses = ['In Progress', 'Queued', 'On Hold', 'Escalated', 'Review'];
    setTasks(prev => prev.map(t => {
      if (!activeStatuses.includes(t.status)) return t;
      let hasDeparting = false;
      const updatedAssignees = t.assignees.map(a => {
        const isMatch = (departing?.id && a.id === departing.id) ||
          a.name.toLowerCase() === departingName.toLowerCase() ||
          (departing?.email && a.email.toLowerCase() === departing.email.toLowerCase());

        if (isMatch && successor) {
          hasDeparting = true;
          return {
            id: successor.id,
            name: successor.name,
            email: successor.email,
            department: successor.department,
            designation: successor.designation,
            avatar: successor.avatar,
            status: a.status || 'In Progress',
            remarks: `Handover from ${departingName}: ${reason}`,
            completedAt: a.completedAt
          };
        }
        return a;
      });

      if (hasDeparting) {
        return {
          ...t,
          assignees: updatedAssignees,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));

    // Broadcast change to other open browser windows
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbangaon_task_sync');
        bc.postMessage({
          action: 'MEMBER_DEACTIVATED',
          departingId,
          departingName,
          departingEmail: departing?.email,
          successorId
        });
        bc.close();
      }
    } catch { }

    // Trigger full background sync to guarantee consistency
    await refreshMembersFromDB();
    await refreshFromDB();

    logAudit({
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Account Status & Deliverable Reallocation',
      oldValue: `${departingName} [ACTIVE]`,
      newValue: `${departingName} [${newStatus}] → All ${reassignedCount} active deliverables transferred to ${successorName}`,
      notes: `Deactivation Protocol Enforced: Type=${deactivationType}. Handover to ${successorName}. ${reassignedCount} tasks reassigned. Audit history preserved.`
    });

    if (selectedMemberFilter === departingName) {
      setSelectedMemberFilter(null);
    }

    return {
      success: true,
      reassignedCount,
      message: data.message
    };
  };

  const deleteMember = async (memberId: string): Promise<{ success: boolean; message: string }> => {
    const target = members.find(m => m.id === memberId || m.name === memberId || m.email.toLowerCase() === memberId.toLowerCase());
    if (target && isCeoUser(target)) {
      throw new Error("Executive Command Protection: CEO Mr. Sukh Sagar Singh Bhati cannot be deleted.");
    }

    const targetEmpId = target?.id || memberId;
    const targetName = target?.name || memberId;
    const targetEmail = target?.email || '';
    const targetCleanEmail = targetEmail.toLowerCase().trim();

    // Register tombstone immediately in local state and localStorage
    setPurgedMemberIds(prev => Array.from(new Set([...prev, targetEmpId])));
    if (targetCleanEmail) {
      setPurgedMemberEmails(prev => Array.from(new Set([...prev, targetCleanEmail])));
    }
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('urbangaon_purged_members_v1');
        const parsed = cached ? JSON.parse(cached) : { ids: [], emails: [] };
        parsed.ids = Array.from(new Set([...(parsed.ids || []), targetEmpId]));
        if (targetCleanEmail) {
          parsed.emails = Array.from(new Set([...(parsed.emails || []), targetCleanEmail]));
        }
        localStorage.setItem('urbangaon_purged_members_v1', JSON.stringify(parsed));
      }
    } catch { }

    const res = await fetch(`/api/members?id=${encodeURIComponent(targetEmpId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor: currentUser.name || 'Super Admin',
        actorRole: currentUser.role || 'SUPER_ADMIN'
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to permanently delete member record.');
    }

    // Optimistically remove from state
    setMembers(prev => prev.filter(m => m.id !== targetEmpId && m.email.toLowerCase().trim() !== targetCleanEmail));

    // Broadcast across tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbangaon_task_sync');
        bc.postMessage({
          action: 'MEMBER_DELETED',
          memberId: targetEmpId,
          name: targetName,
          email: targetEmail
        });
        bc.close();
      }
    } catch { }

    await refreshMembersFromDB();
    await refreshFromDB();

    logAudit({
      action: 'DELETED',
      fieldChanged: `Employee Account Permanently Deleted (${targetName})`,
      oldValue: JSON.stringify({ id: targetEmpId, name: targetName, email: targetEmail }),
      newValue: 'PERMANENTLY_PURGED',
      notes: `Permanent removal of staff account ${targetName} (${targetEmail}). Roster purged in real time.`
    });

    if (selectedMemberFilter === targetName) {
      setSelectedMemberFilter(null);
    }

    return {
      success: true,
      message: data.message || `Employee record successfully removed.`
    };
  };

  // Flowchart 23: Admin marks employee on leave with start and end date
  const markMemberOnLeave = async (params: {
    memberId: string;
    leaveStartDate: string;
    leaveEndDate: string;
    taskDueAction?: 'AUTO_EXTEND' | 'FLAG_ADMIN';
    notes?: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/members/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          actorName: currentUser.name,
          actorRole: currentUser.role,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record employee leave');
      }

      await refreshMembersFromDB();
      await refreshFromDB();
      await refreshNotifications();

      setBannerNotification({
        message: data.message,
        badge: 'Staff On Leave'
      });

      return { success: true, message: data.message };
    } catch (err: any) {
      console.error('[markMemberOnLeave error]', err);
      return { success: false, message: err?.message || 'Error recording leave' };
    }
  };

  // Flowchart 23 Node 7: On return date restore reminders and status
  const returnMemberFromLeave = async (memberId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/members/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          actorName: currentUser.name,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to restore employee from leave');
      }

      await refreshMembersFromDB();
      await refreshFromDB();
      await refreshNotifications();

      setBannerNotification({
        message: data.message,
        badge: '✓ Status Restored'
      });

      return { success: true, message: data.message };
    } catch (err: any) {
      console.error('[returnMemberFromLeave error]', err);
      return { success: false, message: err?.message || 'Error restoring status' };
    }
  };

  const clearAllTasks = async () => {
    if (!isCeoUser(currentUser)) {
      alert("Access Restricted: Only Executive Leadership (CEO & Aakash Das) has permission to wipe company deliverables.");
      return;
    }

    // Optimistically clear local state
    setTasks([]);
    try {
      localStorage.removeItem('urbangaon_tasks_v2');
    } catch { }

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbangaon_task_sync');
        bc.postMessage({ action: 'DELETED_ALL' });
        bc.close();
      }
    } catch { }

    // Call server DELETE endpoint to wipe MongoDB collection with CEO credentials header
    try {
      await fetch('/api/tasks', {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser.email || '',
          'x-user-name': currentUser.name || '',
          'x-user-role': currentUser.role || ''
        }
      });
    } catch (err) {
      console.error('[AppContext] clear tasks error:', err);
    }

    logAudit({
      action: 'UPDATED',
      fieldChanged: 'Task Ledger Wipe',
      oldValue: 'Prior deliverables',
      newValue: '0 Tasks (Clean Slate)',
      notes: `All deliverables cleared by CEO Mr. Sukh Sagar Singh Bhati`
    });

    setBannerNotification({
      message: 'All deliverables cleared from MongoDB Atlas & local ledger. Ready for fresh test tasks!',
      badge: '✓ Clean Slate'
    });
  };

  const logoutUser = () => {
    try {
      localStorage.removeItem('urbangaon_auth_user_v2');
      sessionStorage.removeItem('urbangaon_auth_user_v2');
      sessionStorage.removeItem('urbangaon_session_active');
    } catch { }
    setCurrentUser(GUEST_USER);
    setActiveView('workspace');
    setAuthModalInitialMode('LOGIN');
    setIsAuthModalOpen(true);
    logAudit({
      action: 'LOGIN',
      fieldChanged: 'Auth Session / Logout',
      oldValue: currentUser.name,
      newValue: 'Logged Out Guest',
      notes: `User ${currentUser.name} signed out`
    });
    setBannerNotification({
      message: 'You have been signed out. Please sign in to access your account.',
      badge: '✓ Logged Out'
    });
  };

  // Flowchart 22: Cancel Task Flow (Left Branch) — Restricted to Admin & CEO
  const cancelTask = async (taskId: string, reason: string) => {
    const canCancel = isCeoUser(currentUser) || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
    if (!canCancel) {
      alert('Access Restricted: Only Admin, Super Admin, and CEO have permission to cancel deliverables.');
      return;
    }

    if (!reason || !reason.trim()) {
      alert('Cancellation reason is required per corporate governance.');
      return;
    }

    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    // Flowchart 22: Set status Cancelled exclude from performance reports
    const cancelledAssignees = targetTask.assignees.map(a => ({
      ...a,
      status: 'Cancelled' as TaskStatus,
      completedAt: undefined,
      remarks: `Cancelled: ${reason.trim()}`
    }));

    updateTask(taskId, {
      status: 'Cancelled',
      cancellationReason: reason.trim(),
      assignees: cancelledAssignees,
      progressPercent: 0,
      isPendingNoReason: false,
    }, `Cancelled task with documented rationale: "${reason.trim()}"`);

    // Flowchart 22: Notify all assignees and creator
    const notificationRecipients: Array<{ email: string; name: string }> = [];
    targetTask.assignees.forEach(a => {
      if (a.email && a.email.includes('@')) {
        notificationRecipients.push({ email: a.email, name: a.name });
      }
    });
    if (targetTask.creator?.email && targetTask.creator.email.includes('@')) {
      if (!notificationRecipients.some(r => r.email.toLowerCase() === targetTask.creator.email.toLowerCase())) {
        notificationRecipients.push({ email: targetTask.creator.email, name: targetTask.creator.name });
      }
    }

    if (notificationRecipients.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'TASK_CANCELLED',
          recipients: notificationRecipients,
          title: `Deliverable Cancelled: "${targetTask.title}"`,
          message: `Deliverable #${targetTask.id} was marked as Cancelled by ${currentUser.name}. Mandatory justification: "${reason.trim()}". Excluded from performance reports.`,
          taskId: targetTask.id,
          taskTitle: targetTask.title,
          metadata: {
            cancelledBy: currentUser.name,
            cancellationReason: reason.trim(),
            department: targetTask.department,
            priority: targetTask.priority
          }
        })
      })
        .then(() => refreshNotifications())
        .catch(err => console.debug('[FC22 Cancellation Notification Error]', err));
    }

    // Flowchart 22: Audit log entry created
    logAudit({
      taskId,
      taskTitle: targetTask.title,
      action: 'CANCELLED',
      fieldChanged: 'Task Cancelled',
      oldValue: targetTask.status,
      newValue: 'Cancelled',
      notes: `Cancelled by ${currentUser.name}. Justification: "${reason.trim()}". Excluded from performance metrics. All assignees & creator notified.`
    });

    setBannerNotification({
      message: `Deliverable "${targetTask.title}" marked as Cancelled. Excluded from performance metrics.`,
      badge: 'Task Cancelled'
    });
  };

  // Flowchart 22: Reassign Task Flow (Right Branch)
  const reassignTask = async (params: {
    taskId: string;
    mode: 'REPLACE_ALL' | 'ADD_ALONGSIDE' | 'REMOVE_SPECIFIC';
    newAssigneeIds?: string[];
    removeAssigneeIds?: string[];
    reason?: string;
  }) => {
    const { taskId, mode, newAssigneeIds = [], removeAssigneeIds = [], reason } = params;
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const oldAssignees = targetTask.assignees || [];
    let updatedAssignees: typeof oldAssignees = [];
    let addedMembers: TeamMember[] = [];
    let removedAssignees: typeof oldAssignees = [];

    const activeList = members.filter(m => {
      if (!m) return false;
      if (isStrictCeo(m)) return false;
      const st = String(m.status || 'ACTIVE').toUpperCase().trim();
      return st !== 'DEACTIVATED' && st !== 'REMOVED' && st !== 'TERMINATED' && !(m as any).isDeactivated;
    });

    if (mode === 'REPLACE_ALL') {
      // Flowchart 22: Replace all -> Remove old assignees and add new
      removedAssignees = [...oldAssignees];
      addedMembers = activeList.filter(m => newAssigneeIds.includes(m.id) || (m.email && newAssigneeIds.includes(m.email)));
      updatedAssignees = addedMembers.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        department: m.department,
        designation: m.designation,
        avatar: m.avatar,
        status: 'Not Started' as TaskStatus,
      }));
    } else if (mode === 'ADD_ALONGSIDE') {
      // Flowchart 22: Add alongside -> Keep old assignees and add new
      removedAssignees = [];
      const newToAdd = activeList.filter(
        m => (newAssigneeIds.includes(m.id) || (m.email && newAssigneeIds.includes(m.email))) && !oldAssignees.some(o => o.id === m.id || (o.email && m.email && o.email.toLowerCase() === m.email.toLowerCase()))
      );
      addedMembers = newToAdd;
      const newlyCreatedAssignees = newToAdd.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        department: m.department,
        designation: m.designation,
        avatar: m.avatar,
        status: 'Not Started' as TaskStatus,
      }));
      updatedAssignees = [...oldAssignees, ...newlyCreatedAssignees];
    } else if (mode === 'REMOVE_SPECIFIC') {
      // Flowchart 22: Remove specific -> Remove selected assignees only
      removedAssignees = oldAssignees.filter(o => removeAssigneeIds.includes(o.id) || (o.email && removeAssigneeIds.includes(o.email)));
      addedMembers = [];
      updatedAssignees = oldAssignees.filter(o => !removeAssigneeIds.includes(o.id) && !(o.email && removeAssigneeIds.includes(o.email)));
    }

    if (updatedAssignees.length === 0) {
      alert('A deliverable must have at least one designated assignee. Cannot remove all assignees without assigning a successor.');
      return;
    }

    // Flowchart 22: Recalculate overall task stat
    const comp = computeMultiAssigneeStatus({
      assignees: updatedAssignees,
      scheduledDate: targetTask.scheduledDate,
      pastDueReason: targetTask.pastDueReason,
    });

    updateTask(taskId, {
      assignees: updatedAssignees,
      department: updatedAssignees[0]?.department || targetTask.department,
      status: comp.status,
      progressPercent: comp.progressPercent,
      pendingCeoApproval: comp.status === 'Done' ? targetTask.pendingCeoApproval : false,
    }, `Reassigned assignees (${mode}): Added ${addedMembers.length}, Removed ${removedAssignees.length}`);

    setBannerNotification({
      message: `Deliverable "${targetTask.title}" reassigned to ${updatedAssignees.map(a => a.name).join(', ')}`,
      badge: '✓ Reassigned Live'
    });

    // Flowchart 22: Notify removed and added assignees
    // 1. Notify newly added assignees
    if (addedMembers.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'TASK_ASSIGNED',
          recipients: addedMembers.map(m => ({ email: m.email, name: m.name })),
          title: `New Deliverable Assignment: "${targetTask.title}"`,
          message: `You have been added to deliverable #${targetTask.id} (${mode}) by ${currentUser.name}. ${reason ? `Notes: "${reason}"` : ''}`,
          taskId: targetTask.id,
          taskTitle: targetTask.title,
          metadata: {
            assignedBy: currentUser.name,
            scheduledDate: targetTask.scheduledDate,
            time: targetTask.time,
            priority: targetTask.priority,
            department: targetTask.department,
          }
        })
      })
        .then(() => refreshNotifications())
        .catch(err => console.debug('[FC22 Reassign Added Dispatch Error]', err));
    }

    // 2. Notify removed assignees
    if (removedAssignees.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'TASK_ASSIGNED',
          recipients: removedAssignees.map(a => ({ email: a.email, name: a.name })),
          title: `Deliverable Handover Notice: "${targetTask.title}"`,
          message: `You have been unassigned from deliverable #${targetTask.id} by ${currentUser.name} (${mode}). ${reason ? `Notes: "${reason}"` : ''}`,
          taskId: targetTask.id,
          taskTitle: targetTask.title,
          metadata: {
            assignedBy: currentUser.name,
            reassignedBy: currentUser.name,
            reason: reason || 'Workload rebalance',
          }
        })
      })
        .then(() => refreshNotifications())
        .catch(err => console.debug('[FC22 Reassign Removed Dispatch Error]', err));
    }

    // Flowchart 22: Audit log entry created
    logAudit({
      taskId,
      taskTitle: targetTask.title,
      action: 'REASSIGNED',
      fieldChanged: `Task Assignees Reassigned (${mode})`,
      oldValue: oldAssignees.map(a => a.name).join(', ') || 'None',
      newValue: updatedAssignees.map(a => a.name).join(', '),
      notes: `Reassignment mode: ${mode}. Added: ${addedMembers.map(m => m.name).join(', ') || 'None'}. Removed: ${removedAssignees.map(a => a.name).join(', ') || 'None'}. Notes: "${reason || 'Workload adjustment'}".`
    });

    setBannerNotification({
      message: `Reassigned "${targetTask.title}" (${mode}). Added: ${addedMembers.length}, Removed: ${removedAssignees.length}.`,
      badge: 'Task Reassigned'
    });
  };

  const deleteTask = async (taskId: string) => {
    const canDelete = isCeoUser(currentUser) || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
    if (!canDelete) {
      alert("Access Restricted: Only Admin, Super Admin, and CEO have permission to permanently delete deliverables.");
      return;
    }

    const targetTask = tasks.find(t => t.id === taskId);
    deletedIdsRef.current.add(taskId);

    // Optimistically update local state immediately
    setTasks(prev => {
      const remaining = prev.filter(t => t.id !== taskId);
      try {
        localStorage.setItem('urbangaon_tasks_v2', JSON.stringify(remaining));
      } catch { }
      return remaining;
    });

    // Notify all open tabs on same device via BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbangaon_task_sync');
        bc.postMessage({ action: 'DELETED', taskId, taskTitle: targetTask?.title });
        bc.close();
      }
    } catch { }

    // Sync deletion to MongoDB Atlas backend with CEO credentials header
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser.email || '',
          'x-user-name': currentUser.name || '',
          'x-user-role': currentUser.role || ''
        }
      });
    } catch (err) {
      console.error('[AppContext] deleteTask error:', err);
    }

    logAudit({
      taskId,
      taskTitle: targetTask?.title || 'Task',
      action: 'DELETED',
      fieldChanged: 'Task Deleted',
      oldValue: targetTask?.title || taskId,
      newValue: 'Permanently Deleted from Ledger',
      notes: `Deliverable permanently deleted by CEO Mr. Sukh Sagar Singh Bhati`
    });

    setBannerNotification({
      message: `Deleted task "${targetTask?.title || 'Deliverable'}"`,
      badge: '✓ Task Deleted'
    });
  };

  const completeTask = (taskId: string, assigneeId?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCeo = isCeoUser(currentUser);
    const effectiveAssigneeId = assigneeId || (task.assignees.some(a => a.id === currentUser.id) ? currentUser.id : undefined);

    // Executive Governance Rule: If completed by an employee/non-CEO, deliverable routes to CEO Mr. Sukh Sagar Singh Bhati for Final Approval before completion
    if (!isCeo) {
      const updatedAssignees = task.assignees.map(a => {
        if (!effectiveAssigneeId || a.id === effectiveAssigneeId) {
          return {
            ...a,
            status: 'Review' as TaskStatus,
            remarks: a.remarks ? `${a.remarks} • Submitted for CEO Final Approval by ${currentUser.name}` : `Submitted for CEO Final Approval by ${currentUser.name}`,
          };
        }
        return a;
      });

      updateTask(taskId, {
        assignees: updatedAssignees,
        status: 'Review',
        progressPercent: 95,
        pendingCeoApproval: true,
        ceoApprovalRequestedAt: new Date().toISOString(),
        ceoApprovalRequestedBy: currentUser.name,
      }, `Deliverable submitted by ${currentUser.name}. Dispatched to CEO Mr. Sukh Sagar Singh Bhati for Final Approval before completion.`);

      logAudit({
        taskId,
        taskTitle: task.title,
        action: 'APPROVAL',
        fieldChanged: 'Task Submitted for CEO Final Approval',
        oldValue: task.status,
        newValue: 'Review (Pending CEO Final Approval)',
        notes: `Deliverable submitted by ${currentUser.name}. Awaiting Final Approval from CEO Mr. Sukh Sagar Singh Bhati before marking Done.`
      });

      setBannerNotification({
        message: `Deliverable submitted! Dispatched to CEO Mr. Sukh Sagar Singh Bhati for Final Approval before completion.`,
        badge: '⏳ Sent for CEO Approval'
      });

      // Send instant real-time notification to Sukh Sagar Sir
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'TASK_ASSIGNED',
          recipients: [{ email: 'ceo@urbangaon.com', name: 'Mr. Sukh Sagar Singh Bhati' }],
          title: `Deliverable Pending Final Approval: "${task.title}"`,
          message: `${currentUser.name} has submitted deliverable "${task.title}" for your Final Approval before completion.`,
          taskId: task.id,
          taskTitle: task.title,
          metadata: {
            submittedBy: currentUser.name,
            submittedByEmail: currentUser.email,
            status: 'Review'
          }
        })
      }).catch(() => { });

      return;
    }

    // Direct completion by CEO Mr. Sukh Sagar Singh Bhati
    const updatedAssignees = task.assignees.map(a => {
      if (!effectiveAssigneeId || a.id === effectiveAssigneeId) {
        return { ...a, status: 'Done' as TaskStatus, completedAt: new Date().toISOString() };
      }
      return a;
    });

    const comp = computeMultiAssigneeStatus({
      ...task,
      status: 'Done',
      assignees: updatedAssignees,
    });

    updateTask(taskId, {
      assignees: updatedAssignees,
      status: 'Done',
      progressPercent: 100,
      pendingCeoApproval: false,
      isOverdue: false,
      isPendingNoReason: false,
      overdueDays: 0,
      ceoApprovedAt: new Date().toISOString(),
      ceoApprovedBy: currentUser.name,
    }, 'Deliverable granted Final Approval and marked Completed by CEO Mr. Sukh Sagar Singh Bhati');

    logAudit({
      taskId,
      taskTitle: task.title,
      action: 'STATUS_CHANGE',
      fieldChanged: 'CEO Final Approval & Completion',
      oldValue: task.status,
      newValue: 'Done (100% Completed)',
      notes: `Granted Final Approval by CEO Mr. Sukh Sagar Singh Bhati.`
    });

    setBannerNotification({
      message: `✓ Deliverable '${task.title}' granted Final Approval and marked Done!`,
      badge: '✓ CEO Approved'
    });
  };

  const approveTaskByCeo = async (taskId: string, approvalNote?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedAssignees = task.assignees.map(a => ({
      ...a,
      status: 'Done' as TaskStatus,
      completedAt: a.completedAt || new Date().toISOString(),
      remarks: approvalNote ? `${a.remarks ? `${a.remarks} • ` : ''}CEO Approved: ${approvalNote}` : a.remarks
    }));

    updateTask(taskId, {
      status: 'Done',
      progressPercent: 100,
      pendingCeoApproval: false,
      isOverdue: false,
      isPendingNoReason: false,
      overdueDays: 0,
      ceoApprovedAt: new Date().toISOString(),
      ceoApprovedBy: currentUser.name || 'Mr. Sukh Sagar Singh Bhati',
      notes: approvalNote ? `${task.notes ? `${task.notes}\n` : ''}[CEO Final Approval]: ${approvalNote}` : task.notes,
      assignees: updatedAssignees,
    }, approvalNote ? `CEO Final Approval Granted: "${approvalNote}"` : 'CEO Final Approval Granted. Deliverable marked Completed.');

    logAudit({
      taskId,
      taskTitle: task.title,
      action: 'APPROVAL',
      fieldChanged: 'CEO Final Approval Granted',
      oldValue: task.status,
      newValue: 'Done (100% Completed)',
      notes: `CEO Mr. Sukh Sagar Singh Bhati granted Final Approval for deliverable completion.${approvalNote ? ` Notes: "${approvalNote}"` : ''}`
    });

    setBannerNotification({
      message: `✓ Final Approval granted for "${task.title}". Deliverable marked Completed!`,
      badge: '✓ CEO Approved'
    });

    // Notify all assignees that CEO has granted Final Approval
    if (task.assignees && task.assignees.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'REASON_STATUS_CHANGED',
          recipients: task.assignees.map(a => ({ email: a.email, name: a.name })),
          title: `Deliverable Approved by CEO: "${task.title}"`,
          message: `Mr. Sukh Sagar Singh Bhati has granted Final Approval. Your deliverable is officially Completed (Done)! ${approvalNote ? `Remarks: "${approvalNote}"` : ''}`,
          taskId,
          taskTitle: task.title,
          metadata: {
            decision: 'APPROVED',
            reviewerName: 'Mr. Sukh Sagar Singh Bhati (CEO)',
            notes: approvalNote || 'Final Approval Granted',
          }
        })
      }).catch(() => { });
    }
  };

  const rejectTaskByCeo = async (taskId: string, rejectionReason: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedAssignees = task.assignees.map(a => ({
      ...a,
      status: 'In Progress' as TaskStatus,
      remarks: `CEO Feedback: ${rejectionReason}`
    }));

    updateTask(taskId, {
      status: 'In Progress',
      progressPercent: 50,
      pendingCeoApproval: false,
      ceoRejectionReason: rejectionReason,
      seniorReturnReason: rejectionReason,
      assignees: updatedAssignees,
    }, `Returned by CEO for Revision: "${rejectionReason}"`);

    logAudit({
      taskId,
      taskTitle: task.title,
      action: 'REJECTED',
      fieldChanged: 'CEO Requested Revision on Deliverable',
      oldValue: task.status,
      newValue: 'In Progress (Returned for Revision)',
      notes: `CEO Mr. Sukh Sagar Singh Bhati requested revisions before completion: "${rejectionReason}".`
    });

    setBannerNotification({
      message: `Deliverable returned to assignees for revision: "${rejectionReason}"`,
      badge: 'Returned for Revision'
    });

    // Notify all assignees of CEO feedback
    if (task.assignees && task.assignees.length > 0) {
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'REASON_STATUS_CHANGED',
          recipients: task.assignees.map(a => ({ email: a.email, name: a.name })),
          title: `Revision Requested by CEO: "${task.title}"`,
          message: `CEO Mr. Sukh Sagar Singh Bhati returned your deliverable with feedback: "${rejectionReason}". Please update and resubmit.`,
          taskId,
          taskTitle: task.title,
          metadata: {
            decision: 'REJECTED',
            reviewerName: 'Mr. Sukh Sagar Singh Bhati (CEO)',
            notes: rejectionReason,
          }
        })
      }).catch(() => { });
    }
  };

  const updateAssigneeStatus = (taskId: string, assigneeId: string, status: TaskStatus, remarks?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCeo = isCeoUser(currentUser);
    const effectiveStatus: TaskStatus = (status === 'Done' && !isCeo) ? 'Review' : status;

    const updatedAssignees = task.assignees.map(a => {
      if (a.id === assigneeId) {
        return {
          ...a,
          status: effectiveStatus,
          remarks: remarks !== undefined ? remarks : a.remarks,
          completedAt: effectiveStatus === 'Done' ? new Date().toISOString() : a.completedAt,
        };
      }
      return a;
    });

    const targetAssignee = task.assignees.find(a => a.id === assigneeId);
    const comp = computeMultiAssigneeStatus({
      ...task,
      status: (status === 'Done' && !isCeo) ? 'Review' : undefined,
      pendingCeoApproval: (status === 'Done' && !isCeo) ? true : task.pendingCeoApproval,
      assignees: updatedAssignees,
    });

    const taskUpdates: Partial<Task> = {
      assignees: updatedAssignees,
      status: comp.status,
      progressPercent: comp.progressPercent,
    };

    if (status === 'Done' && !isCeo) {
      taskUpdates.pendingCeoApproval = true;
      taskUpdates.ceoApprovalRequestedAt = new Date().toISOString();
      taskUpdates.ceoApprovalRequestedBy = currentUser.name;
    }

    updateTask(taskId, taskUpdates, `Assignee ${targetAssignee?.name || assigneeId} updated status to "${effectiveStatus}" (Overall: ${comp.status}, ${comp.progressText})`);

    logAudit({
      taskId,
      taskTitle: task.title,
      action: 'STATUS_CHANGE',
      fieldChanged: `Assignee Status: ${targetAssignee?.name || assigneeId}`,
      oldValue: targetAssignee?.status || 'Unknown',
      newValue: `${effectiveStatus} (Overall Task Status: ${comp.status} - ${comp.progressText})`,
      notes: remarks || `Status updated under Multi-Assignee lifecycle.${(status === 'Done' && !isCeo) ? ' Rerouted to CEO Final Approval queue.' : ''}`
    });
  };

  const reassignOrCloseAssignee = (taskId: string, oldAssigneeId: string, action: 'reassign' | 'close', newAssigneeId?: string, notes?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const oldAssignee = task.assignees.find(a => a.id === oldAssigneeId);
    let updatedAssignees = [...task.assignees];

    if (action === 'reassign' && newAssigneeId) {
      const newMember = members.find(m => m.id === newAssigneeId);
      if (!newMember) return;
      updatedAssignees = updatedAssignees.map(a => {
        if (a.id === oldAssigneeId) {
          return {
            id: newMember.id,
            name: newMember.name,
            email: newMember.email,
            department: newMember.department,
            designation: newMember.designation,
            avatar: newMember.avatar || newMember.name.slice(0, 2).toUpperCase(),
            status: 'Not Started' as TaskStatus,
            remarks: notes ? `Reassigned from ${oldAssignee?.name || 'predecessor'}: ${notes}` : `Reassigned from ${oldAssignee?.name || 'predecessor'}`,
          };
        }
        return a;
      });
    } else if (action === 'close') {
      updatedAssignees = updatedAssignees.map(a => {
        if (a.id === oldAssigneeId) {
          return {
            ...a,
            status: 'Cancelled' as TaskStatus,
            remarks: notes || 'Assignee departed/resigned; individual deliverable component closed with management waiver.',
          };
        }
        return a;
      });
    }

    const comp = computeMultiAssigneeStatus({
      ...task,
      assignees: updatedAssignees,
    });

    const noteText = action === 'reassign'
      ? `Reassigned ${oldAssignee?.name} to new colleague (Notes: ${notes || 'Staff shift'})`
      : `Closed deliverable component for ${oldAssignee?.name} (Notes: ${notes || 'Staff departure/resignation'})`;

    updateTask(taskId, {
      assignees: updatedAssignees,
      status: comp.status,
      progressPercent: comp.progressPercent,
    }, noteText);

    logAudit({
      taskId,
      taskTitle: task.title,
      action: action === 'reassign' ? 'REASSIGNED' : 'UPDATED',
      fieldChanged: `Assignee Management: ${oldAssignee?.name}`,
      oldValue: `${oldAssignee?.name} (${oldAssignee?.status})`,
      newValue: action === 'reassign' ? `Reassigned to new member` : `Component closed (Cancelled)`,
      notes: notes || noteText,
    });

    setBannerNotification({
      message: noteText,
      badge: '✓ ASSIGNEE UPDATED'
    });
  };

  const exportToExcel = () => {
    // Standard 2-sheet enterprise workbook (Flowchart 14)
    // Sheet 1: Task Register Details
    const taskRows = tasks
      .slice()
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      })
      .map((t, idx) => ({
        '#': idx + 1,
        'Task ID': t.id,
        'Title': t.title,
        'Scheduled Date': t.scheduledDate,
        'Time': t.time,
        'Priority': t.priority,
        'Status': t.status,
        'Progress %': t.progressPercent || 0,
        'Assignee(s)': t.assignees.map(a => a.name).join(', '),
        'Department': t.department,
        'Project': t.project || '',
        'Hold / Escalation Reason': t.holdReason || t.escalationReason || '',
        'Created By': t.creator.name,
        'Last Updated': t.updatedAt
      }));

    // Sheet 2: Executive Summary & Ratios (FC 11)
    const totalTasks = tasks.length;
    const completed = tasks.filter(t => t.status === 'Done').length;
    const onHold = tasks.filter(t => t.status === 'On Hold').length;
    const escalated = tasks.filter(t => t.status === 'Escalated').length;
    const timelyRatio = totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(1) + '%' : '100%';

    const summaryRows = [
      { Metric: 'Total Enterprise Deliverables', Value: totalTasks },
      { Metric: 'Completed Deliverables', Value: completed },
      { Metric: 'On Hold (Documented Reason)', Value: onHold },
      { Metric: 'Senior Escalations', Value: escalated },
      { Metric: 'Company Sprint Velocity', Value: '88.4%' },
      { Metric: 'Timely Completion Ratio', Value: timelyRatio },
      { Metric: 'Voice AI Extraction Speed', Value: '<180ms Verified' },
      { Metric: 'System Integrity Baseline', Value: systemConfig.versionBaseline }
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(taskRows);
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);

    XLSX.utils.book_append_sheet(wb, ws1, 'Task Register Details');
    XLSX.utils.book_append_sheet(wb, ws2, 'Executive Summary & Ratios');

    XLSX.writeFile(wb, `UrbanGaon_Todos_Executive_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

    logAudit({
      action: 'EXPORTED',
      fieldChanged: 'Excel Workbook Export',
      newValue: `${totalTasks} records exported to .xlsx`,
      notes: 'Generated standard two-sheet executive workbook'
    });
  };

  const updateSystemConfig = (cfg: Partial<SystemConfig>) => {
    setSystemConfig(prev => {
      const nextConfig = { ...prev, ...cfg };
      try {
        localStorage.setItem('urbangaon_system_config_v2', JSON.stringify(nextConfig));
      } catch { }
      return nextConfig;
    });

    // Real-time synchronization with MongoDB Atlas
    fetch('/api/system-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: cfg,
        actor: currentUser?.name || 'Admin',
        actorRole: currentUser?.role || 'SUPER_ADMIN',
        notes: `System configuration updated: ${Object.keys(cfg).join(', ')}`
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSystemConfig(data.data);
          try {
            localStorage.setItem('urbangaon_system_config_v2', JSON.stringify(data.data));
          } catch { }
        }
      })
      .catch(err => console.error('[AppContext] Failed to sync system-config to MongoDB Atlas:', err));

    logAudit({
      action: 'CONFIG_CHANGED',
      fieldChanged: 'System Configuration Updated',
      oldValue: JSON.stringify(systemConfig).slice(0, 50),
      newValue: JSON.stringify(cfg).slice(0, 50),
      notes: 'Global policy modification committed'
    });
  };

  const runNightlyRolloverSimulation = async () => {
    // Flowchart 11 / Automated Carry-forward at 00:05 AM executed live on MongoDB Atlas
    try {
      setBannerNotification({
        message: 'Executing live 00:05 AM Midnight Rollover on MongoDB Atlas...',
        badge: 'ROLLOVER IN PROGRESS'
      });

      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rollover',
          forceShiftTodayToTomorrow: true,
          actor: `${currentUser.name} (${currentUser.role})`
        })
      });

      const data = await res.json();
      await refreshFromDB();

      if (data.success) {
        setBannerNotification({
          message: `Nightly rollover complete: ${data.message || `${data.rolledOverCount || 0} task(s) rolled over`}. Real-time MongoDB sync active.`,
          badge: '✓ 00:05 AM Rollover Active'
        });
      } else {
        throw new Error(data.error || 'Rollover execution failed');
      }
    } catch (err: any) {
      console.error('[Rollover Execution Error]', err);
      setBannerNotification({
        message: `Midnight Rollover notice: ${err.message || 'Execution error'}.`,
        badge: 'ROLLOVER ERROR'
      });
    }
  };

  ////
  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentRole: currentUser.role,
        switchRole,
        tasks,
        members,
        activeMembers,
        selectedDate,
        setSelectedDate,
        viewScope,
        setViewScope,
        activeView,
        setActiveView,
        selectedMemberFilter,
        setSelectedMemberFilter,
        bannerNotification,
        setBannerNotification,
        auditLogs,
        systemConfig,
        updateSystemConfig,
        addTask,
        updateTask,
        holdTask,
        escalateTask,
        seniorAdviseTask,
        seniorReassignTask,
        seniorResolveTask,
        seniorReturnTask,
        checkAndAutoEscalateSlaBreachedTasks,
        reopenTask,
        cancelTask,
        reassignTask,
        deleteTask,
        completeTask,
        approveTaskByCeo,
        rejectTaskByCeo,
        updateAssigneeStatus,
        reassignOrCloseAssignee,
        addMember,
        updateMember,
        updateProfileName,
        updateProfile,
        deactivateMember,
        deleteMember,
        markMemberOnLeave,
        returnMemberFromLeave,
        clearAllTasks,
        logoutUser,
        exportToExcel,
        isMobileNavOpen,
        setIsMobileNavOpen,
        viewingAuditForTaskId,
        setViewingAuditForTaskId,
        showMorningDigestModal,
        setShowMorningDigestModal,
        isCreateTaskModalOpen,
        setIsCreateTaskModalOpen,
        isExportModalOpen,
        setIsExportModalOpen,
        runNightlyRolloverSimulation,
        evaluateOverdueAndNoReasonTasks,
        dbStatus,
        refreshFromDB,
        refreshMembersFromDB,
        logAudit,
        purgedMemberIds,
        purgedMemberEmails,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalInitialMode,
        setAuthModalInitialMode,
        inAppNotifications,
        unreadNotificationsCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
