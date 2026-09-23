'use client';

import React, { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { useApp } from '@/context/AppContext';
import { 
  Clock, 
  User, 
  Edit3, 
  Calendar as CalendarIcon, 
  PauseCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Check, 
  X, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { 
    updateTask, 
    completeTask, 
    holdTask, 
    escalateTask, 
    reopenTask,
    members,
    systemConfig,
    setViewingAuditForTaskId
  } = useApp();

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedTime, setEditedTime] = useState(task.time);
  const [editedAssigneeId, setEditedAssigneeId] = useState(task.assignees[0]?.id || members[1].id);
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(task.priority);
  const [editedProject, setEditedProject] = useState(task.project || 'Core Infrastructure');
  const [editedDepartment, setEditedDepartment] = useState(task.department || 'Product & Tech');
  const [editedLocation, setEditedLocation] = useState(task.location || 'Bangalore HQ');
  const [editedRemarks, setEditedRemarks] = useState(task.assignees[0]?.remarks || '');

  // Modals for Hold, Escalate & Reopen
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReasonInput, setHoldReasonInput] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReasonInput, setEscalateReasonInput] = useState('');
  const [escalateTargetLeader, setEscalateTargetLeader] = useState('Akash Das (Director)');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDateInput, setRescheduleDateInput] = useState(task.scheduledDate);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReasonInput, setReopenReasonInput] = useState('');

  const isCompleted = task.status === 'Done';

  const handleCheckboxToggle = () => {
    if (!isCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      completeTask(task.id);
    } else {
      setShowReopenModal(true);
      setReopenReasonInput('');
    }
  };

  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReasonInput.trim()) return;
    reopenTask(task.id, reopenReasonInput.trim());
    setShowReopenModal(false);
    setReopenReasonInput('');
  };

  const handleSaveInline = () => {
    const selectedMember = members.find(m => m.id === editedAssigneeId) || members[1];
    const oldTime = task.time;

    updateTask(task.id, {
      title: editedTitle,
      time: editedTime,
      priority: editedPriority,
      project: editedProject,
      department: editedDepartment,
      location: editedLocation,
      assignees: [
        {
          id: selectedMember.id,
          name: selectedMember.name,
          email: selectedMember.email,
          department: editedDepartment,
          designation: selectedMember.designation,
          avatar: selectedMember.avatar,
          status: task.status,
          remarks: editedRemarks,
        }
      ]
    }, `Inline task edit: time updated to ${editedTime}, project: ${editedProject}, location: ${editedLocation}`);

    setIsInlineEditing(false);
  };

  const handleConfirmHold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdReasonInput.trim()) return;
    holdTask(task.id, holdReasonInput.trim());
    setShowHoldModal(false);
    setHoldReasonInput('');
  };

  const handleConfirmEscalate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReasonInput.trim()) return;
    escalateTask(task.id, escalateReasonInput.trim(), escalateTargetLeader);
    setShowEscalateModal(false);
    setEscalateReasonInput('');
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    updateTask(task.id, { scheduledDate: rescheduleDateInput }, `Rescheduled deliverable to ${rescheduleDateInput}`);
    setShowRescheduleModal(false);
  };

  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT': return 'priority-badge priority-urgent';
      case 'HIGH': return 'priority-badge priority-high';
      case 'NORMAL': return 'priority-badge priority-normal';
    }
  };

  // If in Inline Edit Mode (Slide 8 / Step 4)
  if (isInlineEditing) {
    return (
      <div className="inline-edit-card">
        <div className="inline-edit-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="inline-badge">✏️ INLINE EDITING MODE ACTIVE</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              • User modifying scheduled deliverable
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>
            Slide 8 Blueprint Flow
          </span>
        </div>

        <div className="inline-form-grid">
          <div className="form-field-group">
            <label className="form-field-label">Task Name</label>
            <input
              type="text"
              className="form-input"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Task name"
            />
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Time (Updated)</label>
            <input
              type="text"
              className="form-input"
              value={editedTime}
              onChange={(e) => setEditedTime(e.target.value)}
              placeholder="e.g. 06:00 PM"
            />
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Assigned To</label>
            <select
              className="form-select"
              value={editedAssigneeId}
              onChange={(e) => setEditedAssigneeId(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.department})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Priority</label>
            <select
              className="form-select"
              value={editedPriority}
              onChange={(e) => setEditedPriority(e.target.value as TaskPriority)}
            >
              <option value="NORMAL">Normal Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Project (Master List)</label>
            <select
              className="form-select"
              value={editedProject}
              onChange={(e) => setEditedProject(e.target.value)}
            >
              {(systemConfig?.masterLists?.projects || ['Core Infrastructure', 'Enterprise Expansion', 'Growth Strategy Q3']).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Department (Master List)</label>
            <select
              className="form-select"
              value={editedDepartment}
              onChange={(e) => setEditedDepartment(e.target.value)}
            >
              {(systemConfig?.masterLists?.departments || ['DevOps & DB', 'Product & Tech', 'Frontend Engineering', 'Design & UI', 'Sales & Growth', 'Finance']).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Location (Master List)</label>
            <select
              className="form-select"
              value={editedLocation}
              onChange={(e) => setEditedLocation(e.target.value)}
            >
              {(systemConfig?.masterLists?.locations || ['Bangalore HQ', 'Mumbai Office', 'Remote India', 'Delhi NCR Branch']).map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="form-field-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-field-label">Notes, Comments & Remarks</label>
            <input
              type="text"
              className="form-input"
              value={editedRemarks}
              onChange={(e) => setEditedRemarks(e.target.value)}
              placeholder="e.g. Reviewed with tech lead; pending schema migration validation"
            />
          </div>
        </div>

        <div className="inline-actions-row">
          <div className="click-to-save-hint">
            👉 CLICK HERE TO SAVE <ArrowRight size={14} />
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsInlineEditing(false)}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-success"
            onClick={handleSaveInline}
          >
            <Check size={14} />
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  // Standard Task Card (Slide 4)
  return (
    <>
      <div className={`task-card ${task.isJustAdded ? 'just-added' : ''}`}>
        <div className="task-left-section">
          <input
            type="checkbox"
            className="task-checkbox"
            checked={isCompleted}
            onChange={handleCheckboxToggle}
            title={isCompleted ? 'Mark as In Progress' : 'Mark as Completed'}
          />

          <div className="task-details-col">
            <div className="task-title-line">
              <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? '#94a3b8' : undefined }}>
                {task.title}
              </span>

              {task.isJustAdded && (
                <span className="just-added-badge">JUST ADDED</span>
              )}

              {task.carryForwardCount && task.carryForwardCount > 0 && (
                <span style={{
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fcd34d',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px'
                }}>
                  🔄 CARRIED FORWARD ({task.carryForwardCount})
                </span>
              )}

              {task.status === 'On Hold' && (
                <span style={{
                  background: '#fef9c3',
                  color: '#854d0e',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.4rem',
                  borderRadius: '4px'
                }}>
                  ⏸️ ON HOLD
                </span>
              )}

              {task.status === 'Escalated' && (
                <span style={{
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.4rem',
                  borderRadius: '4px'
                }}>
                  🚨 ESCALATED TO {task.escalatedTo || 'SENIOR'}
                </span>
              )}
            </div>

            <div className="task-meta-line">
              <div className="task-meta-item">
                <Clock size={13} color="#64748b" />
                <span>{task.time}</span>
              </div>

              <div className="task-meta-item">
                <User size={13} color="#64748b" />
                <span>
                  Assigned to:{' '}
                  <strong>{task.assignees.map(a => `${a.name}${a.department ? ` (${a.department})` : ''}`).join(', ')}</strong>
                </span>
              </div>

              <span className={getPriorityBadgeClass(task.priority)}>
                {task.priority} {task.priority !== 'URGENT' ? 'PRIORITY' : ''}
              </span>

              {task.progressPercent !== undefined && task.progressPercent > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                  ({task.progressPercent}% Live Progress)
                </span>
              )}
            </div>

            {/* Optional Hold or Escalation Rationale Banner */}
            {task.holdReason && (
              <div style={{
                fontSize: '0.72rem',
                color: '#854d0e',
                background: '#fefce8',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                marginTop: '0.2rem'
              }}>
                <strong>Hold Reason:</strong> {task.holdReason}
              </div>
            )}
            {task.escalationReason && (
              <div style={{
                fontSize: '0.72rem',
                color: '#991b1b',
                background: '#fef2f2',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                marginTop: '0.2rem'
              }}>
                <strong>Escalation Blocker:</strong> {task.escalationReason}
              </div>
            )}
          </div>
        </div>

        <div className="task-actions-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsInlineEditing(true)}
            title="Inline Edit Mode (Slide 8)"
          >
            <Edit3 size={13} color="#2563eb" />
            Edit Task
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowRescheduleModal(true)}
            title="Reschedule Task Date"
          >
            <CalendarIcon size={13} color="#64748b" />
            Reschedule
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowHoldModal(true)}
            title="FC 7: Put on Hold with mandatory reason"
            style={{ padding: '0.4rem 0.5rem' }}
          >
            <PauseCircle size={13} color="#d97706" />
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowEscalateModal(true)}
            title="FC 17: Escalate to Senior Leadership"
            style={{ padding: '0.4rem 0.5rem' }}
          >
            <AlertTriangle size={13} color="#dc2626" />
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setViewingAuditForTaskId(task.id)}
            title="FC 12: View Immutable Audit Trail"
            style={{ padding: '0.4rem 0.5rem' }}
          >
            <ShieldCheck size={13} color="#059669" />
          </button>

          {isCompleted && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowReopenModal(true);
                setReopenReasonInput('');
              }}
              title="FC 10: Reopen Completed Task with Justification"
              style={{ padding: '0.4rem 0.6rem', color: '#1e40af', background: '#eff6ff', borderColor: '#bfdbfe' }}
            >
              <RotateCcw size={13} color="#1e40af" />
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Modal: Mandatory Hold Justification (Flowchart 7) */}
      {showHoldModal && (
        <div className="stream-overlay" onClick={() => setShowHoldModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>
                ⏸️ Put Task On Hold (Governance Rule)
              </h3>
              <button className="calendar-nav-btn" onClick={() => setShowHoldModal(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              As per UrbanGaon governance, tasks cannot be paused without a documented business justification for executive oversight.
            </p>
            <form onSubmit={handleConfirmHold} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Mandatory Hold Explanation</label>
                <textarea
                  className="form-input"
                  rows={3}
                  required
                  placeholder="Explain why this deliverable is on hold (e.g. Awaiting client API keys)..."
                  value={holdReasonInput}
                  onChange={e => setHoldReasonInput(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowHoldModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#d97706' }}>Confirm Hold</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Senior Escalation (Flowchart 17) */}
      {showEscalateModal && (
        <div className="stream-overlay" onClick={() => setShowEscalateModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626' }}>
                🚨 Escalate Deliverable to Senior Leadership
              </h3>
              <button className="calendar-nav-btn" onClick={() => setShowEscalateModal(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Escalating routes this deliverable immediately to executive leadership with high-priority notifications.
            </p>
            <form onSubmit={handleConfirmEscalate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Select Senior Executive</label>
                <select 
                  className="form-select"
                  value={escalateTargetLeader}
                  onChange={e => setEscalateTargetLeader(e.target.value)}
                >
                  <option value="Akash Das (Director & CEO)">Akash Das (Director & CEO)</option>
                  <option value="Engineering Head">Engineering Head</option>
                  <option value="Talent & Operations Lead">Talent & Operations Lead</option>
                </select>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Blocker Rationale</label>
                <textarea
                  className="form-input"
                  rows={3}
                  required
                  placeholder="Detail the critical impediment preventing completion..."
                  value={escalateReasonInput}
                  onChange={e => setEscalateReasonInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEscalateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#dc2626' }}>Dispatch Escalation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reschedule Date */}
      {showRescheduleModal && (
        <div className="stream-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>📅 Reschedule Deliverable</h3>
              <button className="calendar-nav-btn" onClick={() => setShowRescheduleModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleConfirmReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">New Target Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={rescheduleDateInput}
                  onChange={e => setRescheduleDateInput(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Reopen Task with Mandatory Justification */}
      {showReopenModal && (
        <div className="stream-overlay" onClick={() => setShowReopenModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={16} color="#1e40af" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', margin: 0 }}>
                  Reopen Completed Task (Governance)
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setShowReopenModal(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
              Reopening <strong>"{task.title}"</strong> requires a documented management reason to maintain compliance traceability.
            </p>
            <form onSubmit={handleConfirmReopen} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Mandatory Reopen Reason *</label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder="e.g. Additional testing requested by client; reopened for revisions."
                  value={reopenReasonInput}
                  onChange={e => setReopenReasonInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowReopenModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#1e40af' }}>
                  Confirm Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
