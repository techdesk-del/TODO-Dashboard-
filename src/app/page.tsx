'use client';

import React from 'react';
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
import { Check, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

export default function Home() {
  const {
    activeView,
    selectedDate,
    tasks,
    bannerNotification,
    viewingAuditForTaskId
  } = useApp();

  // Tasks for current selected date
  const dateTasks = tasks.filter(t => t.scheduledDate === selectedDate);

  const formatDateTitle = (dateStr: string) => {
    if (dateStr === '2026-09-15') return 'Tuesday, 15 September 2026';
    if (dateStr === '2026-09-16') return 'Wednesday, 16 September 2026';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

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

              {/* Tasks for Selected Date Header (Slide 4 & Slide 7) */}
              <div className="workspace-heading-row">
                <div>
                  <div className="workspace-date-title">
                    <span>📅</span>
                    <span>Tasks for: {formatDateTitle(selectedDate)}</span>
                  </div>
                  <div className="workspace-date-sub">
                    Filtered from Left Calendar • {dateTasks.length} Tasks Scheduled
                  </div>
                </div>

                <div className="task-count-pill">
                  {dateTasks.length} Tasks Scheduled
                </div>
              </div>

              {/* Task Cards List (Slide 4, 7, 8) */}
              <div className="task-cards-list">
                {dateTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}

                {dateTasks.length === 0 && (
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
