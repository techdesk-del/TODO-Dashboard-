'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isCeoUser, isStrictCeo } from '@/lib/rosterData';
import { getTodayStr, formatDateDisplay, formatDateShort, formatCreationDate } from '@/lib/dateUtils';
import { Task, TeamMember } from '@/types';
import { TaskCard } from '@/components/TaskCard';
import {
  LayoutDashboard,
  FileText,
  Download,
  ArrowLeft,
  ChevronDown,
  ShieldCheck,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Users,
  Trash2,
  Search,
  Eye,
  X,
  RotateCcw,
  Calendar,
  Layers,
  Sparkles,
  Building2,
  MapPin,
  Briefcase,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Activity,
  Check,
  CalendarPlus,
  CalendarClock,
  PauseCircle,
  Edit3,
  User,
  UserPlus
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CeoPortal: React.FC = () => {
  const {
    tasks,
    members,
    activeMembers,
    selectedMemberFilter,
    setSelectedMemberFilter,
    exportToExcel,
    setViewingAuditForTaskId,
    setActiveView,
    deleteTask,
    updateTask,
    completeTask,
    holdTask,
    reopenTask,
    reassignTask,
    approveTaskByCeo,
    rejectTaskByCeo,
    currentUser,
    setBannerNotification,
    refreshFromDB
  } = useApp();

  const isCeo = isCeoUser(currentUser);
  const isCeoMonitoring = isStrictCeo(currentUser);
  const todayStr = getTodayStr();

  // Local Filter & Search States
  const [ceoTaskLayout, setCeoTaskLayout] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Not Started' | 'In Progress' | 'Review' | 'Done' | 'On Hold'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);
  const [inspectingTaskId, setInspectingTaskId] = useState<string | null>(null);
  const inspectingTask = useMemo(() => {
    if (!inspectingTaskId) return null;
    return tasks.find(t => t.id === inspectingTaskId) || null;
  }, [tasks, inspectingTaskId]);
  const setInspectingTask = (t: Task | null) => setInspectingTaskId(t ? t.id : null);

  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CEO Interactive Modals for Reopen, Reassign, and Reschedule
  const [ceoRescheduleModal, setCeoRescheduleModal] = useState<{ task: Task; dateInput: string } | null>(null);
  const [ceoReopenModal, setCeoReopenModal] = useState<{ task: Task; reason: string } | null>(null);
  const [ceoReassignModal, setCeoReassignModal] = useState<{
    task: Task;
    mode: 'REPLACE_ALL' | 'ADD_ALONGSIDE' | 'REMOVE_SPECIFIC';
    newAssigneeIds: string[];
    removeAssigneeIds: string[];
    reason: string;
  } | null>(null);

  const assignableStaff = useMemo(() => {
    return members.filter(m => {
      if (!m) return false;
      if (isStrictCeo(m)) return false;
      const st = String(m.status || 'ACTIVE').toUpperCase().trim();
      return st !== 'DEACTIVATED' && st !== 'REMOVED' && st !== 'TERMINATED' && !(m as any).isDeactivated;
    });
  }, [members]);

  // Close inspector on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspectingTaskId) {
        setInspectingTaskId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingTaskId]);

  // Executive Quick Action Handlers for CEO
  const handleQuickMarkDone = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === 'Review' || task.pendingCeoApproval) {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      approveTaskByCeo(taskId, 'CEO Approved and marked Complete.');
    } else {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      completeTask(taskId);
    }
  };

  const handleQuickSetInProgress = (taskId: string) => {
    updateTask(taskId, { status: 'In Progress', progressPercent: 50 }, 'Status set to In Progress by CEO');
  };

  const handleQuickPutOnHold = (taskId: string) => {
    const reason = prompt('Enter justification for placing deliverable On Hold:');
    if (!reason || !reason.trim()) return;
    holdTask(taskId, reason.trim());
  };

  const handleQuickRescheduleToday = (taskId: string) => {
    const t = tasks.find(item => item.id === taskId);
    updateTask(taskId, { scheduledDate: todayStr, dueDate: todayStr }, `Rescheduled overdue deliverable to today (${todayStr}) by CEO`);
    setBannerNotification({
      message: `Deliverable "${t?.title || 'Task'}" rescheduled to Today (${todayStr})`,
      badge: '✓ Rescheduled Live'
    });
  };

  const handleQuickRescheduleDate = (taskId: string, currentDate: string) => {
    const t = tasks.find(item => item.id === taskId);
    if (!t) return;
    setCeoRescheduleModal({ task: t, dateInput: currentDate || todayStr });
  };

  const handleOpenCeoReopen = (task: Task) => {
    setCeoReopenModal({ task, reason: '' });
  };

  const handleOpenCeoReassign = (task: Task) => {
    setCeoReassignModal({
      task,
      mode: 'REPLACE_ALL',
      newAssigneeIds: [],
      removeAssigneeIds: [],
      reason: ''
    });
  };

  const handleQuickAddDelayReason = (taskId: string, currentReason?: string) => {
    const reason = prompt('Enter delay / past due justification for corporate audit trail:', currentReason || '');
    if (reason === null) return;
    updateTask(taskId, { delayReason: reason.trim(), pastDueReason: reason.trim() }, `Updated delay justification: "${reason.trim()}"`);
  };

  const handleQuickAddNote = (taskId: string, currentNotes?: string) => {
    const noteDirective = prompt('Enter CEO note / executive instruction:');
    if (!noteDirective || !noteDirective.trim()) return;
    const combinedNotes = currentNotes ? `${currentNotes}\n[CEO Directive]: ${noteDirective.trim()}` : `[CEO Directive]: ${noteDirective.trim()}`;
    updateTask(taskId, { notes: combinedNotes }, `CEO added directive note: "${noteDirective.trim()}"`);
  };

  // Filter tasks based on member, search, status, and department
  const uncancelledTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'Cancelled');
  }, [tasks]);

  // Deliverables awaiting CEO Final Approval
  const pendingCeoApprovalTasks = useMemo(() => {
    return uncancelledTasks.filter(t => t.status === 'Review' || t.pendingCeoApproval);
  }, [uncancelledTasks]);

  // Active member for drilldown
  const activeMember = useMemo(() => {
    if (!selectedMemberFilter) return null;
    return activeMembers.find(m => m.name.toLowerCase() === selectedMemberFilter.toLowerCase()) || null;
  }, [activeMembers, selectedMemberFilter]);

  // Unique departments for filter dropdown
  const departmentList = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.department) set.add(t.department);
    });
    activeMembers.forEach(m => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort();
  }, [tasks, activeMembers]);

  const memberFilteredTasks = useMemo(() => {
    if (!activeMember) return uncancelledTasks;
    const memberNameClean = activeMember.name.toLowerCase().trim();
    const memberEmailClean = (activeMember.email || '').toLowerCase().trim();
    return uncancelledTasks.filter(t => {
      const isAssignee = t.assignees?.some(a =>
        a.id === activeMember.id ||
        (a.name && a.name.toLowerCase().trim().includes(memberNameClean)) ||
        (a.email && a.email.toLowerCase().trim() === memberEmailClean)
      );
      return Boolean(isAssignee);
    });
  }, [uncancelledTasks, activeMember]);

  const displayedTasks = useMemo(() => {
    return memberFilteredTasks.filter(task => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Review') {
          if (task.status !== 'Review' && !task.pendingCeoApproval) return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      // Department filter
      if (departmentFilter !== 'ALL' && task.department !== departmentFilter) {
        return false;
      }

      // Search query (title, project, department, assignee, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesProject = (task.project || '').toLowerCase().includes(q);
        const matchesDept = (task.department || '').toLowerCase().includes(q);
        const matchesAssignees = task.assignees?.some(a => a.name.toLowerCase().includes(q));
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        const matchesHoldReason = (task.holdReason || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesProject && !matchesDept && !matchesAssignees && !matchesNotes && !matchesHoldReason) {
          return false;
        }
      }

      return true;
    }).slice().sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [memberFilteredTasks, statusFilter, departmentFilter, searchQuery]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMemberFilter, statusFilter, departmentFilter, searchQuery]);

  // Pagination Calculations for Executive Command Center
  const totalDisplayedCount = displayedTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplayedCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalDisplayedCount);
  const paginatedTasks = useMemo(() => {
    return displayedTasks.slice(startIndex, startIndex + pageSize);
  }, [displayedTasks, startIndex, pageSize]);

  // Executive KPI Calculations
  const totalTasksCount = memberFilteredTasks.length;
  const completedCount = memberFilteredTasks.filter(t => t.status === 'Done').length;
  const inProgressCount = memberFilteredTasks.filter(t => t.status === 'In Progress').length;
  const notStartedCount = memberFilteredTasks.filter(t => t.status === 'Not Started').length;
  const pendingBlockersCount = memberFilteredTasks.filter(t =>
    t.status === 'On Hold' ||
    t.status === 'Escalated' ||
    (t.scheduledDate < todayStr && t.status !== 'Done')
  ).length;

  const sprintVelocity = totalTasksCount > 0
    ? Math.round((completedCount / totalTasksCount) * 100)
    : 100;

  // Handlers
  const handlePrintBoardReport = () => {
    window.print();
  };

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await refreshFromDB();
      setBannerNotification({
        message: 'Executive Ledger synchronized with MongoDB Atlas in real-time.',
        badge: 'SYNC COMPLETE'
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleExecuteDelete = (taskId: string) => {
    deleteTask(taskId);
    setDeletingTaskId(null);
    if (inspectingTask?.id === taskId) {
      setInspectingTask(null);
    }
    setBannerNotification({
      message: 'Deliverable permanently removed from corporate ledger by CEO authorization.',
      badge: 'GOVERNANCE AUDIT'
    });
  };

  const resetAllFilters = () => {
    setSelectedMemberFilter(null);
    setSearchQuery('');
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
  };

  const hasActiveFilters = Boolean(
    selectedMemberFilter ||
    searchQuery.trim() ||
    statusFilter !== 'ALL' ||
    departmentFilter !== 'ALL'
  );

  return (
    <div className="ceo-portal-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ─────────────────────────────────────────────────────────────
          1. EXECUTIVE HERO COMMAND BANNER
      ────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.1rem 1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <LayoutDashboard size={20} color="#334155" strokeWidth={2} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Executive Command Center
              </h1>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Live Oversight
              </span>
            </div>

            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Real-time deliverable monitoring across <strong>{activeMembers.length} active team members</strong> • Tracking <strong>{uncancelledTasks.length} enterprise deliverables</strong>
            </p>
          </div>
        </div>

        {/* Executive Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Synchronize ledger with live MongoDB Atlas database"
          >
            <RotateCcw size={13} className={isRefreshing ? 'spin-animation' : ''} />
            <span>Sync Ledger</span>
          </button>

          <button
            type="button"
            onClick={handlePrintBoardReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              background: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Download executive board print/PDF dossier"
          >
            <Printer size={14} color="#2563eb" />
            <span>Board PDF Dossier</span>
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Export full multi-sheet audit & deliverables ledger to Microsoft Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXECUTIVE KPI CARDS (4-CARD GRID)
      ────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))',
        gap: '0.9rem'
      }}>
        {/* KPI 1: Total Active Deliverables */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#3b82f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Deliverables
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {totalTasksCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Tasks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            <span><strong>{inProgressCount}</strong> in progress</span>
            <span><strong>{notStartedCount}</strong> queued</span>
          </div>
          {/* Micro Progress Bar */}
          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${totalTasksCount > 0 ? ((inProgressCount + completedCount) / totalTasksCount) * 100 : 0}%`,
              height: '100%',
              background: '#3b82f6',
              borderRadius: '999px'
            }} />
          </div>
        </div>

        {/* KPI 2: Team Sprint Velocity */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#10b981' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sprint Velocity
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>
            {sprintVelocity}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            <span><strong>{completedCount}</strong> of <strong>{totalTasksCount}</strong> done</span>
            <span style={{ color: '#059669', fontWeight: 700 }}>Pace: Strong</span>
          </div>
          {/* Micro Progress Bar */}
          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${sprintVelocity}%`,
              height: '100%',
              background: '#10b981',
              borderRadius: '999px'
            }} />
          </div>
        </div>

        {/* KPI 3: Bottleneck Watch */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: pendingBlockersCount > 0 ? '#f59e0b' : '#10b981'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Operational Bottlenecks
            </span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: pendingBlockersCount > 0 ? '#fffbeb' : '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={16} color={pendingBlockersCount > 0 ? '#d97706' : '#059669'} />
            </div>
          </div>
          <div style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: pendingBlockersCount > 0 ? '#d97706' : '#059669',
            lineHeight: 1.1
          }}>
            {pendingBlockersCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Items</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: pendingBlockersCount > 0 ? '#b45309' : '#059669', fontWeight: 600, marginTop: '2px' }}>
            {pendingBlockersCount > 0 ? 'Requires leadership intervention' : '✓ Zero critical halts'}
          </div>
          {/* Micro Bar */}
          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${totalTasksCount > 0 ? Math.min((pendingBlockersCount / totalTasksCount) * 100, 100) : 0}%`,
              height: '100%',
              background: pendingBlockersCount > 0 ? '#f59e0b' : '#10b981',
              borderRadius: '999px'
            }} />
          </div>
        </div>

        {/* KPI 4: Verified Completions */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#8b5cf6' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Finalized Milestones
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} color="#7c3aed" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1.1 }}>
            {completedCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Tasks</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            {completedCount > 0 ? '✓ Audited & verified in database' : 'Awaiting deliverable sign-offs'}
          </div>
          {/* Micro Bar */}
          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${totalTasksCount > 0 ? (completedCount / totalTasksCount) * 100 : 0}%`,
              height: '100%',
              background: '#8b5cf6',
              borderRadius: '999px'
            }} />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. UNIFIED EXECUTIVE TOOLBAR & FILTERS
      ────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '0.9rem 1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Top Controls Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '6px 11px',
            flex: '1 1 220px',
            minWidth: '0',
            transition: 'border-color 0.15s ease'
          }}>
            <Search size={15} color="#64748b" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deliverables, projects, staff..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.78rem',
                color: '#0f172a',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }}
              >
                <X size={13} color="#94a3b8" />
              </button>
            )}
          </div>

          {/* Member Picker Dropdown */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '0' }}>
            <button
              type="button"
              onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '6px 12px',
                background: activeMember ? '#eff6ff' : '#ffffff',
                border: activeMember ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: activeMember ? '#1d4ed8' : '#1e293b',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <Users size={14} color={activeMember ? '#2563eb' : '#64748b'} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeMember ? activeMember.name : `All Team Members (${activeMembers.length})`}
                </span>
              </div>
              <ChevronDown size={14} color="#64748b" />
            </button>

            {isMemberDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                zIndex: 60,
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '5px'
              }}>
                {/* Reset to All */}
                <div
                  onClick={() => {
                    setSelectedMemberFilter(null);
                    setIsMemberDropdownOpen(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: !activeMember ? '#eff6ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: !activeMember ? '#1d4ed8' : '#0f172a'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem'
                    }}>
                    </div>
                    <span>All Company Members</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                    {uncancelledTasks.length} tasks
                  </span>
                </div>

                {/* List each active member */}
                {activeMembers.map(m => {
                  const memberTasksCount = uncancelledTasks.filter(t =>
                    t.assignees?.some(a =>
                      a.id === m.id ||
                      (a.name && a.name.toLowerCase().trim() === m.name.toLowerCase().trim()) ||
                      (a.email && m.email && a.email.toLowerCase().trim() === m.email.toLowerCase().trim())
                    )
                  ).length;
                  const isSelected = activeMember?.id === m.id;

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedMemberFilter(m.name);
                        setIsMemberDropdownOpen(false);
                      }}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '2px',
                        transition: 'background 0.12s ease'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden'
                        }}>
                          {m.avatar?.startsWith('/') || m.avatar?.startsWith('http') ? (
                            <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            m.avatar || m.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.designation} • {m.department}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: isSelected ? '#1d4ed8' : '#64748b',
                        background: isSelected ? '#dbeafe' : '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}>
                        {memberTasksCount} tasks
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 180px', minWidth: '0' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>Cluster:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0f172a',
                background: '#ffffff',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">All Clusters / Depts</option>
              {departmentList.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title="Clear all active search and filter constraints"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Bottom Status Filter Chips */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '0.65rem'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px', flexShrink: 0 }}>
            Status:
          </span>

          {[
            { id: 'ALL', label: 'All Tasks', count: memberFilteredTasks.length },
            { id: 'Review', label: ' Awaiting Final Approval', count: memberFilteredTasks.filter(t => t.status === 'Review' || t.pendingCeoApproval).length },
            { id: 'In Progress', label: 'In Progress', count: inProgressCount },
            { id: 'Not Started', label: 'Queued', count: notStartedCount },
            { id: 'Done', label: 'Completed', count: completedCount },
            { id: 'On Hold', label: 'On Hold / Blockers', count: memberFilteredTasks.filter(t => t.status === 'On Hold' || t.status === 'Escalated').length }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: isActive ? '#2563eb' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.12s ease'
                }}
              >
                <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#475569',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontSize: '0.66rem',
                  flexShrink: 0
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. ACTIVE MEMBER DOSSIER CARD (WHEN A MEMBER IS SELECTED)
      ────────────────────────────────────────────────────────────── */}
      {activeMember && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1.5px solid #a7f3d0',
          borderRadius: '12px',
          padding: '0.9rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
        }}>
          {/* Member Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(5, 150, 105, 0.25)',
              overflow: 'hidden'
            }}>
              {activeMember.avatar?.startsWith('/') || activeMember.avatar?.startsWith('http') ? (
                <img src={activeMember.avatar} alt={activeMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                activeMember.avatar || activeMember.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#064e3b' }}>
                  {activeMember.name}
                </span>
                <span style={{
                  background: '#d1fae5',
                  color: '#065f46',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  {activeMember.designation}
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '2px' }}>
                {activeMember.email} • {activeMember.department} Cluster
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Assigned</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#064e3b' }}>{totalTasksCount} Deliverables</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>In Progress</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>{inProgressCount} Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Velocity</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>{sprintVelocity}% Completed</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMemberFilter(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                background: '#ffffff',
                color: '#047857',
                border: '1px solid #6ee7b7',
                borderRadius: '7px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <ArrowLeft size={13} />
              <span>Reset to Company Overview</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. COMPANY DELIVERABLES — CARDS / TABLE TOGGLE
      ────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>

        {/* ── Header row: title + layout toggle ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
              Company Deliverables ({displayedTasks.length})
            </span>
            {totalDisplayedCount > 0 && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                Showing {startIndex + 1}–{endIndex} of {totalDisplayedCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setCeoTaskLayout('cards')}
              title="Box Cards View"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: ceoTaskLayout === 'cards' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: ceoTaskLayout === 'cards' ? '#eff6ff' : '#ffffff',
                color: ceoTaskLayout === 'cards' ? '#2563eb' : '#64748b',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              <Layers size={13} /> <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setCeoTaskLayout('table')}
              title="Table View"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: ceoTaskLayout === 'table' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: ceoTaskLayout === 'table' ? '#eff6ff' : '#ffffff',
                color: ceoTaskLayout === 'table' ? '#2563eb' : '#64748b',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              <FileSpreadsheet size={13} /> <span>Table</span>
            </button>
          </div>
        </div>

        {/* ══ CARDS MODE ══ */}
        {ceoTaskLayout === 'cards' && (
          <div style={{ padding: 'clamp(0.5rem, 2vw, 0.85rem)' }}>
            {displayedTasks.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Search size={22} color="#94a3b8" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>No deliverables found</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '340px' }}>Adjust filters or reset to view all company deliverables.</div>
                {hasActiveFilters && (
                  <button type="button" onClick={resetAllFilters} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '7px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                    <RotateCcw size={13} /><span>Show All</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="task-cards-list">
                {paginatedTasks.map((task, idx) => (
                  <TaskCard key={task.id} task={task} index={startIndex + idx + 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TABLE MODE ══ */}
        {ceoTaskLayout === 'table' && (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', width: '50px', whiteSpace: 'nowrap' }}>
                      #
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '250px' }}>
                      Task Name
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      Department
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '165px' }}>
                      Assignee
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      Due Date
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      Priority
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      Status & Progress
                    </th>
                    <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      Executive Governance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    const isOverdue = task.scheduledDate < todayStr && task.status !== 'Done';
                    const isConfirmingDelete = deletingTaskId === task.id;

                    return (
                      <tr
                        key={`${task.id}-${globalIdx}`}
                        onClick={() => setInspectingTaskId(task.id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.12s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                        title="Click row to inspect full deliverable details & executive actions"
                      >
                        {/* Sequence Badge */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 800
                          }}>
                            #{globalIdx}
                          </span>
                        </td>

                        {/* Task Name */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', minWidth: '250px' }}>
                          <span
                            style={{
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              cursor: 'pointer',
                              transition: 'color 0.15s ease',
                              lineHeight: 1.45,
                              display: 'block'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#0f172a')}
                            title="Click to view complete details, project, location, and notes"
                          >
                            {task.title}
                          </span>
                        </td>

                        {/* Department Cluster */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <span style={{
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {task.department || 'Operations'}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.66rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden'
                            }}>
                              {task.assignees?.[0]?.avatar?.startsWith('/') || task.assignees?.[0]?.avatar?.startsWith('http') ? (
                                <img src={task.assignees[0].avatar} alt={task.assignees[0].name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              ) : (
                                task.assignees?.[0]?.avatar || task.assignees?.[0]?.name?.slice(0, 2).toUpperCase() || 'TM'
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                {task.assignees?.map(a => a.name).join(', ') || 'Unassigned'}
                              </div>
                              {task.assignees?.[0]?.designation && (
                                <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {task.assignees[0].designation}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Due Date */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                              <Calendar size={12} color="#64748b" />
                              <span>Current Date: <strong style={{ color: '#0f172a' }}>{todayStr}</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 700, color: isOverdue ? '#dc2626' : '#1e293b' }}>
                              <CalendarClock size={13} color={isOverdue ? '#dc2626' : '#2563eb'} />
                              <span>Due: {formatDateShort(task.scheduledDate) || task.scheduledDate}</span>
                            </div>
                            {isOverdue && (
                              <span style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                display: 'inline-block',
                                width: 'fit-content'
                              }}>
                                PAST DUE
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          {(() => {
                            const pri = (task.priority || 'NORMAL').toUpperCase();
                            let bg = '#eff6ff';
                            let text = '#1d4ed8';
                            let border = '#bfdbfe';

                            if (pri === 'URGENT') {
                              bg = '#fef2f2';
                              text = '#b91c1c';
                              border = '#fecaca';
                            } else if (pri === 'HIGH') {
                              bg = '#fff7ed';
                              text = '#c2410c';
                              border = '#fed7aa';
                            } else if (pri === 'LOW') {
                              bg = '#f8fafc';
                              text = '#64748b';
                              border = '#e2e8f0';
                            }

                            return (
                              <span style={{
                                background: bg,
                                color: text,
                                border: `1px solid ${border}`,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase'
                              }}>
                                {pri}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Status & Progress */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: task.status === 'Done' ? '#10b981' : task.status === 'In Progress' ? '#3b82f6' : task.status === 'On Hold' ? '#f59e0b' : '#94a3b8'
                              }} />
                              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a' }}>
                                {task.status}
                              </span>
                              {task.progressPercent !== undefined && task.status === 'In Progress' && (
                                <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>
                                  ({task.progressPercent}%)
                                </span>
                              )}
                            </div>

                            {/* Progress meter */}
                            <div style={{ width: '80px', height: '3px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${task.status === 'Done' ? 100 : task.status === 'In Progress' ? (task.progressPercent || 50) : 0}%`,
                                height: '100%',
                                background: task.status === 'Done' ? '#10b981' : '#3b82f6',
                                borderRadius: '999px'
                              }} />
                            </div>

                            {task.holdReason && (
                              <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>
                                Hold: {task.holdReason.slice(0, 25)}...
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Executive Governance Actions */}
                        <td
                          style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', flexWrap: 'wrap' }}>
                            {isCeo && (task.status === 'Review' || task.pendingCeoApproval) && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const note = prompt(`Enter optional CEO approval note for "${task.title}":`, 'Final approval granted. Deliverable verified and marked Completed.');
                                    if (note === null) return;
                                    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
                                    approveTaskByCeo(task.id, note.trim());
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.25)'
                                  }}
                                  title="Grant Final Approval and Mark Done"
                                >
                                  <Check size={12} />
                                  <span>Approve & Complete (Done)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const reason = prompt(`Enter revision instructions for "${task.title}":`);
                                    if (!reason || !reason.trim()) return;
                                    rejectTaskByCeo(task.id, reason.trim());
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '4px 8px',
                                    background: '#ffffff',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title="Return to staff with feedback for revision"
                                >
                                  <X size={12} />
                                  <span>Request Changes</span>
                                </button>
                              </>
                            )}

                            {/* Inspect Details Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingTaskId(task.id);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 8px',
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                              title="Inspect comprehensive deliverable dossier"
                            >
                              <Eye size={12} color="#0284c7" />
                              <span>Inspect</span>
                            </button>

                            {/* Reschedule Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickRescheduleDate(task.id, task.scheduledDate);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 8px',
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                              title="Reschedule deliverable target date"
                            >
                              <Calendar size={12} color="#2563eb" />
                              <span>Reschedule</span>
                            </button>

                            {/* Reassign Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCeoReassign(task);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 8px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                              title="Reassign deliverable staff"
                            >
                              <UserPlus size={12} color="#2563eb" />
                              <span>Reassign</span>
                            </button>

                            {/* Reopen Button (when Completed) */}
                            {task.status === 'Done' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCeoReopen(task);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '4px 8px',
                                  background: '#eef2ff',
                                  color: '#1e40af',
                                  border: '1px solid #c7d2fe',
                                  borderRadius: '6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease'
                                }}
                                title="Reopen completed deliverable"
                              >
                                <RotateCcw size={12} color="#1e40af" />
                                <span>Reopen</span>
                              </button>
                            )}

                            {/* Audit Trail Button */}
                            <button
                              type="button"
                              onClick={() => setViewingAuditForTaskId(task.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 8px',
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                              title="View complete immutable audit log history for this deliverable"
                            >
                              <ShieldCheck size={12} color="#059669" />
                              <span>Audit</span>
                            </button>

                            {/* Safe Delete Button */}
                            {isCeo && (
                              <>
                                {!isConfirmingDelete ? (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingTaskId(task.id)}
                                    style={{
                                      padding: '4px 7px',
                                      background: '#ffffff',
                                      color: '#dc2626',
                                      border: '1px solid #fecaca',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.12s ease'
                                    }}
                                    title="CEO Action: Permanently remove deliverable"
                                  >
                                    <Trash2 size={12} color="#dc2626" />
                                  </button>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleExecuteDelete(task.id)}
                                      style={{
                                        padding: '4px 7px',
                                        background: '#dc2626',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '5px',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                      title="Confirm Permanent Deletion"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingTaskId(null)}
                                      style={{
                                        padding: '4px 6px',
                                        background: '#f1f5f9',
                                        color: '#64748b',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '5px',
                                        fontSize: '0.68rem',
                                        cursor: 'pointer'
                                      }}
                                      title="Cancel"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State - Table Mode */}
            {displayedTasks.length === 0 && (
              <div style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Search size={22} color="#94a3b8" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                  No deliverables found matching active filters
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '380px' }}>
                  Try adjusting your search criteria or resetting filters to view all company deliverables.
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    style={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Show All Company Tasks</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Enterprise Pagination & Governance Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.74rem',
          color: '#64748b'
        }}>
          {/* Left: Showing summary & Rows per page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div>
              {totalDisplayedCount > 0 ? (
                <>
                  Showing <strong style={{ color: '#0f172a' }}>{startIndex + 1}</strong> to <strong style={{ color: '#0f172a' }}>{endIndex}</strong> of <strong style={{ color: '#0f172a' }}>{totalDisplayedCount}</strong> deliverables
                  {activeMember ? ` assigned to ${activeMember.name}` : ' across all corporate staff'}
                </>
              ) : (
                <>Showing <strong>0</strong> deliverables</>
              )}
            </div>

            {totalDisplayedCount > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 600 }}>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '3px 24px 3px 8px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                    minHeight: '30px',
                    height: '30px'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>

          {/* Right: Page Navigation Controls */}
          {totalDisplayedCount > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage <= 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  minHeight: '30px',
                  padding: 0,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: safeCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage <= 1 ? '#cbd5e1' : '#334155',
                  cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                }}
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage <= 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  height: '30px',
                  minHeight: '30px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: safeCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage <= 1 ? '#94a3b8' : '#1e293b',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                }}
                title="Previous Page"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '30px',
                        height: '30px',
                        minHeight: '30px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: safeCurrentPage === item ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: safeCurrentPage === item ? '#2563eb' : '#ffffff',
                        color: safeCurrentPage === item ? '#ffffff' : '#334155',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: safeCurrentPage === item ? '0 1px 3px rgba(37, 99, 235, 0.25)' : 'none'
                      }}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage >= totalPages}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  height: '30px',
                  minHeight: '30px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: safeCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage >= totalPages ? '#94a3b8' : '#1e293b',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                }}
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage >= totalPages}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  minHeight: '30px',
                  padding: 0,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: safeCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage >= totalPages ? '#cbd5e1' : '#334155',
                  cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                }}
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span>Executive Governance Ledger • Synchronized Real-Time</span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. EXECUTIVE TASK DETAIL INSPECTION DRAWER / MODAL
      ────────────────────────────────────────────────────────────── */}
      {inspectingTask && (() => {
        const isInspectingOverdue = inspectingTask.scheduledDate < todayStr && inspectingTask.status !== 'Done';
        const isAwaitingCeoApproval = inspectingTask.status === 'Review' || !!inspectingTask.pendingCeoApproval;
        const taskIdx = displayedTasks.findIndex(t => t.id === inspectingTask.id);
        const pri = (inspectingTask.priority || 'NORMAL').toUpperCase();

        let priBg = '#eff6ff';
        let priText = '#1d4ed8';
        let priBorder = '#bfdbfe';
        if (pri === 'URGENT') {
          priBg = '#fef2f2';
          priText = '#b91c1c';
          priBorder = '#fecaca';
        } else if (pri === 'HIGH') {
          priBg = '#fff7ed';
          priText = '#c2410c';
          priBorder = '#fed7aa';
        } else if (pri === 'LOW') {
          priBg = '#f8fafc';
          priText = '#64748b';
          priBorder = '#e2e8f0';
        }

        const statusBg = inspectingTask.status === 'Done' ? '#ecfdf5' : inspectingTask.status === 'In Progress' ? '#eff6ff' : inspectingTask.status === 'On Hold' ? '#fffbeb' : '#f8fafc';
        const statusText = inspectingTask.status === 'Done' ? '#059669' : inspectingTask.status === 'In Progress' ? '#1d4ed8' : inspectingTask.status === 'On Hold' ? '#b45309' : '#475569';
        const statusBorder = inspectingTask.status === 'Done' ? '#a7f3d0' : inspectingTask.status === 'In Progress' ? '#bfdbfe' : inspectingTask.status === 'On Hold' ? '#fde68a' : '#cbd5e1';

        const progressVal = inspectingTask.status === 'Done' ? 100 : inspectingTask.status === 'In Progress' ? (inspectingTask.progressPercent ?? 50) : 0;

        return (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem'
            }}
            onClick={() => setInspectingTaskId(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: '640px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800
                    }}>
                      #{taskIdx >= 0 ? taskIdx + 1 : inspectingTask.id}
                    </span>

                    <span style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800
                    }}>
                      {inspectingTask.department || 'Operations'}
                    </span>

                    <span style={{
                      background: priBg,
                      color: priText,
                      border: `1px solid ${priBorder}`,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em'
                    }}>
                      {pri}
                    </span>

                    <span style={{
                      background: statusBg,
                      color: statusText,
                      border: `1px solid ${statusBorder}`,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusText }} />
                      {inspectingTask.status}
                    </span>

                    {isInspectingOverdue && (
                      <span style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <AlertTriangle size={11} />
                        PAST DUE
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                    {inspectingTask.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingTaskId(null)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                    flexShrink: 0,
                    transition: 'all 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#64748b';
                  }}
                  title="Close inspection dialog (Esc)"
                >
                  <X size={16} />
                </button>
              </div>

              {/* CEO Final Approval Banner if Awaiting Sign-off */}
              {isAwaitingCeoApproval && (
                <div style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                  border: '1.5px solid #fde68a',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  boxShadow: '0 2px 6px rgba(180, 83, 9, 0.08)'
                }}>
                  <div style={{ minWidth: '220px', flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>⏳</span>
                      <span>Pending CEO Final Sign-Off</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '2px' }}>
                      {inspectingTask.ceoApprovalRequestedBy ? `Submitted by ${inspectingTask.ceoApprovalRequestedBy} • ` : ''}
                      Deliverable completed by staff. Executive approval from Mr. Sukh Sagar Singh Bhati required.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const note = prompt(`Enter optional CEO approval endorsement for "${inspectingTask.title}":`, 'Final approval granted. Deliverable verified and marked Completed.');
                        if (note === null) return;
                        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
                        approveTaskByCeo(inspectingTask.id, note.trim());
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                      }}
                    >
                      <Check size={13} />
                      <span>Approve & Complete (Done)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt(`Enter revision instructions for staff on "${inspectingTask.title}":`);
                        if (!reason || !reason.trim()) return;
                        rejectTaskByCeo(inspectingTask.id, reason.trim());
                      }}
                      style={{
                        background: '#ffffff',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <X size={13} />
                      <span>Request Revision</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Core Executive Dossier Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.9rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Briefcase size={12} color="#2563eb" />
                    <span>{inspectingTask.project || 'General Portfolio'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Location & Office</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#64748b" />
                    <span>{inspectingTask.location || 'Jaipur Headquarters'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Date</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} color="#64748b" />
                    <span>{todayStr}</span>
                  </div>
                  {inspectingTask.creator && (
                    <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>
                      By: {inspectingTask.creator.name} ({inspectingTask.creator.role || 'Staff'})
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.64rem', fontWeight: 800, color: isInspectingOverdue ? '#dc2626' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Due Date & Time
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isInspectingOverdue ? '#dc2626' : '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarClock size={12} color={isInspectingOverdue ? '#dc2626' : '#2563eb'} />
                    <span>{formatDateDisplay(inspectingTask.scheduledDate)} at {inspectingTask.time || '05:00 PM'}</span>
                  </div>
                  {isInspectingOverdue && (
                    <div style={{ fontSize: '0.66rem', color: '#b91c1c', fontWeight: 700, marginTop: '1px' }}>
                      Deliverable is overdue from past date
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Live Progress & Completion
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: statusText }}>
                      {progressVal}% Complete
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${progressVal}%`,
                      height: '100%',
                      background: inspectingTask.status === 'Done' ? '#10b981' : inspectingTask.status === 'In Progress' ? '#3b82f6' : inspectingTask.status === 'On Hold' ? '#f59e0b' : '#94a3b8',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>

              {/* Description & Objective */}
              {inspectingTask.description && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Deliverable Brief & Scope
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#334155',
                    lineHeight: 1.5,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.75rem'
                  }}>
                    {inspectingTask.description}
                  </div>
                </div>
              )}

              {/* Notes & Remarks (Daily Task details parity) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Notes, Context & Remarks
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAddNote(inspectingTask.id, inspectingTask.notes)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: 0
                    }}
                  >
                    <Edit3 size={11} />
                    <span>+ Add Executive Note</span>
                  </button>
                </div>
                <div style={{
                  fontSize: '0.78rem',
                  color: inspectingTask.notes ? '#1e293b' : '#94a3b8',
                  lineHeight: 1.5,
                  background: inspectingTask.notes ? '#eff6ff' : '#f8fafc',
                  border: inspectingTask.notes ? '1px solid #bfdbfe' : '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  whiteSpace: 'pre-line'
                }}>
                  {inspectingTask.notes || 'No remarks currently attached. Click "+ Add Executive Note" to record leadership instructions.'}
                </div>
              </div>

              {/* Assignees */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Assigned Team Members ({inspectingTask.assignees?.length || 0})
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCeoReassign(inspectingTask)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <UserPlus size={12} />
                    <span>Reassign Staff</span>
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {inspectingTask.assignees && inspectingTask.assignees.length > 0 ? (
                    inspectingTask.assignees.map((a, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: '#2563eb',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            {a.avatar?.startsWith('/') || a.avatar?.startsWith('http') ? (
                              <img src={a.avatar} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              a.avatar || a.name?.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{a.name}</div>
                            {a.designation && <div style={{ fontSize: '0.66rem', color: '#64748b' }}>{a.designation} • {a.department}</div>}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: a.status === 'Done' ? '#059669' : a.status === 'In Progress' ? '#1d4ed8' : '#64748b',
                          background: a.status === 'Done' ? '#ecfdf5' : a.status === 'In Progress' ? '#eff6ff' : '#f1f5f9',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          border: '1px solid',
                          borderColor: a.status === 'Done' ? '#a7f3d0' : a.status === 'In Progress' ? '#bfdbfe' : '#e2e8f0'
                        }}>
                          {a.status || 'Not Started'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                      No staff members assigned to this deliverable.
                    </div>
                  )}
                </div>
              </div>

              {/* Contextual Justifications & Alerts (Overdue Delay, Hold, Escalation) */}
              {(isInspectingOverdue || inspectingTask.delayReason || inspectingTask.pastDueReason) && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.6rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9f1239', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} />
                      <span>Past Due / Delay Justification</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#881337', marginTop: '2px', lineHeight: 1.4 }}>
                      {inspectingTask.delayReason || inspectingTask.pastDueReason || 'Deliverable is past due. Staff justification required under Governance Policy FC 21.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAddDelayReason(inspectingTask.id, inspectingTask.delayReason || inspectingTask.pastDueReason)}
                    style={{
                      background: '#ffffff',
                      color: '#be123c',
                      border: '1px solid #fca5a5',
                      borderRadius: '5px',
                      padding: '3px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {inspectingTask.delayReason || inspectingTask.pastDueReason ? 'Edit Reason' : 'Add Reason'}
                  </button>
                </div>
              )}

              {inspectingTask.holdReason && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PauseCircle size={12} />
                    <span>Hold / Blocker Justification</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#78350f', marginTop: '2px', lineHeight: 1.4 }}>
                    {inspectingTask.holdReason}
                  </div>
                </div>
              )}

              {inspectingTask.escalationReason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} />
                    <span>Escalated to {inspectingTask.escalatedTo || 'Senior Leadership'}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#7f1d1d', marginTop: '2px', lineHeight: 1.4 }}>
                    {inspectingTask.escalationReason}
                  </div>
                </div>
              )}

              {/* CEO Executive Quick Actions Toolbar (Daily task action parity) */}
              <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    CEO Quick Actions & Governance
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    {/* Mark Done */}
                    {inspectingTask.status !== 'Done' && (
                      <button
                        type="button"
                        onClick={() => handleQuickMarkDone(inspectingTask.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Mark deliverable completed"
                      >
                        <Check size={12} />
                        <span>Mark Done (100%)</span>
                      </button>
                    )}

                    {/* Set In Progress */}
                    {inspectingTask.status !== 'In Progress' && inspectingTask.status !== 'Done' && (
                      <button
                        type="button"
                        onClick={() => handleQuickSetInProgress(inspectingTask.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Set status to In Progress"
                      >
                        <Activity size={12} />
                        <span>Start In Progress</span>
                      </button>
                    )}

                    {/* Put on Hold */}
                    {inspectingTask.status !== 'On Hold' && inspectingTask.status !== 'Done' && (
                      <button
                        type="button"
                        onClick={() => handleQuickPutOnHold(inspectingTask.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Put deliverable on hold with justification"
                      >
                        <PauseCircle size={12} />
                        <span>Hold</span>
                      </button>
                    )}

                    {/* Move to Today (Overdue Shortcut) */}
                    {isInspectingOverdue && (
                      <button
                        type="button"
                        onClick={() => handleQuickRescheduleToday(inspectingTask.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          background: '#fff1f2',
                          color: '#be123c',
                          border: '1px solid #fecdd3',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                        title="Reschedule overdue deliverable to today"
                      >
                        <RotateCcw size={12} />
                        <span>Move to Today</span>
                      </button>
                    )}

                    {/* Reschedule Date */}
                    <button
                      type="button"
                      onClick={() => handleQuickRescheduleDate(inspectingTask.id, inspectingTask.scheduledDate)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Reschedule deliverable date"
                    >
                      <Calendar size={12} />
                      <span>Reschedule</span>
                    </button>

                    {/* Reassign Staff */}
                    <button
                      type="button"
                      onClick={() => handleOpenCeoReassign(inspectingTask)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Reassign deliverable to team members"
                    >
                      <UserPlus size={12} />
                      <span>Reassign</span>
                    </button>

                    {/* Reopen Completed Deliverable */}
                    {inspectingTask.status === 'Done' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCeoReopen(inspectingTask)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          background: '#eef2ff',
                          color: '#1e40af',
                          border: '1px solid #c7d2fe',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Reopen completed deliverable with mandatory justification"
                      >
                        <RotateCcw size={12} />
                        <span>Reopen</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Buttons: Audit Trail, Delete, Close */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const id = inspectingTask.id;
                        setInspectingTaskId(null);
                        setViewingAuditForTaskId(id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        background: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        borderRadius: '7px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Inspect immutable audit log history"
                    >
                      <ShieldCheck size={13} color="#059669" />
                      <span>Audit Trail</span>
                    </button>

                    {isCeo && (
                      <button
                        type="button"
                        onClick={() => {
                          const confirmMsg = `CEO Authorization: Permanently remove deliverable "${inspectingTask.title}" from company ledger?`;
                          if (window.confirm(confirmMsg)) {
                            const id = inspectingTask.id;
                            handleExecuteDelete(id);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          background: '#ffffff',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '7px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Delete deliverable"
                      >
                        <Trash2 size={13} color="#dc2626" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingTaskId(null)}
                    style={{
                      padding: '6px 16px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '7px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2)'
                    }}
                  >
                    Done Inspecting
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          7. CEO INTERACTIVE MODALS: RESCHEDULE, REOPEN, REASSIGN
      ────────────────────────────────────────────────────────────── */}
      {ceoRescheduleModal && (
        <div
          className="stream-overlay"
          style={{ zIndex: 10050 }}
          onClick={() => setCeoRescheduleModal(null)}
        >
          <div
            className="stream-modal-card"
            style={{ maxWidth: '420px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Reschedule Deliverable
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Update target execution & due date in real time
                  </div>
                </div>
              </div>
              <button type="button" className="calendar-nav-btn" onClick={() => setCeoRescheduleModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: 1.35
            }}>
              {ceoRescheduleModal.task.title}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ceoRescheduleModal.dateInput) return;
                updateTask(
                  ceoRescheduleModal.task.id,
                  { scheduledDate: ceoRescheduleModal.dateInput, dueDate: ceoRescheduleModal.dateInput },
                  `Rescheduled deliverable to ${ceoRescheduleModal.dateInput} by CEO`
                );
                setBannerNotification({
                  message: `Deliverable "${ceoRescheduleModal.task.title}" rescheduled to ${ceoRescheduleModal.dateInput}`,
                  badge: '✓ Rescheduled Live'
                });
                setCeoRescheduleModal(null);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div className="form-field-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <label className="form-field-label" style={{ margin: 0 }}>New Target Date</label>
                  <button
                    type="button"
                    onClick={() => setCeoRescheduleModal(prev => prev ? { ...prev, dateInput: todayStr } : null)}
                    style={{
                      background: ceoRescheduleModal.dateInput === todayStr ? '#2563eb' : '#eff6ff',
                      color: ceoRescheduleModal.dateInput === todayStr ? '#ffffff' : '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Today ({todayStr})
                  </button>
                </div>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={ceoRescheduleModal.dateInput}
                  onChange={(e) => setCeoRescheduleModal(prev => prev ? { ...prev, dateInput: e.target.value } : null)}
                  style={{ marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '4px' }}>
                <button type="button" className="btn-secondary" onClick={() => setCeoRescheduleModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ceoReopenModal && (
        <div
          className="stream-overlay"
          style={{ zIndex: 10050 }}
          onClick={() => setCeoReopenModal(null)}
        >
          <div
            className="stream-modal-card"
            style={{ maxWidth: '460px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af', margin: 0 }}>
                Reopen Completed Deliverable (FC 10)
              </h3>
              <button type="button" className="calendar-nav-btn" onClick={() => setCeoReopenModal(null)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              Reopening <strong>&ldquo;{ceoReopenModal.task.title}&rdquo;</strong> transitions it back to <strong>In Progress (50%)</strong> in real time and notifies all assigned staff.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ceoReopenModal.reason.trim()) return;
                reopenTask(ceoReopenModal.task.id, ceoReopenModal.reason.trim());
                setCeoReopenModal(null);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div className="form-field-group">
                <label className="form-field-label">Reason for Reopening *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  required
                  placeholder="Provide executive instructions or reason for reopening this deliverable..."
                  value={ceoReopenModal.reason}
                  onChange={(e) => setCeoReopenModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setCeoReopenModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#2563eb' }}>
                  Reopen as In Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ceoReassignModal && (
        <div
          className="stream-overlay"
          style={{ zIndex: 10050 }}
          onClick={() => setCeoReassignModal(null)}
        >
          <div
            className="stream-modal-card"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', margin: 0 }}>
                  Reassign Deliverable — Executive Control
                </h3>
              </div>
              <button type="button" className="calendar-nav-btn" onClick={() => setCeoReassignModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#1e293b'
            }}>
              {ceoReassignModal.task.title}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const { task, mode, newAssigneeIds, removeAssigneeIds, reason } = ceoReassignModal;
                if ((mode === 'REPLACE_ALL' || mode === 'ADD_ALONGSIDE') && newAssigneeIds.length === 0) {
                  alert('Please select at least one staff member to assign.');
                  return;
                }
                if (mode === 'REMOVE_SPECIFIC' && removeAssigneeIds.length === 0) {
                  alert('Please select at least one existing assignee to remove.');
                  return;
                }
                await reassignTask({
                  taskId: task.id,
                  mode,
                  newAssigneeIds,
                  removeAssigneeIds,
                  reason: reason.trim()
                });
                setCeoReassignModal(null);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
            >
              <div className="form-field-group">
                <label className="form-field-label">Reassignment Mode *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {[
                    { key: 'REPLACE_ALL', title: 'Replace All', desc: 'Remove old & add new' },
                    { key: 'ADD_ALONGSIDE', title: 'Add Alongside', desc: 'Keep old & add new' },
                    { key: 'REMOVE_SPECIFIC', title: 'Remove Specific', desc: 'Remove selected only' }
                  ].map((item) => {
                    const active = ceoReassignModal.mode === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setCeoReassignModal(prev => prev ? {
                          ...prev,
                          mode: item.key as 'REPLACE_ALL' | 'ADD_ALONGSIDE' | 'REMOVE_SPECIFIC',
                          newAssigneeIds: [],
                          removeAssigneeIds: []
                        } : null)}
                        style={{
                          padding: '0.55rem 0.4rem',
                          borderRadius: '8px',
                          border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: active ? '#eff6ff' : '#ffffff',
                          color: active ? '#1e40af' : '#475569',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <div>{item.title}</div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 500, color: '#64748b', marginTop: '2px' }}>
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(ceoReassignModal.mode === 'REPLACE_ALL' || ceoReassignModal.mode === 'ADD_ALONGSIDE') && (
                <div className="form-field-group">
                  <label className="form-field-label">Select Staff Members to Assign *</label>
                  <div style={{
                    maxHeight: '185px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    background: '#f8fafc'
                  }}>
                    {assignableStaff
                      .filter(m => ceoReassignModal.mode === 'REPLACE_ALL' ? true : !ceoReassignModal.task.assignees.some(a => a.id === m.id))
                      .map(m => {
                        const isChecked = ceoReassignModal.newAssigneeIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              background: isChecked ? '#eff6ff' : '#ffffff',
                              border: isChecked ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                              cursor: 'pointer',
                              fontSize: '0.78rem'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCeoReassignModal(prev => {
                                  if (!prev) return null;
                                  const nextIds = checked
                                    ? [...prev.newAssigneeIds, m.id]
                                    : prev.newAssigneeIds.filter(id => id !== m.id);
                                  return { ...prev, newAssigneeIds: nextIds };
                                });
                              }}
                            />
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{m.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto' }}>
                              {m.department} • {m.designation}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {ceoReassignModal.mode === 'REMOVE_SPECIFIC' && (
                <div className="form-field-group">
                  <label className="form-field-label">Select Current Assignees to Remove *</label>
                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.45rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    background: '#fef2f2'
                  }}>
                    {ceoReassignModal.task.assignees.map(a => {
                      const isChecked = ceoReassignModal.removeAssigneeIds.includes(a.id);
                      return (
                        <label
                          key={a.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            background: isChecked ? '#fee2e2' : '#ffffff',
                            border: isChecked ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setCeoReassignModal(prev => {
                                if (!prev) return null;
                                const nextIds = checked
                                  ? [...prev.removeAssigneeIds, a.id]
                                  : prev.removeAssigneeIds.filter(id => id !== a.id);
                                return { ...prev, removeAssigneeIds: nextIds };
                              });
                            }}
                          />
                          <span style={{ fontWeight: 700, color: '#991b1b' }}>{a.name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto' }}>
                            Status: {a.status}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-field-group">
                <label className="form-field-label">Handover Notes / Executive Directive (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Shifting ownership for priority sprint execution..."
                  value={ceoReassignModal.reason}
                  onChange={(e) => setCeoReassignModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setCeoReassignModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#2563eb' }}>
                  Confirm & Sync Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
