'use client';

import React, { useState, useEffect } from 'react';
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
import { formatDateTitle } from '@/lib/dateUtils';
import { isCeoUser } from '@/lib/rosterData';
import { Check, Calendar as CalendarIcon, Sparkles, Globe, CalendarDays } from 'lucide-react';

export default function Home() {
  const {
    activeView,
    setActiveView,
    selectedDate,
    setSelectedDate,
    tasks,
    bannerNotification,
    viewingAuditForTaskId,
    currentUser
  } = useApp();

  const [viewScope, setViewScope] = useState<'selected' | 'all'>('all');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isCeo = isMounted && isCeoUser(currentUser);

  // Role-based visibility isolation:
  // - CEO oversees all company deliverables across all staff members
  // - Regular employees ONLY see tasks that they created OR are assigned to
  const visibleTasks = isCeo
    ? tasks.filter(t => t.status !== 'Cancelled')
    : tasks.filter(t => {
        if (t.status === 'Cancelled') return false;
        const currentCleanEmail = (currentUser.email || '').toLowerCase().trim();
        const isCreator = t.creator?.id === currentUser.id || (t.creator?.email && t.creator.email.toLowerCase().trim() === currentCleanEmail);
        const isAssignee = t.assignees?.some(a => a.id === currentUser.id || (a.email && a.email.toLowerCase().trim() === currentCleanEmail));
        return isCreator || isAssignee;
      });

  const dateTasks = visibleTasks.filter(t => t.scheduledDate === selectedDate);
  const displayTasks = viewScope === 'all' ? visibleTasks : dateTasks;



  return (
    <div className="app-layout">
      {/* Executive Header */}
      <Header />

      <div className="app-body">
        {/* Left Sidebar with Calendar & CEO access */}
        <Sidebar />

        {/* Main Workspace Area */}
        <main className="main-workspace">
          {activeView === 'workspace' && (
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

              {/* Tasks Heading & Scope Selector (All Dates vs Selected Date) */}
              <div className="workspace-heading-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div className="workspace-date-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>📅</span>
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

                {/* Scope Switcher: All Dates vs Selected Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setViewScope('all')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: viewScope === 'all' ? '#2563eb' : 'transparent',
                      color: viewScope === 'all' ? '#ffffff' : '#64748b',
                      boxShadow: viewScope === 'all' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none',
                    }}
                  >
                    <Globe size={13} />
                    All Dates ({visibleTasks.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewScope('selected')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: viewScope === 'selected' ? '#ffffff' : 'transparent',
                      color: viewScope === 'selected' ? '#0f172a' : '#64748b',
                      boxShadow: viewScope === 'selected' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    <CalendarDays size={13} />
                    {selectedDate.slice(5)} ({dateTasks.length})
                  </button>
                </div>
              </div>

              {/* Task Cards List (Slide 4, 7, 8) */}
              <div className="task-cards-list">
                {displayTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
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
                      Use the voice microphone button below or type a conversational prompt to schedule deliverables instantaneously.
                    </div>
                  </div>
                )}
              </div>

              {/* Dual-Mode Task Composer (Slide 4, 5, 6) */}
              <VoiceInputBar />
            </>
          )}

          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'ceo_portal' && (
            isCeo ? (
              <CeoPortal />
            ) : (
              <div style={{
                background: '#ffffff',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                maxWidth: '520px',
                margin: '3rem auto',
                boxShadow: '0 10px 25px rgba(217, 119, 6, 0.08)'
              }}>
                <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>🔒</div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.5rem' }}>
                  CEO Portal Access Restricted
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  The Executive Command Center is strictly restricted to <strong>Mr. Sukh Sagar Singh Bhati (CEO)</strong>.
                  <br /><br />
                  You are currently logged in as <strong>{currentUser.name}</strong> ({currentUser.designation}).
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('workspace')}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', margin: '0 auto', display: 'inline-flex' }}
                >
                  Return to My Workspace
                </button>
              </div>
            )
          )}
          {activeView === 'admin_hr' && (
            isCeo ? (
              <AdminHrPortal />
            ) : (
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                maxWidth: '520px',
                margin: '3rem auto',
                boxShadow: '0 10px 25px rgba(0,0,0,0.06)'
              }}>
                <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>🔒</div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Admin & HR Portal Access Restricted
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Organization administration is strictly reserved for <strong>Mr. Sukh Sagar Singh Bhati (CEO)</strong>.
                  <br /><br />
                  Logged in as: <strong>{currentUser.name}</strong> ({currentUser.designation})
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('workspace')}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', margin: '0 auto', display: 'inline-flex' }}
                >
                  Return to My Workspace
                </button>
              </div>
            )
          )}
          {activeView === 'team_view' && (
            (isCeo || currentUser.role === 'MANAGER') ? (
              <ManagerTeamView />
            ) : (
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                maxWidth: '520px',
                margin: '3rem auto',
                boxShadow: '0 10px 25px rgba(0,0,0,0.06)'
              }}>
                <div style={{ fontSize: '2.8rem', marginBottom: '0.75rem' }}>🔒</div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Management Access Restricted
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Team management view is restricted to Reporting Managers and CEO.
                  <br /><br />
                  Logged in as: <strong>{currentUser.name}</strong> ({currentUser.designation})
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('workspace')}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.82rem', margin: '0 auto', display: 'inline-flex' }}
                >
                  Return to My Workspace
                </button>
              </div>
            )
          )}
          {activeView === 'audit_trail' && <AuditTrailModal />}
          {activeView === 'system_config' && <SystemConfigModal />}
          {activeView === 'workflow_manual' && (isCeo ? <WorkflowManualModal /> : null)}
        </main>
      </div>

      {/* Global Modals */}
      {viewingAuditForTaskId && <AuditTrailModal />}
      <MorningDigestPreviewModal />
    </div>
  );
}
