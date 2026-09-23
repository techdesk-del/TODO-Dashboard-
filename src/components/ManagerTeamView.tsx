'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, TeamMember } from '@/types';
import { Users, Layers, ArrowRightLeft, Check, AlertTriangle, Clock, Eye, RotateCcw, X } from 'lucide-react';

export const ManagerTeamView: React.FC = () => {
  const { members, tasks, updateTask, reopenTask } = useApp();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');

  // Workload rebalancing modal
  const [taskToReassign, setTaskToReassign] = useState<Task | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState<string>(members[0]?.id || '');

  // Manager Reopen Modal
  const [taskToReopen, setTaskToReopen] = useState<Task | null>(null);
  const [managerReopenReason, setManagerReopenReason] = useState<string>('');

  const isAllMembers = selectedMemberId === 'ALL';
  const selectedMember = isAllMembers ? null : (members.find(m => m.id === selectedMemberId) || members[0]);

  const memberTasks = isAllMembers
    ? tasks
    : tasks.filter(t => t.assignees.some(a => a.id === selectedMember?.id || a.name.toLowerCase().includes((selectedMember?.name || '').toLowerCase())));

  const handleConfirmReassignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToReassign) return;
    const targetMember = members.find(m => m.id === newAssigneeId) || members[0];

    updateTask(taskToReassign.id, {
      assignees: [
        {
          id: targetMember.id,
          name: targetMember.name,
          email: targetMember.email,
          department: targetMember.department,
          designation: targetMember.designation,
          avatar: targetMember.avatar,
          status: taskToReassign.status
        }
      ]
    }, `Manager Workload Rebalance: Reassigned to ${targetMember.name}`);

    setTaskToReassign(null);
  };

  const handleConfirmManagerReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToReopen) return;
    if (!managerReopenReason.trim()) {
      alert('Mandatory justification is required to reopen this task.');
      return;
    }

    reopenTask(taskToReopen.id, managerReopenReason.trim());
    setTaskToReopen(null);
    setManagerReopenReason('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '8px' }}>
            <Layers size={20} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Reporting Manager Command Center — "My Team" (Flowchart 19)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Team workload monitoring, delay justification reviews, task reopening, and load rebalancing
            </div>
          </div>
        </div>

        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
          Active View: {isAllMembers ? 'All Team Members' : selectedMember?.name}
        </span>
      </div>

      {/* Team Members Summary Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '0.85rem'
      }}>
        {/* All Members Card */}
        <div
          onClick={() => setSelectedMemberId('ALL')}
          style={{
            background: '#ffffff',
            border: isAllMembers ? '2px solid #2563eb' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: isAllMembers ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <div className="avatar-circle" style={{ width: '30px', height: '30px', background: '#2563eb', color: '#fff', fontWeight: 700 }}>ALL</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Entire Department</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{members.length} Total Staff</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', textAlign: 'center', marginTop: '0.6rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.3rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>TASKS</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{tasks.length}</div>
            </div>
            <div style={{ background: '#ecfdf5', padding: '0.3rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.62rem', color: '#15803d', fontWeight: 700 }}>DONE</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#15803d' }}>{tasks.filter(t => t.status === 'Done').length}</div>
            </div>
            <div style={{ background: '#fef3c7', padding: '0.3rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.62rem', color: '#b45309', fontWeight: 700 }}>HOLD</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#b45309' }}>{tasks.filter(t => t.status === 'On Hold').length}</div>
            </div>
          </div>
        </div>

        {members.map(member => {
          const isSelected = member.id === selectedMemberId;
          const assigned = tasks.filter(t => t.assignees.some(a => a.id === member.id || a.name.includes(member.name))).length;
          const completed = tasks.filter(t => t.status === 'Done' && t.assignees.some(a => a.id === member.id || a.name.includes(member.name))).length;
          const onHold = tasks.filter(t => t.status === 'On Hold' && t.assignees.some(a => a.id === member.id || a.name.includes(member.name))).length;

          return (
            <div
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              style={{
                background: '#ffffff',
                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <div className="avatar-circle" style={{ width: '30px', height: '30px' }}>{member.avatar}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{member.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{member.designation}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', textAlign: 'center', marginTop: '0.6rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.3rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700 }}>TASKS</div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{assigned}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '0.3rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.62rem', color: '#15803d', fontWeight: 700 }}>DONE</div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#15803d' }}>{completed}</div>
                </div>
                <div style={{ background: '#fef3c7', padding: '0.3rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.62rem', color: '#b45309', fontWeight: 700 }}>HOLD</div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#b45309' }}>{onHold}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Member Active Portfolio Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Live Deliverables Portfolio: {isAllMembers ? 'All Department Deliverables' : selectedMember?.name}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {isAllMembers ? 'Aggregated across all reporting team members' : `${selectedMember?.designation} • ${selectedMember?.department}`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="filter-badge-count" style={{ background: '#eff6ff', color: '#2563eb' }}>
              {memberTasks.length} Assigned Deliverables
            </span>
          </div>
        </div>

        <div className="enterprise-table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Deliverable Title</th>
                <th>Assignee(s)</th>
                <th>Scheduled Date & Time</th>
                <th>Priority</th>
                <th>Status & Progress</th>
                <th>Manager Interventions</th>
              </tr>
            </thead>
            <tbody>
              {memberTasks.map(t => {
                const canReopen = t.status === 'Done' || t.status === 'On Hold' || t.status === 'Cancelled';

                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.title}</div>
                      {t.holdReason && (
                        <div style={{ fontSize: '0.7rem', color: '#b45309' }}>
                          ⏸️ Hold Justification: {t.holdReason}
                        </div>
                      )}
                      {t.escalationReason && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>
                          🚨 Escalated: {t.escalationReason}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {t.assignees.map(a => (
                          <span key={a.id} style={{ fontSize: '0.75rem', fontWeight: 600 }}>{a.name}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div>{t.scheduledDate}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.time}</div>
                    </td>
                    <td>
                      <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{t.status}</span>
                      {t.progressPercent !== undefined && (
                        <div style={{ fontSize: '0.7rem', color: '#2563eb' }}>
                          Progress: {t.progressPercent}%
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                          onClick={() => setTaskToReassign(t)}
                          title="Reassign to another colleague (FC 19/22)"
                        >
                          <ArrowRightLeft size={12} />
                          Rebalance
                        </button>

                        {canReopen && (
                          <button
                            className="btn-secondary"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.72rem',
                              background: '#eff6ff',
                              color: '#1e40af',
                              borderColor: '#bfdbfe'
                            }}
                            onClick={() => {
                              setTaskToReopen(t);
                              setManagerReopenReason('');
                            }}
                            title="Reopen deliverable with mandatory justification"
                          >
                            <RotateCcw size={12} />
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {memberTasks.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              No tasks currently assigned to {selectedMember?.name || 'this team'}.
            </div>
          )}
        </div>
      </div>

      {/* Reassignment Modal */}
      {taskToReassign && (
        <div className="stream-overlay" onClick={() => setTaskToReassign(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Workload Rebalance / Transfer</h3>
              <button className="calendar-nav-btn" onClick={() => setTaskToReassign(null)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Transferring deliverable <strong>"{taskToReassign.title}"</strong> to balance team velocity.
            </p>
            <form onSubmit={handleConfirmReassignment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Select Target Colleague</label>
                <select
                  className="form-select"
                  value={newAssigneeId}
                  onChange={e => setNewAssigneeId(e.target.value)}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.department} - {m.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskToReassign(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Execute Reassignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Reopen Task Modal */}
      {taskToReopen && (
        <div className="stream-overlay" onClick={() => setTaskToReopen(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={16} color="#1e40af" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Managerial Task Reopen
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setTaskToReopen(null)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
              Reopening <strong>"{taskToReopen.title}"</strong> will restore it to <strong>In Progress (50%)</strong> and create a compliance log entry.
            </p>

            <form onSubmit={handleConfirmManagerReopen} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Mandatory Manager Justification *</label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder="e.g. Code review required revisions; reopening for follow-up push."
                  value={managerReopenReason}
                  onChange={e => setManagerReopenReason(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskToReopen(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#1e40af' }}>
                  Confirm Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
