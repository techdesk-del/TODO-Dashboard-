'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, TeamMember } from '@/types';
import { Users, Layers, ArrowRightLeft, Check, AlertTriangle, Clock, Eye } from 'lucide-react';

export const ManagerTeamView: React.FC = () => {
  const { members, tasks, updateTask, reopenTask } = useApp();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[1].id); // Alex Rivera

  const selectedMember = members.find(m => m.id === selectedMemberId) || members[1];
  const memberTasks = tasks.filter(t => t.assignees.some(a => a.id === selectedMember.id || a.name.toLowerCase().includes(selectedMember.name.toLowerCase())));

  // Workload rebalancing modal
  const [taskToReassign, setTaskToReassign] = useState<Task | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState<string>(members[0].id);

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
    }, `Manager Workload Rebalance: Reassigned from ${selectedMember.name} to ${targetMember.name}`);

    setTaskToReassign(null);
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
              Workload balancing, delay justification reviews, and collaborative team reassignments
            </div>
          </div>
        </div>

        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
          Active Manager: Tech Leads (Product & Tech)
        </span>
      </div>

      {/* Team Members Summary Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.85rem'
      }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Live Deliverables Portfolio: {selectedMember.name}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {selectedMember.designation} • {selectedMember.department}
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
                <th>Scheduled Date & Time</th>
                <th>Priority</th>
                <th>Status & Progress</th>
                <th>Manager Interventions</th>
              </tr>
            </thead>
            <tbody>
              {memberTasks.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{t.title}</div>
                    {t.holdReason && (
                      <div style={{ fontSize: '0.7rem', color: '#b45309' }}>
                        ⏸️ Hold Justification: {t.holdReason}
                      </div>
                    )}
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
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                        onClick={() => setTaskToReassign(t)}
                        title="Reassign to another colleague (FC 19/22)"
                      >
                        <ArrowRightLeft size={12} />
                        Rebalance
                      </button>

                      {t.status === 'On Hold' && (
                        <button
                          className="btn-success"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                          onClick={() => reopenTask(t.id, 'Manager approved resolution')}
                        >
                          <Check size={12} />
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {memberTasks.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              No tasks currently assigned to {selectedMember.name}.
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
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Transfering deliverable <strong>"{taskToReassign.title}"</strong> from {selectedMember.name} to balance team velocity.
            </p>
            <form onSubmit={handleConfirmReassignment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Select Target Colleague</label>
                <select
                  className="form-select"
                  value={newAssigneeId}
                  onChange={e => setNewAssigneeId(e.target.value)}
                >
                  {members.filter(m => m.id !== selectedMember.id).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.department})
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
    </div>
  );
};
