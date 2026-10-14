'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Task } from '@/types';
import { isCeoUser } from '@/lib/rosterData';
import { getCompanyHoliday, isSundayDate, HOLIDAY_METADATA } from '@/lib/holidayData';
import { ChevronLeft, ChevronRight, Clock, Plus, User, Sparkles, ShieldCheck } from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { tasks, selectedDate, setSelectedDate, setActiveView, currentUser } = useApp();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isCeo = isMounted && isCeoUser(currentUser);

  const userVisibleTasks = isCeo
    ? tasks.filter(t => t.status !== 'Cancelled')
    : tasks.filter(t => {
        if (t.status === 'Cancelled') return false;
        const currentCleanEmail = (currentUser.email || '').toLowerCase().trim();
        const isCreator = t.creator?.id === currentUser.id || (t.creator?.email && t.creator.email.toLowerCase().trim() === currentCleanEmail);
        const isAssignee = t.assignees?.some(a => a.id === currentUser.id || (a.email && a.email.toLowerCase().trim() === currentCleanEmail));
        return isCreator || isAssignee;
      });

  // Dynamically compute calendar month & year from selectedDate or navigation state
  const [calDate, setCalDate] = useState(() => {
    const parts = (selectedDate || '').split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    return new Date(y, m - 1, 1);
  });

  // Keep calendar month in sync if selectedDate changes outside
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (y && m) {
        setCalDate(new Date(y, m - 1, 1));
      }
    }
  }, [selectedDate]);

  const selectedYear = calDate.getFullYear();
  const selectedMonth = calDate.getMonth() + 1;
  const selectedMonthStr = String(selectedMonth).padStart(2, '0');
  const monthLabel = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Compute previous month padding days (Monday = 0, Sunday = 6)
  const firstDayIndex = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7;
  const prevMonthLastDate = new Date(selectedYear, selectedMonth - 1, 0).getDate();
  const prevMonthDays = Array.from({ length: firstDayIndex }, (_, i) => prevMonthLastDate - firstDayIndex + 1 + i);

  // Compute next month padding days
  const totalCells = firstDayIndex + daysInMonth;
  const nextMonthPaddingCount = (7 - (totalCells % 7)) % 7;
  const nextMonthDays = Array.from({ length: nextMonthPaddingCount }, (_, i) => i + 1);

  const getTasksForDay = (day: number) => {
    const dateStr = `${selectedYear}-${selectedMonthStr}-${day.toString().padStart(2, '0')}`;
    return userVisibleTasks.filter(t => t.scheduledDate === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'On Hold': return '#f59e0b';
      case 'Escalated': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Calendar Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
            📅 Interactive Calendar Grid (Flowchart 15 & 23)
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button 
              type="button" 
              className="calendar-nav-btn" 
              aria-label="Previous Month"
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb', minWidth: '130px', textAlign: 'center' }}>
              {monthLabel}
            </span>
            <button 
              type="button" 
              className="calendar-nav-btn" 
              aria-label="Next Month"
              onClick={handleNextMonth}
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* View Mode Toggle & Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '6px',
            display: 'flex',
            gap: '3px'
          }}>
            <button
              className="btn-secondary"
              style={{
                padding: '0.3rem 0.75rem',
                border: 'none',
                background: viewMode === 'month' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: viewMode === 'month' ? 700 : 500
              }}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              className="btn-secondary"
              style={{
                padding: '0.3rem 0.75rem',
                border: 'none',
                background: viewMode === 'week' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: viewMode === 'week' ? 700 : 500
              }}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className="btn-secondary"
              style={{
                padding: '0.3rem 0.75rem',
                border: 'none',
                background: viewMode === 'day' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: viewMode === 'day' ? 700 : 500
              }}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.72rem', color: '#64748b', marginLeft: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Done
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} /> Active
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> On Hold
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Escalated
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#92400e' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Holiday (Auto-Paused)
            </span>
          </div>
        </div>
      </div>

      {/* Official Holiday Synchronization Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.78rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e' }}>
          <Sparkles size={16} color="#d97706" />
          <span>
            <strong>Official UrbanGaon FY 2026-27 Holidays Synchronized:</strong> 8 Gazetted Holidays & All Sundays are active.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#78350f', fontSize: '0.72rem' }}>
          <span style={{ background: '#fef08a', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
            Approved by: {HOLIDAY_METADATA.approvedBy}
          </span>
          <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <ShieldCheck size={14} /> Mail Forwarding & Reminders Auto-Suppressed
          </span>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        width: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ minWidth: '720px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.5rem 0',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '0.75rem',
          color: '#475569'
        }}>
          <span>Monday</span>
          <span>Tuesday</span>
          <span>Wednesday</span>
          <span>Thursday</span>
          <span>Friday</span>
          <span>Saturday</span>
          <span style={{ color: '#dc2626' }}>Sunday (Weekly Off)</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: 'minmax(110px, auto)'
        }}>
          {/* Previous month padding days */}
          {prevMonthDays.map(prevDay => (
            <div 
              key={`prev-${prevDay}`} 
              style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem', color: '#cbd5e1', fontSize: '0.8rem' }}
            >
              {prevDay}
            </div>
          ))}

          {days.map(day => {
            const dateStr = `${selectedYear}-${selectedMonthStr}-${day.toString().padStart(2, '0')}`;
            const dayTasks = getTasksForDay(day);
            const isSelected = selectedDate === dateStr;
            const holiday = getCompanyHoliday(dateStr);
            const isSunday = isSundayDate(dateStr);

            return (
              <div
                key={day}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setActiveView('workspace');
                }}
                style={{
                  border: isSelected 
                    ? '2px solid #2563eb' 
                    : holiday 
                      ? '1px solid #fde68a' 
                      : '1px solid #e2e8f0',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  background: isSelected 
                    ? '#eff6ff' 
                    : holiday 
                      ? '#fffdf5' 
                      : isSunday 
                        ? '#fafbfc' 
                        : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
                title={holiday ? `${holiday.name} — Official Holiday (Auto-Suppressed)` : isSunday ? 'Sunday Weekly Off (Reminders Paused)' : 'Click to view tasks for this date'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 800 : (holiday || isSunday) ? 700 : 600,
                    color: isSelected 
                      ? '#2563eb' 
                      : holiday 
                        ? '#b45309' 
                        : isSunday 
                          ? '#dc2626' 
                          : '#1e293b',
                    background: isSelected 
                      ? '#dbeafe' 
                      : holiday 
                        ? '#fef3c7' 
                        : 'transparent',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {day}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {holiday && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: '#92400e',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '3px',
                        padding: '1px 4px'
                      }}>
                        {holiday.icon} Holiday
                      </span>
                    )}

                    {isSunday && !holiday && (
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: '#dc2626',
                        background: '#fef2f2',
                        borderRadius: '3px',
                        padding: '1px 4px'
                      }}>
                        Off
                      </span>
                    )}

                    {dayTasks.length > 0 && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563eb' }}>
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Holiday Full Badge */}
                {holiday && (
                  <div style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '3px 6px',
                    borderRadius: '4px',
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    color: '#92400e',
                    border: '1px solid #fcd34d',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 2px rgba(245, 158, 11, 0.1)'
                  }} title={`${holiday.name} • Official Company Holiday (Reminders Paused)`}>
                    <span>{holiday.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{holiday.name}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                  {dayTasks.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 5px',
                        borderRadius: '4px',
                        background: '#f8fafc',
                        borderLeft: `3px solid ${getStatusColor(t.status)}`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: '#1e293b'
                      }}
                      title={`${t.title} (${t.time})`}
                    >
                      {t.title}
                    </div>
                  ))}

                  {dayTasks.length > 3 && (
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                      +{dayTasks.length - 3} more...
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Next month padding days */}
          {nextMonthDays.map(nextDay => (
            <div 
              key={`next-${nextDay}`} 
              style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem', color: '#cbd5e1', fontSize: '0.8rem' }}
            >
              {nextDay}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
};
