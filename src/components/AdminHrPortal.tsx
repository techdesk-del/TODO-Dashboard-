'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { isCeoUser, isAakashUser } from '@/lib/rosterData';
import { TeamMember, Task, TaskStatus } from '@/types';
import { 
  UserPlus, 
  Users, 
  UserX, 
  Check, 
  X, 
  Search, 
  Mail, 
  Building, 
  Briefcase, 
  Shield, 
  RefreshCw,
  Send,
  RotateCcw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Trash2,
  User,
  Phone,
  Building2,
  ArrowRight,
  AlertCircle,
  FileText,
  ShieldAlert,
  BarChart3,
  Edit3,
  ArrowRightLeft,
  FileSpreadsheet,
  Eye,
  Download,
  CheckSquare,
  Square,
  ChevronDown
} from 'lucide-react';

import { OFFICIAL_HOLIDAYS_2026_27, HOLIDAY_METADATA } from '@/lib/holidayData';
import { generateMultiSheetExcelWorkbook, downloadWorkbook } from '@/lib/exportUtils';
import { getTodayStr } from '@/lib/dateUtils';

export const AdminHrPortal: React.FC = () => {
  const { members, tasks, updateTask, reopenTask, deleteTask, addMember, updateMember, deactivateMember, deleteMember, markMemberOnLeave, returnMemberFromLeave, currentUser, systemConfig, logAudit } = useApp();
  const isCeo = isCeoUser(currentUser);

  const [activeTab, setActiveTab] = useState<'oversight' | 'reports' | 'create_user' | 'pending_approvals' | 'deactivation' | 'holidays' | 'directory' | 'email_logs'>('oversight');
  const [selectedUserForOversight, setSelectedUserForOversight] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Flowchart A: Search-as-you-type, Dept & Manager Filters, Interventions
  const [departmentFilterForOversight, setDepartmentFilterForOversight] = useState<string>('ALL');

  // Flowchart 23: Staff Leave & Holiday Handling State
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [leaveTargetMember, setLeaveTargetMember] = useState<TeamMember | null>(null);
  const [leaveModalStartDate, setLeaveModalStartDate] = useState<string>(getTodayStr());
  const [leaveModalEndDate, setLeaveModalEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [leaveTaskAction, setLeaveTaskAction] = useState<'AUTO_EXTEND' | 'FLAG_ADMIN'>('AUTO_EXTEND');
  const [leaveNotesInput, setLeaveNotesInput] = useState<string>('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState<boolean>(false);
  const [managerFilterForOversight, setManagerFilterForOversight] = useState<string>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editStatus, setEditStatus] = useState<TaskStatus>('In Progress');
  const [editReason, setEditReason] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [showBulkReassignModal, setShowBulkReassignModal] = useState<boolean>(false);
  const [bulkReassignTargetMemberId, setBulkReassignTargetMemberId] = useState<string>('');

  // Flowchart B (Flowchart 11: Admin - Reports and Performance Ratio)
  const [reportType, setReportType] = useState<'USER_WISE' | 'PERFORMANCE_RATIO' | 'PENDING' | 'ESCALATED' | 'ON_HOLD' | 'DEPARTMENT'>('PERFORMANCE_RATIO');
  const [reportSelectedEmployeeId, setReportSelectedEmployeeId] = useState<string>('');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportPendingStatus, setReportPendingStatus] = useState<string>('ALL');
  const [reportDepartment, setReportDepartment] = useState<string>('ALL');

  // Reopen Task Modal State
  const [taskToReopen, setTaskToReopen] = useState<Task | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');

  // Flowchart 20 & Flowchart 26: Email Logs Table State (Admin & Super Admin)
  const [emailLogs, setEmailLogs] = useState<Array<{
    _id?: string;
    id?: string;
    recipientEmail: string;
    recipientName?: string;
    eventType: string;
    subject: string;
    bodyText?: string;
    status: 'DELIVERED' | 'FAILED' | 'PENDING';
    errorMessage?: string;
    retries?: number;
    taskId?: string;
    taskTitle?: string;
    createdAt: string;
  }>>([]);
  const [emailLogStats, setEmailLogStats] = useState<{ total: number; delivered: number; failed: number }>({
    total: 0,
    delivered: 0,
    failed: 0,
  });
  const [emailLogFilter, setEmailLogFilter] = useState<'ALL' | 'DELIVERED' | 'FAILED'>('ALL');
  const [emailLogSearch, setEmailLogSearch] = useState<string>('');
  const [isFetchingEmailLogs, setIsFetchingEmailLogs] = useState<boolean>(false);
  const [retryingEmailId, setRetryingEmailId] = useState<string | null>(null);
  const [retryBanner, setRetryBanner] = useState<string | null>(null);

  const fetchEmailLogs = useCallback(async () => {
    setIsFetchingEmailLogs(true);
    try {
      const res = await fetch(`/api/notifications/email-logs?limit=100&_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setEmailLogs(json.data);
          if (json.stats) {
            setEmailLogStats(json.stats);
          }
        }
      }
    } catch (err) {
      console.warn('[AdminHrPortal] failed to fetch email logs', err);
    } finally {
      setIsFetchingEmailLogs(false);
    }
  }, []);

  const retryDispatch = async (log: any) => {
    const logId = log._id || log.id || '';
    setRetryingEmailId(logId);
    try {
      const res = await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: log.eventType,
          recipients: [{ email: log.recipientEmail, name: log.recipientName || '' }],
          title: log.subject,
          message: log.bodyText || log.subject,
          taskId: log.taskId,
          taskTitle: log.taskTitle
        })
      });
      if (res.ok) {
        setRetryBanner(`✓ Dispatched retry email to ${log.recipientEmail}`);
        fetchEmailLogs();
      } else {
        setRetryBanner(`Retry failed: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setRetryBanner(`Retry error: ${err.message}`);
    } finally {
      setRetryingEmailId(null);
    }
  };

  // Flowchart: Staff Directory & Corporate Email Configuration
  const [memberToEditEmail, setMemberToEditEmail] = useState<TeamMember | null>(null);
  const [newEmailInput, setNewEmailInput] = useState<string>('');
  const [emailChangeReason, setEmailChangeReason] = useState<string>('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState<boolean>(false);
  const [emailUpdateError, setEmailUpdateError] = useState<string | null>(null);

  // Directory filter state
  const [directorySearchQuery, setDirectorySearchQuery] = useState<string>('');
  const [directoryDeptFilter, setDirectoryDeptFilter] = useState<string>('ALL');
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<string>('ALL');
  
  // Flowchart: Employee Provisioning (Admin Dashboard -> Create Employee)
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [emailExistsError, setEmailExistsError] = useState<string | null>(null);
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEmployeeId, setNewUserEmployeeId] = useState('');
  const [newUserDept, setNewUserDept] = useState('');
  const [newUserDesignation, setNewUserDesignation] = useState('');
  const [newUserReportingManagerId, setNewUserReportingManagerId] = useState('');
  const [newUserRole, setNewUserRole] = useState<'EMPLOYEE' | 'MANAGER' | 'ADMIN'>('EMPLOYEE');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [provisionedDetails, setProvisionedDetails] = useState<{
    employeeId: string;
    code: string;
    link: string;
    email: string;
    name: string;
  } | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);


  // Deactivation Handover state (Flowchart 4 & 18)
  const [deactivationSubTab, setDeactivationSubTab] = useState<'form' | 'archive'>('form');
  const [departingMemberId, setDepartingMemberId] = useState<string>('');
  const [successorMemberId, setSuccessorMemberId] = useState<string>('');
  const [deactivationType, setDeactivationType] = useState<'Resignation' | 'Termination' | 'Long leave'>('Resignation');
  const [lastWorkingDay, setLastWorkingDay] = useState<string>(getTodayStr());
  const [effectiveDate, setEffectiveDate] = useState<string>(getTodayStr());
  const [leaveStartDate, setLeaveStartDate] = useState<string>(getTodayStr());
  const [leaveEndDate, setLeaveEndDate] = useState<string>('');
  const [deactivationReason, setDeactivationReason] = useState<string>('Resignation');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [handoverAcknowledged, setHandoverAcknowledged] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState<string | null>(null);

  // Active vs Deactivated members
  const activeMembers = useMemo(() => {
    return members.filter(m => m && m.status !== 'DEACTIVATED' && (m as any).isDeactivated !== true);
  }, [members]);

  const deactivatedMembers = useMemo(() => {
    return members.filter(m => m && (m.status === 'DEACTIVATED' || (m as any).isDeactivated === true));
  }, [members]);

  // Offboardable active members (excluding deactivated staff and CEO)
  const offboardableMembers = useMemo(() => {
    const list = activeMembers.filter(m => !isCeoUser(m) && m.status !== 'DEACTIVATED' && (m as any).isDeactivated !== true);
    // Deduplicate by clean email and name so duplicate records don't appear repeatedly
    const seen = new Set<string>();
    const unique: TeamMember[] = [];
    for (const m of list) {
      const key = (m.email || m.name || m.id).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(m);
      }
    }
    return unique;
  }, [activeMembers]);


  // Flowchart: Reporting Managers (Managers, Admins, Super Admin/CEO)
  const reportingManagers = useMemo(() => {
    return activeMembers.filter(m => m.role === 'MANAGER' || m.role === 'ADMIN' || m.role === 'SUPER_ADMIN' || isCeoUser(m));
  }, [activeMembers]);

  // Derived current departing and successor members
  const departingMember = useMemo(() => {
    if (departingMemberId) {
      const found = offboardableMembers.find(m => m.id === departingMemberId);
      if (found) return found;
    }
    return offboardableMembers[0] || null;
  }, [departingMemberId, offboardableMembers]);

  const successorMember = useMemo(() => {
    if (successorMemberId) {
      return members.find(m => m.id === successorMemberId) || null;
    }
    return activeMembers.find(m => m.id !== departingMember?.id) || members.find(m => m.id !== departingMember?.id) || null;
  }, [successorMemberId, activeMembers, departingMember?.id, members]);

  // Active in-flight tasks for departing member
  const departingActiveTasks = useMemo(() => {
    if (!departingMember) return [];
    const activeStatuses: TaskStatus[] = ['In Progress', 'Queued', 'On Hold', 'Escalated', 'Review'];
    return tasks.filter(t => {
      if (!activeStatuses.includes(t.status)) return false;
      return t.assignees.some(a => 
        a.id === departingMember.id || 
        a.name.toLowerCase() === departingMember.name.toLowerCase() ||
        (departingMember.email && a.email.toLowerCase() === departingMember.email.toLowerCase())
      );
    });
  }, [departingMember, tasks]);

  // Pending sign-up requests queue (FC 2 & 3)
  const [pendingRequests, setPendingRequests] = useState<Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    reason?: string;
    manager?: string;
    appliedAt: string;
  }>>([]);
  const [approvalBanner, setApprovalBanner] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [isFetchingRequests, setIsFetchingRequests] = useState(false);

  // Flowchart 3: Request Details & Verification Modal State
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    reason?: string;
    manager?: string;
    appliedAt: string;
  } | null>(null);
  const [verifyDept, setVerifyDept] = useState('');
  const [verifyDesignation, setVerifyDesignation] = useState('');
  const [verifyManager, setVerifyManager] = useState('');
  const [verifyManagerEmail, setVerifyManagerEmail] = useState('');
  const [verifyEmployeeId, setVerifyEmployeeId] = useState('');

  // Flowchart 3: Rejection Reason Modal State
  const [rejectionModalRequest, setRejectionModalRequest] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [rejectionInputReason, setRejectionInputReason] = useState('');

  const openRequestReview = (req: typeof pendingRequests[0]) => {
    setSelectedRequestForReview(req);
    setVerifyDept(req.department || 'General Staff');
    setVerifyDesignation(req.designation || 'Specialist');
    setVerifyManager(req.manager || 'Dr. Rekha Pareek');
    setVerifyManagerEmail('rekha.pareek@urbangaon.com');
    setVerifyEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Fetch live pending self sign-up requests from MongoDB Atlas (FC 2 & 3)
  const fetchPendingRequests = useCallback(async (quiet = false, signal?: AbortSignal) => {
    if (!quiet && isMountedRef.current) setIsFetchingRequests(true);
    try {
      if (typeof document !== 'undefined' && document.hidden && quiet) {
        return;
      }
      const res = await fetch(`/api/auth/request-access?_t=${Date.now()}`, { 
        cache: 'no-store',
        signal,
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.success && Array.isArray(json.data) && isMountedRef.current) {
          setPendingRequests(json.data);
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        return;
      }
      // Silently handle background polling dropouts without throwing Next.js dev console errors
      if (!quiet) {
        console.warn('[AdminHrPortal] notice: pending requests fetch unavailable', err?.message || e);
      }
    } finally {
      if (!quiet && isMountedRef.current) setIsFetchingRequests(false);
    }
  }, []);

  // Real-time synchronization via BroadcastChannel ('urbangaon_auth_sync') and background polling
  useEffect(() => {
    const controller = new AbortController();
    fetchPendingRequests(false, controller.signal);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('urbangaon_auth_sync');
        bc.onmessage = (event) => {
          const msg = event.data;
          if (!msg || !msg.action) return;

          if (msg.action === 'REQUEST_SUBMITTED' && msg.request) {
            setPendingRequests(prev => {
              if (prev.some(r => r.id === msg.request.id || r.email?.toLowerCase() === msg.request.email?.toLowerCase())) {
                return prev;
              }
              return [msg.request, ...prev];
            });
          } else if (msg.action === 'REQUEST_RESOLVED' && msg.id) {
            setPendingRequests(prev => prev.filter(r => r.id !== msg.id));
          } else if (msg.action === 'REQUEST_RESTORE' && msg.request) {
            setPendingRequests(prev => {
              if (prev.some(r => r.id === msg.request.id)) return prev;
              return [msg.request, ...prev];
            });
          }
        };
      }
    } catch {}

    // Real-time heartbeat poll every 5 seconds when tab is active
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && isMountedRef.current) {
        fetchPendingRequests(true);
      }
    }, 5000);

    return () => {
      controller.abort();
      clearInterval(interval);
      bc?.close();
    };
  }, [fetchPendingRequests]);

  // Flowchart A: Calculate filtered deliverables with Department and Reporting Manager filters
  const isAllUsers = selectedUserForOversight === 'ALL';
  const targetOversightMember = isAllUsers ? null : members.find(m => m.name === selectedUserForOversight || m.id === selectedUserForOversight);

  // Filter members list based on department and manager filters for oversight combobox
  const oversightFilteredMembers = useMemo(() => {
    return activeMembers.filter(m => {
      if (departmentFilterForOversight !== 'ALL' && m.department !== departmentFilterForOversight) {
        return false;
      }
      if (managerFilterForOversight !== 'ALL') {
        const mgr = reportingManagers.find(rm => rm.name === managerFilterForOversight || rm.id === managerFilterForOversight);
        const matchMgrId = m.managerId && mgr && m.managerId === mgr.id;
        const matchMgrName = m.manager && mgr && m.manager.toLowerCase().includes(mgr.name.toLowerCase());
        if (!matchMgrId && !matchMgrName) return false;
      }
      return true;
    });
  }, [activeMembers, departmentFilterForOversight, managerFilterForOversight, reportingManagers]);

  // Search-as-you-type member matching
  const searchMatchedMembers = useMemo(() => {
    if (!userSearchQuery.trim()) return oversightFilteredMembers;
    const q = userSearchQuery.toLowerCase();
    return oversightFilteredMembers.filter(m => 
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.employeeId && m.employeeId.toLowerCase().includes(q)) ||
      m.department.toLowerCase().includes(q) ||
      (m.designation && m.designation.toLowerCase().includes(q))
    );
  }, [oversightFilteredMembers, userSearchQuery]);

  // Filtered members for directory tab
  const filteredDirectoryMembers = useMemo(() => {
    return members.filter(m => {
      if (directoryDeptFilter !== 'ALL' && m.department !== directoryDeptFilter) return false;
      if (directoryStatusFilter !== 'ALL' && (m.status || 'ACTIVE') !== directoryStatusFilter) return false;
      if (directorySearchQuery.trim()) {
        const q = directorySearchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.employeeId && m.employeeId.toLowerCase().includes(q)) ||
          m.department.toLowerCase().includes(q) ||
          (m.designation && m.designation.toLowerCase().includes(q)) ||
          m.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, directoryDeptFilter, directoryStatusFilter, directorySearchQuery]);

  const baseTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Department filter
      if (departmentFilterForOversight !== 'ALL' && t.department !== departmentFilterForOversight) {
        return false;
      }

      // 2. Reporting Manager filter (matches tasks where assignees report to manager)
      if (managerFilterForOversight !== 'ALL') {
        const mgr = reportingManagers.find(rm => rm.name === managerFilterForOversight || rm.id === managerFilterForOversight);
        const hasManagedAssignee = t.assignees.some(a => {
          const staffMember = members.find(m => m.id === a.id || m.email.toLowerCase() === (a.email || '').toLowerCase());
          if (!staffMember) return false;
          return (staffMember.managerId && mgr && staffMember.managerId === mgr.id) ||
                 (staffMember.manager && mgr && staffMember.manager.toLowerCase().includes(mgr.name.toLowerCase()));
        });
        if (!hasManagedAssignee) return false;
      }

      // 3. User filter
      if (!isAllUsers) {
        const targetName = targetOversightMember?.name || selectedUserForOversight;
        const matchesUser = t.assignees.some(a => 
          a.name.toLowerCase().includes(targetName.toLowerCase()) ||
          (targetOversightMember?.email && (a.email || '').toLowerCase() === targetOversightMember.email.toLowerCase())
        );
        if (!matchesUser) return false;
      }

      return true;
    });
  }, [tasks, departmentFilterForOversight, managerFilterForOversight, isAllUsers, targetOversightMember, selectedUserForOversight, reportingManagers, members]);

  const filteredTasks = useMemo(() => {
    return baseTasks.filter(t => {
      // Status filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      // Search query filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchProject = (t.project || '').toLowerCase().includes(q);
        const matchAssignee = t.assignees.some(a => a.name.toLowerCase().includes(q));
        if (!matchTitle && !matchProject && !matchAssignee) return false;
      }
      return true;
    }).slice().sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [baseTasks, statusFilter, searchFilter]);

  // KPI calculations
  const totalMonitored = baseTasks.length;
  const completedCount = baseTasks.filter(t => t.status === 'Done').length;
  const inProgressCount = baseTasks.filter(t => t.status === 'In Progress').length;
  const onHoldCount = baseTasks.filter(t => t.status === 'On Hold').length;
  const escalatedCount = baseTasks.filter(t => t.status === 'Escalated').length;

  // Flowchart B: Calculate metrics using written formulas
  const reportMetrics = useMemo(() => {
    let filtered = tasks;

    if (reportType === 'USER_WISE') {
      if (reportSelectedEmployeeId) {
        const targetMember = members.find(m => m.id === reportSelectedEmployeeId);
        const name = (targetMember?.name || '').toLowerCase();
        // Flowchart 22: Exclude Cancelled tasks from performance reports
        filtered = tasks.filter(t => t.status !== 'Cancelled' && t.assignees.some(a => a.id === reportSelectedEmployeeId || a.name.toLowerCase().includes(name)));
      }
    } else if (reportType === 'PERFORMANCE_RATIO') {
      // Flowchart 22: "Set status Cancelled exclude from performance reports"
      filtered = filtered.filter(t => t.status !== 'Cancelled');
      if (reportStartDate) filtered = filtered.filter(t => t.scheduledDate >= reportStartDate);
      if (reportEndDate) filtered = filtered.filter(t => t.scheduledDate <= reportEndDate);
    } else if (reportType === 'PENDING') {
      filtered = filtered.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
      if (reportPendingStatus !== 'ALL') {
        filtered = filtered.filter(t => t.status === reportPendingStatus);
      }
    } else if (reportType === 'ESCALATED') {
      filtered = filtered.filter(t => t.status === 'Escalated' || Boolean(t.escalationReason));
    } else if (reportType === 'ON_HOLD') {
      filtered = filtered.filter(t => t.status === 'On Hold' || Boolean(t.holdReason));
    } else if (reportType === 'DEPARTMENT') {
      if (reportDepartment !== 'ALL') {
        filtered = filtered.filter(t => t.department === reportDepartment);
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const totalCount = filtered.length;
    const completedTasks = filtered.filter(t => t.status === 'Done');
    const totalCompleted = completedTasks.length;

    // Written Formula: Late completion count = completed after scheduled date
    const lateCompleted = completedTasks.filter(t => {
      const completionDate = (t.updatedAt || '').split('T')[0] || t.scheduledDate;
      return completionDate > t.scheduledDate;
    });
    const onTimeCompleted = completedTasks.filter(t => {
      const completionDate = (t.updatedAt || '').split('T')[0] || t.scheduledDate;
      return completionDate <= t.scheduledDate;
    });

    // Written Formula: Timely completion ratio = (onTimeCompleted / totalCompleted) * 100%
    const timelyCompletionRatio = totalCompleted > 0
      ? ((onTimeCompleted.length / totalCompleted) * 100).toFixed(1) + '%'
      : '100.0%';

    // Written Formula: Pending with reason categorized vs Pending without reason
    const pendingTasks = filtered.filter(t => t.status !== 'Done' && t.status !== 'Cancelled');
    const pendingWithReason = pendingTasks.filter(t => Boolean(t.holdReason || t.escalationReason || t.pastDueReason));
    const pendingWithoutReason = pendingTasks.filter(t => !Boolean(t.holdReason || t.escalationReason || t.pastDueReason) && t.scheduledDate < todayStr);

    // Written Formula: Escalated count & On-hold count
    const fcEscalatedCount = filtered.filter(t => t.status === 'Escalated' || Boolean(t.escalationReason)).length;
    const fcOnHoldCount = filtered.filter(t => t.status === 'On Hold' || Boolean(t.holdReason)).length;

    // Written Formula: Reschedule count per person
    const rescheduleMap: Record<string, number> = {};
    filtered.forEach(t => {
      const resched = t.carryForwardCount || 0;
      if (resched > 0) {
        t.assignees.forEach(a => {
          rescheduleMap[a.name] = (rescheduleMap[a.name] || 0) + resched;
        });
      }
    });

    return {
      filtered,
      totalCount,
      totalCompleted,
      lateCompletedCount: lateCompleted.length,
      onTimeCompletedCount: onTimeCompleted.length,
      timelyCompletionRatio,
      pendingCount: pendingTasks.length,
      pendingWithReasonCount: pendingWithReason.length,
      pendingWithoutReasonCount: pendingWithoutReason.length,
      escalatedCount: fcEscalatedCount,
      onHoldCount: fcOnHoldCount,
      rescheduleMap
    };
  }, [tasks, members, reportType, reportSelectedEmployeeId, reportStartDate, reportEndDate, reportPendingStatus, reportDepartment]);

  // Flowchart A: Admin Actions (Edit, Bulk Reassign, Export)
  const handleConfirmEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToEdit) return;

    const updates: Partial<Task> = {
      status: editStatus,
      notes: editRemarks.trim() || taskToEdit.notes,
      editedByAdmin: true,
    };
    if (editStatus === 'On Hold') {
      updates.holdReason = editReason.trim() || 'Admin placed on hold';
    } else if (editStatus === 'Escalated') {
      updates.escalationReason = editReason.trim() || 'Admin escalated';
    }

    updateTask(taskToEdit.id, updates, `Admin modified task: status=${editStatus}`);

    logAudit({
      taskId: taskToEdit.id,
      taskTitle: taskToEdit.title,
      action: 'UPDATED',
      fieldChanged: 'Status, Reason & Remarks (Admin Intervention)',
      oldValue: `Status: ${taskToEdit.status}`,
      newValue: `Status: ${editStatus}, Reason: ${editReason || 'N/A'}`,
      notes: `Admin oversight intervention. Remarks: ${editRemarks || 'None'}`
    });

    setTaskToEdit(null);
  };

  const handleConfirmBulkReassign = () => {
    if (selectedTaskIds.length === 0 || !bulkReassignTargetMemberId) return;
    const targetMember = members.find(m => m.id === bulkReassignTargetMemberId);
    if (!targetMember) return;

    selectedTaskIds.forEach(tId => {
      const task = tasks.find(t => t.id === tId);
      if (!task) return;

      const newAssignee = {
        id: targetMember.id,
        name: targetMember.name,
        email: targetMember.email,
        department: targetMember.department,
        designation: targetMember.designation,
        avatar: targetMember.avatar,
        status: task.status,
      };

      updateTask(task.id, {
        assignees: [newAssignee],
        editedByAdmin: true
      }, `Admin bulk reassigned task to ${targetMember.name}`);

      logAudit({
        taskId: task.id,
        taskTitle: task.title,
        action: 'REASSIGNED',
        fieldChanged: 'Assignee Reassignment',
        oldValue: task.assignees.map(a => a.name).join(', '),
        newValue: targetMember.name,
        notes: `Bulk reassigned by Admin. New Assignee: ${targetMember.name} (${targetMember.email})`
      });
    });

    setSelectedTaskIds([]);
    setShowBulkReassignModal(false);
    setBulkReassignTargetMemberId('');
  };

  const handleExportCurrentEmployeeTasks = () => {
    const tasksToExport = filteredTasks;
    const { workbook, filename } = generateMultiSheetExcelWorkbook({
      tasks: tasksToExport,
      currentUser,
      filterOpts: {
        exportType: 'USER_WISE',
        selectedUserName: selectedUserForOversight,
      }
    });
    downloadWorkbook(workbook, filename);
    logAudit({
      action: 'EXPORTED',
      fieldChanged: 'Employee Tasks Excel Export',
      newValue: `${filename} (${tasksToExport.length} tasks)`,
      notes: `Admin exported deliverables for ${selectedUserForOversight}`
    });
  };

  const handleExportReportExcel = () => {
    const { filtered, timelyCompletionRatio } = reportMetrics;
    const { workbook } = generateMultiSheetExcelWorkbook({
      tasks: filtered,
      currentUser,
      filterOpts: {
        exportType: 'WHOLE_TASKS',
      }
    });
    downloadWorkbook(workbook, `UrbanGaon_Report_${reportType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
    logAudit({
      action: 'EXPORTED',
      fieldChanged: 'Executive Report & Performance Ratios Export',
      newValue: `${filtered.length} deliverables exported (Timely Ratio: ${timelyCompletionRatio})`,
      notes: `Executive Report Export (${reportType}) with written formula metrics`
    });
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailExistsError(null);
    setInviteSuccessMsg(null);
    setProvisionedDetails(null);

    const cleanEmail = newUserEmail.trim().toLowerCase();
    const cleanName = newUserName.trim();
    const cleanPhone = newUserPhone.trim();
    const cleanId = (newUserEmployeeId.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`);

    if (!cleanName) {
      alert('Full legal name is required.');
      return;
    }
    if (!cleanEmail) {
      alert('Official corporate email is required.');
      return;
    }

    // Flowchart: Decision Diamond: Email already exists?
    const emailExists = members.some(m => m.email.toLowerCase() === cleanEmail);
    if (emailExists) {
      setEmailExistsError(`Email already exists: An employee account with email "${cleanEmail}" is already registered. Please enter a unique corporate email address.`);
      return;
    }

    // Unique Employee ID check
    const idExists = members.some(m => m.id === cleanId || m.employeeId === cleanId);
    if (idExists) {
      alert(`Employee ID "${cleanId}" is already assigned to another employee. Please assign a unique employee ID.`);
      return;
    }

    if (!cleanPhone) {
      alert('Phone number is required.');
      return;
    }
    if (!newUserDept) {
      alert('Please select a Master Department from dropdown.');
      return;
    }
    if (!newUserDesignation.trim()) {
      alert('Please enter an official designation.');
      return;
    }
    if (!newUserReportingManagerId) {
      alert('Please select a Reporting Manager.');
      return;
    }

    const selectedManager = members.find(m => m.id === newUserReportingManagerId);

    setIsSubmittingUser(true);
    try {
      // Flowchart Steps:
      // - Assign unique employee ID
      // - Select Department from dropdown
      // - Enter designation
      // - Select reporting manager
      // - Set role as Employee
      // - Generate one-time set-password link
      // - Send set-password email to employee
      // - Employee record created in status Pending First Login
      // - Audit log entry created
      const created = await addMember({
        id: cleanId,
        employeeId: cleanId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        department: newUserDept,
        designation: newUserDesignation.trim(),
        role: 'EMPLOYEE',
        avatar: '/urbangaon-employee-emblem.png',
        managerId: selectedManager?.id,
        manager: selectedManager?.name,
        managerEmail: selectedManager?.email,
        status: 'Pending First Login',
      });

      // Obtain generated one-time link and code
      let invCode = '';
      let setPwdLink = '';
      try {
        const invRes = await fetch('/api/auth/invitation/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            role: 'EMPLOYEE',
            department: newUserDept,
            designation: newUserDesignation.trim(),
            invitedBy: currentUser.name || 'Admin / Talent HR',
          })
        });
        const invData = await invRes.json();
        if (invData.success && invData.invitation) {
          invCode = invData.invitation.code;
          const host = window.location.origin;
          setPwdLink = `${host}/?inviteCode=${invCode}&email=${encodeURIComponent(cleanEmail)}`;
        }
      } catch {}

      setInviteSuccessMsg(`✓ Employee record created for ${cleanName} in status "Pending First Login". One-time set-password link dispatched!`);
      setProvisionedDetails({
        employeeId: cleanId,
        code: invCode,
        link: setPwdLink,
        email: cleanEmail,
        name: cleanName,
      });

      setNewUserName('');
      setNewUserEmail('');
      setEmailExistsError(null);
      setNewUserPhone('');
      setNewUserEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewUserDept('');
      setNewUserDesignation('');
      setNewUserReportingManagerId('');
      setNewUserRole('EMPLOYEE');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to provision employee';
      if (errorMsg.toLowerCase().includes('email already exists')) {
        setEmailExistsError(errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleApproveRequest = async (
    req: typeof pendingRequests[0],
    overrides?: {
      department?: string;
      designation?: string;
      manager?: string;
      managerEmail?: string;
      employeeId?: string;
    }
  ) => {
    if (approvingId || rejectingId) return;
    setApprovingId(req.id);
    setSelectedRequestForReview(null);

    // 1. Instant Optimistic UI: remove row immediately from pending queue with zero lag
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));

    // 2. Broadcast instant removal across all open browser tabs in real-time
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbangaon_auth_sync');
        bc.postMessage({ action: 'REQUEST_RESOLVED', id: req.id });
        bc.close();
      }
    } catch {}

    const deptToAssign = overrides?.department || verifyDept || req.department || 'General Staff';
    const desigToAssign = overrides?.designation || verifyDesignation || req.designation || 'Specialist';
    const mgrToAssign = overrides?.manager || verifyManager || req.manager || 'Talent Management Desk';
    const mgrEmailToAssign = overrides?.managerEmail || verifyManagerEmail;
    const empIdToAssign = overrides?.employeeId || verifyEmployeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Instant feedback banner
    setApprovalBanner(`Approving ${req.name} (Assigned ID: ${empIdToAssign}). Provisioning status: Pending First Login...`);

    try {
      const patchRes = await fetch(`/api/auth/request-access/${encodeURIComponent(req.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          role: 'EMPLOYEE',
          reviewedBy: currentUser.name || 'Admin / Talent HR',
          department: deptToAssign,
          designation: desigToAssign,
          manager: mgrToAssign,
          managerEmail: mgrEmailToAssign,
          employeeId: empIdToAssign,
        }),
      });
      const patchData = await patchRes.json().catch(() => ({}));

      if (!patchRes.ok || !patchData.success) {
        throw new Error(patchData.error || 'Server approval failed');
      }

      const codeMsg = patchData.invitationCode ? ` Official Invitation Code Issued: [${patchData.invitationCode}].` : '';
      setApprovalBanner(`✓ Account approved for ${req.name} (${req.email}). ID: [${empIdToAssign}]. Status: Pending First Login.${codeMsg} One-time activation link dispatched.`);
      setTimeout(() => setApprovalBanner(null), 10000);

      // Audit log entry created on client
      try {
        logAudit({
          action: 'APPROVAL',
          fieldChanged: 'Sign-Up Request Approval',
          oldValue: `Pending Request: ${req.email}`,
          newValue: `Approved ID: ${empIdToAssign} (Pending First Login)`,
          notes: `Admin ${currentUser.name} approved access request for ${req.name}. Assigned ${empIdToAssign}, Dept: ${deptToAssign}.`
        });
      } catch {}

      // Async background sync with AppContext member cache
      addMember({
        id: empIdToAssign,
        name: req.name,
        email: req.email,
        department: deptToAssign,
        designation: desigToAssign,
        role: 'EMPLOYEE',
        status: 'Pending First Login'
      }).catch(e => console.warn('[AdminHrPortal] Background member roster sync:', e));

    } catch (err) {
      console.error('Approval failed', err);
      // Rollback on failure
      setPendingRequests(prev => {
        if (prev.some(r => r.id === req.id)) return prev;
        return [req, ...prev];
      });
      // Broadcast rollback
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('urbangaon_auth_sync');
          bc.postMessage({ action: 'REQUEST_RESTORE', request: req });
          bc.close();
        }
      } catch {}
      setApprovalBanner(`Failed to approve ${req.name}: ${err instanceof Error ? err.message : 'Network error'}. Request restored.`);
      setTimeout(() => setApprovalBanner(null), 8000);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectRequest = async (id: string, name: string, documentedReason?: string) => {
    if (approvingId || rejectingId) return;
    let reason = documentedReason;
    if (!reason || !reason.trim()) {
      const promptReason = prompt(`Enter mandatory written rejection reason for ${name}:`);
      if (!promptReason || !promptReason.trim()) return;
      reason = promptReason.trim();
    }

    setRejectingId(id);
    setSelectedRequestForReview(null);
    setRejectionModalRequest(null);
    const existingReq = pendingRequests.find(r => r.id === id);

    // Instant optimistic removal
    setPendingRequests(prev => prev.filter(r => r.id !== id));

    // Broadcast instant removal across tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('urbangaon_auth_sync');
        bc.postMessage({ action: 'REQUEST_RESOLVED', id });
        bc.close();
      }
    } catch {}

    setApprovalBanner(`Applicant ${name} rejected. Formal notification email dispatching...`);

    try {
      const res = await fetch(`/api/auth/request-access/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          reason: reason.trim(),
          reviewedBy: currentUser.name || 'Admin / Talent HR',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server error recording rejection');
      }

      // Audit log entry created on client
      try {
        logAudit({
          action: 'REJECTED',
          fieldChanged: 'Sign-Up Request Rejection',
          oldValue: `Pending Request: ${name}`,
          newValue: `Rejected ("${reason.trim()}")`,
          notes: `Admin ${currentUser.name} rejected access request for ${name}. Reason: "${reason.trim()}". Rejection email dispatched.`
        });
      } catch {}

      setApprovalBanner(`✓ Rejection recorded for ${name}. Rejection email dispatched with documented rationale.`);
      setTimeout(() => setApprovalBanner(null), 6000);
    } catch (err) {
      console.error('Rejection failed', err);
      if (existingReq) {
        setPendingRequests(prev => [existingReq, ...prev]);
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const bc = new BroadcastChannel('urbangaon_auth_sync');
            bc.postMessage({ action: 'REQUEST_RESTORE', request: existingReq });
            bc.close();
          }
        } catch {}
      }
      setApprovalBanner(`Could not reject ${name}: ${err instanceof Error ? err.message : 'Network error'}.`);
      setTimeout(() => setApprovalBanner(null), 8000);
    } finally {
      setRejectingId(null);
    }
  };

  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToReopen) return;
    if (!reopenReason.trim()) {
      alert('Mandatory justification is required to reopen this task.');
      return;
    }

    reopenTask(taskToReopen.id, reopenReason.trim());
    setTaskToReopen(null);
    setReopenReason('');
  };

  const handleConfirmDeactivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departingMember) {
      setDeactivationError('Please select an employee to offboard.');
      return;
    }
    if (isCeoUser(departingMember)) {
      setDeactivationError('Executive Command Protection: CEO Mr. Sukh Sagar Singh Bhati cannot be deactivated under corporate governance.');
      return;
    }
    if (!successorMember) {
      setDeactivationError('Please designate an active successor to receive the deliverables.');
      return;
    }
    if (departingMember.id === successorMember.id) {
      setDeactivationError('Successor cannot be the same departing employee. Please select another active team member.');
      return;
    }
    if (!handoverAcknowledged) {
      setDeactivationError('Please acknowledge the transfer and credentials deactivation confirmation before proceeding.');
      return;
    }

    setIsDeactivating(true);
    setDeactivationError(null);

    try {
      const dateInfo = deactivationType === 'Resignation'
        ? `Last Working Day: ${lastWorkingDay}`
        : deactivationType === 'Termination'
          ? `Effective Date: ${effectiveDate}`
          : `Leave: ${leaveStartDate} to ${leaveEndDate || 'Indefinite'}`;

      const fullReason = `${deactivationType} (${dateInfo})${handoverNotes.trim() ? ` — Notes: ${handoverNotes.trim()}` : ''}`;

      await deactivateMember(
        departingMember.id,
        successorMember.id,
        fullReason,
        deactivationType,
        {
          lastWorkingDay: deactivationType === 'Resignation' ? lastWorkingDay : undefined,
          effectiveDate: deactivationType === 'Termination' ? effectiveDate : undefined,
          leaveStartDate: deactivationType === 'Long leave' ? leaveStartDate : undefined,
          leaveEndDate: deactivationType === 'Long leave' ? leaveEndDate : undefined,
        }
      );

      setHandoverAcknowledged(false);
      setHandoverNotes('');
      // Automatically advance to the next active non-CEO employee that is NOT the departing person
      const nextDeparting = offboardableMembers.find(m => 
        m.id !== departingMember.id && 
        m.name.toLowerCase() !== departingMember.name.toLowerCase() && 
        (departingMember.email ? m.email.toLowerCase() !== departingMember.email.toLowerCase() : true)
      );
      setDepartingMemberId(nextDeparting ? nextDeparting.id : (offboardableMembers[0]?.id || ''));
    } catch (err: unknown) {
      setDeactivationError(err instanceof Error ? err.message : 'Deactivation failed.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Enterprise Portal Header Card */}
      <div className="admin-portal-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Admin & Talent HR Operations Center
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
              Direct employee provisioning, 7 master department governance, real-time oversight & task intervention
            </div>
          </div>
        </div>

        {/* Quick Enterprise Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.65rem', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            7 Master Depts
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.65rem', borderRadius: '6px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>
            {activeMembers.length} Active Staff
          </span>
          {pendingRequests.length > 0 && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.65rem', borderRadius: '6px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
              {pendingRequests.length} Pending
            </span>
          )}
        </div>
      </div>

      {/* Dedicated Modern Tab Strip */}
      <div className="admin-portal-tabs-bar">
        <button
          className={`admin-portal-tab-pill ${activeTab === 'oversight' ? 'active' : ''}`}
          onClick={() => setActiveTab('oversight')}
        >
          <Layers size={14} />
          <span>Task Monitoring</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
          style={{
            color: activeTab === 'reports' ? '#1e40af' : undefined,
            background: activeTab === 'reports' ? '#dbeafe' : undefined,
          }}
        >
          <BarChart3 size={14} />
          <span>Reports &amp; Ratios</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'create_user' ? 'active' : ''}`}
          onClick={() => setActiveTab('create_user')}
        >
          <UserPlus size={14} />
          <span>Create Employee</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'pending_approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending_approvals')}
        >
          <CheckCircle2 size={14} />
          <span>Approvals{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'deactivation' ? 'active' : ''}`}
          onClick={() => setActiveTab('deactivation')}
        >
          <UserX size={14} />
          <span>Deactivation &amp; Handover</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
          style={{
            color: activeTab === 'holidays' ? '#92400e' : undefined,
            background: activeTab === 'holidays' ? '#fef3c7' : undefined
          }}
        >
          <Sparkles size={14} />
          <span>Company Holidays</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
          style={{
            color: activeTab === 'directory' ? '#0369a1' : undefined,
            background: activeTab === 'directory' ? '#e0f2fe' : undefined
          }}
        >
          <Mail size={14} />
          <span>Staff Directory &amp; Email Config</span>
        </button>
      </div>

      {/* Tab 1: User Oversight & Company-wide Monitoring (Flowchart A) */}
      {activeTab === 'oversight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Controls Bar: Search-as-you-type Combobox, Dept Filter, Manager Filter & Export */}
          <div className="admin-filter-bar">
            <div className="admin-filter-controls-grid">
              {/* 1. Flowchart A: "Click Select User dropdown with search-as-you-type" */}
              <div className="admin-filter-control-item" style={{ position: 'relative' }}>
                <label className="admin-filter-label" style={{ color: '#1e40af' }}>
                  SELECT EMPLOYEE (SEARCH-AS-YOU-TYPE):
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    className="form-input admin-filter-input"
                    placeholder={selectedUserForOversight === 'ALL' ? 'Type to search staff by name, email, ID...' : `Current: ${selectedUserForOversight}`}
                    value={userSearchQuery}
                    onChange={e => {
                      setUserSearchQuery(e.target.value);
                      setIsUserDropdownOpen(true);
                    }}
                    onFocus={() => setIsUserDropdownOpen(true)}
                  />
                  {isUserDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      maxHeight: '260px',
                      overflowY: 'auto',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      zIndex: 100,
                      padding: '4px'
                    }}>
                      <div
                        style={{
                          padding: '6px 10px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: '#1e40af',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: selectedUserForOversight === 'ALL' ? '#eff6ff' : 'transparent'
                        }}
                        onClick={() => {
                          setSelectedUserForOversight('ALL');
                          setUserSearchQuery('');
                          setIsUserDropdownOpen(false);
                        }}
                      >
                        ALL EMPLOYEES — Full Company Overview ({tasks.length} Deliverables)
                      </div>
                      {searchMatchedMembers.map(m => (
                        <div
                          key={m.id}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.73rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: selectedUserForOversight === m.name ? '#eff6ff' : 'transparent'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.background = selectedUserForOversight === m.name ? '#eff6ff' : 'transparent'}
                          onClick={() => {
                            setSelectedUserForOversight(m.name);
                            setUserSearchQuery('');
                            setIsUserDropdownOpen(false);
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              {m.designation || 'Staff'} • {m.department} {m.employeeId ? `• ${m.employeeId}` : ''}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f8fafc', color: '#2563eb' }}>
                            {tasks.filter(t => t.assignees.some(a => a.name.toLowerCase().includes(m.name.toLowerCase()))).length} tasks
                          </span>
                        </div>
                      ))}
                      {searchMatchedMembers.length === 0 && (
                        <div style={{ padding: '8px 10px', fontSize: '0.72rem', color: '#94a3b8' }}>
                          No staff found matching &ldquo;{userSearchQuery}&rdquo;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Flowchart A: "Filter by department or reporting manager" */}
              <div className="admin-filter-control-item">
                <label className="admin-filter-label">
                  DEPARTMENT FILTER:
                </label>
                <select
                  className="form-select admin-filter-select"
                  value={departmentFilterForOversight}
                  onChange={e => setDepartmentFilterForOversight(e.target.value)}
                >
                  <option value="ALL">All 7 Departments</option>
                  {(systemConfig?.masterLists?.departments || [
                    'Executive Management',
                    'AI & IT Operations',
                    'Full-Stack Engineering',
                    'Product & UI/UX',
                    'Talent HR & People',
                    'Marketing & Growth',
                    'Client Success & Support',
                    'Finance & Compliance'
                  ]).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="admin-filter-control-item">
                <label className="admin-filter-label">
                  REPORTING MANAGER FILTER:
                </label>
                <select
                  className="form-select admin-filter-select"
                  value={managerFilterForOversight}
                  onChange={e => setManagerFilterForOversight(e.target.value)}
                >
                  <option value="ALL">All Reporting Managers</option>
                  {reportingManagers.map(mgr => (
                    <option key={mgr.id} value={mgr.name}>
                      {mgr.name} ({mgr.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Flowchart A: "Export that employee's task to Excel" */}
              <div className="admin-filter-control-item">
                <button
                  type="button"
                  className="admin-export-tasks-btn"
                  onClick={handleExportCurrentEmployeeTasks}
                  title="Export filtered employee tasks to multi-sheet Excel"
                >
                  <FileSpreadsheet size={15} />
                  <span>Export Employee Tasks (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Sub-bar: Search deliverable filter & Selected user summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter deliverables by title, project, assignee..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{ fontSize: '0.78rem', height: '34px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.72rem', color: '#475569', flexWrap: 'wrap' }}>
                <span>Scope: <strong>{selectedUserForOversight === 'ALL' ? 'Company-Wide' : selectedUserForOversight}</strong></span>
                {departmentFilterForOversight !== 'ALL' && <span>• Dept: <strong>{departmentFilterForOversight}</strong></span>}
                {managerFilterForOversight !== 'ALL' && <span>• Manager: <strong>{managerFilterForOversight}</strong></span>}
                <span>• Showing <strong>{filteredTasks.length}</strong> tasks</span>
                {targetOversightMember && (
                  <button
                    type="button"
                    onClick={() => {
                      setMemberToEditEmail(targetOversightMember);
                      setNewEmailInput(targetOversightMember.email);
                      setEmailChangeReason('');
                      setEmailUpdateError(null);
                    }}
                    style={{
                      marginLeft: '0.4rem',
                      fontSize: '0.72rem',
                      color: '#0284c7',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 700
                    }}
                    title="Change official email for selected employee"
                  >
                    <Mail size={12} />
                    Edit Email ({targetOversightMember.email})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick KPI Bar */}
          <div className="admin-kpi-grid">
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>TOTAL MONITORED</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalMonitored}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563eb' }}>IN PROGRESS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>{inProgressCount}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a' }}>COMPLETED (DONE)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>{completedCount}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#d97706' }}>ON HOLD</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>{onHoldCount}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>ESCALATED</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{escalatedCount}</div>
            </div>
          </div>

          {/* Status Filter Tabs & Bulk Actions Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['ALL', 'In Progress', 'Done', 'On Hold', 'Escalated', 'Queued'].map(st => (
                <button
                  key={st}
                  className={`btn-secondary ${statusFilter === st ? 'active' : ''}`}
                  style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', fontWeight: statusFilter === st ? 700 : 500 }}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'ALL' ? 'All Statuses' : st}
                </button>
              ))}
            </div>

            {/* Bulk Actions Button (Flowchart A: "Select multiple tasks and choose new assignee") */}
            {selectedTaskIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e40af' }}>
                  {selectedTaskIds.length} tasks selected
                </span>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: '#1d4ed8', padding: '0.35rem 0.75rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setShowBulkReassignModal(true)}
                >
                  <ArrowRightLeft size={13} />
                  Bulk Reassign Tasks
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                  onClick={() => setSelectedTaskIds([])}
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>

          {/* Deliverables Oversight Table (Flowchart A: Row view with status, project, due date) */}
          <div className="enterprise-table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedTaskIds(filteredTasks.map(t => t.id));
                        } else {
                          setSelectedTaskIds([]);
                        }
                      }}
                      title="Select all tasks for bulk reassignment"
                    />
                  </th>
                  <th style={{ minWidth: '320px' }}>Deliverable &amp; Project</th>
                  <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Assignee(s)</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Scheduled</th>
                  <th style={{ minWidth: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>Priority</th>
                  <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ minWidth: '200px', whiteSpace: 'nowrap', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t, idx) => {
                  const isDone = t.status === 'Done';
                  const isOnHold = t.status === 'On Hold';
                  const isCancelled = t.status === 'Cancelled';
                  const canReopen = isDone || isOnHold || isCancelled;
                  const isSelected = selectedTaskIds.includes(t.id);
                  const isEditedByAdmin = t.editedByAdmin || (t.notes && t.notes.toLowerCase().includes('edited by admin'));

                  return (
                    <tr key={t.id} style={{ background: isSelected ? '#eff6ff' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedTaskIds(prev => [...prev, t.id]);
                            } else {
                              setSelectedTaskIds(prev => prev.filter(id => id !== t.id));
                            }
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <span className="task-sequence-badge" style={{ fontSize: '0.7rem', marginTop: '1px' }}>
                            #{idx + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{t.title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginTop: '4px' }}>
                              {/* Flowchart A: "Show edited by Admin tag on the task" */}
                              {isEditedByAdmin && (
                                <span style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  whiteSpace: 'nowrap'
                                }} title="Modified under Admin Task Oversight">
                                  Edited by Admin
                                </span>
                              )}
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {t.project || 'General Operations'}{t.department ? ` • ${t.department}` : ''}
                              </span>
                            </div>
                        {t.holdReason && (
                          <div style={{ fontSize: '0.68rem', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', marginTop: '6px', display: 'inline-block' }}>
                            Hold: {t.holdReason}
                          </div>
                        )}
                        {t.escalationReason && (
                          <div style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', marginTop: '6px', display: 'inline-block' }}>
                            Escalated to {t.escalatedTo || 'Senior Leadership'}: {t.escalationReason}
                          </div>
                        )}
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {t.assignees.map(a => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#e2e8f0',
                                color: '#1e293b',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {a.avatar || a.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{t.scheduledDate}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>{t.time}</div>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          color: isDone ? '#15803d' : isOnHold ? '#b45309' : t.status === 'Escalated' ? '#b91c1c' : '#1d4ed8',
                          background: isDone ? '#f0fdf4' : isOnHold ? '#fffbeb' : t.status === 'Escalated' ? '#fef2f2' : '#eff6ff'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                          {t.status}
                        </span>
                        {t.progressPercent !== undefined && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                            <div style={{ width: '64px', height: '4px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, Math.max(0, t.progressPercent))}%`, height: '100%', background: isDone ? '#16a34a' : '#2563eb', borderRadius: '999px' }} />
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{t.progressPercent}%</span>
                          </div>
                        )}
                      </td>
                      {/* Flowchart A: Admin Actions (Edit, Reopen, View Only) */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', flexWrap: 'nowrap' }}>
                          {/* 1. Edit Action */}
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '0.28rem 0.55rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => {
                              setTaskToEdit(t);
                              setEditStatus(t.status);
                              setEditReason(t.holdReason || t.escalationReason || '');
                              setEditRemarks(t.notes || '');
                            }}
                            title="Edit status, reason, notes and remarks"
                          >
                            <Edit3 size={11} />
                            Edit
                          </button>

                          {/* 2. Reopen Action */}
                          {canReopen && (
                            <button
                              type="button"
                              className="btn-primary"
                              style={{
                                padding: '0.28rem 0.55rem',
                                fontSize: '0.7rem',
                                background: '#1e40af',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={() => {
                                setTaskToReopen(t);
                                setReopenReason('');
                              }}
                              title="Reopen completed task"
                            >
                              <RotateCcw size={11} />
                              Reopen
                            </button>
                          )}

                          {/* 3. View Only Action */}
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '0.28rem 0.55rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => setTaskToView(t)}
                            title="See task details, status, notes and reasons"
                          >
                            <Eye size={11} />
                            View
                          </button>

                          {/* CEO Delete */}
                          {isCeo && (
                            <button
                              type="button"
                              className="btn-secondary btn-delete-task"
                              style={{ padding: '0.28rem 0.45rem', fontSize: '0.7rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => {
                                if (window.confirm(`CEO Action: Are you sure you want to permanently delete "${t.title}"?`)) {
                                  deleteTask(t.id);
                                }
                              }}
                              title="Delete Deliverable (CEO Only)"
                            >
                              <Trash2 size={11} color="#dc2626" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTasks.length === 0 && (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                No tasks match the selected monitoring filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* FLOWCHART B (FLOWCHART 11): ADMIN - REPORTS AND PERFORMANCE RATIO    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Reports Header & "Which Report?" Selector */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '8px' }}>
                  <BarChart3 size={20} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Reports &amp; Performance Ratios
                  </h3>
                  <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                    Calculates metrics using official written formulas • Executive charts, trends &amp; multi-sheet export
                  </div>
                </div>
              </div>

              {/* Flowchart 11: Export to Excel with task-summary sheet */}
              <button
                type="button"
                className="btn-primary"
                onClick={handleExportReportExcel}
                style={{
                  background: '#059669',
                  borderColor: '#047857',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Download to Excel with task-summary sheet"
              >
                <Download size={14} />
                Download to Excel (Summary Sheet)
              </button>
            </div>

            {/* Decision Diamond: "Which report?" */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                SELECT EXECUTIVE REPORT TYPE:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.45rem' }}>
                {[
                  { id: 'PERFORMANCE_RATIO', label: 'Performance Ratio', desc: 'Date range & velocity' },
                  { id: 'USER_WISE', label: 'User-wise Tasks', desc: 'Select employee' },
                  { id: 'PENDING', label: 'Pending Tasks', desc: 'Filter by status' },
                  { id: 'ESCALATED', label: 'Escalated Tasks', desc: 'Leadership escalations' },
                  { id: 'ON_HOLD', label: 'On-Hold Tasks', desc: 'With hold reasons' },
                  { id: 'DEPARTMENT', label: 'Team or Dept', desc: '7 master departments' },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className={`btn-secondary ${reportType === r.id ? 'active' : ''}`}
                    style={{
                      padding: '0.5rem 0.6rem',
                      fontSize: '0.74rem',
                      fontWeight: reportType === r.id ? 800 : 500,
                      background: reportType === r.id ? '#eff6ff' : '#ffffff',
                      borderColor: reportType === r.id ? '#3b82f6' : '#cbd5e1',
                      color: reportType === r.id ? '#1d4ed8' : '#334155',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                    onClick={() => setReportType(r.id as any)}
                  >
                    <span>{r.label}</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.75 }}>{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter controls based on "Which report?" */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {reportType === 'USER_WISE' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>Select Employee:</span>
                  <select
                    className="form-select"
                    style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600 }}
                    value={reportSelectedEmployeeId}
                    onChange={e => setReportSelectedEmployeeId(e.target.value)}
                  >
                    <option value="">All Active Employees ({activeMembers.length})</option>
                    {activeMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.designation || 'Staff'} ({m.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {reportType === 'PERFORMANCE_RATIO' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>From:</span>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      value={reportStartDate}
                      onChange={e => setReportStartDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>To:</span>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                      value={reportEndDate}
                      onChange={e => setReportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {reportType === 'PENDING' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>Filter Pending Status:</span>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                    value={reportPendingStatus}
                    onChange={e => setReportPendingStatus(e.target.value)}
                  >
                    <option value="ALL">All Pending (In Progress, Queued, On Hold, Escalated)</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Queued">Queued</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Escalated">Escalated</option>
                  </select>
                </div>
              )}

              {reportType === 'DEPARTMENT' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>Select Department:</span>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.75rem', fontWeight: 600 }}
                    value={reportDepartment}
                    onChange={e => setReportDepartment(e.target.value)}
                  >
                    <option value="ALL">All Departments</option>
                    {(systemConfig?.masterLists?.departments || [
                      'Executive Management',
                      'AI & IT Operations',
                      'Full-Stack Engineering',
                      'Product & UI/UX',
                      'Talent HR & People',
                      'Marketing & Growth',
                      'Client Success & Support',
                      'Finance & Compliance'
                    ]).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', marginLeft: 'auto' }}>
                Scope: {reportMetrics.totalCount} Deliverables Analyzed
              </span>
            </div>
          </div>

          {/* Flowchart 11: Calculate metrics using written formulas (Cards Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
            {/* 1. Timely completion ratio */}
            <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                TIMELY COMPLETION RATIO
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                {reportMetrics.timelyCompletionRatio}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
                Formula: (On-time Done / Total Done) * 100
              </div>
            </div>

            {/* 2. Late completion count */}
            <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>
                LATE COMPLETION COUNT
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c2410c', marginTop: '2px' }}>
                {reportMetrics.lateCompletedCount}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
                Completed after scheduled date
              </div>
            </div>

            {/* 3. Pending with reason categorized */}
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                PENDING (WITH REASON)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {reportMetrics.pendingWithReasonCount}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
                Documented hold / escalation reason
              </div>
            </div>

            {/* 4. Pending without reason */}
            <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                PENDING (WITHOUT REASON)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
                {reportMetrics.pendingWithoutReasonCount}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
                Overdue with no reason documented
              </div>
            </div>

            {/* 5. Escalated count */}
            <div style={{ background: '#ffffff', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>
                ESCALATED COUNT
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b91c1c', marginTop: '2px' }}>
                {reportMetrics.escalatedCount}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
                Escalated to senior leadership
              </div>
            </div>

            {/* 6. On-hold count */}
            <div style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                ON-HOLD COUNT
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>
                {reportMetrics.onHoldCount}
              </div>
              <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
                Deliverables in paused state
              </div>
            </div>
          </div>

          {/* Flowchart 11: Display report on screen with charts and trends */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
            {/* Visual Trends Breakdown Bar */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                Operational Distribution
              </h4>
              <div style={{ display: 'flex', height: '14px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9', marginBottom: '0.75rem' }}>
                <div style={{ width: `${reportMetrics.totalCount ? (reportMetrics.totalCompleted / reportMetrics.totalCount) * 100 : 0}%`, background: '#22c55e' }} title={`Completed: ${reportMetrics.totalCompleted}`} />
                <div style={{ width: `${reportMetrics.totalCount ? (reportMetrics.pendingCount / reportMetrics.totalCount) * 100 : 0}%`, background: '#3b82f6' }} title={`Pending: ${reportMetrics.pendingCount}`} />
                <div style={{ width: `${reportMetrics.totalCount ? (reportMetrics.onHoldCount / reportMetrics.totalCount) * 100 : 0}%`, background: '#f59e0b' }} title={`On Hold: ${reportMetrics.onHoldCount}`} />
                <div style={{ width: `${reportMetrics.totalCount ? (reportMetrics.escalatedCount / reportMetrics.totalCount) * 100 : 0}%`, background: '#ef4444' }} title={`Escalated: ${reportMetrics.escalatedCount}`} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                  <span>Done: <strong>{reportMetrics.totalCompleted}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                  <span>Pending: <strong>{reportMetrics.pendingCount}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                  <span>On Hold: <strong>{reportMetrics.onHoldCount}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  <span>Escalated: <strong>{reportMetrics.escalatedCount}</strong></span>
                </div>
              </div>
            </div>

            {/* Reschedule Count Per Person Leaderboard */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                Reschedule Count Per Person
              </h4>
              <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.entries(reportMetrics.rescheduleMap).length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    ✓ Zero deliverables carried forward or rescheduled. Perfect sprint completion!
                  </div>
                ) : (
                  Object.entries(reportMetrics.rescheduleMap).map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', padding: '2px 4px', borderBottom: '1px dashed #f1f5f9' }}>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{name}</span>
                      <span style={{ color: '#b45309', fontWeight: 800 }}>{count} reschedules</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Filtered Deliverables Table for the Report */}
          <div className="enterprise-table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Deliverable Title</th>
                  <th>Assignees</th>
                  <th>Department</th>
                  <th>Scheduled Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportMetrics.filtered.slice(0, 50).map((t, idx) => (
                  <tr key={t.id}>
                    <td style={{ fontSize: '0.7rem', color: '#64748b' }}>#{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>{t.title}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Project: {t.project || 'General'}</div>
                      {t.holdReason && <div style={{ fontSize: '0.65rem', color: '#b45309' }}>Hold: {t.holdReason}</div>}
                      {t.escalationReason && <div style={{ fontSize: '0.65rem', color: '#b91c1c' }}>Escalation: {t.escalationReason}</div>}
                    </td>
                    <td>{t.assignees.map(a => a.name).join(', ')}</td>
                    <td>{t.department}</td>
                    <td>{t.scheduledDate} {t.time}</td>
                    <td>
                      <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: t.status === 'Done' ? '#16a34a' : t.status === 'On Hold' ? '#d97706' : t.status === 'Escalated' ? '#dc2626' : '#2563eb'
                      }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportMetrics.filtered.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                No deliverables found for this report configuration.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* FLOWCHART A: EDIT TASK MODAL (MODIFY STATUS, REASON, NOTES/REMARKS)  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {taskToEdit && (
        <div className="stream-overlay" onClick={() => setTaskToEdit(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '540px', width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Admin Task Modification
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setTaskToEdit(null)}><X size={16} /></button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a' }}>{taskToEdit.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                #{taskToEdit.id} • Dept: {taskToEdit.department} • Assignees: {taskToEdit.assignees.map(a => a.name).join(', ')}
              </div>
            </div>

            <form onSubmit={handleConfirmEditTask} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Status *</label>
                <select
                  className="form-select"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as TaskStatus)}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Queued">Queued</option>
                  <option value="Done">Done</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Escalated">Escalated</option>
                  <option value="Review">Review</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {(editStatus === 'On Hold' || editStatus === 'Escalated') && (
                <div className="form-field-group">
                  <label className="form-field-label">{editStatus === 'On Hold' ? 'Hold Reason *' : 'Escalation Reason *'}</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder={editStatus === 'On Hold' ? 'e.g. Waiting on third-party security certification' : 'e.g. Urgent review needed by VP'}
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                  />
                </div>
              )}

              <div className="form-field-group">
                <label className="form-field-label">Notes and Remarks</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Management justification and operational remarks..."
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskToEdit(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#2563eb' }}>
                  Save Changes &amp; Log Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* FLOWCHART A: VIEW ONLY TASK MODAL                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {taskToView && (
        <div className="stream-overlay" onClick={() => setTaskToView(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '560px', width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Deliverable Inspector
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setTaskToView(null)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb' }}>DELIVERABLE #{taskToView.id}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 4px' }}>{taskToView.title}</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Project: <strong>{taskToView.project || 'General'}</strong> • Dept: <strong>{taskToView.department}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.76rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{taskToView.status} ({taskToView.progressPercent ?? 0}%)</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Priority:</span>
                  <div style={{ fontWeight: 800 }}>{taskToView.priority}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Scheduled Date:</span>
                  <div style={{ fontWeight: 700 }}>{taskToView.scheduledDate} at {taskToView.time}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Admin Intervention:</span>
                  <div style={{ fontWeight: 700, color: taskToView.editedByAdmin ? '#1d4ed8' : '#64748b' }}>
                    {taskToView.editedByAdmin ? 'Edited by Admin' : 'Standard'}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Assignees ({taskToView.assignees.length}):</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {taskToView.assignees.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.74rem' }}>
                      <span style={{ fontWeight: 600 }}>{a.name} ({a.department})</span>
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {taskToView.notes && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '0.65rem', fontSize: '0.75rem' }}>
                  <strong>Notes &amp; Remarks:</strong> {taskToView.notes}
                </div>
              )}

              {taskToView.holdReason && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.65rem', fontSize: '0.75rem', color: '#b45309' }}>
                  <strong>Hold Reason:</strong> {taskToView.holdReason}
                </div>
              )}

              {taskToView.escalationReason && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.65rem', fontSize: '0.75rem', color: '#b91c1c' }}>
                  <strong>Escalation Reason:</strong> {taskToView.escalationReason} (Escalated to: {taskToView.escalatedTo || 'Leadership'})
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskToView(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* FLOWCHART A: BULK REASSIGN MODAL                                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showBulkReassignModal && (
        <div className="stream-overlay" onClick={() => setShowBulkReassignModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '500px', width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRightLeft size={18} color="#1d4ed8" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Bulk Reassign Deliverables
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setShowBulkReassignModal(false)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '0.85rem' }}>
              Reassign <strong>{selectedTaskIds.length}</strong> selected deliverables to a new team member. Each change will be logged in the immutable audit trail.
            </p>

            <div className="form-field-group">
              <label className="form-field-label">Select New Assignee *</label>
              <select
                className="form-select"
                value={bulkReassignTargetMemberId}
                onChange={e => setBulkReassignTargetMemberId(e.target.value)}
              >
                <option value="">-- Choose New Assignee --</option>
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.designation || 'Specialist'} ({m.department})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowBulkReassignModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#1d4ed8' }}
                disabled={!bulkReassignTargetMemberId}
                onClick={handleConfirmBulkReassign}
              >
                Confirm Bulk Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Create Employee Flow (Flowchart: Admin Dashboard -> Create Employee) */}
      {activeTab === 'create_user' && (
        <div className="admin-create-account-container">
          {/* Left Column: Form Card */}
          <div className="admin-form-card">
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#3085d6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #bfdbfe',
                  boxShadow: '0 2px 8px rgba(48,133,214,0.25)',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  <img src="/urbangaon-employee-emblem.png" alt="UrbanGaon" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Create Employee (Employee Provisioning Flow)
                  </h3>
                  <p style={{ fontSize: '0.73rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Provision new employee record with unique ID, reporting manager, and one-time activation link in status <strong>Pending First Login</strong>.
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                Policy Compliant
              </span>
            </div>

            {/* Success Banner & Generated Set-Password Link Box */}
            {inviteSuccessMsg && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span>{inviteSuccessMsg}</span>
                </div>

                {provisionedDetails && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    marginTop: '4px',
                    fontSize: '0.75rem',
                    color: '#1f2937'
                  }}>
                    <div style={{ fontWeight: 800, color: '#15803d', marginBottom: '4px' }}>
                      Generated One-Time Set-Password Activation Credentials:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Employee ID:</span>
                      <code style={{ fontWeight: 700, color: '#0f172a' }}>{provisionedDetails.employeeId}</code>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Status:</span>
                      <span style={{ color: '#b45309', fontWeight: 700 }}>Pending First Login</span>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Invitation Code:</span>
                      <code style={{ fontWeight: 700, color: '#2563eb' }}>{provisionedDetails.code}</code>
                    </div>

                    {provisionedDetails.link && (
                      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>One-Time Set-Password Link:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            readOnly
                            value={provisionedDetails.link}
                            className="form-input"
                            style={{ fontSize: '0.72rem', padding: '4px 8px', background: '#f8fafc', color: '#2563eb' }}
                          />
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              navigator.clipboard.writeText(provisionedDetails.link);
                              alert('Set-password link copied to clipboard!');
                            }}
                            style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Email Already Exists Error Alert (Flowchart Decision Diamond YES branch) */}
            {emailExistsError && (
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #f87171',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>{emailExistsError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="admin-form-grid-2col">
                {/* 1. Enter full name */}
                <div className="form-field-group">
                  <label className="form-field-label">1. Full Legal Name *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><User size={15} /></span>
                    <input
                      type="text"
                      className="form-input admin-input-with-icon"
                      required
                      autoComplete="off"
                      placeholder="e.g. Vikramaditya Sen"
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. Enter email address & Decision Diamond: Email already exists? */}
                <div className="form-field-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="form-field-label">2. Official Corporate Email *</label>
                    {emailExistsError && (
                      <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>
                        Email already registered!
                      </span>
                    )}
                  </div>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Mail size={15} /></span>
                    <input
                      type="email"
                      className="form-input admin-input-with-icon"
                      style={{ borderColor: emailExistsError ? '#ef4444' : undefined }}
                      required
                      autoComplete="off"
                      placeholder="name@urbangaon.com"
                      value={newUserEmail}
                      onChange={e => {
                        const val = e.target.value;
                        setNewUserEmail(val);
                        if (emailExistsError && !members.some(m => m.email.toLowerCase() === val.trim().toLowerCase())) {
                          setEmailExistsError(null);
                        }
                      }}
                      onBlur={() => {
                        if (newUserEmail.trim()) {
                          const exists = members.some(m => m.email.toLowerCase() === newUserEmail.trim().toLowerCase());
                          if (exists) {
                            setEmailExistsError(`Email already exists: An employee with email "${newUserEmail.trim()}" is already registered. Please enter a different email.`);
                          } else {
                            setEmailExistsError(null);
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 3. Enter phone number */}
                <div className="form-field-group">
                  <label className="form-field-label">3. Mobile Phone Number *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Phone size={15} /></span>
                    <input
                      type="tel"
                      className="form-input admin-input-with-icon"
                      required
                      autoComplete="off"
                      placeholder="+91 98765 43210"
                      value={newUserPhone}
                      onChange={e => setNewUserPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* 4. Assign unique employee ID */}
                <div className="form-field-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="form-field-label">4. Assign Unique Employee ID *</label>
                    <button
                      type="button"
                      onClick={() => setNewUserEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Auto-Generate ID
                    </button>
                  </div>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Shield size={15} /></span>
                    <input
                      type="text"
                      className="form-input admin-input-with-icon"
                      required
                      autoComplete="off"
                      placeholder="e.g. EMP-2026-104"
                      value={newUserEmployeeId}
                      onChange={e => setNewUserEmployeeId(e.target.value)}
                    />
                  </div>
                </div>

                {/* 5. Select Department from dropdown */}
                <div className="form-field-group">
                  <label className="form-field-label">5. Select Department from Dropdown *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Building size={15} /></span>
                    <select
                      className="form-select admin-input-with-icon"
                      required
                      value={newUserDept}
                      onChange={e => setNewUserDept(e.target.value)}
                    >
                      <option value="" disabled>-- Select Master Department * --</option>
                      {(systemConfig?.masterLists?.departments || [
                        'Civil',
                        'Sales',
                        'AI & IT',
                        'Talent',
                        'Purchase',
                        'Legal',
                        'Accounts'
                      ]).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Enter designation */}
                <div className="form-field-group">
                  <label className="form-field-label">6. Enter Official Designation *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Briefcase size={15} /></span>
                    <input
                      type="text"
                      className="form-input admin-input-with-icon"
                      required
                      autoComplete="off"
                      placeholder="e.g. Senior Project Manager"
                      value={newUserDesignation}
                      onChange={e => setNewUserDesignation(e.target.value)}
                    />
                  </div>
                </div>

                {/* 7. Select reporting manager */}
                <div className="form-field-group">
                  <label className="form-field-label">7. Select Reporting Manager *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Users size={15} /></span>
                    <select
                      className="form-select admin-input-with-icon"
                      required
                      value={newUserReportingManagerId}
                      onChange={e => setNewUserReportingManagerId(e.target.value)}
                    >
                      <option value="" disabled>-- Select Reporting Manager * --</option>
                      {reportingManagers.map(mgr => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.name} ({mgr.designation || mgr.role} - {mgr.department})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 8. Set role as Employee */}
                <div className="form-field-group">
                  <label className="form-field-label">8. Set Role as Employee *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Shield size={15} /></span>
                    <select
                      className="form-select admin-input-with-icon"
                      required
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value as 'EMPLOYEE' | 'MANAGER' | 'ADMIN')}
                    >
                      <option value="EMPLOYEE">Employee / Staff (Daily Register & Deliverables)</option>
                      <option value="MANAGER">Reporting Manager (Team Rebalancing & Escalations)</option>
                      <option value="ADMIN">Admin / Talent HR (People Ops & Company Oversight)</option>
                    </select>
                  </div>
                </div>

                {/* Official Corporate Avatar Badge */}
                <div className="form-field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-field-label">Official Corporate Avatar Badge</label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#3085d6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #3085d6',
                      boxShadow: '0 2px 8px rgba(48,133,214,0.25)',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      <img src="/urbangaon-employee-emblem.png" alt="UrbanGaon Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                        UrbanGaon Official Brand Emblem
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        This official UrbanGaon blue house brand emblem will be assigned as the corporate identity avatar for this account.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Note & Form Actions */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '0.72rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Clock size={13} color="#f59e0b" />
                <span>
                  <strong>Provisioning Lifecycle:</strong> Employee record will be created in status <code>Pending First Login</code>. An expiring one-time set-password activation link will be automatically generated and emailed to the employee.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingUser}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.55rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.82rem'
                  }}
                >
                  <Send size={14} />
                  {isSubmittingUser ? 'Synchronizing with Database...' : 'Create Employee & Dispatch One-Time Activation Link'}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setNewUserName('');
                    setNewUserEmail('');
                    setEmailExistsError(null);
                    setNewUserPhone('');
                    setNewUserEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
                    setNewUserDept('');
                    setNewUserDesignation('');
                    setNewUserReportingManagerId('');
                    setNewUserRole('EMPLOYEE');
                    setInviteSuccessMsg(null);
                    setProvisionedDetails(null);
                  }}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
                >
                  Reset Form
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Interactive Digital ID Card & Headcount Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Live Employee ID Card Preview */}
            <div className="corporate-id-badge-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="/urbangaon-employee-emblem.png" alt="UrbanGaon" style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)', objectFit: 'cover' }} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', color: '#f1f5f9', textTransform: 'uppercase' }}>
                    UrbanGaon Corporate ID
                  </span>
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  ● Ready to Sync
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#3085d6',
                  border: '2.5px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img src="/urbangaon-employee-emblem.png" alt="UrbanGaon Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {newUserName.trim() || 'Employee Full Name'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#93c5fd', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {newUserDesignation.trim() || 'Designation'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(255,255,255,0.12)', padding: '2px 7px', borderRadius: '4px', color: '#f1f5f9' }}>
                      {newUserDept || 'Unassigned Dept'}
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.3)', padding: '2px 7px', borderRadius: '4px', color: '#bfdbfe' }}>
                      {newUserRole || 'Role Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ color: '#94a3b8' }}>Corporate Email:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                    {newUserEmail.trim() || 'name@urbangaon.com'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ color: '#94a3b8' }}>Phone:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {newUserPhone.trim() || '+91 ••••• •••••'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ color: '#94a3b8' }}>Access Authority:</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                    {newUserRole === 'ADMIN' ? 'Full Admin & Talent HR' : newUserRole === 'MANAGER' ? 'Reporting Manager' : newUserRole === 'EMPLOYEE' ? 'Staff Deliverables' : 'Pending Selection'}
                  </span>
                </div>
              </div>
            </div>

            {/* Department Headcount Breakdown */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={15} color="#2563eb" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                    Master Department Headcounts
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>
                  {activeMembers.length} Active Staff
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                {[
                  'Civil',
                  'Sales',
                  'AI & IT',
                  'Talent',
                  'Purchase',
                  'Legal',
                  'Accounts'
                ].map(dept => {
                  const count = activeMembers.filter(m => m.department?.toLowerCase() === dept.toLowerCase()).length;
                  const isCurrentSelected = newUserDept.toLowerCase() === dept.toLowerCase();
                  return (
                    <div
                      key={dept}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        background: isCurrentSelected ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${isCurrentSelected ? '#bfdbfe' : '#e2e8f0'}`,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setNewUserDept(dept)}
                      title={`Click to set department to ${dept}`}
                    >
                      <span style={{ fontWeight: isCurrentSelected ? 800 : 600, color: isCurrentSelected ? '#1d4ed8' : '#334155' }}>
                        {dept}
                      </span>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        background: isCurrentSelected ? '#2563eb' : '#e2e8f0',
                        color: isCurrentSelected ? '#ffffff' : '#475569',
                        padding: '1px 6px',
                        borderRadius: '999px'
                      }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Sign-Up Approvals Queue (FC 2 & 3) */}
      {activeTab === 'pending_approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header Controls Bar */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.9rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Employee Sign-Up Approvals Queue
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Live Real-Time Sync
                </span>
                <span style={{
                  background: pendingRequests.length > 0 ? '#eff6ff' : '#f1f5f9',
                  color: pendingRequests.length > 0 ? '#1d4ed8' : '#64748b',
                  border: `1px solid ${pendingRequests.length > 0 ? '#bfdbfe' : '#e2e8f0'}`,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}>
                  {pendingRequests.length} Pending
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Review self-registration requests from new staff. Approving a request generates official credentials and synchronizes immediately to MongoDB Atlas.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={isFetchingRequests}
                onClick={() => fetchPendingRequests(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
                title="Fetch latest pending requests from MongoDB Atlas"
              >
                <RefreshCw size={13} className={isFetchingRequests ? 'spin' : ''} />
                <span>{isFetchingRequests ? 'Syncing...' : 'Refresh Queue'}</span>
              </button>
            </div>
          </div>

          {approvalBanner && (
            <div style={{
              background: approvalBanner.includes('Failed') ? '#fef2f2' : approvalBanner.startsWith('Approving') ? '#eff6ff' : '#f0fdf4',
              border: `1px solid ${approvalBanner.includes('Failed') ? '#fca5a5' : approvalBanner.startsWith('Approving') ? '#bfdbfe' : '#86efac'}`,
              color: approvalBanner.includes('Failed') ? '#991b1b' : approvalBanner.startsWith('Approving') ? '#1e40af' : '#166534',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {approvalBanner.startsWith('Approving') ? (
                  <RefreshCw size={16} className="spin" style={{ flexShrink: 0 }} />
                ) : approvalBanner.includes('Failed') ? (
                  <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                ) : (
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                )}
                <span>{approvalBanner}</span>
              </div>
              <button
                onClick={() => setApprovalBanner(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {pendingRequests.length > 0 ? (
            <div className="enterprise-table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>Applicant Details</th>
                    <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Department & Designation</th>
                    <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Designated Manager</th>
                    <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Applied Timestamp</th>
                    <th style={{ minWidth: '190px', whiteSpace: 'nowrap' }}>HR Verification Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(req => {
                    const isApproving = approvingId === req.id;
                    const isRejecting = rejectingId === req.id;
                    const isRowBusy = Boolean(approvingId || rejectingId);

                    return (
                      <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => openRequestReview(req)}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{req.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>{req.email}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{req.phone || 'Phone not provided'}</div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600 }}>{req.department}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{req.designation}</div>
                          {req.reason && (
                            <div style={{ fontSize: '0.68rem', color: '#059669', fontStyle: 'italic', maxWidth: '220px', whiteSpace: 'normal', marginTop: '2px' }}>
                              &ldquo;{req.reason}&rdquo;
                            </div>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{req.manager || 'HR Pending'}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(req.appliedAt).toLocaleDateString()}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'nowrap' }}>
                            <button
                              className="btn-secondary"
                              disabled={isRowBusy}
                              style={{
                                padding: '0.38rem 0.65rem',
                                fontSize: '0.72rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                fontWeight: 700,
                                background: '#eff6ff',
                                borderColor: '#bfdbfe',
                                color: '#1e40af'
                              }}
                              onClick={() => openRequestReview(req)}
                              title="Click request to view details & verify"
                            >
                              <FileText size={13} />
                              <span>Verify Details</span>
                            </button>
                            <button
                              className="btn-success"
                              disabled={isRowBusy}
                              style={{
                                padding: '0.38rem 0.75rem',
                                fontSize: '0.72rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                whiteSpace: 'nowrap',
                                fontWeight: 700,
                                opacity: isRowBusy && !isApproving ? 0.6 : 1,
                                cursor: isRowBusy ? 'not-allowed' : 'pointer'
                              }}
                              onClick={() => handleApproveRequest(req)}
                              title="Quick approve and dispatch set-password email"
                            >
                              {isApproving ? (
                                <>
                                  <RefreshCw size={13} className="spin" />
                                  <span>Approving...</span>
                                </>
                              ) : (
                                <>
                                  <Check size={13} />
                                  <span>Approve</span>
                                </>
                              )}
                            </button>
                            <button
                              className="btn-secondary"
                              disabled={isRowBusy}
                              style={{
                                padding: '0.38rem 0.75rem',
                                fontSize: '0.72rem',
                                color: '#dc2626',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                                opacity: isRowBusy && !isRejecting ? 0.6 : 1,
                                cursor: isRowBusy ? 'not-allowed' : 'pointer'
                              }}
                              onClick={() => setRejectionModalRequest(req)}
                              title="Reject sign-up request with documented rationale"
                            >
                              {isRejecting ? (
                                <>
                                  <RefreshCw size={13} className="spin" />
                                  <span>Rejecting...</span>
                                </>
                              ) : (
                                <>
                                  <X size={13} />
                                  <span>Reject</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                No Pending Applicant Approvals
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '420px', lineHeight: 1.45 }}>
                All staff accounts are currently verified, provisioned, and active in MongoDB Atlas. When new employees submit registration requests, they will appear here for HR review.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Deactivation & Mandatory Handover (FC 18 — Clean & Organized) */}
      {activeTab === 'deactivation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Header & Clean Sub-Nav */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Account Deactivation & Mandatory Handover
                </h3>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                  FC 18 Governance
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Atomic commitment transfer to an active colleague with immediate credential revocation.
              </p>
            </div>

            {/* Sub-tab Switcher: Active Handover vs Offboarded Archive */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              gap: '3px'
            }}>
              <button
                type="button"
                onClick={() => setDeactivationSubTab('form')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: deactivationSubTab === 'form' ? 700 : 500,
                  background: deactivationSubTab === 'form' ? '#ffffff' : 'transparent',
                  color: deactivationSubTab === 'form' ? '#0f172a' : '#64748b',
                  boxShadow: deactivationSubTab === 'form' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <UserX size={13} color={deactivationSubTab === 'form' ? '#dc2626' : '#64748b'} />
                <span>Execute Handover</span>
              </button>

              <button
                type="button"
                onClick={() => setDeactivationSubTab('archive')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: deactivationSubTab === 'archive' ? 700 : 500,
                  background: deactivationSubTab === 'archive' ? '#ffffff' : 'transparent',
                  color: deactivationSubTab === 'archive' ? '#0f172a' : '#64748b',
                  boxShadow: deactivationSubTab === 'archive' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Users size={13} color={deactivationSubTab === 'archive' ? '#2563eb' : '#64748b'} />
                <span>Offboarded Archive ({deactivatedMembers.length})</span>
              </button>
            </div>
          </div>

          {/* VIEW A: Execute Handover (Organized 2-Pane View) */}
          {deactivationSubTab === 'form' && (
            <>
              {/* Error Alert */}
              {deactivationError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  color: '#991b1b',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} color="#dc2626" />
                    <span>{deactivationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeactivationError(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 800 }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 2-Pane Clean Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
                gap: '1rem',
                alignItems: 'start'
              }} className="admin-handover-cockpit">

                {/* Left Card: Handover Setup Form */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.1rem'
                }}>
                  <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      Handover Setup
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Assign an active colleague to inherit all in-flight deliverables.
                    </div>
                  </div>

                  <form onSubmit={handleConfirmDeactivation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* 1. Departing Staff */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a' }}>
                          1. Departing Staff Member
                        </label>
                        <span style={{ fontSize: '0.7rem', color: departingActiveTasks.length > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                          Holds {departingActiveTasks.length} active task(s)
                        </span>
                      </div>
                      <select
                        className="form-select"
                        value={departingMember?.id || ''}
                        onChange={e => {
                          setDepartingMemberId(e.target.value);
                          setDeactivationError(null);
                        }}
                        style={{
                          width: '100%',
                          minHeight: '40px',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          borderColor: '#cbd5e1',
                          fontWeight: 500
                        }}
                      >
                        {offboardableMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} — {m.designation} ({m.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Successor */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a' }}>
                          2. Designated Successor
                        </label>
                        <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
                          Will inherit all {departingActiveTasks.length} task(s)
                        </span>
                      </div>
                      <select
                        className="form-select"
                        value={successorMember?.id || ''}
                        onChange={e => {
                          setSuccessorMemberId(e.target.value);
                          setDeactivationError(null);
                        }}
                        style={{
                          width: '100%',
                          minHeight: '40px',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          borderColor: '#cbd5e1',
                          fontWeight: 500
                        }}
                      >
                        {activeMembers
                          .filter(m => m.id !== departingMember?.id)
                          .map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} — {m.designation} ({m.department})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* 3. Flowchart 4: Reason Pathways (Resignation / Termination / Long leave) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                        3. Separation / Leave Reason
                      </label>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        marginBottom: '10px'
                      }}>
                        {[
                          { id: 'Resignation', label: 'Resignation', desc: 'Voluntary separation' },
                          { id: 'Termination', label: 'Termination', desc: 'Direct separation' },
                          { id: 'Long leave', label: 'Long Leave', desc: 'Extended sabbatical' },
                        ].map(type => {
                          const isSelected = deactivationType === type.id;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => {
                                setDeactivationType(type.id as any);
                                setDeactivationReason(type.id);
                              }}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                color: isSelected ? '#1e40af' : '#475569',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div>{type.label}</div>
                              <div style={{ fontSize: '0.65rem', color: isSelected ? '#3b82f6' : '#94a3b8', marginTop: '2px' }}>
                                {type.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Resignation Specific Inputs (Branch 1) */}
                      {deactivationType === 'Resignation' && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                Select Last Working Day:
                              </label>
                              <input
                                type="date"
                                className="form-input"
                                value={lastWorkingDay}
                                onChange={e => setLastWorkingDay(e.target.value)}
                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', borderColor: '#cbd5e1' }}
                              />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              
                              <span><strong>Protocol:</strong> Block login immediately after last working day ({lastWorkingDay}). Deliverables reassigned.</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Termination Specific Inputs (Branch 2) */}
                      {deactivationType === 'Termination' && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                                Select Effective Termination Date:
                              </label>
                              <input
                                type="date"
                                className="form-input"
                                value={effectiveDate}
                                onChange={e => setEffectiveDate(e.target.value)}
                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', borderColor: '#fca5a5' }}
                              />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              
                              <span><strong>Protocol:</strong> Block login immediately after effective date ({effectiveDate}). Session terminated.</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Long leave Specific Inputs (Branch 3) */}
                      {deactivationType === 'Long leave' && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                                Leave Start Date:
                              </label>
                              <input
                                type="date"
                                className="form-input"
                                value={leaveStartDate}
                                onChange={e => setLeaveStartDate(e.target.value)}
                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', borderColor: '#86efac' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                                Leave Return Date:
                              </label>
                              <input
                                type="date"
                                className="form-input"
                                value={leaveEndDate}
                                onChange={e => setLeaveEndDate(e.target.value)}
                                placeholder="Indefinite / TBD"
                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', borderColor: '#86efac' }}
                              />
                            </div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#166534', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', padding: '6px 8px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            
                            <span><strong>Protocol:</strong> Mark On Leave, block login until return date ({leaveEndDate || 'Indefinite'}). Tasks reallocated.</span>
                          </div>
                        </div>
                      )}

                      {/* 4. Handover Notes */}
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                          4. Handover Notes & Remarks
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Audit log remark (e.g., Handover meeting completed, assets returned)"
                          value={handoverNotes}
                          onChange={e => setHandoverNotes(e.target.value)}
                          style={{ width: '100%', minHeight: '38px', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', borderColor: '#cbd5e1' }}
                        />
                      </div>
                    </div>

                    {/* Confirmation Checkbox */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.6rem',
                      background: handoverAcknowledged ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${handoverAcknowledged ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      padding: '0.7rem 0.85rem',
                      cursor: 'pointer',
                      fontSize: '0.74rem',
                      color: '#334155',
                      lineHeight: 1.45
                    }}>
                      <input
                        type="checkbox"
                        checked={handoverAcknowledged}
                        onChange={e => setHandoverAcknowledged(e.target.checked)}
                        style={{ marginTop: '2px', cursor: 'pointer', flexShrink: 0, accentColor: '#16a34a' }}
                      />
                      <span>
                        {deactivationType === 'Long leave' ? (
                          <>I confirm that all <strong>{departingActiveTasks.length} task(s)</strong> will temporarily transfer to <strong>{successorMember?.name || 'Successor'}</strong> and <strong>{departingMember?.name || 'Employee'}</strong> will be marked <strong>On Leave</strong> until return date ({leaveEndDate || 'Indefinite'}).</>
                        ) : (
                          <>I confirm that all <strong>{departingActiveTasks.length} task(s)</strong> will transfer to <strong>{successorMember?.name || 'Successor'}</strong> and <strong>{departingMember?.name || 'Departing Employee'}</strong>&apos;s login access will be deactivated in MongoDB Atlas.</>
                        )}
                      </span>
                    </label>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isDeactivating || isCeoUser(departingMember) || !handoverAcknowledged || departingMember?.id === successorMember?.id}
                      style={{
                        padding: '0.75rem 1.25rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: (isDeactivating || isCeoUser(departingMember) || !handoverAcknowledged || departingMember?.id === successorMember?.id)
                          ? '#94a3b8'
                          : deactivationType === 'Long leave'
                            ? '#16a34a'
                            : '#dc2626',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: (isDeactivating || isCeoUser(departingMember) || !handoverAcknowledged || departingMember?.id === successorMember?.id)
                          ? 'not-allowed'
                          : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {isDeactivating ? (
                        <>
                          <RefreshCw size={14} className="spin" />
                          <span>Processing Handover...</span>
                        </>
                      ) : (
                        <>
                          <UserX size={14} />
                          <span>
                            {deactivationType === 'Long leave'
                              ? `Reassign ${departingActiveTasks.length} Tasks & Mark On Leave`
                              : `Reassign ${departingActiveTasks.length} Tasks & Deactivate Account`}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Right Column: Tasks to Transfer & Governance Audit Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Right Card 1: Tasks Being Transferred */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                          Tasks to Transfer ({departingActiveTasks.length})
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          From {departingMember?.name?.split(' ')[0] || 'Staff'} ➔ {successorMember?.name?.split(' ')[0] || 'Successor'}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: departingActiveTasks.length > 0 ? '#fef3c7' : '#dcfce7',
                        color: departingActiveTasks.length > 0 ? '#92400e' : '#166534',
                        padding: '2px 7px',
                        borderRadius: '999px'
                      }}>
                        {departingActiveTasks.length} active
                      </span>
                    </div>

                    {/* Clean, compact task cards */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      maxHeight: '340px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}>
                      {departingActiveTasks.map(t => (
                        <div
                          key={t.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '0.6rem 0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.3rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: t.priority === 'URGENT' ? '#fee2e2' : t.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                              color: t.priority === 'URGENT' ? '#991b1b' : t.priority === 'HIGH' ? '#9a3412' : '#475569'
                            }}>
                              {t.priority}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              {t.scheduledDate} • {t.time}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                            {t.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {t.department} • {t.project || 'General'}
                          </div>
                        </div>
                      ))}

                      {departingActiveTasks.length === 0 && (
                        <div style={{
                          padding: '1.5rem 1rem',
                          textAlign: 'center',
                          color: '#64748b',
                          background: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px dashed #cbd5e1'
                        }}>
                          <CheckCircle2 size={22} color="#16a34a" style={{ margin: '0 auto 0.4rem auto' }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                            0 In-Flight Deliverables
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            This employee holds no active tasks. Deactivation can proceed directly.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Card 2: Departing Employee Profile Summary */}
                  {departingMember && (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Departing Personnel Profile</span>
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>
                          Target Account
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: '#3085d6',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {departingMember.avatar?.startsWith('/') || departingMember.avatar?.startsWith('http') ? (
                            <img src={departingMember.avatar} alt={departingMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            departingMember.avatar || departingMember.name?.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {departingMember.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {departingMember.designation || 'Specialist'} • {departingMember.department}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.72rem', marginTop: '2px' }}>
                        <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.64rem', fontWeight: 600 }}>Employee ID:</span>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{departingMember.employeeId || 'EMP-2026'}</span>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.64rem', fontWeight: 600 }}>Successor Assignee:</span>
                          <span style={{ fontWeight: 700, color: '#15803d' }}>{successorMember?.name?.split(' ')[0] || 'Unassigned'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Right Card 3: FC 18 Security & Protocol Governance Checklist */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color="#0284c7" />
                      <span>FC 18 Deactivation & Security Governance Protocol</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.71rem', color: '#475569', marginTop: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <CheckCircle2 size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><strong>Immediate Access Revocation:</strong> Active sessions terminated & account locked in MongoDB Atlas.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <CheckCircle2 size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><strong>Atomic Deliverable Handover:</strong> Active tasks smoothly transferred to designated successor.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <CheckCircle2 size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><strong>Immutable Audit Log:</strong> Action logged with timestamp, handover remarks & actor credentials.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <CheckCircle2 size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><strong>Email Schedule Suppression:</strong> Daily morning reminder digests paused automatically.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW B: Offboarded Personnel Archive */}
          {deactivationSubTab === 'archive' && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Historical Offboarded Personnel Archive
                  </h4>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Complete audit trail of deactivated staff and their handover history
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  Total Deactivated: {deactivatedMembers.length}
                </span>
              </div>

              {deactivatedMembers.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
                  gap: '0.75rem'
                }}>
                  {deactivatedMembers.map(m => (
                    <div
                      key={m.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        background: '#e2e8f0',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        flexShrink: 0
                      }}>
                        {m.avatar || m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.designation} • {m.department}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.email}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#fee2e2',
                          color: '#991b1b',
                        }}>
                          DEACTIVATED
                        </span>
                        {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Permanently delete and remove record for ${m.name} (${m.email}) from database? This action cannot be undone.`)) {
                                try {
                                  await deleteMember(m.id);
                                } catch (err: any) {
                                  alert(err.message || 'Failed to delete member');
                                }
                              }
                            }}
                            style={{
                              padding: '3px 7px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              borderRadius: '4px',
                              border: '1px solid #fca5a5',
                              background: '#fff',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              transition: 'all 0.12s ease'
                            }}
                            title={`Permanently delete ${m.name} from MongoDB`}
                          >
                            <Trash2 size={11} />
                            Purge
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                  No employees have been deactivated yet. The company active roster is 100% active.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Official Company Holidays (Flowchart 23 & FY 2026-27 Master List) */}
      {activeTab === 'holidays' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: 'clamp(1rem, 2.5vw, 1.5rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Official Document Header */}
          <div style={{
            borderBottom: '2px solid #2563eb',
            paddingBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  UrbanGaon Holidays for Financial Year 2026-27
                </h3>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                Official Enterprise Holiday Register • Automated Reminder & Action Suppression
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: '#dcfce7',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Check size={14} /> Synced with Calendar & Email Engine
              </span>
            </div>
          </div>

          {/* Policy Guidance Alert */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #2563eb',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            fontSize: '0.78rem',
            color: '#334155',
            lineHeight: 1.5,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <strong>Automated Governance Rule:</strong> On all 8 official company holidays and every <strong>Sunday (Weekly Off)</strong>, the system automatically suppresses all morning reminder email dispatches, forward actions, and task delay alerts. No spam or confusion for employees during holidays.
          </div>

          {/* Official Table */}
          <div className="enterprise-table-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
            <table className="enterprise-table" style={{ width: '100%', minWidth: '580px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '8%', minWidth: '45px', whiteSpace: 'nowrap' }}>S.NO</th>
                  <th style={{ textAlign: 'left', width: '22%', minWidth: '125px', whiteSpace: 'nowrap' }}>Date Of Holidays</th>
                  <th style={{ textAlign: 'left', width: '32%', minWidth: '150px' }}>Name Of Holidays</th>
                  <th style={{ textAlign: 'center', width: '16%', minWidth: '90px', whiteSpace: 'nowrap' }}>No Of Holidays</th>
                  <th style={{ textAlign: 'left', width: '22%', minWidth: '165px', whiteSpace: 'nowrap' }}>System Action Status</th>
                </tr>
              </thead>
              <tbody>
                {OFFICIAL_HOLIDAYS_2026_27.map(h => (
                  <tr key={h.sNo}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                      {h.sNo}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {h.displayDate}
                    </td>
                    <td style={{ color: '#1e293b', fontWeight: 600 }}>
                      <span style={{ marginRight: '6px' }}>{h.icon}</span>
                      {h.name}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {h.days}
                    </td>
                    <td>
                      <span style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                         Auto-Paused (Zero Dispatches)
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={3} style={{ textAlign: 'right', color: '#0f172a' }}>
                    Total:
                  </td>
                  <td style={{ textAlign: 'center', color: '#2563eb', fontSize: '0.95rem' }}>
                    08
                  </td>
                  <td style={{ color: '#059669', fontSize: '0.75rem' }}>
                    ✓ 100% Policy Synchronized
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Signatures & Approvals (As in Original Document) */}
          <div className="admin-holiday-signatures">
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                Corporate Governance
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                FY 2026-27 Official Policy
              </div>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                Corporate Governance Compliance
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                Approved By
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                Mr. Sukh Sagar Singh
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                Founder / CEO (UrbanGaon)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 7: STAFF DIRECTORY & CORPORATE EMAIL CONFIGURATION (SDE-3 / CEO)  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0369a1' }}>
                  Employee Directory &amp; Corporate Email Management
                </h3>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#0c4a6e', lineHeight: 1.4 }}>
                Directly configure, update, and manage official corporate email addresses for all team members. All email modifications are synchronized across active sessions, MongoDB Atlas, and the immutable audit trail.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: '#ffffff',
                border: '1px solid #7dd3fc',
                color: '#0284c7',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                Total Registered: {members.length}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search staff by name, email, employee ID, role..."
                value={directorySearchQuery}
                onChange={e => setDirectorySearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', width: '100%', fontSize: '0.78rem', height: '36px', boxSizing: 'border-box' }}
              />
            </div>

            <select
              className="form-select"
              value={directoryDeptFilter}
              onChange={e => setDirectoryDeptFilter(e.target.value)}
              style={{ fontSize: '0.78rem', minWidth: '160px', height: '36px', padding: '0 0.5rem', flexShrink: 0 }}
            >
              <option value="ALL">All Departments</option>
              {['AI & IT Operations', 'Executive Management', 'Full-Stack Engineering', 'Product & UI/UX', 'Talent HR & People', 'Sales', 'Accounts', 'Legal Team', 'Marketing & Growth'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              className="form-select"
              value={directoryStatusFilter}
              onChange={e => setDirectoryStatusFilter(e.target.value)}
              style={{ fontSize: '0.78rem', minWidth: '140px', height: '36px', padding: '0 0.5rem', flexShrink: 0 }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON LEAVE">On Leave</option>
              <option value="Pending First Login">Pending First Login</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>

            {(directorySearchQuery || directoryDeptFilter !== 'ALL' || directoryStatusFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDirectorySearchQuery('');
                  setDirectoryDeptFilter('ALL');
                  setDirectoryStatusFilter('ALL');
                }}
                style={{ fontSize: '0.75rem', padding: '0 0.85rem', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Directory Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155' }}>Staff Member</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155' }}>Employee ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155' }}>Department &amp; Role</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155' }}>Corporate Email</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155' }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155', textAlign: 'center' }}>Email Configuration</th>
                </tr>
              </thead>
              <tbody>
                {filteredDirectoryMembers.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isAakashUser(member) ? '#ecfdf5' : '#eff6ff',
                          color: isAakashUser(member) ? '#059669' : '#2563eb',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: isAakashUser(member) ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                          overflow: 'hidden'
                        }}>
                          {member.avatar?.startsWith('/') || member.avatar?.startsWith('http') ? (
                            <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            member.avatar || member.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {member.name}
                            {isAakashUser(member) && (
                              <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                AI &amp; IT OFFICER
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{member.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569', fontFamily: 'monospace', fontWeight: 600 }}>
                      {member.employeeId || member.id}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: '#0f172a', fontWeight: 600 }}>{member.department}</div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: member.role === 'SUPER_ADMIN' ? '#fdf2f8' : member.role === 'ADMIN' ? '#fef3c7' : '#f1f5f9',
                        color: member.role === 'SUPER_ADMIN' ? '#be185d' : member.role === 'ADMIN' ? '#b45309' : '#475569',
                        border: '1px solid #cbd5e1'
                      }}>
                        {member.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Mail size={13} color="#2563eb" />
                        <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{member.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: member.status === 'ACTIVE' ? '#dcfce7' : (member.status === 'ON_LEAVE' || (member.status as string) === 'ON LEAVE') ? '#fef3c7' : member.status === 'DEACTIVATED' ? '#fee2e2' : '#f1f5f9',
                        color: member.status === 'ACTIVE' ? '#15803d' : (member.status === 'ON_LEAVE' || (member.status as string) === 'ON LEAVE') ? '#b45309' : member.status === 'DEACTIVATED' ? '#b91c1c' : '#475569'
                      }}>
                        {member.status === 'ON_LEAVE' ? 'ON LEAVE' : (member.status || 'ACTIVE')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setMemberToEditEmail(member);
                          setNewEmailInput(member.email);
                          setEmailChangeReason('');
                          setEmailUpdateError(null);
                        }}
                        style={{
                          fontSize: '0.74rem',
                          padding: '5px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#0284c7',
                          borderColor: '#bae6fd',
                          background: '#f0f9ff',
                          fontWeight: 700
                        }}
                        title={`Change email address for ${member.name}`}
                      >
                        <Edit3 size={13} />
                        Change Email
                      </button>

                      {/* Flowchart 23: Mark Employee on Leave / Return from Leave */}
                      {member.status === 'ON_LEAVE' ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={async () => {
                            if (confirm(`Restore ${member.name} from leave to ACTIVE status now?`)) {
                              await returnMemberFromLeave(member.id);
                            }
                          }}
                          style={{
                            fontSize: '0.74rem',
                            padding: '5px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#15803d',
                            borderColor: '#86efac',
                            background: '#f0fdf4',
                            fontWeight: 700,
                            marginLeft: '6px'
                          }}
                          title={`Return ${member.name} from leave`}
                        >
                          Return to Active
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setLeaveTargetMember(member);
                            setLeaveModalStartDate(getTodayStr());
                            const d = new Date();
                            d.setDate(d.getDate() + 3);
                            setLeaveModalEndDate(d.toISOString().split('T')[0]);
                            setLeaveTaskAction('AUTO_EXTEND');
                            setLeaveNotesInput('');
                            setShowLeaveModal(true);
                          }}
                          style={{
                            fontSize: '0.74rem',
                            padding: '5px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#b45309',
                            borderColor: '#fde68a',
                            background: '#fffbeb',
                            fontWeight: 700,
                            marginLeft: '6px'
                          }}
                          title={`Mark ${member.name} on leave with start & end date`}
                        >
                          Mark On Leave
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 8: EMAIL DELIVERY LOGS & NOTIFICATION DISPATCH (FC 20 & FC 26)   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'email_logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={20} color="#4338ca" />
                  Email Delivery Logs &amp; Notification Dispatch Daemon
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Centralized dispatch audit tracking delivery status, SMTP handshake verification, and immediate retry orchestration.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={fetchEmailLogs}
                disabled={isFetchingEmailLogs}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={14} className={isFetchingEmailLogs ? 'animate-spin' : ''} />
                <span>{isFetchingEmailLogs ? 'Refreshing...' : 'Refresh Logs'}</span>
              </button>
            </div>

            {retryBanner && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                background: retryBanner.startsWith('✓') ? '#f0fdf4' : '#fef2f2',
                border: retryBanner.startsWith('✓') ? '1px solid #86efac' : '1px solid #fecaca',
                color: retryBanner.startsWith('✓') ? '#15803d' : '#991b1b',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}>
                {retryBanner}
              </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  TOTAL DISPATCHES
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {emailLogStats.total}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                  Across all notification triggers
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                  SUCCESSFULLY DELIVERED
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                  {emailLogStats.delivered}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#166534', marginTop: '2px' }}>
                  SMTP 250 OK confirmed
                </div>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                  DELIVERY FAILURES
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
                  {emailLogStats.failed}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#991b1b', marginTop: '2px' }}>
                  Actionable admin failure summary
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>Filter Status:</span>
                {(['ALL', 'DELIVERED', 'FAILED'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setEmailLogFilter(f)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: emailLogFilter === f ? '1.5px solid #4338ca' : '1px solid #cbd5e1',
                      background: emailLogFilter === f ? '#e0e7ff' : '#ffffff',
                      color: emailLogFilter === f ? '#3730a3' : '#475569'
                    }}
                  >
                    {f === 'ALL' ? `All (${emailLogs.length})` : f === 'DELIVERED' ? `Delivered (${emailLogStats.delivered})` : `Failed (${emailLogStats.failed})`}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search recipient, subject, or task..."
                  className="form-input"
                  style={{ paddingLeft: '32px', fontSize: '0.78rem', height: '34px' }}
                  value={emailLogSearch}
                  onChange={e => setEmailLogSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Email Logs Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="admin-oversight-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#475569' }}>TIMESTAMP</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#475569' }}>EVENT TYPE</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#475569' }}>RECIPIENT</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#475569' }}>SUBJECT / DELIVERABLE</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#475569' }}>STATUS</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs
                  .filter(l => {
                    if (emailLogFilter === 'DELIVERED' && l.status !== 'DELIVERED') return false;
                    if (emailLogFilter === 'FAILED' && l.status !== 'FAILED') return false;
                    if (emailLogSearch.trim()) {
                      const q = emailLogSearch.toLowerCase();
                      const matchEmail = (l.recipientEmail || '').toLowerCase().includes(q);
                      const matchName = (l.recipientName || '').toLowerCase().includes(q);
                      const matchSubject = (l.subject || '').toLowerCase().includes(q);
                      const matchTask = (l.taskTitle || '').toLowerCase().includes(q);
                      if (!matchEmail && !matchName && !matchSubject && !matchTask) return false;
                    }
                    return true;
                  })
                  .map((log, idx) => {
                    const logId = log._id || log.id || `log-${idx}`;
                    const isRetrying = retryingEmailId === logId;
                    return (
                      <tr key={logId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.75rem' }}>
                          {log.createdAt ? (
                            <>
                              <div>{new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div style={{ color: '#94a3b8' }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                            </>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}>
                            {log.eventType || 'NOTIFICATION'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.recipientName || log.recipientEmail}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.recipientEmail}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{log.subject}</div>
                          {log.taskTitle && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              Task: {log.taskTitle}
                            </div>
                          )}
                          {log.errorMessage && (
                            <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '3px', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                              Error: {log.errorMessage}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          {log.status === 'DELIVERED' ? (
                            <span style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ✓ DELIVERED
                            </span>
                          ) : (
                            <span style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              ✕ FAILED
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => retryDispatch(log)}
                            disabled={isRetrying}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              color: '#4338ca',
                              borderColor: '#c7d2fe',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RotateCcw size={12} className={isRetrying ? 'animate-spin' : ''} />
                            <span>{isRetrying ? 'Retrying...' : 'Resend'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {emailLogs.length === 0 && !isFetchingEmailLogs && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                      <Mail size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                      <div style={{ fontWeight: 600 }}>No email logs recorded yet.</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                        Dispatches sent by the Notification Daemon will appear here in realtime.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CHANGE EMPLOYEE CORPORATE EMAIL (ENTERPRISE GOVERNANCE)        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {memberToEditEmail && (
        <div className="stream-overlay" onClick={() => !isUpdatingEmail && setMemberToEditEmail(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '8px' }}>
                  <Mail size={18} color="#0284c7" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Change Employee Corporate Email
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Enterprise Governance &amp; Identity Management
                  </div>
                </div>
              </div>
              <button
                className="calendar-nav-btn"
                onClick={() => !isUpdatingEmail && setMemberToEditEmail(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Employee Info */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                {memberToEditEmail.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                {memberToEditEmail.designation} • {memberToEditEmail.department} (ID: {memberToEditEmail.employeeId || memberToEditEmail.id})
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '4px' }}>
                Current Email: <strong style={{ color: '#0f172a' }}>{memberToEditEmail.email}</strong>
              </div>
            </div>

            {emailUpdateError && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.74rem',
                marginTop: '0.75rem'
              }}>
                {emailUpdateError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const cleanEmail = newEmailInput.trim().toLowerCase();
                if (!cleanEmail) {
                  setEmailUpdateError('Please enter a valid corporate email address.');
                  return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(cleanEmail)) {
                  setEmailUpdateError(`"${cleanEmail}" is not a valid email address.`);
                  return;
                }
                if (cleanEmail === memberToEditEmail.email.toLowerCase()) {
                  setEmailUpdateError('The new email is identical to the current email.');
                  return;
                }
                if (!emailChangeReason.trim()) {
                  setEmailUpdateError('A documented governance reason is mandatory for identity auditing.');
                  return;
                }

                setIsUpdatingEmail(true);
                setEmailUpdateError(null);

                const res = await updateMember(
                  memberToEditEmail.id,
                  { email: cleanEmail },
                  emailChangeReason.trim()
                );

                setIsUpdatingEmail(false);
                if (res.success) {
                  setMemberToEditEmail(null);
                } else {
                  setEmailUpdateError(res.error || 'Failed to update email.');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.85rem' }}
            >
              <div className="form-field-group">
                <label className="form-field-label">New Official Corporate Email *</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  placeholder="e.g. techdesk@urbangaon.com"
                  value={newEmailInput}
                  onChange={e => setNewEmailInput(e.target.value)}
                  autoFocus
                />
                <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                  Recommended corporate domain: <code>@urbangaon.com</code>
                </span>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Documented Governance Reason *</label>
                <textarea
                  className="form-input"
                  required
                  rows={2}
                  placeholder="e.g. Domain migration to techdesk@urbangaon.com, role shift, official mailbox reorganization..."
                  value={emailChangeReason}
                  onChange={e => setEmailChangeReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isUpdatingEmail}
                  onClick={() => setMemberToEditEmail(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isUpdatingEmail}
                  style={{
                    background: '#0284c7',
                    borderColor: '#0369a1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Check size={14} />
                  {isUpdatingEmail ? 'Updating...' : 'Save & Update Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Reopen Task Modal (Flowchart 10 Governance) */}
      {taskToReopen && (
        <div className="stream-overlay" onClick={() => setTaskToReopen(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={18} color="#1e40af" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Administrative Task Reopen
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setTaskToReopen(null)}><X size={16} /></button>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a' }}>
                {taskToReopen.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#3b82f6', marginTop: '2px' }}>
                Current Status: <strong>{taskToReopen.status}</strong> • Assignees: {taskToReopen.assignees.map(a => a.name).join(', ')}
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.4 }}>
              As per UrbanGaon enterprise governance, reopening a completed, held, or cancelled task changes its status to <strong>In Progress (50%)</strong> and creates an immutable entry in the audit trail.
            </p>

            <form onSubmit={handleConfirmReopen} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Mandatory Management Justification *</label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder="e.g. Scope revised: deliverable requires QA sign-off and multi-region deployment verification."
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTaskToReopen(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={14} />
                  Confirm Administrative Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* FLOWCHART 3: REQUEST DETAILS & VERIFICATION MODAL                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {selectedRequestForReview && (
        <div className="stream-overlay" onClick={() => setSelectedRequestForReview(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '580px', width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#ecfdf5', padding: '7px', borderRadius: '8px' }}>
                  <CheckCircle2 size={18} color="#059669" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Sign-Up Request Verification
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Verify department, designation, manager & assign unique employee ID
                  </div>
                </div>
              </div>
              <button className="calendar-nav-btn" onClick={() => setSelectedRequestForReview(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Applicant Summary */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{selectedRequestForReview.name}</div>
                  <div style={{ fontSize: '0.76rem', color: '#2563eb' }}>{selectedRequestForReview.email}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{selectedRequestForReview.phone || 'Phone not provided'}</div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>
                  Applied: {new Date(selectedRequestForReview.appliedAt).toLocaleDateString()}
                </span>
              </div>
              {selectedRequestForReview.reason && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.73rem', color: '#475569', fontStyle: 'italic' }}>
                  &ldquo;{selectedRequestForReview.reason}&rdquo;
                </div>
              )}
            </div>

            {/* Admin Verification Form */}
            <form onSubmit={e => {
              e.preventDefault();
              handleApproveRequest(selectedRequestForReview, {
                department: verifyDept,
                designation: verifyDesignation,
                manager: verifyManager,
                managerEmail: verifyManagerEmail,
                employeeId: verifyEmployeeId,
              });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Verify Department *
                  </label>
                  <select
                    className="form-select"
                    required
                    value={verifyDept}
                    onChange={e => setVerifyDept(e.target.value)}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  >
                    <option value="Executive Management">Executive Management</option>
                    <option value="AI & IT Operations">AI & IT Operations</option>
                    <option value="Full-Stack Engineering">Full-Stack Engineering</option>
                    <option value="Product & UI/UX">Product & UI/UX</option>
                    <option value="Talent HR & People">Talent HR & People</option>
                    <option value="Marketing & Growth">Marketing & Growth</option>
                    <option value="Client Success & Support">Client Success & Support</option>
                    <option value="Finance & Compliance">Finance & Compliance</option>
                    <option value="General Staff">General Staff</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Verify Designation *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={verifyDesignation}
                    onChange={e => setVerifyDesignation(e.target.value)}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Designated Reporting Manager *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Dr. Rekha Pareek"
                    value={verifyManager}
                    onChange={e => setVerifyManager(e.target.value)}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Manager Corporate Email
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="manager@urbangaon.com"
                    value={verifyManagerEmail}
                    onChange={e => setVerifyManagerEmail(e.target.value)}
                    style={{ width: '100%', fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Assign Unique Employee ID *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={verifyEmployeeId}
                    onChange={e => setVerifyEmployeeId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px', color: '#1e40af' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                    Assigned Role &amp; Initial Status
                  </label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '36px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8' }}>
                      Role: EMPLOYEE
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>
                      Status: Pending First Login
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => {
                    const req = selectedRequestForReview;
                    setSelectedRequestForReview(null);
                    setRejectionModalRequest(req);
                  }}
                >
                  <X size={14} style={{ marginRight: '4px' }} />
                  Reject Request
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedRequestForReview(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-success"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem' }}
                  >
                    <Check size={15} />
                    Approve &amp; Send One-Time Link →
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* FLOWCHART 3: REJECTION REASON MODAL                                    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {rejectionModalRequest && (
        <div className="stream-overlay" onClick={() => setRejectionModalRequest(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <X size={18} color="#dc2626" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  Reject Access Request
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setRejectionModalRequest(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#9f1239' }}>
              Applicant: <strong>{rejectionModalRequest.name}</strong> ({rejectionModalRequest.email})
            </div>

            <p style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.45 }}>
              Under corporate governance, rejections require a mandatory written rationale which will be formally dispatched to the applicant via email and logged in the immutable audit trail.
            </p>

            <form onSubmit={e => {
              e.preventDefault();
              if (!rejectionInputReason.trim()) {
                alert('Please provide a mandatory written justification reason.');
                return;
              }
              handleRejectRequest(rejectionModalRequest.id, rejectionModalRequest.name, rejectionInputReason.trim());
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Mandatory Rejection Justification *
                </label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder="e.g. Verification check failed: official corporate identity could not be corroborated with department leadership."
                  value={rejectionInputReason}
                  onChange={e => setRejectionInputReason(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRejectionModalRequest(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-secondary"
                  style={{ background: '#dc2626', color: '#ffffff', borderColor: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <X size={14} />
                  Confirm Rejection &amp; Dispatch Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flowchart 23: Mark Employee On Leave Modal */}
      {showLeaveModal && leaveTargetMember && (
        <div className="stream-overlay" onClick={() => !isSubmittingLeave && setShowLeaveModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '520px', borderTop: '4px solid #d97706' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '8px' }}>
                  
                </div>
                <div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#92400e', margin: 0 }}>
                    Mark Employee On Leave
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Pause Reminders • Due Date Evaluation • Notify Leadership
                  </div>
                </div>
              </div>
              <button className="calendar-nav-btn" onClick={() => !isSubmittingLeave && setShowLeaveModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                  {leaveTargetMember.name}
                </div>
                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>
                  {leaveTargetMember.designation} • {leaveTargetMember.department} • ({leaveTargetMember.email})
                </div>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.55rem 0.75rem', marginBottom: '0.85rem', lineHeight: 1.45 }}>
                <strong>Leave Handling Protocol:</strong> When marked on leave, the system pauses automated morning reminders for this employee, attaches the on-leave badge to their active deliverables, and dispatches notices to task creators and reporting managers.
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!leaveModalStartDate || !leaveModalEndDate) {
                  alert('Leave start and end dates are required.');
                  return;
                }
                if (leaveModalEndDate < leaveModalStartDate) {
                  alert('Leave end date cannot be earlier than start date.');
                  return;
                }
                setIsSubmittingLeave(true);
                await markMemberOnLeave({
                  memberId: leaveTargetMember.id,
                  leaveStartDate: leaveModalStartDate,
                  leaveEndDate: leaveModalEndDate,
                  taskDueAction: leaveTaskAction,
                  notes: leaveNotesInput.trim()
                });
                setIsSubmittingLeave(false);
                setShowLeaveModal(false);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-field-group">
                    <label className="form-field-label" style={{ fontWeight: 700 }}>Leave Start Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={leaveModalStartDate}
                      onChange={e => setLeaveModalStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-field-label" style={{ fontWeight: 700 }}>Leave End / Return Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={leaveModalEndDate}
                      onChange={e => setLeaveModalEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Flowchart 23 Diamond: Task due during leave? */}
                <div>
                  <label className="form-field-label" style={{ fontWeight: 800, color: '#1e293b' }}>
                    Deliverables Due During Leave? (Policy Action) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <div
                      onClick={() => setLeaveTaskAction('AUTO_EXTEND')}
                      style={{
                        padding: '0.65rem',
                        borderRadius: '8px',
                        border: leaveTaskAction === 'AUTO_EXTEND' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: leaveTaskAction === 'AUTO_EXTEND' ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: leaveTaskAction === 'AUTO_EXTEND' ? '#1d4ed8' : '#0f172a' }}>
                        Auto-extend due date
                      </div>
                      <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                        Automatically push due date to return date
                      </div>
                    </div>

                    <div
                      onClick={() => setLeaveTaskAction('FLAG_ADMIN')}
                      style={{
                        padding: '0.65rem',
                        borderRadius: '8px',
                        border: leaveTaskAction === 'FLAG_ADMIN' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                        background: leaveTaskAction === 'FLAG_ADMIN' ? '#fff7ed' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: leaveTaskAction === 'FLAG_ADMIN' ? '#c2410c' : '#0f172a' }}>
                        Flag for Admin decision
                      </div>
                      <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                        Flag task for managerial review & reassignment
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Leave Notes / Handover Reason</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="e.g. Annual leave approved by department lead; urgent deliverables covered by secondary assignees..."
                    value={leaveNotesInput}
                    onChange={e => setLeaveNotesInput(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowLeaveModal(false)}
                    disabled={isSubmittingLeave}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ background: '#d97706', borderColor: '#b45309' }}
                    disabled={isSubmittingLeave}
                  >
                    {isSubmittingLeave ? 'Processing...' : 'Confirm Leave & Pause Reminders'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
