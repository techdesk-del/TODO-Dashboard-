'use client';

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
import { formatDateTitle, getTodayStr, getTomorrowStr, formatDateDayMonth } from '@/lib/dateUtils';
import { isCeoUser, isStrictCeo, canAccessAdminHr, canAccessWorkflows } from '@/lib/rosterData';
import { Check, Calendar as CalendarIcon, Sparkles, Globe, CalendarDays, AlertTriangle, RotateCcw, Plus } from 'lucide-react';

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

  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'assigned_to_me' | 'assigned_by_me'>('assigned_to_me');
  const [ceoEmployeeFilter, setCeoEmployeeFilter] = useState<string>('ALL');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isCeo = isMounted && isCeoUser(currentUser);
  const isStrictCeoUser = isMounted && isStrictCeo(currentUser);
  const isCeoMonitoring = isStrictCeoUser;
  const canAccessAdmin = isMounted && canAccessAdminHr(currentUser);
  const canViewWorkflows = isMounted && canAccessWorkflows(currentUser);
  const canAccessManager = isMounted && (isCeo || currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');

  // SDE-3 Architectural Pattern: Determine Effective View
  // If activeView is restricted and user does not have authorization,
  // silently and immediately fall back to 'workspace' without showing any restriction banner/screen.
  const isRestrictedUnauthorized =
    (activeView === 'admin_hr' && !canAccessAdmin) ||
    (activeView === 'ceo_portal' && !isCeo) ||
    (activeView === 'team_view' && !canAccessManager) ||
    (activeView === 'audit_trail' && !canAccessAdmin) ||
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
  // - All employees and administrators (including Super Admin Aakash Das) ONLY see tasks that they created OR are assigned to in their personal workspace
  const currentCleanEmail = (currentUser.email || '').toLowerCase().trim();
  const visibleTasks = useMemo(() => {
    if (!isStrictCeoUser) {
      return tasks.filter(t => {
        if (t.status === 'Cancelled') return false;
        const isCreator = t.creator?.id === currentUser.id || (t.creator?.email && t.creator.email.toLowerCase().trim() === currentCleanEmail);
        const isAssignee = t.assignees?.some(a => a.id === currentUser.id || (a.email && a.email.toLowerCase().trim() === currentCleanEmail));
        return isCreator || isAssignee;
      });
    }

    const uncancelled = tasks.filter(t => t.status !== 'Cancelled');
    if (isCeoMonitoring && ceoEmployeeFilter !== 'ALL') {
      const targetMember = members.find(m => m.id === ceoEmployeeFilter);
      const targetEmail = (targetMember?.email || '').toLowerCase().trim();
      return uncancelled.filter(t => {
        const isCreator = t.creator?.id === ceoEmployeeFilter || (t.creator?.email && t.creator.email.toLowerCase().trim() === targetEmail);
        const isAssignee = t.assignees?.some(a => a.id === ceoEmployeeFilter || (a.email && a.email.toLowerCase().trim() === targetEmail));
        return isCreator || isAssignee;
      });
    }
    return uncancelled;
  }, [tasks, isStrictCeoUser, isCeoMonitoring, ceoEmployeeFilter, members, currentUser, currentCleanEmail]);

  // Flowchart 6 view partition:
  // - Task appears in "Assigned to" for each assignee
  // - Task appears in "Assigned by" for the creator
  const assignedToMeCount = visibleTasks.filter(t => 
    t.assignees?.some(a => a.id === currentUser.id || (a.email && a.email.toLowerCase().trim() === currentCleanEmail))
  ).length;

  const assignedByMeCount = visibleTasks.filter(t => 
    t.creator?.id === currentUser.id || (t.creator?.email && t.creator.email.toLowerCase().trim() === currentCleanEmail)
  ).length;

  const partitionedTasks = visibleTasks.filter(t => {
    if (assigneeFilter === 'assigned_to_me') {
      return t.assignees?.some(a => a.id === currentUser.id || (a.email && a.email.toLowerCase().trim() === currentCleanEmail));
    }
    if (assigneeFilter === 'assigned_by_me') {
      return t.creator?.id === currentUser.id || (t.creator?.email && t.creator.email.toLowerCase().trim() === currentCleanEmail);
    }
    return true;
  });

  const todayStr = getTodayStr();
  const overdueTasks = partitionedTasks.filter(t => t.scheduledDate < todayStr && t.status !== 'Done' && t.status !== 'Cancelled');
  const dateTasks = partitionedTasks.filter(t => t.scheduledDate === selectedDate);
  const displayTasks = useMemo(() => {
    const list = viewScope === 'all' ? partitionedTasks : dateTasks;
    const taskMap = new Map<string, typeof list[0]>();
    for (const t of list) {
      if (t && t.id && !taskMap.has(t.id)) {
        taskMap.set(t.id, t);
      }
    }
    return Array.from(taskMap.values()).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [viewScope, partitionedTasks, dateTasks]);



  return (
    <div className="app-layout">
      {/* Executive Header */}
      <Header />

      <div className="app-body">
        {/* Left Sidebar with Calendar & CEO access */}
        <Sidebar />

        {/* Main Workspace Area */}
        <main className="main-workspace">
          {effectiveView === 'workspace' && (
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
                          ? `Worldwide Real-Time Ledger • ${visibleTasks.length} Total Deliverables Across All Employees`
                          : `Filtered from Calendar • ${dateTasks.length} Tasks Scheduled for this Date`)
                      : (viewScope === 'all'
                          ? `Private Employee Workspace • Only displaying tasks created by or assigned to ${currentUser.name}`
                          : `Private Schedule • ${dateTasks.length} of your tasks scheduled for this date`)}
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
                        onClick={() => setAssigneeFilter('all')}
                        style={{
                          padding: '5px 11px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          background: assigneeFilter === 'all' ? '#ffffff' : 'transparent',
                          color: assigneeFilter === 'all' ? '#0f172a' : '#64748b',
                          boxShadow: assigneeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        All ({visibleTasks.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssigneeFilter('assigned_to_me')}
                        style={{
                          padding: '5px 11px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          background: assigneeFilter === 'assigned_to_me' ? '#2563eb' : 'transparent',
                          color: assigneeFilter === 'assigned_to_me' ? '#ffffff' : '#64748b',
                          boxShadow: assigneeFilter === 'assigned_to_me' ? '0 1px 3px rgba(37,99,235,0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title="Tasks assigned to you"
                      >
                        Assigned to Me ({assignedToMeCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssigneeFilter('assigned_by_me')}
                        style={{
                          padding: '5px 11px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          background: assigneeFilter === 'assigned_by_me' ? '#2563eb' : 'transparent',
                          color: assigneeFilter === 'assigned_by_me' ? '#ffffff' : '#64748b',
                          boxShadow: assigneeFilter === 'assigned_by_me' ? '0 1px 3px rgba(37,99,235,0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title="Tasks created and assigned by you"
                      >
                        Assigned by Me ({assignedByMeCount})
                      </button>
                    </div>
                  )}

                  {/* Scope Switcher: All Dates vs Selected Date */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setViewScope('all')}
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
                {displayTasks.map((task, idx) => (
                  <TaskCard key={`${task.id}-${idx}`} task={task} index={idx + 1} />
                ))}

                {displayTasks.length === 0 && (
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
                )}
              </div>

              {/* Dual-Mode Task Composer (Slide 4, 5, 6) - Hidden for CEO */}
              {!isCeoMonitoring && <VoiceInputBar />}
            </>
          )}

          {effectiveView === 'calendar' && <CalendarView />}
          {effectiveView === 'ceo_portal' && isCeo && <CeoPortal />}
          {effectiveView === 'admin_hr' && canAccessAdmin && <AdminHrPortal />}
          {effectiveView === 'team_view' && canAccessManager && <ManagerTeamView />}
          {effectiveView === 'audit_trail' && canAccessAdmin && <AuditTrailModal />}
          {effectiveView === 'system_config' && canAccessAdmin && <SystemConfigModal />}
          {effectiveView === 'workflow_manual' && canViewWorkflows && <WorkflowManualModal />}
        </main>
      </div>

      {/* Global Modals */}
      {viewingAuditForTaskId && <AuditTrailModal />}
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
