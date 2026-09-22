'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Crown, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Users, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  BookOpen,
  ArrowRight
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    activeView,
    setActiveView,
    tasks,
    setSelectedMemberFilter,
    isMobileNavOpen,
    setIsMobileNavOpen
  } = useApp();

  const closeSidebar = () => setIsMobileNavOpen(false);

  // ── Hydration safety ─────────────────────────────────────────────
  // tasks may differ between SSR (INITIAL_TASKS) and client
  // (localStorage). We defer task-derived UI until mounted.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Days in September 2026 (starts Tuesday Sep 1, 2026; 30 days)
  const septemberDays = Array.from({ length: 30 }, (_, i) => i + 1);

  // Only compute after mount to avoid SSR/client mismatch
  const daysWithTasks: Set<number> = isMounted
    ? new Set(
        tasks
          .map(t => {
            const parts = t.scheduledDate.split('-');
            if (parts[0] === '2026' && parts[1] === '09') {
              return parseInt(parts[2], 10);
            }
            return null;
          })
          .filter((d): d is number => d !== null)
      )
    : new Set<number>();

  const selectedDayNum = parseInt(selectedDate.split('-')[2], 10);

  const todayCount    = isMounted ? tasks.filter(t => t.scheduledDate === '2026-09-15').length : 0;
  const tomorrowCount = isMounted ? tasks.filter(t => t.scheduledDate === '2026-09-16').length : 0;

  const handleDateClick = (day: number) => {
    const dayPadded = day.toString().padStart(2, '0');
    const newDate = `2026-09-${dayPadded}`;
    setSelectedDate(newDate);
    if (activeView !== 'workspace' && activeView !== 'calendar') {
      setActiveView('workspace');
    }
  };

  const handleCeoAccessClick = () => {
    setSelectedMemberFilter(null);
    setActiveView('ceo_portal');
    closeSidebar();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`sidebar-backdrop ${isMobileNavOpen ? 'mobile-open' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside className={`app-sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
      {/* CEO Access Portal Golden Card (Slide 4, Slide 9) */}
      <div 
        className="ceo-access-card"
        onClick={handleCeoAccessClick}
        style={{
          boxShadow: activeView === 'ceo_portal' ? '0 0 15px rgba(217, 119, 6, 0.45)' : undefined,
          borderColor: activeView === 'ceo_portal' ? '#d97706' : undefined
        }}
      >
        <div className="ceo-title-group">
          <span className="ceo-crown-icon">👑</span>
          <span className="ceo-title-text">CEO Access</span>
        </div>
        <span className="ceo-view-badge">CEO View ↗</span>
      </div>

      {/* Calendar Date Picker (Slide 4 & Slide 7) */}
      <div className="calendar-widget">
        <div className="calendar-header">
          <span className="calendar-label">Calendar Date Picker</span>
          <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700 }}>Sep 2026</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <button className="calendar-nav-btn" aria-label="Previous Month">‹</button>
          <span className="calendar-month-selector">September 2026</span>
          <button className="calendar-nav-btn" aria-label="Next Month">›</button>
        </div>

        {/* Days of week */}
        <div className="calendar-grid-header">
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>Su</span>
        </div>

        {/* Days grid for Sep 2026 (Starts on Tuesday) */}
        <div className="calendar-grid-days">
          {/* Aug 31 padding */}
          <div className="cal-day-cell other-month">31</div>

          {septemberDays.map(day => {
            const hasTasks = daysWithTasks.has(day);
            const isActive = selectedDayNum === day;

            return (
              <div
                key={day}
                className={`cal-day-cell ${isActive ? 'active-day' : ''}`}
                onClick={() => handleDateClick(day)}
                title={`Select 2026-09-${day.toString().padStart(2, '0')}`}
              >
                <span>{day}</span>
                {hasTasks && <span className="cal-task-dot" />}
              </div>
            );
          })}

          {/* Oct padding */}
          <div className="cal-day-cell other-month">1</div>
          <div className="cal-day-cell other-month">2</div>
          <div className="cal-day-cell other-month">3</div>
          <div className="cal-day-cell other-month">4</div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.6rem',
          paddingTop: '0.5rem',
          borderTop: '1px dashed #e2e8f0',
          fontSize: '0.65rem',
          color: '#64748b'
        }}>
          <span>• Days with scheduled tasks</span>
          <span style={{ color: '#2563eb', fontWeight: 700 }}>{selectedDayNum} Sep Active</span>
        </div>
      </div>

      {/* Filter Shortcuts (Slide 4 & Slide 7) */}
      <div className="filter-shortcuts-group">
        <span className="filter-group-heading">Filter Shortcuts</span>
        
        <button
          className={`filter-shortcut-btn ${selectedDate === '2026-09-15' && activeView === 'workspace' ? 'active' : ''}`}
          onClick={() => {
            setSelectedDate('2026-09-15');
            setActiveView('workspace');
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span>📍 Today (15 Sep)</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>Tuesday · {todayCount} Tasks</span>
          </div>
          <span className="filter-badge-count">{todayCount}</span>
        </button>

        <button
          className={`filter-shortcut-btn ${selectedDate === '2026-09-16' && activeView === 'workspace' ? 'active' : ''}`}
          onClick={() => {
            setSelectedDate('2026-09-16');
            setActiveView('workspace');
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span>⚡ Tomorrow (16 Sep)</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>Wednesday · {tomorrowCount} Tasks</span>
          </div>
          <span className="filter-badge-count">{tomorrowCount}</span>
        </button>
      </div>

      {/* Primary Navigation Links */}
      <nav className="sidebar-nav-links">
        <button
          className={`nav-link-item ${activeView === 'workspace' ? 'active' : ''}`}
          onClick={() => { setActiveView('workspace'); closeSidebar(); }}
        >
          <CheckSquare size={16} />
          <span>Daily Task Register</span>
        </button>

        <button
          className={`nav-link-item ${activeView === 'calendar' ? 'active' : ''}`}
          onClick={() => { setActiveView('calendar'); closeSidebar(); }}
        >
          <CalendarIcon size={16} />
          <span>Calendar Grid View (FC 15)</span>
        </button>

        <button
          className={`nav-link-item ${activeView === 'ceo_portal' ? 'active' : ''}`}
          onClick={handleCeoAccessClick}
        >
          <Crown size={16} color="#d97706" />
          <span style={{ color: '#d97706', fontWeight: 700 }}>Executive Command Center</span>
        </button>

        <button
          className={`nav-link-item ${activeView === 'admin_hr' ? 'active' : ''}`}
          onClick={() => { setActiveView('admin_hr'); closeSidebar(); }}
        >
          <Users size={16} />
          <span>Admin & HR Portal (FC 1-10)</span>
        </button>

        <button
          className={`nav-link-item ${activeView === 'team_view' ? 'active' : ''}`}
          onClick={() => { setActiveView('team_view'); closeSidebar(); }}
        >
          <Layers size={16} />
          <span>Manager "My Team" (FC 19)</span>
        </button>

        <button
          className={`nav-link-item ${activeView === 'audit_trail' ? 'active' : ''}`}
          onClick={() => { setActiveView('audit_trail'); closeSidebar(); }}
        >
          <ShieldCheck size={16} />
          <span>Immutable Audit Log (FC 12)</span>
        </button>

        <button
          className={`nav-link-item ${activeView === 'system_config' ? 'active' : ''}`}
          onClick={() => { setActiveView('system_config'); closeSidebar(); }}
        >
          <Sliders size={16} />
          <span>System Config (FC 16/24)</span>
        </button>

        <button
          className={`nav-link-item ${activeView === 'workflow_manual' ? 'active' : ''}`}
          onClick={() => { setActiveView('workflow_manual'); closeSidebar(); }}
        >
          <BookOpen size={16} />
          <span>28 Workflows Manual</span>
        </button>
      </nav>

      <div className="sidebar-footer-note">
        💡 <strong>Date Navigation:</strong> Click any date on the calendar to filter tasks. Click <strong>CEO Access</strong> for company-wide view.
      </div>
    </aside>
  </>
  );
};
