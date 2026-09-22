'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task } from '@/types';
import { ChevronLeft, ChevronRight, Clock, Plus, User } from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { tasks, selectedDate, setSelectedDate, setActiveView } = useApp();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Days in September 2026 (1 to 30)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  const getTasksForDay = (day: number) => {
    const dateStr = `2026-09-${day.toString().padStart(2, '0')}`;
    return tasks.filter(t => t.scheduledDate === dateStr);
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
            📅 Interactive Calendar Grid (Flowchart 15)
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button className="calendar-nav-btn" aria-label="Previous Month"><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb' }}>September 2026</span>
            <button className="calendar-nav-btn" aria-label="Next Month"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem', color: '#64748b', marginLeft: '0.5rem' }}>
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
          </div>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
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
          <span>Sunday</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: 'minmax(110px, auto)'
        }}>
          {/* Aug 31 */}
          <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
            31
          </div>

          {days.map(day => {
            const dateStr = `2026-09-${day.toString().padStart(2, '0')}`;
            const dayTasks = getTasksForDay(day);
            const isSelected = selectedDate === dateStr;

            return (
              <div
                key={day}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setActiveView('workspace');
                }}
                style={{
                  border: '1px solid #e2e8f0',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
                title="Click to view tasks for this date"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#2563eb' : '#1e293b',
                    background: isSelected ? '#dbeafe' : 'transparent',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {day}
                  </span>

                  {dayTasks.length > 0 && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563eb' }}>
                      {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                </div>

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

          {/* Oct padding */}
          {[1, 2, 3, 4].map(day => (
            <div key={`oct-${day}`} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.5rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
              {day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
