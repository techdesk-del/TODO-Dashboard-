'use client';

import React, { useState } from 'react';
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
import { Check, Calendar as CalendarIcon, Sparkles, Globe, CalendarDays } from 'lucide-react';

export default function Home() {
  const {
    activeView,
    selectedDate,
    setSelectedDate,
    tasks,
    bannerNotification,
    viewingAuditForTaskId
  } = useApp();

  const [viewScope, setViewScope] = useState<'selected' | 'all'>('all');

  // Filter out cancelled / deleted tasks
  const activeTasks = tasks.filter(t => t.status !== 'Cancelled');
  const dateTasks = activeTasks.filter(t => t.scheduledDate === selectedDate);
  const displayTasks = viewScope === 'all' ? activeTasks : dateTasks;



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
                        Task Successfully Scheduled via Voice AI
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
                      {viewScope === 'all'
                        ? 'All Deliverables Across All Dates'
                        : `Tasks for: ${formatDateTitle(selectedDate)}`}
                    </span>
                  </div>
                  <div className="workspace-date-sub">
                    {viewScope === 'all'
                      ? `Worldwide Real-Time Ledger • ${activeTasks.length} Total Deliverables Synchronized with MongoDB Atlas`
                      : `Filtered from Calendar • ${dateTasks.length} Tasks Scheduled for this Date`}
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
                    All Dates ({activeTasks.length})
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
          {activeView === 'ceo_portal' && <CeoPortal />}
          {activeView === 'admin_hr' && <AdminHrPortal />}
          {activeView === 'team_view' && <ManagerTeamView />}
          {activeView === 'audit_trail' && <AuditTrailModal />}
          {activeView === 'system_config' && <SystemConfigModal />}
          {activeView === 'workflow_manual' && <WorkflowManualModal />}
        </main>
      </div>

      {/* Global Modals */}
      {viewingAuditForTaskId && <AuditTrailModal />}
      <MorningDigestPreviewModal />
    </div>
  );
}
