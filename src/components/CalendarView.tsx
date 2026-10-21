'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, TeamMember } from '@/types';
import { isCeoUser, canAccessAdminHr } from '@/lib/rosterData';
import { getCompanyHoliday, isSundayDate, HOLIDAY_METADATA } from '@/lib/holidayData';
import { getTodayStr, formatDateDisplay, formatDateShort } from '@/lib/dateUtils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  Eye, 
  X,
  Layers,
  ArrowRight
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { 
    tasks, 
    members, 
    selectedDate, 
    setSelectedDate, 
    setActiveView, 
    currentUser, 
    updateTask, 
    setIsCreateTaskModalOpen 
  } = useApp();

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ME');
  const [isMounted, setIsMounted] = useState(false);

  // Selected date popup state (Flowchart 1: Click a date -> Show all tasks for that date)
  const [inspectDate, setInspectDate] = useState<string | null>(null);

  // Task detail popup state (Flowchart 1: Click a task -> Open task detail popup with quick actions)
  const [activeTaskDetail, setActiveTaskDetail] = useState<Task | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isCeo = isMounted && isCeoUser(currentUser);
  const isAdminOrManager = isMounted && (isCeo || canAccessAdminHr(currentUser) || currentUser.role === 'MANAGER');
  const todayStr = getTodayStr();

  // Active members for employee switcher
  const activeMembers = useMemo(() => members.filter(m => m.status !== 'DEACTIVATED'), [members]);

  // Dynamic calendar date cursor
  const [calDate, setCalDate] = useState<Date>(() => {
    const parts = (selectedDate || '').split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const d = parseInt(parts[2], 10) || new Date().getDate();
    return new Date(y, m - 1, d);
  });

  // Keep calendar in sync when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (y && m && d) {
        setCalDate(new Date(y, m - 1, d));
      }
    }
  }, [selectedDate]);

  // Filter tasks based on logged-in user or selected employee (Flowchart 1)
  const calendarTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'Cancelled') return false;

      // Admin switched to "ALL"
      if (selectedEmployeeId === 'ALL') {
        return true;
      }

      // Specific employee chosen from Admin switch dropdown
      if (selectedEmployeeId !== 'ME' && selectedEmployeeId !== 'ALL') {
        const emp = members.find(m => m.id === selectedEmployeeId);
        const empEmail = (emp?.email || '').toLowerCase().trim();
        const isCreator = t.creator?.id === selectedEmployeeId || (t.creator?.email && t.creator.email.toLowerCase().trim() === empEmail);
        const isAssignee = t.assignees?.some(a => a.id === selectedEmployeeId || (a.email && a.email.toLowerCase().trim() === empEmail));
        return isCreator || isAssignee;
      }

      // Default: logged in user
      if (isCeo) return true;
      const currentCleanEmail = (currentUser.email || '').toLowerCase().trim();
      const isCreator = t.creator?.id === currentUser.id || (t.creator?.email && t.creator.email.toLowerCase().trim() === currentCleanEmail);
      const isAssignee = t.assignees?.some(a => a.id === currentUser.id || (a.email && a.email.toLowerCase().trim() === currentCleanEmail));
      return isCreator || isAssignee;
    });
  }, [tasks, selectedEmployeeId, members, currentUser, isCeo]);

  const selectedYear = calDate.getFullYear();
  const selectedMonth = calDate.getMonth() + 1;
  const selectedMonthStr = String(selectedMonth).padStart(2, '0');
  const monthLabel = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Navigation handlers for Month, Week, Day
  const handlePrevPeriod = () => {
    setCalDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() - 7);
      } else {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  };

  const handleNextPeriod = () => {
    setCalDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  };

  const handleTodayClick = () => {
    const now = new Date();
    setCalDate(now);
    setSelectedDate(todayStr);
  };

  // Helper: Format date as YYYY-MM-DD
  const formatDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Month Grid Calculations
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const firstDayIndex = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7; // Monday = 0
  const prevMonthLastDate = new Date(selectedYear, selectedMonth - 1, 0).getDate();
  const prevMonthDays = Array.from({ length: firstDayIndex }, (_, i) => prevMonthLastDate - firstDayIndex + 1 + i);
  const totalCells = firstDayIndex + daysInMonth;
  const nextMonthPaddingCount = (7 - (totalCells % 7)) % 7;
  const nextMonthDays = Array.from({ length: nextMonthPaddingCount }, (_, i) => i + 1);

  // Week View Calculations (Monday to Sunday)
  const currentWeekDays = useMemo(() => {
    const d = new Date(calDate);
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      return dayDate;
    });
  }, [calDate]);

  // Tasks mapped by date
  const getTasksForDate = (dateStr: string) => {
    return calendarTasks.filter(t => t.scheduledDate === dateStr);
  };

  const isOverdue = (task: Task): boolean => {
    return task.scheduledDate < todayStr && task.status !== 'Done' && task.status !== 'Cancelled';
  };

  const getStatusColor = (status: string, taskOverdue: boolean) => {
    if (taskOverdue) return '#dc2626';
    switch (status) {
      case 'Done': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'On Hold': return '#f59e0b';
      case 'Escalated': return '#ef4444';
      default: return '#64748b';
    }
  };

  // Quick Action handlers (Flowchart 1: mark complete, change status)
  const handleQuickMarkComplete = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    updateTask(taskId, { status: 'Done', progressPercent: 100 }, 'Marked complete via Calendar Quick Action');
  };

  const handleQuickChangeStatus = (taskId: string, newStatus: Task['status'], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const progress = newStatus === 'Done' ? 100 : newStatus === 'In Progress' ? 50 : 0;
    updateTask(taskId, { status: newStatus, progressPercent: progress }, `Status changed to ${newStatus} via Calendar`);
  };

  const handleAddTaskOnDate = (dateStr: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDate(dateStr);
    setIsCreateTaskModalOpen(true);
    setInspectDate(null);
  };

  // Date inspect list
  const inspectedDateTasks = inspectDate ? getTasksForDate(inspectDate) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Calendar Header with Controls & Admin Switcher */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.2rem 1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '8px' }}>
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Interactive Calendar & Dispatch Schedule
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Flowchart 1 & 15: Due date colour coding • Overdue in Red • Quick actions
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button 
              type="button" 
              className="calendar-nav-btn" 
              onClick={handlePrevPeriod}
              title={`Previous ${viewMode}`}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', minWidth: '140px', textAlign: 'center' }}>
              {viewMode === 'month' && monthLabel}
              {viewMode === 'week' && `Week of ${formatDateShort(formatDateKey(currentWeekDays[0]))}`}
              {viewMode === 'day' && formatDateDisplay(formatDateKey(calDate))}
            </span>
            <button 
              type="button" 
              className="calendar-nav-btn" 
              onClick={handleNextPeriod}
              title={`Next ${viewMode}`}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={handleTodayClick}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '5px',
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                cursor: 'pointer',
                marginLeft: '4px'
              }}
            >
              Today
            </button>
          </div>
        </div>

        {/* View Mode Toggle & Admin Employee Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Admin Employee Switcher (Flowchart 1: "Switch employee as Admin") */}
          {isAdminOrManager && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={13} color="#2563eb" /> View Staff:
              </span>
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 600, minWidth: '170px' }}
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                title="Flowchart 1: Switch employee calendar view as Admin"
              >
                <option value="ME">👤 My Deliverables</option>
                <option value="ALL">🏢 All Employees (Department)</option>
                <optgroup label="Direct Team Members">
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.designation})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* View Mode Selector: Month | Week | Today */}
          <div style={{
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '7px',
            display: 'flex',
            gap: '3px'
          }}>
            <button
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.85rem',
                border: 'none',
                borderRadius: '5px',
                background: viewMode === 'month' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: viewMode === 'month' ? 800 : 600,
                color: viewMode === 'month' ? '#2563eb' : '#64748b',
                fontSize: '0.78rem'
              }}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.85rem',
                border: 'none',
                borderRadius: '5px',
                background: viewMode === 'week' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: viewMode === 'week' ? 800 : 600,
                color: viewMode === 'week' ? '#2563eb' : '#64748b',
                fontSize: '0.78rem'
              }}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.85rem',
                border: 'none',
                borderRadius: '5px',
                background: viewMode === 'day' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: viewMode === 'day' ? 800 : 600,
                color: viewMode === 'day' ? '#2563eb' : '#64748b',
                fontSize: '0.78rem'
              }}
              onClick={() => setViewMode('day')}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Legend Bar: Colour Coding & Overdue in Red */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '0.6rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.6rem',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#334155' }}>Status Legend:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981' }} /> Done
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3b82f6' }} /> In Progress
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b' }} /> On Hold
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444' }} /> Escalated
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
            <AlertTriangle size={12} color="#dc2626" /> Overdue (Red Flag)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
            🎉 Gazetted Holiday
          </span>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
          Showing <strong>{calendarTasks.length}</strong> deliverables for active filter
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. MONTH VIEW GRID (Flowchart 1) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          width: '100%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ minWidth: '760px' }}>
            {/* Days of week header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '0.6rem 0',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '0.76rem',
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

            {/* Days Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridAutoRows: 'minmax(120px, auto)'
            }}>
              {/* Previous month padding */}
              {prevMonthDays.map(prevDay => (
                <div 
                  key={`prev-${prevDay}`} 
                  style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem', color: '#cbd5e1', fontSize: '0.8rem' }}
                >
                  {prevDay}
                </div>
              ))}

              {/* Current Month Days */}
              {days.map(day => {
                const dateStr = `${selectedYear}-${selectedMonthStr}-${day.toString().padStart(2, '0')}`;
                const dayTasks = getTasksForDate(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === todayStr;
                const holiday = getCompanyHoliday(dateStr);
                const isSunday = isSundayDate(dateStr);
                const overdueCount = dayTasks.filter(isOverdue).length;

                return (
                  <div
                    key={day}
                    onClick={() => setInspectDate(dateStr)}
                    style={{
                      border: isSelected 
                        ? '2px solid #2563eb' 
                        : isToday 
                          ? '2px solid #3b82f6' 
                          : holiday 
                            ? '1px solid #fde68a' 
                            : '1px solid #e2e8f0',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      background: isSelected 
                        ? '#eff6ff' 
                        : isToday 
                          ? '#f0f9ff' 
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
                    title={holiday ? `${holiday.name} — Official Holiday` : `Click to view and manage tasks for ${dateStr}`}


                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: isToday ? 800 : isSelected ? 700 : (holiday || isSunday) ? 700 : 600,
                        color: isToday 
                          ? '#ffffff' 
                          : isSelected 
                            ? '#2563eb' 
                            : holiday 
                              ? '#b45309' 
                              : isSunday 
                                ? '#dc2626' 
                                : '#1e293b',
                        background: isToday 
                          ? '#2563eb' 
                          : isSelected 
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
                        {overdueCount > 0 && (
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            background: '#dc2626',
                            borderRadius: '3px',
                            padding: '1px 4px'
                          }} title={`${overdueCount} Overdue Deliverable(s)`}>
                            {overdueCount} Overdue
                          </span>
                        )}

                        {dayTasks.length > 0 && overdueCount === 0 && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563eb' }}>
                            {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Holiday Indicator */}
                    {holiday && (
                      <div style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '2px 5px',
                        borderRadius: '4px',
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fcd34d',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <span>{holiday.icon}</span>
                        <span>{holiday.name}</span>
                      </div>
                    )}

                    {/* Tasks List for Day */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                      {dayTasks.slice(0, 3).map(t => {
                        const taskOverdue = isOverdue(t);
                        return (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTaskDetail(t);
                            }}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              background: taskOverdue ? '#fee2e2' : '#f8fafc',
                              color: taskOverdue ? '#991b1b' : '#1e293b',
                              borderLeft: `3px solid ${getStatusColor(t.status, taskOverdue)}`,
                              border: taskOverdue ? '1px solid #fca5a5' : undefined,
                              borderLeftWidth: '3px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer'
                            }}
                            title={`${t.title} [${t.status}] — Click for detail popup`}
                          >
                            {taskOverdue && '⚠️ '}
                            {t.title}
                          </div>
                        );
                      })}

                      {dayTasks.length > 3 && (
                        <span style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: 700 }}>
                          +{dayTasks.length - 3} more...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Next Month Padding */}
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
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. WEEK VIEW (Flowchart 1: "System loads current week") */}
      {/* ─────────────────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem'
        }}>
          {currentWeekDays.map(dayDate => {
            const dateStr = formatDateKey(dayDate);
            const dayTasks = getTasksForDate(dateStr);
            const isToday = dateStr === todayStr;
            const holiday = getCompanyHoliday(dateStr);
            const isSunday = isSundayDate(dateStr);
            const overdueTasks = dayTasks.filter(isOverdue);

            return (
              <div
                key={dateStr}
                style={{
                  background: '#ffffff',
                  border: isToday ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '380px',
                  boxShadow: isToday ? '0 4px 12px rgba(37, 99, 235, 0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}
              >
                {/* Day Header */}
                <div style={{
                  padding: '0.75rem 0.85rem',
                  background: isToday ? '#eff6ff' : holiday ? '#fffbeb' : '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isToday ? '#2563eb' : '#475569', textTransform: 'uppercase' }}>
                      {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      {dayDate.getDate()} {dayDate.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddTaskOnDate(dateStr)}
                    style={{
                      border: 'none',
                      background: '#ffffff',
                      color: '#2563eb',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                    }}
                    title="Add task on this date (Flowchart 1)"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Holiday pill if any */}
                {holiday && (
                  <div style={{ margin: '6px', padding: '3px 6px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, color: '#92400e' }}>
                    {holiday.icon} {holiday.name}
                  </div>
                )}

                {/* Task list for this day */}
                <div style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
                  {dayTasks.map(t => {
                    const taskOverdue = isOverdue(t);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setActiveTaskDetail(t)}
                        style={{
                          background: taskOverdue ? '#fee2e2' : '#ffffff',
                          border: taskOverdue ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                          borderLeft: `3px solid ${getStatusColor(t.status, taskOverdue)}`,
                          borderRadius: '6px',
                          padding: '0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: taskOverdue ? '#991b1b' : '#0f172a', lineHeight: 1.2 }}>
                            {taskOverdue && '⚠️ '}
                            {t.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          <span>{t.time}</span>
                          <span style={{ 
                            fontWeight: 700, 
                            color: getStatusColor(t.status, taskOverdue),
                            fontSize: '0.65rem'
                          }}>
                            {t.status}
                          </span>
                        </div>

                        {/* Quick action buttons on task card */}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                          {t.status !== 'Done' && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickMarkComplete(t.id, e)}
                              style={{
                                flex: 1,
                                fontSize: '0.65rem',
                                padding: '2px 4px',
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                            >
                              ✓ Done
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTaskDetail(t);
                            }}
                            style={{
                              flex: 1,
                              fontSize: '0.65rem',
                              padding: '2px 4px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {dayTasks.length === 0 && (
                    <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem' }}>
                      No tasks scheduled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. TODAY / DAY VIEW (Flowchart 1: "System loads today") */}
      {/* ─────────────────────────────────────────────────────────── */}
      {viewMode === 'day' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Deliverables for {formatDateDisplay(formatDateKey(calDate))}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Full schedule with quick completion and status controls
              </span>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => handleAddTaskOnDate(formatDateKey(calDate))}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
            >
              <Plus size={14} /> Add Deliverable
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {getTasksForDate(formatDateKey(calDate)).map((t, idx) => {
              const taskOverdue = isOverdue(t);
              return (
                <div
                  key={t.id}
                  style={{
                    background: taskOverdue ? '#fff1f2' : '#ffffff',
                    border: taskOverdue ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                    borderLeft: `4px solid ${getStatusColor(t.status, taskOverdue)}`,
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#475569'
                    }}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: taskOverdue ? '#991b1b' : '#0f172a' }}>
                          {t.title}
                        </span>
                        {taskOverdue && (
                          <span style={{ background: '#dc2626', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                            OVERDUE
                          </span>
                        )}
                        <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Project: <strong>{t.project || 'General'}</strong> • Time: <strong>{t.time}</strong> • Assignees: {t.assignees.map(a => a.name).join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Quick actions for Day view */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', fontWeight: 600 }}
                      value={t.status}
                      onChange={e => handleQuickChangeStatus(t.id, e.target.value as Task['status'])}
                      title="Quick Change Status"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Done">Done</option>
                      <option value="Escalated">Escalated</option>
                    </select>

                    {t.status !== 'Done' && (
                      <button
                        type="button"
                        onClick={() => handleQuickMarkComplete(t.id)}
                        className="btn-primary"
                        style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', background: '#10b981' }}
                      >
                        <CheckCircle2 size={13} /> Complete
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTaskDetail(t)}
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
                    >
                      <Eye size={13} /> Details
                    </button>
                  </div>
                </div>
              );
            })}

            {getTasksForDate(formatDateKey(calDate)).length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <CalendarIcon size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#475569' }}>No deliverables scheduled for this day</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Click "Add Deliverable" above to schedule tasks.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 4. DATE DETAIL POPUP MODAL (Flowchart 1: "Click a date") */}
      {/* ─────────────────────────────────────────────────────────── */}
      {inspectDate && (
        <div className="stream-overlay" onClick={() => setInspectDate(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  📅 Deliverables for {formatDateDisplay(inspectDate)}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {inspectedDateTasks.length} task(s) on this date • Quick completion & status changes
                </span>
              </div>
              <button className="calendar-nav-btn" onClick={() => setInspectDate(null)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '360px', overflowY: 'auto', margin: '0.75rem 0' }}>
              {inspectedDateTasks.map((t, idx) => {
                const taskOverdue = isOverdue(t);
                return (
                  <div
                    key={t.id}
                    style={{
                      background: taskOverdue ? '#fef2f2' : '#f8fafc',
                      border: taskOverdue ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                      borderLeft: `3px solid ${getStatusColor(t.status, taskOverdue)}`,
                      borderRadius: '6px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: taskOverdue ? '#991b1b' : '#0f172a' }}>
                        {taskOverdue && '⚠️ '}
                        {t.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                        Project: <strong>{t.project || 'General'}</strong> • Time: {t.time} • Assignee: {t.assignees.map(a => a.name).join(', ')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <select
                        className="form-select"
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.45rem' }}
                        value={t.status}
                        onChange={e => handleQuickChangeStatus(t.id, e.target.value as Task['status'])}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Done">Done</option>
                        <option value="Escalated">Escalated</option>
                      </select>

                      {t.status !== 'Done' && (
                        <button
                          type="button"
                          onClick={() => handleQuickMarkComplete(t.id)}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {inspectedDateTasks.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No deliverables scheduled for {formatDateDisplay(inspectDate)}.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleAddTaskOnDate(inspectDate)}
                style={{ fontSize: '0.76rem', gap: '4px' }}
              >
                <Plus size={14} /> Add Task on this Date
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setInspectDate(null)}
                style={{ fontSize: '0.76rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 5. TASK DETAIL POPUP (Flowchart 1: "Click a task") */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTaskDetail && (
        <div className="stream-overlay" onClick={() => setActiveTaskDetail(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`priority-badge priority-${activeTaskDetail.priority.toLowerCase()}`}>
                  {activeTaskDetail.priority}
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {activeTaskDetail.title}
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setActiveTaskDetail(null)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0.75rem 0', fontSize: '0.8rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>DUE DATE & TIME:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatDateDisplay(activeTaskDetail.scheduledDate)} at {activeTaskDetail.time}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>CURRENT STATUS:</span>
                  <div style={{ fontWeight: 800, color: getStatusColor(activeTaskDetail.status, isOverdue(activeTaskDetail)) }}>
                    {activeTaskDetail.status} ({activeTaskDetail.progressPercent ?? 0}%)
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>PROJECT:</span>
                  <div style={{ fontWeight: 600 }}>{activeTaskDetail.project || 'General Portfolio'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>ASSIGNEES:</span>
                  <div style={{ fontWeight: 600 }}>{activeTaskDetail.assignees.map(a => a.name).join(', ')}</div>
                </div>
              </div>

              {activeTaskDetail.notes && (
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>NOTES & CONTEXT:</span>
                  <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '6px', marginTop: '2px' }}>
                    {activeTaskDetail.notes}
                  </div>
                </div>
              )}

              {activeTaskDetail.holdReason && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '0.5rem', borderRadius: '6px' }}>
                  <strong>⏸️ Hold Justification:</strong> {activeTaskDetail.holdReason}
                </div>
              )}

              {activeTaskDetail.escalationReason && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.5rem', borderRadius: '6px' }}>
                  <strong>🚨 Escalation Note:</strong> {activeTaskDetail.escalationReason}
                </div>
              )}

              {/* Quick Actions inside Task Detail Popup */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 800, display: 'block', marginBottom: '0.4rem' }}>
                  QUICK STATUS ACTIONS:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickChangeStatus(activeTaskDetail.id, 'In Progress');
                      setActiveTaskDetail(null);
                    }}
                    style={{ fontSize: '0.72rem', padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Start In 
                    

                    
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickMarkComplete(activeTaskDetail.id);
                      setActiveTaskDetail(null);
                    }}
                    style={{ fontSize: '0.72rem', padding: '4px 10px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Mark Done (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickChangeStatus(activeTaskDetail.id, 'On Hold');
                      setActiveTaskDetail(null);
                    }}
                    style={{ fontSize: '0.72rem', padding: '4px 10px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Put On Hold
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTaskDetail(null)}
                style={{ fontSize: '0.76rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
