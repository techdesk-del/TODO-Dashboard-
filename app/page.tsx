'use client';

import type { Task } from '@/types';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { TaskCard } from '@/components/TaskCard';
import { VoiceInputBar } from '@/components/VoiceInputBar';
import { CeoPortal } from '@/components/CeoPortal';
import { CalendarView } from '@/components/CalendarView';
import { AdminHrPortal } from '@/components/AdminHrPortal';
import { ManagerTeamView } from '@/components/ManagerTeamView';
import { AuditTrailModal } from '@/components/AuditTrailModal';
import { SystemConfigModal } from '@/components/SystemConfigModal';
import { WorkflowManualModal } from '@/components/WorkflowManualModal';
import { MorningDigestPreviewModal } from '@/components/MorningDigestPreviewModal';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { EnterpriseExportModal } from '@/components/EnterpriseExportModal';
import { AuthModal } from '@/components/AuthModal';
import { LiveCompanyDashboard } from '@/components/LiveCompanyDashboard';
import { formatDateTitle, getTodayStr, getTomorrowStr, formatDateDayMonth, isTaskForDate } from '@/shared/lib/dateUtils';
import { isCeoUser, isStrictCeo, canAccessAdminHr, canAccessWorkflows, canViewAuditTrail } from '@/shared/lib/rosterData';
import { Check, Calendar as CalendarIcon, Sparkles, Globe, CalendarDays, AlertTriangle, RotateCcw, Plus, Eye, EyeOff, Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { computeMultiAssigneeStatus } from '@/shared/lib/multiAssignee';

export default function Home() {
  const {
    activeView,
    setActiveView,
    selectedDate,
    setSelectedDate,
    tasks,
    updateTask,
    bannerNotification,
    viewingAuditForTaskId,
    currentUser,
    members,
    activeMembers,
    isCreateTaskModalOpen,
    setIsCreateTaskModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalInitialMode,
    viewScope,
    setViewScope,
  } = useApp();

  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'assigned_to_me' | 'assigned_by_me'>('all');
  const [ceoEmployeeFilter, setCeoEmployeeFilter] = useState<string>('ALL');
  const [hideCompleted, setHideCompleted] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  // Enterprise Pagination States (SDE-3 / CEO Level)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Auto-reset to page 1 whenever filters, scope, or date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewScope, selectedDate, ceoEmployeeFilter, assigneeFilter, hideCompleted, pageSize]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isGuest = !isMounted || currentUser.id === 'guest';
  const isCeo = isMounted && isCeoUser(currentUser);
  const isStrictCeoUser = isMounted && isStrictCeo(currentUser);
  const isCeoMonitoring = isStrictCeoUser;
  const canAccessAdmin = isMounted && canAccessAdminHr(currentUser);
  const canViewWorkflows = isMounted && canAccessWorkflows(currentUser);
  const canAccessManager = isMounted && (isCeo || currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');
  const canAccessAudit = isMounted && canViewAuditTrail(currentUser);

  // SDE-3 Architectural Pattern: Determine Effective View
  // If activeView is restricted and user does not have authorization,
  // silently and immediately fall back to 'workspace' without showing any restriction banner/screen.
  const isRestrictedUnauthorized =
    (activeView === 'admin_hr' && !canAccessAdmin) ||
    (activeView === 'ceo_portal' && !isCeo) ||
    (activeView === 'team_view' && !canAccessManager) ||
    (activeView === 'audit_trail' && !canAccessAudit) ||
    (activeView === 'system_config' && !canAccessAdmin) ||
    (activeView === 'workflow_manual' && !canViewWorkflows);

  const effectiveView = isRestrictedUnauthorized ? 'workspace' : activeView;

  useEffect(() => {
    if (isRestrictedUnauthorized) {
      setActiveView('workspace');
    }
  }, [isRestrictedUnauthorized, setActiveView]);

  // Role-based visibility isolation:
  // - Strict CEO (Mr. Sukh Sagar Singh Bhati) oversees all company deliverables across all staff members
  // - All employees and administrators (including Super Admin Aakash Das) strictly see tasks ASSIGNED to them in their personal profile
  const currentCleanEmail = (currentUser.email || '').toLowerCase().trim();
  const currentCleanName = (currentUser.name || '').toLowerCase().trim();
  const visibleTasks = useMemo(() => {
    if (!isStrictCeoUser) {
      return tasks.filter(t => {
        if (t.status === 'Cancelled') return false;
        const isAssignee = t.assignees?.some(a =>
          a.id === currentUser.id ||
          (a.email && a.email.toLowerCase().trim() === currentCleanEmail) ||
          (a.name && currentCleanName && a.name.toLowerCase().trim() === currentCleanName)
        );
        return Boolean(isAssignee);
      });
    }

    const uncancelled = tasks.filter(t => t.status !== 'Cancelled');
    if (isCeoMonitoring && ceoEmployeeFilter !== 'ALL') {
      const targetMember = members.find(m => m.id === ceoEmployeeFilter);
      const targetEmail = (targetMember?.email || '').toLowerCase().trim();
      const targetName = (targetMember?.name || '').toLowerCase().trim();
      return uncancelled.filter(t => {
        const isAssignee = t.assignees?.some(a =>
          a.id === ceoEmployeeFilter ||
          (a.email && a.email.toLowerCase().trim() === targetEmail) ||
          (a.name && targetName && a.name.toLowerCase().trim() === targetName)
        );
        return Boolean(isAssignee);
      });
    }
    return uncancelled;
  }, [tasks, isStrictCeoUser, isCeoMonitoring, ceoEmployeeFilter, members, currentUser, currentCleanEmail, currentCleanName]);

  const partitionedTasks = visibleTasks;

  const todayStr = getTodayStr();
  const overdueTasks = partitionedTasks.filter(t => {
    if (t.status === 'Done' || t.status === 'Cancelled') return false;
    const effectiveDeadline = (t.dueDate && t.dueDate.trim().length > 0) ? t.dueDate.trim() : t.scheduledDate;
    return Boolean(t.isOverdue || (effectiveDeadline && effectiveDeadline < todayStr));
  });
  const dateTasks = partitionedTasks.filter(t => isTaskForDate(t, selectedDate));

  const isDoneTask = (t: Task) => {
    if (!t) return false;
    if (t.status === 'Done') return true;
    try {
      return computeMultiAssigneeStatus(t).status === 'Done';
    } catch {
      return false;
    }
  };

  const scopedList = viewScope === 'all' ? partitionedTasks : dateTasks;
  const completedCount = scopedList.filter(isDoneTask).length;

  const displayTasks = useMemo(() => {
    const list = scopedList;
    const taskMap = new Map<string, typeof list[0]>();
    for (const t of list) {
      if (t && t.id && !taskMap.has(t.id)) {
        if (hideCompleted && isDoneTask(t)) continue;
        taskMap.set(t.id, t);
      }
    }
    return Array.from(taskMap.values()).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [scopedList, hideCompleted]);

  // Enterprise SDE-3 / CEO Pagination Calculations
  const totalTasksCount = displayTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalTasksCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalTasksCount);

  const paginatedTasks = useMemo(() => {
    return displayTasks.slice(startIndex, endIndex);
  }, [displayTasks, startIndex, endIndex]);

  // Sliding window pagination helper (CEO / Enterprise standard)
  const getPaginationItems = (current: number, total: number): (number | '...')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const items: (number | '...')[] = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) items.push(i);
      items.push('...');
      items.push(total);
    } else if (current >= total - 3) {
      items.push(1);
      items.push('...');
      for (let i = total - 4; i <= total; i++) items.push(i);
    } else {
      items.push(1);
      items.push('...');
      items.push(current - 1);
      items.push(current);
      items.push(current + 1);
      items.push('...');
      items.push(total);
    }
    return items;
  };



  return (
    <div className="app-layout">
      {/* Executive Header */}
      <Header />

      <div className="app-body">
        {/* Left Sidebar with Calendar & CEO access (Hidden before sign-in) */}
        {!isGuest && <Sidebar />}

        {/* Main Workspace Area */}
        <main className="main-workspace" style={isGuest ? { width: '100%', maxWidth: '100%', padding: '0 clamp(0.5rem, 2vw, 1.5rem)', margin: '0 auto' } : undefined}>
          {(isGuest || effectiveView === 'company_dashboard') && (
            <LiveCompanyDashboard />
          )}

          {!isGuest && effectiveView === 'workspace' && (
            <>
              {/* Slide 4: Real-Time Synced Notification Banner */}
              {bannerNotification && (
                <div className="sync-banner">
                  <div className="sync-banner-content">
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#2563eb',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      ✓
                    </div>
                    <div>
                      <div className="sync-banner-title">
                        {bannerNotification.badge === 'AUTHENTICATED' ? 'Corporate Session Active' : 'Task Successfully Scheduled via Voice AI'}
                      </div>
                      <div className="sync-banner-subtitle">
                        {bannerNotification.message}
                      </div>
                    </div>
                  </div>

                  <div className="sync-speed-badge">
                    <span>{bannerNotification.badge}</span>
                  </div>
                </div>
              )}

              {/* Executive Overdue & Pending Deliverables Alert Card */}
              {overdueTasks.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                  border: '1px solid #fecdd3',
                  borderRadius: '10px',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  boxShadow: '0 2px 8px rgba(225, 29, 72, 0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 'min(100%, 260px)' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#e11d48',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#881337' }}>
                        {overdueTasks.length} Pending Deliverable{overdueTasks.length > 1 ? 's' : ''} Overdue from Previous Dates
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#9f1239', marginTop: '1px' }}>
                        Tasks from {Array.from(new Set(overdueTasks.map(t => t.scheduledDate))).join(', ')} require completion or date rescheduling.
                      </div>
                    </div>
                  </div>

                  <div className="overdue-alert-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setViewScope('all')}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1px solid #fca5a5',
                        background: '#ffffff',
                        color: '#be123c',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      View All Overdue ({overdueTasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        overdueTasks.forEach(t => {
                          updateTask(t.id, { scheduledDate: todayStr }, `Rescheduled overdue deliverable to today (${todayStr})`);
                        });
                        setSelectedDate(todayStr);
                      }}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: 'none',
                        background: '#e11d48',
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 4px rgba(225, 29, 72, 0.25)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <RotateCcw size={13} />
                      Reschedule All to Today
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks Heading & Scope Selector (All Dates vs Selected Date) */}
              <div className="workspace-heading-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', width: '100%', paddingBottom: '0.5rem' }}>
                <div>
                  <div className="workspace-date-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <CalendarDays size={18} color="#2563eb" />
                    <span>
                      {isCeo
                        ? (viewScope === 'all' ? `Executive Company-Wide Deliverables (${visibleTasks.length})` : `Tasks for: ${formatDateTitle(selectedDate)}`)
                        : (viewScope === 'all' ? `My Deliverables & Tasks (${visibleTasks.length})` : `My Tasks for: ${formatDateTitle(selectedDate)}`)}
                    </span>
                  </div>
                  <div className="workspace-date-sub">
                    {isCeo
                      ? (viewScope === 'all'
                        ? `Worldwide Real-Time Ledger • ${visibleTasks.length} Total Deliverables Across All Employees${totalPages > 1 ? ` • Page ${safeCurrentPage} of ${totalPages}` : ''}`
                        : `Filtered from Calendar • ${dateTasks.length} Tasks Scheduled for this Date${totalPages > 1 ? ` • Page ${safeCurrentPage} of ${totalPages}` : ''}`)
                      : (viewScope === 'all'
                        ? `Private Employee Workspace • Only displaying tasks created by or assigned to ${currentUser.name}${totalPages > 1 ? ` • Page ${safeCurrentPage} of ${totalPages}` : ''}`
                        : `Private Schedule • ${dateTasks.length} of your tasks scheduled for this date${totalPages > 1 ? ` • Page ${safeCurrentPage} of ${totalPages}` : ''}`)}
                  </div>
                </div>

                {/* Flowchart 6 View Partition Tabs & Scope Switcher */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  maxWidth: '100%',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  paddingBottom: '2px'
                }}>
                  {/* Flowchart 6 View Partition Tabs & Scope Switcher */}
                  {isCeoMonitoring ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      flexShrink: 0,
                      border: '1px solid #e2e8f0'
                    }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                        Staff Filter:
                      </span>
                      <select
                        value={ceoEmployeeFilter}
                        onChange={(e) => setCeoEmployeeFilter(e.target.value)}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                        title="Select an employee to isolate and monitor their corporate deliverables"
                      >
                        <option value="ALL">All Monitored Staff ({tasks.filter(t => t.status !== 'Cancelled').length} tasks)</option>
                        {activeMembers.filter(m => !isStrictCeo(m)).map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigneeFilter('all');
                          setViewScope('all');
                        }}
                        style={{
                          padding: '5px 11px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          background: viewScope === 'all' ? '#2563eb' : '#e0e7ff',
                          color: viewScope === 'all' ? '#ffffff' : '#1d4ed8',
                          boxShadow: viewScope === 'all' ? '0 1px 3px rgba(37,99,235,0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title="Show all deliverables assigned to you across all dates"
                      >
                        My Assigned Tasks ({visibleTasks.length})
                      </button>
                    </div>
                  )}

                  {/* Scope Switcher: All Dates vs Selected Date */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setViewScope('all');
                        setAssigneeFilter('all');
                      }}
                      style={{
                        padding: '5px 11px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        background: viewScope === 'all' ? '#2563eb' : 'transparent',
                        color: viewScope === 'all' ? '#ffffff' : '#64748b',
                        boxShadow: viewScope === 'all' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title="Show all deliverables across all dates (27, 28, 29, etc.)"
                    >
                      <Globe size={13} />
                      All Dates ({visibleTasks.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewScope('selected')}
                      style={{
                        padding: '5px 11px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                        background: viewScope === 'selected' ? '#ffffff' : 'transparent',
                        color: viewScope === 'selected' ? '#0f172a' : '#64748b',
                        boxShadow: viewScope === 'selected' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <CalendarDays size={13} />
                      {selectedDate === todayStr ? `Today (${dateTasks.length})` : selectedDate === getTomorrowStr() ? `Tomorrow (${dateTasks.length})` : `${formatDateDayMonth(selectedDate)} (${dateTasks.length})`}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView('company_dashboard')}
                    style={{
                      padding: '5px 11px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      background: '#ffffff',
                      color: '#2563eb',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                    title="View Company-Wide Live Deliverables Table across all staff"
                  >
                    <Layers size={13} />
                    <span>Company Table</span>
                  </button>

                  {completedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setHideCompleted(prev => !prev)}
                      style={{
                        padding: '5px 11px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: hideCompleted ? '#ffffff' : '#eff6ff',
                        color: hideCompleted ? '#64748b' : '#2563eb',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                      }}
                      title={hideCompleted ? `Show ${completedCount} finished deliverable(s)` : 'Hide finished deliverables'}
                    >
                      {hideCompleted ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{hideCompleted ? `Show Completed (${completedCount})` : `Hide Completed (${completedCount})`}</span>
                    </button>
                  )}

                  {/* Flowchart 6: Add Task Button (Disabled & Hidden for CEO - Executive Monitor Mode) */}
                  {!isCeoMonitoring && (
                    <button
                      type="button"
                      onClick={() => setIsCreateTaskModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        borderRadius: '7px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: '#ffffff',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      <Plus size={14} strokeWidth={2.75} />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Task Cards List (Slide 4, 7, 8) */}
              <div className="task-cards-list">
                {paginatedTasks.map((task, idx) => {
                  const globalIdx = startIndex + idx + 1;
                  return <TaskCard key={`${task.id}-${globalIdx}`} task={task} index={globalIdx} />;
                })}

                {displayTasks.length === 0 && (
                  completedCount > 0 && hideCompleted ? (
                    <div style={{
                      background: '#ffffff',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '2.5rem 2rem',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <Check size={36} color="#10b981" />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                        All {completedCount} deliverable(s) for this date are completed!
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '420px' }}>
                        Finished tasks are hidden from the active view. They remain fully available in Excel/CSV Export, or you can reveal them anytime.
                      </div>
                      <button
                        type="button"
                        onClick={() => setHideCompleted(false)}
                        style={{
                          marginTop: '0.5rem',
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Show Completed Tasks ({completedCount})
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      background: '#ffffff',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '3rem 2rem',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <CalendarIcon size={36} color="#94a3b8" />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                        No tasks scheduled for {formatDateTitle(selectedDate)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '400px' }}>
                        {isCeoMonitoring
                          ? 'Executive Monitoring Mode active: No deliverables found for this date across monitored employees.'
                          : 'Use the voice microphone button below or type a conversational prompt to schedule deliverables instantaneously.'}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Enterprise SDE-3 / CEO Pagination Control Bar */}
              {totalTasksCount > 0 && (
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.85rem 1.25rem',
                  marginTop: '0.75rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  {/* Left: Range and total counter + Rows Per Page */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Showing <strong style={{ color: '#0f172a' }}>{startIndex + 1}</strong>–<strong style={{ color: '#0f172a' }}>{endIndex}</strong> of <strong style={{ color: '#0f172a' }}>{totalTasksCount}</strong> deliverables
                    </span>

                    {/* Rows Per Page Selector */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontWeight: 700,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Page Navigation Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {/* First Page */}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(1)}
                        disabled={safeCurrentPage === 1}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: safeCurrentPage === 1 ? '#f8fafc' : '#ffffff',
                          color: safeCurrentPage === 1 ? '#cbd5e1' : '#334155',
                          cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="First Page"
                      >
                        <ChevronsLeft size={14} />
                      </button>

                      {/* Previous Page */}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={safeCurrentPage === 1}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: safeCurrentPage === 1 ? '#f8fafc' : '#ffffff',
                          color: safeCurrentPage === 1 ? '#cbd5e1' : '#334155',
                          cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Previous Page"
                      >
                        <ChevronLeft size={14} />
                      </button>

                      {/* Page Number Pills */}
                      {getPaginationItems(safeCurrentPage, totalPages).map((item, pIdx) => {
                        if (item === '...') {
                          return (
                            <span key={`dots-${pIdx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.8rem', userSelect: 'none' }}>
                              …
                            </span>
                          );
                        }
                        const isSelected = item === safeCurrentPage;
                        return (
                          <button
                            key={`page-${item}`}
                            type="button"
                            onClick={() => setCurrentPage(item as number)}
                            style={{
                              minWidth: '32px',
                              height: '32px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                              background: isSelected ? '#2563eb' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#334155',
                              fontSize: '0.78rem',
                              fontWeight: isSelected ? 800 : 600,
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {item}
                          </button>
                        );
                      })}

                      {/* Next Page */}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={safeCurrentPage === totalPages}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: safeCurrentPage === totalPages ? '#f8fafc' : '#ffffff',
                          color: safeCurrentPage === totalPages ? '#cbd5e1' : '#334155',
                          cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Next Page"
                      >
                        <ChevronRight size={14} />
                      </button>

                      {/* Last Page */}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safeCurrentPage === totalPages}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: safeCurrentPage === totalPages ? '#f8fafc' : '#ffffff',
                          color: safeCurrentPage === totalPages ? '#cbd5e1' : '#334155',
                          cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Last Page"
                      >
                        <ChevronsRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Dual-Mode Task Composer (Slide 4, 5, 6) - Hidden for CEO */}
              {!isCeoMonitoring && <VoiceInputBar />}
            </>
          )}

          {!isGuest && effectiveView === 'calendar' && <CalendarView />}
          {!isGuest && effectiveView === 'ceo_portal' && isCeo && <CeoPortal />}
          {!isGuest && effectiveView === 'admin_hr' && canAccessAdmin && <AdminHrPortal />}
          {!isGuest && effectiveView === 'team_view' && canAccessManager && <ManagerTeamView />}
          {!isGuest && effectiveView === 'audit_trail' && canAccessAudit && <AuditTrailModal />}
          {!isGuest && effectiveView === 'system_config' && canAccessAdmin && <SystemConfigModal />}
          {!isGuest && effectiveView === 'workflow_manual' && canViewWorkflows && <WorkflowManualModal />}
        </main>
      </div>

      {/* Global Modals */}
      {viewingAuditForTaskId && canAccessAudit && <AuditTrailModal />}
      <MorningDigestPreviewModal />
      {isCreateTaskModalOpen && <CreateTaskModal />}
      <EnterpriseExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalInitialMode}
      />
    </div>
  );
}
