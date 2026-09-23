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
  ArrowRight,
  LogIn,
  LogOut,
  Trash2,
  CalendarDays
} from 'lucide-react';
import { getTodayStr, getTomorrowStr, formatDateDisplay } from '@/lib/dateUtils';
import { AuthModal } from './AuthModal';

export const Sidebar: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    activeView,
    setActiveView,
    tasks,
    setSelectedMemberFilter,
    isMobileNavOpen,
    setIsMobileNavOpen,
    clearAllTasks,
    currentUser,
    logoutUser
  } = useApp();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const closeSidebar = () => setIsMobileNavOpen(false);

  // ── Hydration safety ─────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Today & Tomorrow dynamic strings
  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();

  // Dynamic Month & Year Calculation
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const monthLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });

  // First day of month (Monday = 0)
  const firstDayRaw = new Date(currentYear, currentMonth, 1).getDay(); // Sunday = 0
  const firstDayIndex = (firstDayRaw + 6) % 7; // Monday = 0, Sunday = 6

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filter tasks for today & tomorrow
  const todayCount = isMounted ? tasks.filter(t => t.scheduledDate === todayStr).length : 0;
  const tomorrowCount = isMounted ? tasks.filter(t => t.scheduledDate === tomorrowStr).length : 0;

  const currentYearMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const daysWithTasks: Set<number> = isMounted
    ? new Set(
        tasks
          .map(t => {
            const parts = t.scheduledDate.split('-');
            if (parts[0] === String(currentYear) && parts[1] === String(currentMonth + 1).padStart(2, '0')) {
              return parseInt(parts[2], 10);
            }
            return null;
          })
          .filter((d): d is number => d !== null)
      )
    : new Set<number>();

  const selectedParts = selectedDate.split('-');
  const isSelectedThisMonth = selectedParts[0] === String(currentYear) && selectedParts[1] === String(currentMonth + 1).padStart(2, '0');
  const selectedDayNum = isSelectedThisMonth ? parseInt(selectedParts[2], 10) : null;

  const handleDateClick = (day: number) => {
    const dayPadded = day.toString().padStart(2, '0');
    const monthPadded = String(currentMonth + 1).padStart(2, '0');
    const newDate = `${currentYear}-${monthPadded}-${dayPadded}`;
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

  const handleClearData = async () => {
    const isConfirmed = confirm(
      'Are you sure you want to clear ALL deliverables from MongoDB Atlas and local memory?\n\nThis will reset the board to 0 tasks so you can test with fresh data.'
    );
    if (isConfirmed) {
      await clearAllTasks();
    }
  };

  const isGuest = currentUser.id === 'guest';

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`sidebar-backdrop ${isMobileNavOpen ? 'mobile-open' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside 
        className={`app-sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}
        style={{ paddingTop: 0, marginTop: 0 }}
      >
        {/* CEO Access Portal Golden Card - Flush with 0px top space */}
        <div 
          className="ceo-access-card"
          onClick={handleCeoAccessClick}
          style={{
            marginTop: 0,
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: activeView === 'ceo_portal' ? '2px solid #d97706' : '1.5px solid #fcd34d',
            borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
            marginLeft: 'calc(-1 * clamp(0.75rem, 3vw, 1rem))',
            marginRight: 'calc(-1 * clamp(0.75rem, 3vw, 1rem))',
            boxShadow: activeView === 'ceo_portal' ? '0 0 15px rgba(217, 119, 6, 0.45)' : '0 2px 5px rgba(217, 119, 6, 0.08)',
          }}
        >
          <div className="ceo-title-group">
            <span className="ceo-crown-icon">👑</span>
            <span className="ceo-title-text">CEO Access</span>
          </div>
          <span className="ceo-view-badge">CEO View ↗</span>
        </div>

        {/* Calendar Date Picker - Dynamically synchronized to current month */}
        <div className="calendar-widget">
          <div className="calendar-header">
            <span className="calendar-label">Calendar Date Picker</span>
            <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700 }}>{monthLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span className="calendar-month-selector">{monthName}</span>
            <span style={{ fontSize: '0.65rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
              Live
            </span>
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

          {/* Days grid for current month */}
          <div className="calendar-grid-days">
            {/* Previous month padding cells */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`pad-${idx}`} className="cal-day-cell other-month">•</div>
            ))}

            {monthDays.map(day => {
              const isSelected = isSelectedThisMonth && day === selectedDayNum;
              const hasTask = daysWithTasks.has(day);
              const dayStrFormatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dayStrFormatted === todayStr;

              return (
                <div
                  key={day}
                  className={`cal-day-cell ${isSelected ? 'selected' : ''} ${hasTask ? 'has-task' : ''} ${isToday ? 'today-highlight' : ''}`}
                  onClick={() => handleDateClick(day)}
                  style={{
                    fontWeight: isToday ? 800 : isSelected ? 700 : undefined,
                    outline: isToday && !isSelected ? '1.5px solid #2563eb' : undefined,
                    cursor: 'pointer'
                  }}
                  title={isToday ? 'Today' : `Select ${day} ${monthName}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Shortcuts: Synchronized to Today and Tomorrow */}
        <div className="filter-shortcuts-group">
          <span className="filter-group-heading">Live Date Shortcuts</span>
          
          <button
            className={`filter-shortcut-btn ${selectedDate === todayStr && activeView === 'workspace' ? 'active' : ''}`}
            onClick={() => {
              setSelectedDate(todayStr);
              setActiveView('workspace');
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span>📍 Today ({todayStr.slice(5)})</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>{todayCount} Active Deliverables</span>
            </div>
            <span className="filter-badge-count">{todayCount}</span>
          </button>

          <button
            className={`filter-shortcut-btn ${selectedDate === tomorrowStr && activeView === 'workspace' ? 'active' : ''}`}
            onClick={() => {
              setSelectedDate(tomorrowStr);
              setActiveView('workspace');
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span>⚡ Tomorrow ({tomorrowStr.slice(5)})</span>
              <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>{tomorrowCount} Scheduled Deliverables</span>
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

        {/* Clear Data & Authentication Actions */}
        <div style={{
          marginTop: 'auto',
          padding: '0.75rem 0',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {isGuest ? (
            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', gap: '6px' }}
              onClick={() => { setIsAuthModalOpen(true); closeSidebar(); }}
            >
              <LogIn size={14} />
              <span>Sign In / Register</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem', gap: '4px' }}
                onClick={() => { setIsAuthModalOpen(true); closeSidebar(); }}
                title="Switch login credentials"
              >
                <LogIn size={12} />
                <span>Switch</span>
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem', gap: '4px', color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => { logoutUser(); closeSidebar(); }}
                title="Sign out of current account"
              >
                <LogOut size={12} />
                <span>Log Out</span>
              </button>
            </div>
          )}

          <button
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.72rem', color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', gap: '6px' }}
            onClick={handleClearData}
            title="Clear all tasks from MongoDB to start with fresh data"
          >
            <Trash2 size={13} color="#dc2626" />
            <span>Clear All Data ({tasks.length})</span>
          </button>
        </div>

        <div className="sidebar-footer-note">
          💡 <strong>Live Date Sync:</strong> Today is <strong>{formatDateDisplay(todayStr)}</strong>. Click any date to plan ahead.
        </div>
      </aside>

      {/* Global Auth Modal from Sidebar */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
