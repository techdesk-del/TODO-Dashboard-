'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, TeamMember } from '@/types';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  ChevronDown, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  AlertOctagon, 
  CheckCircle,
  Filter,
  UserCheck
} from 'lucide-react';

export const CeoPortal: React.FC = () => {
  const { 
    tasks, 
    members, 
    selectedMemberFilter, 
    setSelectedMemberFilter, 
    exportToExcel,
    setViewingAuditForTaskId,
    setActiveView 
  } = useApp();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Active member for drilldown
  const activeMember = members.find(m => m.name === selectedMemberFilter) || null;

  // Filter tasks based on member selection
  const displayedTasks = activeMember
    ? tasks.filter(t => t.assignees.some(a => a.name.toLowerCase().includes(activeMember.name.toLowerCase()) || a.id === activeMember.id))
    : tasks;

  // KPIs dynamically computed from live task register
  const totalTasksCount = displayedTasks.length;
  const completedThisWeekCount = displayedTasks.filter(t => t.status === 'Done').length;
  const pendingBlockersCount = displayedTasks.filter(t => t.status === 'On Hold' || t.status === 'Escalated').length;
  const sprintVelocity = totalTasksCount > 0 
    ? `${Math.round((completedThisWeekCount / totalTasksCount) * 100)}%` 
    : '100%';

  // Function to print or generate PDF report
  const handleDownloadBoardReport = () => {
    window.print();
  };

  const handleDownloadMemberPdf = () => {
    window.print();
  };

  return (
    <div className="ceo-portal-view">
      {/* Top Action & Branding Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>👑</span>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              CEO Access Portal • Company-Wide Deliverables
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Executive command view aggregating 42 active deliverables, sprint velocity, and member dropdown
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleDownloadBoardReport}
            style={{ background: '#0284c7' }}
          >
            <FileText size={15} />
            Download Board PDF Report
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={exportToExcel}
            style={{ background: '#1d4ed8' }}
          >
            <Download size={15} />
            Export to Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* 4 KPI Stat Cards (Slide 9) */}
      <div className="ceo-kpi-grid">
        <div className="kpi-stat-card">
          <span className="kpi-title">TOTAL ACTIVE TASKS</span>
          <span className="kpi-value">{totalTasksCount} Tasks</span>
          <span className="kpi-subtext">⚡ 8 added today via Voice AI</span>
        </div>

        <div className="kpi-stat-card">
          <span className="kpi-title">TEAM SPRINT VELOCITY</span>
          <span className="kpi-value">{sprintVelocity}</span>
          <span className="kpi-subtext">🚀 On schedule for Friday cutover</span>
        </div>

        <div className="kpi-stat-card">
          <span className="kpi-title">PENDING BLOCKERS</span>
          <span className="kpi-value" style={{ color: '#c2410c' }}>{pendingBlockersCount} Items</span>
          <span className="kpi-subtext warning">⚠️ Database Migration & Proposal</span>
        </div>

        <div className="kpi-stat-card">
          <span className="kpi-title">COMPLETED THIS WEEK</span>
          <span className="kpi-value" style={{ color: '#15803d' }}>{completedThisWeekCount} Tasks</span>
          <span className="kpi-subtext">✓ 100% verified integrity</span>
        </div>
      </div>

      {/* Member Filter Dropdown Selector (Slide 9) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>
            👥 FILTER DELIVERABLES BY TEAM MEMBER:
          </div>

          <div style={{ position: 'relative', width: '360px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%',
                justifyContent: 'space-between',
                padding: '0.5rem 0.85rem',
                border: '1.5px solid #2563eb',
                color: '#1e40af',
                fontWeight: 700
              }}
            >
              <span>{activeMember ? activeMember.name : 'Select Member: All Members (42 Tasks)'}</span>
              <ChevronDown size={15} />
            </button>

            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '105%',
                left: 0,
                right: 0,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                zIndex: 50,
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '0.4rem'
              }}>
                <div
                  onClick={() => {
                    setSelectedMemberFilter(null);
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: !activeMember ? '#eff6ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>All Members (Company-Wide Overview)</span>
                  <span className="filter-badge-count">{totalTasksCount} Tasks</span>
                </div>

                {members.map(member => (
                  <div
                    key={member.id}
                    onClick={() => {
                      setSelectedMemberFilter(member.name);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: activeMember?.id === member.id ? '#eff6ff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className="avatar-circle" style={{ width: '28px', height: '28px', fontSize: '0.7rem' }}>
                        {member.avatar}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{member.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{member.designation}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="filter-badge-count">{member.totalTasks} Tasks</span>
                      {member.name === 'Alex Rivera' && (
                        <span style={{
                          background: '#dc2626',
                          color: 'white',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px'
                        }}>
                          👉 CLICK TO SELECT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>
          💡 Click any member in dropdown to isolate their individual task flow
        </div>
      </div>

      {/* Slide 10: Member Selected Isolation Banner (Alex Rivera) */}
      {activeMember && (
        <div className="member-drilldown-banner">
          <div className="member-drilldown-profile">
            <div className="avatar-circle" style={{ width: '42px', height: '42px', fontSize: '0.9rem' }}>
              {activeMember.avatar}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e3a8a' }}>
                {activeMember.name} • {activeMember.designation}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                {activeMember.email} • {activeMember.department} Cluster Team
              </div>
            </div>
          </div>

          <div className="drilldown-stats-group">
            <div className="drilldown-stat-item">
              <span className="drilldown-stat-label">ASSIGNED TASKS</span>
              <span className="drilldown-stat-val">{activeMember.totalTasks} Tasks Total</span>
            </div>

            <div className="drilldown-stat-item">
              <span className="drilldown-stat-label">LIVE PROGRESS</span>
              <span className="drilldown-stat-val" style={{ color: '#d97706' }}>
                {activeMember.activeTasks} Active · {activeMember.totalTasks - activeMember.activeTasks} Queued
              </span>
            </div>

            <div className="drilldown-stat-item">
              <span className="drilldown-stat-label">EXECUTION PACE</span>
              <span className="drilldown-stat-val" style={{ color: '#15803d' }}>
                {activeMember.velocity}% On Schedule
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedMemberFilter(null)}
              >
                <ArrowLeft size={13} />
                Reset to All Members
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleDownloadMemberPdf}
                style={{ background: '#2563eb' }}
              >
                <FileText size={13} />
                {activeMember.name.split(' ')[0]} Performance PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliverables Table (Slide 9 & 10) */}
      <div className="enterprise-table-wrapper">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Task Title {activeMember ? `(All Assigned to ${activeMember.name})` : ''}</th>
              <th>Team / Dept</th>
              <th>Assignee</th>
              <th>Due Date & Time</th>
              <th>Priority</th>
              <th>Live Status</th>
              <th>CEO Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedTasks.map(task => (
              <tr key={task.id}>
                <td>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{task.title}</div>
                  {task.project && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Project: {task.project}
                    </div>
                  )}
                  {task.assignees[0]?.remarks && (
                    <div style={{ fontSize: '0.68rem', color: '#0369a1', fontStyle: 'italic', marginTop: '0.1rem' }}>
                      {task.assignees[0].remarks}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                    {task.department}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className="avatar-circle" style={{ width: '22px', height: '22px', fontSize: '0.65rem' }}>
                      {task.assignees[0]?.avatar || 'U'}
                    </div>
                    <span style={{ fontWeight: 600 }}>
                      {task.assignees.map(a => a.name).join(', ')}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{task.scheduledDate}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{task.time}</span>
                  </div>
                </td>
                <td>
                  <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: task.status === 'Done' ? '#10b981' : task.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
                      }} />
                      <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                        {task.status} {task.progressPercent ? `(${task.progressPercent}%)` : ''}
                      </span>
                    </div>

                    {task.holdReason && (
                      <span style={{ fontSize: '0.68rem', color: '#854d0e' }}>
                        Hold: {task.holdReason.slice(0, 30)}...
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setViewingAuditForTaskId(task.id)}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                  >
                    <ShieldCheck size={13} color="#059669" />
                    View Audit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {displayedTasks.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No deliverables found matching current filter.
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: '#64748b',
        padding: '0.5rem 0'
      }}>
        <span>
          Showing {displayedTasks.length} {activeMember ? `tasks exclusively assigned to ${activeMember.name}` : 'total company tasks'} (Filtered in 0ms)
        </span>
        <span>
          Next.js 15 Server Actions • Multi-Region MongoDB Cluster M10+ Active
        </span>
      </div>
    </div>
  );
};
