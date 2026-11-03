'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Task } from '@/types';
import { formatDateDayMonth, getTodayStr } from '@/shared/lib/dateUtils';
import { computeMultiAssigneeStatus } from '@/shared/lib/multiAssignee';
import { 
  Search, 
  Filter, 
  LogIn, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Building2, 
  Users, 
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export const LiveCompanyDashboard: React.FC = () => {
  const { 
    tasks, 
    members, 
    currentUser, 
    setIsAuthModalOpen, 
    setAuthModalInitialMode,
    setActiveView,
    dbStatus,
    refreshFromDB
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Enterprise Pagination States (SDE-3 / CEO Level)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Auto-reset to page 1 whenever any filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, departmentFilter, statusFilter, pageSize]);

  const todayStr = getTodayStr();
  const isGuest = currentUser.id === 'guest';

  // Extract unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.department && t.department.trim()) {
        set.add(t.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Filter tasks in real time across all company employees
  const filteredTasks = useMemo(() => {
    const uncancelled = tasks.filter(t => t.status !== 'Cancelled');

    return uncancelled.filter(t => {
      // Department filter
      if (departmentFilter !== 'ALL' && t.department !== departmentFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const comp = computeMultiAssigneeStatus(t);
        const effectiveStatus = comp.status || t.status;
        if (statusFilter === 'Done' && effectiveStatus !== 'Done') return false;
        if (statusFilter === 'In Progress' && effectiveStatus !== 'In Progress') return false;
        if (statusFilter === 'Not Started' && effectiveStatus !== 'Not Started') return false;
        if (statusFilter === 'Overdue') {
          const effectiveDl = (t.dueDate && t.dueDate.trim().length > 0) ? t.dueDate.trim() : t.scheduledDate;
          const isOver = Boolean(t.isOverdue || (effectiveDl && effectiveDl < todayStr));
          if (!isOver || effectiveStatus === 'Done') return false;
        }
      }

      // Search query filter (matches title, department, assignee names)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const deptMatch = (t.department || '').toLowerCase().includes(q);
        const assigneeMatch = t.assignees?.some(a => (a.name || '').toLowerCase().includes(q));
        if (!titleMatch && !deptMatch && !assigneeMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Latest created on top
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return a.id.localeCompare(b.id);
    });
  }, [tasks, departmentFilter, statusFilter, searchQuery, todayStr]);

  // ── Enterprise Pagination Calculations ──────────────────────────
  const totalItems = filteredTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice(startIndex, endIndex);
  }, [filteredTasks, startIndex, endIndex]);

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

  // Summary Metrics
  const metrics = useMemo(() => {
    const uncancelled = tasks.filter(t => t.status !== 'Cancelled');
    const total = uncancelled.length;
    const completed = uncancelled.filter(t => t.status === 'Done' || computeMultiAssigneeStatus(t).status === 'Done').length;
    const inProgress = uncancelled.filter(t => (t.status === 'In Progress' || computeMultiAssigneeStatus(t).status === 'In Progress') && t.status !== 'Done').length;
    const overdue = uncancelled.filter(t => {
      if (t.status === 'Done' || computeMultiAssigneeStatus(t).status === 'Done') return false;
      const dl = (t.dueDate && t.dueDate.trim().length > 0) ? t.dueDate.trim() : t.scheduledDate;
      return Boolean(t.isOverdue || (dl && dl < todayStr));
    }).length;

    return { total, completed, inProgress, overdue };
  }, [tasks, todayStr]);

  const handleOpenLogin = () => {
    setAuthModalInitialMode('LOGIN');
    setIsAuthModalOpen(true);
  };

  const formatCleanDate = (dateVal?: string): string => {
    if (!dateVal) return '—';
    try {
      const datePart = dateVal.includes('T') ? dateVal.slice(0, 10) : dateVal;
      const [y, m, d] = datePart.split('-').map(Number);
      if (!y || !m || !d) return dateVal;
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateVal;
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: 'clamp(0.75rem, 2.5vw, 1.75rem)', boxSizing: 'border-box' }}>
      
      {/* Top Hero / Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '16px',
        padding: 'clamp(1.2rem, 3vw, 2rem)',
        color: '#ffffff',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        border: '1px solid #334155',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(37,99,235,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '4px 10px', borderRadius: '20px', marginBottom: '0.6rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Real-Time Live Company Dashboard
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800, margin: '0 0 0.35rem 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              UrbanGaon Deliverables Command Center
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0, maxWidth: '680px', lineHeight: 1.5 }}>
              Transparent, real-time tracking of all active deliverables, employee commitments, departments, and milestones across the entire organization.
            </p>
          </div>

          {/* Action: Sign In Button */}
          {isGuest ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleOpenLogin}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                <LogIn size={16} />
                <span>Sign In to Access Private Workspace</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActiveView('workspace')}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <ArrowRight size={16} />
                <span>Switch to My Personal Workspace</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Summary Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginTop: '1.25rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Total Tasks</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>{metrics.total}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa', marginTop: '2px' }}>{metrics.inProgress}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.7rem', color: '#86efac', fontWeight: 600, textTransform: 'uppercase' }}>Completed</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80', marginTop: '2px' }}>{metrics.completed}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 600, textTransform: 'uppercase' }}>Past Due / Overdue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>{metrics.overdue}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Department + Status Filters */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '6px 12px',
          flex: '1 1 240px',
          minWidth: '200px'
        }}>
          <Search size={15} color="#64748b" />
          <input
            type="text"
            placeholder="Search by employee name, task, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.82rem',
              width: '100%',
              color: '#0f172a'
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={14} color="#64748b" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                fontSize: '0.78rem',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="#64748b" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                fontSize: '0.78rem',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Completed</option>
              <option value="Not Started">Not Started</option>
              <option value="Overdue">Overdue / Past Due</option>
            </select>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Total: <strong style={{ color: '#0f172a' }}>{totalItems}</strong> task(s)</span>
            {totalPages > 1 && (
              <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>
                Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Enterprise Real-Time Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            minWidth: '880px',
            fontSize: '0.84rem'
          }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ padding: '12px 14px', width: '60px', fontWeight: 800, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  S.No
                </th>
                <th style={{ padding: '12px 14px', minWidth: '150px', fontWeight: 800, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Department
                </th>
                <th style={{ padding: '12px 14px', minWidth: '180px', fontWeight: 800, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Employee Name
                </th>
                <th style={{ padding: '12px 14px', minWidth: '300px', fontWeight: 800, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Todo Tasks
                </th>
                <th style={{ padding: '12px 14px', minWidth: '130px', fontWeight: 800, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Created Date
                </th>
                <th style={{ padding: '12px 14px', minWidth: '140px', fontWeight: 800, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={32} color="#94a3b8" />
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>No matching tasks found</div>
                      <div style={{ fontSize: '0.78rem' }}>Try clearing your search query or department/status filter.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task, idx) => {
                  const globalIdx = startIndex + idx;
                  const comp = computeMultiAssigneeStatus(task);
                  const effectiveStatus = comp.status || task.status;
                  const isCompleted = effectiveStatus === 'Done';
                  const effectiveDl = (task.dueDate && task.dueDate.trim().length > 0) ? task.dueDate.trim() : task.scheduledDate;
                  const isOverdue = !isCompleted && Boolean(task.isOverdue || (effectiveDl && effectiveDl < todayStr));

                  return (
                    <tr 
                      key={task.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.12s ease',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa'}
                    >
                      {/* Column 1: S.No */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 800, color: '#64748b' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#334155'
                        }}>
                          #{globalIdx + 1}
                        </span>
                      </td>

                      {/* Column 2: Department */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          whiteSpace: 'nowrap'
                        }}>
                          {task.department || 'General'}
                        </span>
                      </td>

                      {/* Column 3: Employee Name */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {task.assignees && task.assignees.length > 0 ? (
                            task.assignees.map((assignee, aIdx) => (
                              <div key={`${assignee.id || aIdx}-${assignee.name}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {assignee.avatar || (assignee.name ? assignee.name.slice(0, 2).toUpperCase() : 'EM')}
                                </span>
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>
                                  {assignee.name || 'Unnamed Employee'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {task.creator?.name ? task.creator.name.slice(0, 2).toUpperCase() : 'UG'}
                              </span>
                              <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.82rem' }}>
                                {task.creator?.name || 'All Company'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Todo Tasks */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <span style={{
                            fontWeight: 700,
                            color: '#0f172a',
                            fontSize: '0.85rem',
                            lineHeight: 1.4
                          }}>
                            {task.title}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {/* Status Pill */}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: isCompleted ? '#ecfdf5' : isOverdue ? '#fff1f2' : effectiveStatus === 'In Progress' ? '#eff6ff' : '#f8fafc',
                              color: isCompleted ? '#059669' : isOverdue ? '#e11d48' : effectiveStatus === 'In Progress' ? '#2563eb' : '#64748b',
                              border: isCompleted ? '1px solid #a7f3d0' : isOverdue ? '1px solid #fecdd3' : effectiveStatus === 'In Progress' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                              whiteSpace: 'nowrap'
                            }}>
                              {isCompleted && <Check size={10} strokeWidth={3} />}
                              {effectiveStatus}
                            </span>

                            {/* Priority Badge */}
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              background: task.priority === 'URGENT' ? '#fef2f2' : task.priority === 'HIGH' ? '#fffbeb' : '#f8fafc',
                              color: task.priority === 'URGENT' ? '#dc2626' : task.priority === 'HIGH' ? '#d97706' : '#64748b',
                              border: task.priority === 'URGENT' ? '1px solid #fecaca' : task.priority === 'HIGH' ? '1px solid #fde68a' : '1px solid #e2e8f0',
                              letterSpacing: '0.04em'
                            }}>
                              {task.priority || 'NORMAL'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 5: Created Date */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '0.78rem', fontWeight: 600 }}>
                          <Calendar size={13} color="#64748b" />
                          <span>{formatCleanDate(task.createdAt)}</span>
                        </div>
                      </td>

                      {/* Column 6: Due Date */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          background: isOverdue ? '#fff1f2' : isCompleted ? '#f0fdf4' : '#f8fafc',
                          color: isOverdue ? '#be123c' : isCompleted ? '#166534' : '#1e293b',
                          border: isOverdue ? '1px solid #fecdd3' : isCompleted ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                        }}>
                          <Clock size={12} color={isOverdue ? '#e11d48' : isCompleted ? '#16a34a' : '#64748b'} />
                          <span>{formatCleanDate(effectiveDl)}</span>
                          {isOverdue && (
                            <span style={{ fontSize: '0.65rem', color: '#e11d48', fontWeight: 800 }}>(Overdue)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise SDE-3 / CEO Pagination Footer Bar */}
        <div style={{
          padding: '0.85rem 1.25rem',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Left: Range and total counter + Rows Per Page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {totalItems === 0 ? (
                'Showing 0 of 0 deliverables'
              ) : (
                <>
                  Showing <strong style={{ color: '#0f172a' }}>{startIndex + 1}</strong>–<strong style={{ color: '#0f172a' }}>{endIndex}</strong> of <strong style={{ color: '#0f172a' }}>{totalItems}</strong> deliverables
                </>
              )}
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
        </div>
      </div>

    </div>
  );
};
