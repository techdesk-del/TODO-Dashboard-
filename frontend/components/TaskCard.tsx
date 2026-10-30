'use client';

import React, { useState, useMemo } from 'react';
import { Task, TaskPriority, TaskStatus, AssigneeInfo } from '@/types';
import { useApp } from '@/context/AppContext';
import { isCeoUser, isStrictCeo, canViewAuditTrail } from '@/shared/lib/rosterData';
import { getTodayStr, formatCreationDate, formatDueDate } from '@/shared/lib/dateUtils';
import { computeMultiAssigneeStatus } from '@/shared/lib/multiAssignee';
import {
  Clock,
  User,
  Edit3,
  Calendar as CalendarIcon,
  CalendarPlus,
  CalendarClock,
  PauseCircle,
  AlertTriangle,
  ShieldCheck,
  Check,
  X,
  ArrowRight,
  RotateCcw,
  Trash2,
  Users,
  UserPlus,
  UserX,
  CheckCircle2,
  FileText,
  Ban,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskCardProps {
  task: Task;
  index?: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index }) => {
  const {
    updateTask,
    completeTask,
    approveTaskByCeo,
    rejectTaskByCeo,
    updateAssigneeStatus,
    reassignOrCloseAssignee,
    holdTask,
    escalateTask,
    seniorAdviseTask,
    seniorReassignTask,
    seniorResolveTask,
    seniorReturnTask,
    reopenTask,
    cancelTask,
    reassignTask,
    deleteTask,
    members,
    currentUser,
    systemConfig,
    setViewingAuditForTaskId,
    setBannerNotification
  } = useApp();

  const isCeo = isCeoUser(currentUser);
  const canCancelOrDelete = isCeo || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeMembers = useMemo(() => {
    return members.filter(m => {
      if (!m) return false;
      if (isStrictCeo(m)) return false;
      const status = String(m.status || '').toUpperCase().trim();
      return status !== 'DEACTIVATED' && status !== 'REMOVED' && status !== 'TERMINATED' && !(m as any).isDeactivated;
    });
  }, [members]);

  // Flowchart 22: Task Cancellation & Reassignment Flow
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignMode, setReassignMode] = useState<'REPLACE_ALL' | 'ADD_ALONGSIDE' | 'REMOVE_SPECIFIC'>('REPLACE_ALL');
  const [selectedNewAssigneeIds, setSelectedNewAssigneeIds] = useState<string[]>([]);
  const [selectedRemoveAssigneeIds, setSelectedRemoveAssigneeIds] = useState<string[]>([]);
  const [reassignReasonInput, setReassignReasonInput] = useState('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

  // Flowchart 3: Senior Actions Modal (Advise, Reassign, Resolve, Return)
  const [seniorActionModal, setSeniorActionModal] = useState<{
    isOpen: boolean;
    action: 'advise' | 'reassign' | 'resolve' | 'return';
    note: string;
    targetAssigneeId: string;
  }>({
    isOpen: false,
    action: 'advise',
    note: '',
    targetAssigneeId: activeMembers[0]?.id || ''
  });

  // Flowchart 8: Assignee left or resigned? Creator/Admin reassign or close
  const [manageAssigneeData, setManageAssigneeData] = useState<{
    isOpen: boolean;
    assignee: AssigneeInfo | null;
    action: 'reassign' | 'close';
    newAssigneeId: string;
    notes: string;
  }>({
    isOpen: false,
    assignee: null,
    action: 'reassign',
    newAssigneeId: '',
    notes: '',
  });

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedScheduledDate, setEditedScheduledDate] = useState(task.scheduledDate);
  const [editedDueDate, setEditedDueDate] = useState(task.dueDate || task.scheduledDate);
  const [editedTime, setEditedTime] = useState(task.time);
  const [editedAssigneeId, setEditedAssigneeId] = useState(task.assignees[0]?.id || activeMembers[0]?.id || members[0]?.id || '');
  const [editedPriority, setEditedPriority] = useState<TaskPriority>(task.priority);
  const [editedDepartment, setEditedDepartment] = useState(task.department || 'AI & IT');
  const [editedLocation, setEditedLocation] = useState('Jaipur');
  const [editedRemarks, setEditedRemarks] = useState(task.assignees[0]?.remarks || '');

  const handleStartEdit = () => {
    setEditedTitle(task.title);
    setEditedScheduledDate(task.scheduledDate);
    setEditedDueDate(task.dueDate || task.scheduledDate);
    setEditedTime(task.time);
    setEditedAssigneeId(task.assignees[0]?.id || activeMembers[0]?.id || members[0]?.id || '');
    setEditedPriority(task.priority);
    setEditedDepartment(task.department || 'Product & Tech');
    setEditedLocation('Jaipur');
    setEditedRemarks(task.assignees[0]?.remarks || '');
    setIsInlineEditing(true);
  };

  // Modals for Hold, Escalate & Reopen
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReasonInput, setHoldReasonInput] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReasonInput, setEscalateReasonInput] = useState('');
  const [escalateTargetLeader, setEscalateTargetLeader] = useState('Mr. Sukh Sagar Singh Bhati (CEO)');
  const [showDelayReasonModal, setShowDelayReasonModal] = useState(false);
  const [delayReasonInput, setDelayReasonInput] = useState('');

  // Escalation Target Leaders: Strictly CEO Mr. Sukh Sagar Singh Bhati and Talent Team members
  const escalationLeaders = useMemo(() => {
    const list: string[] = ['Mr. Sukh Sagar Singh Bhati (CEO)'];

    // Add active Talent team members dynamically from roster/members
    const talentMembers = activeMembers.filter(m =>
      !isCeoUser(m) && (
        (m.department && (m.department.toLowerCase().includes('talent') || m.department.toLowerCase().includes('hr'))) ||
        (m.designation && (m.designation.toLowerCase().includes('talent') || m.designation.toLowerCase().includes('hr')))
      )
    );

    if (talentMembers.length > 0) {
      talentMembers.forEach(tm => {
        list.push(`${tm.name} (${tm.designation})`);
      });
    } else {
      list.push('Dr. Rekha Pareek (Talent Acquisition & HR Lead)');
      list.push('Dr. Sharmila Yadav (Talent Management & Development Lead)');
      list.push('Satya Singh (Talent Operations Specialist)');
    }

    return list;
  }, [activeMembers]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDateInput, setRescheduleDateInput] = useState(task.scheduledDate);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReasonInput, setReopenReasonInput] = useState('');

  const comp = computeMultiAssigneeStatus(task);
  const isCompleted = comp.status === 'Done' || task.status === 'Done';

  const handleCheckboxToggle = () => {
    if (!isCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      if (isCeo) {
        approveTaskByCeo(task.id, 'Approved & Completed directly by CEO Mr. Sukh Sagar Singh Bhati');
      } else {
        const myAssignee = task.assignees.find(a => a.id === currentUser.id || a.email?.toLowerCase() === currentUser.email?.toLowerCase());
        completeTask(task.id, myAssignee?.id);
      }
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
    // Assigned to feature: strictly exclusive to CEO Mr. Sukh Sagar Singh Bhati
    const selectedMember = activeMembers.find(m => m.id === editedAssigneeId) || activeMembers[0] || members.find(m => !isStrictCeo(m)) || members[0];
    const updatedAssignees = isCeo
      ? [
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
      : task.assignees.map(a => ({
        ...a,
        department: editedDepartment,
        remarks: editedRemarks || a.remarks,
      }));

    updateTask(task.id, {
      title: editedTitle,
      scheduledDate: editedScheduledDate,
      dueDate: editedDueDate,
      time: editedTime,
      priority: editedPriority,
      department: editedDepartment,
      location: 'Jaipur',
      assignees: updatedAssignees,
    }, `Inline task edit: title updated to "${editedTitle}", scheduled: ${editedScheduledDate}, due: ${editedDueDate}, time: ${editedTime}`);

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
    if (!rescheduleDateInput) return;
    updateTask(task.id, { scheduledDate: rescheduleDateInput, dueDate: rescheduleDateInput }, `Rescheduled deliverable to ${rescheduleDateInput}`);
    setBannerNotification({
      message: `Deliverable "${task.title}" rescheduled to ${rescheduleDateInput}`,
      badge: '✓ Rescheduled Live'
    });
    setShowRescheduleModal(false);
  };

  const handleConfirmDelayReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayReasonInput.trim()) return;
    updateTask(task.id, {
      delayReason: delayReasonInput.trim(),
      pastDueReason: delayReasonInput.trim(),
      isPendingNoReason: false,
      delayReasonSubmittedAt: new Date().toISOString()
    }, `Documented delay reason "${delayReasonInput.trim()}"`);
    setShowDelayReasonModal(false);
    setDelayReasonInput('');
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
            <span className="inline-badge">INLINE EDITING MODE ACTIVE</span>
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
            <label className="form-field-label">Scheduled Date (Planned)</label>
            <input
              type="date"
              className="form-input"
              value={editedScheduledDate}
              onChange={(e) => setEditedScheduledDate(e.target.value)}
            />
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Due Date (Deadline)</label>
            <input
              type="date"
              className="form-input"
              value={editedDueDate}
              onChange={(e) => setEditedDueDate(e.target.value)}
            />
          </div>


          {/* Assigned To - Strictly Visible and Accessible to CEO Only */}
          {isCeo && (
            <div className="form-field-group">
              <label className="form-field-label">Assigned To</label>
              <select
                className="form-select"
                value={editedAssigneeId}
                onChange={(e) => setEditedAssigneeId(e.target.value)}
              >
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.department})
                  </option>
                ))}
              </select>
            </div>
          )}

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
            <label className="form-field-label">Department (Master List)</label>
            <select
              className="form-select"
              value={editedDepartment}
              onChange={(e) => setEditedDepartment(e.target.value)}
            >
              {(systemConfig?.masterLists?.departments || ['Civil', 'Sales', 'AI & IT', 'Talent', 'Purchase', 'Legal', 'Accounts', 'Front Desk']).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Location</label>
            <select
              className="form-select"
              value={editedLocation}
              onChange={(e) => setEditedLocation(e.target.value)}
            >
              <option value="Jaipur">Jaipur</option>
            </select>
          </div>

          <div className="form-field-group" style={{ gridColumn: '1 / -1' }}>
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
            CLICK HERE TO SAVE <ArrowRight size={14} />
          </div>

          {/* CEO-Only Delete Button */}
          {isCeo && (
            <button
              type="button"
              className="btn-secondary btn-delete-task"
              onClick={() => setShowDeleteModal(true)}
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              title="Delete this deliverable (CEO Sukh Sagar ji only)"
            >
              <Trash2 size={13} color="#dc2626" />
              Delete
            </button>
          )}

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

  // A task is only "Just Added" if created in the last 60s in the active session
  const isActuallyJustAdded = Boolean(
    task.isJustAdded &&
    task.createdAt &&
    (Date.now() - new Date(task.createdAt).getTime() < 60000)
  );

  const todayStr = getTodayStr();
  const effectiveDeadline = task.dueDate || task.scheduledDate;
  const isAwaitingCeo = !isCompleted && (task.status === 'Review' || task.pendingCeoApproval);
  const isOverdue = !isCompleted && Boolean(task.isOverdue || (effectiveDeadline < todayStr && task.status !== 'Cancelled'));
  const hasDelayReason = Boolean(
    (task.delayReason && task.delayReason.trim().length > 0) ||
    (task.pastDueReason && task.pastDueReason.trim().length > 0)
  );

  const dueDateInfo = formatDueDate(task.scheduledDate, undefined, task.dueDate);
  const creationDateFormatted = formatCreationDate(task.createdAt);

  // Standard Task Card (Slide 4)
  return (
    <>
      <div className={`task-card ${isActuallyJustAdded ? 'just-added' : ''} ${isOverdue ? 'task-card-overdue' : ''}`}>
        {/* Top Header Row: Single-line view showing Task Title, Scheduled Date, Due Date, Status, and Dropdown toggle */}
        {/* Top Header Row: Strictly single-line view showing Task Title on left, Dates + Status + Dropdown toggle on right */}
        <div
          className="task-card-header"
          onClick={() => setIsExpanded(prev => !prev)}
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.55rem 0.75rem',
            width: '100%',
            padding: '2px 0'
          }}
          title={isExpanded ? 'Click to collapse options' : 'Click to expand options & edit details'}
        >
          {/* Left: Checkbox, Sequence, Title, Just Added */}
          <div
            className="task-header-left"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              flex: '1 1 240px',
              minWidth: 'min(240px, 100%)'
            }}
          >
            <input
              type="checkbox"
              className="task-checkbox"
              checked={isCompleted}
              onClick={(e) => e.stopPropagation()}
              onChange={handleCheckboxToggle}
              title={isCompleted ? 'Mark as In Progress' : 'Mark as Completed'}
              style={{ flexShrink: 0, margin: 0 }}
            />

            {typeof index === 'number' && (
              <span className="task-sequence-badge" style={{ flexShrink: 0 }} title={`Deliverable #${index}`}>
                #{index}
              </span>
            )}

            {/* Task Name / Title */}
            <span
              className="task-title-text"
              style={{
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? '#94a3b8' : '#0f172a',
                fontWeight: 700,
                fontSize: '0.88rem',
                lineHeight: 1.4,
                minWidth: 0,
                flex: '1 1 auto'
              }}
              title={task.title}
            >
              {task.title}
            </span>

            {isActuallyJustAdded && (
              <span className="just-added-badge" style={{ flexShrink: 0 }}>JUST ADDED</span>
            )}
          </div>

          {/* Right: Dates, Status Pill, Dropdown Toggle */}
          <div
            className="task-header-right"
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.4rem',
              flexShrink: 0,
              maxWidth: '100%'
            }}
          >
            {/* Target Deadline / Due Date */}
            <span
              style={{
                background: isOverdue ? '#fff1f2' : (dueDateInfo.isToday ? '#eff6ff' : (dueDateInfo.isTomorrow ? '#f0fdf4' : '#f8fafc')),
                border: isOverdue ? '1px solid #fecdd3' : (dueDateInfo.isToday ? '1px solid #bfdbfe' : (dueDateInfo.isTomorrow ? '1px solid #bbf7d0' : '1px solid #e2e8f0')),
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                color: isOverdue ? '#be123c' : (dueDateInfo.isToday ? '#1d4ed8' : (dueDateInfo.isTomorrow ? '#15803d' : '#1e293b')),
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
              title={`Target Deadline: ${task.dueDate || task.scheduledDate} ${task.time || ''}`}
            >
              <CalendarClock size={12} color={isOverdue ? '#e11d48' : (dueDateInfo.isToday ? '#2563eb' : (dueDateInfo.isTomorrow ? '#16a34a' : '#64748b'))} />
              <span>Due: <strong>{dueDateInfo.formatted}</strong></span>
            </span>

            {/* Single Primary Status Pill */}
            {isCompleted ? (
              <span className="task-pill-badge badge-done" style={{ margin: 0, padding: '2px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                ✓ COMPLETED
              </span>
            ) : isAwaitingCeo ? (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '5px'
                }}
              >
                <span
                  className="task-pill-badge"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    fontSize: '0.68rem',


                    fontWeight: 800,
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={task.ceoApprovalRequestedBy ? `Submitted by ${task.ceoApprovalRequestedBy} for CEO Final Approval` : 'Awaiting CEO Final Approval before completion'}
                >
                  <span> AWAITING CEO APPROVAL</span>
                </span>
                {isCeo && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const note = prompt(`Optional CEO approval note for "${task.title}":`, 'Final approval granted. Deliverable completed per standards.');
                        if (note === null) return;
                        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                        approveTaskByCeo(task.id, note.trim());
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 3px rgba(21, 128, 61, 0.2)'
                      }}
                      title="Grant CEO Final Approval to mark this deliverable Completed (Done)"
                    >
                      <Check size={13} />
                      <span>Approve & Complete (Done)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const reason = prompt(`Enter revision instructions for "${task.title}":`);
                        if (!reason || !reason.trim()) return;
                        rejectTaskByCeo(task.id, reason.trim());
                      }}
                      style={{
                        background: '#ffffff',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        whiteSpace: 'nowrap'
                      }}
                      title="Return deliverable to staff with feedback for revision"
                    >
                      <X size={13} />
                      <span>Request Changes</span>
                    </button>
                  </>
                )}
              </div>
            ) : isOverdue ? (
              <span className="task-pill-badge badge-overdue" style={{ margin: 0, padding: '2px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }} title={hasDelayReason ? `Delay Reason: "${task.delayReason || task.pastDueReason}"` : 'Overdue without recorded reason'}>
                {hasDelayReason ? 'OVERDUE (REASON RECORDED)' : 'PENDING NO REASON'}
              </span>
            ) : comp.status === 'In Progress' ? (
              <span className="task-pill-badge badge-in-progress" style={{ margin: 0, padding: '2px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                IN PROCESS
              </span>
            ) : comp.status === 'Pending Notice' ? (
              <span className="task-pill-badge badge-pending-notice" style={{ margin: 0, padding: '2px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                PENDING NOTICE
              </span>
            ) : comp.status === 'On Hold' ? (
              <span className="task-pill-badge badge-hold" style={{ margin: 0, padding: '2px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                ON HOLD
              </span>
            ) : comp.status === 'Escalated' ? (
              <span className="task-pill-badge badge-escalated" style={{ margin: 0, padding: '2px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                ESCALATED
              </span>
            ) : comp.status === 'Cancelled' ? (
              <span className="task-pill-badge badge-cancelled" style={{ margin: 0, padding: '2px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                CANCELLED
              </span>
            ) : (
              <span className="task-pill-badge badge-not-started" style={{ margin: 0, padding: '2px 7px', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                NOT STARTED
              </span>
            )}

            {/* Expand / Collapse Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(prev => !prev);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                background: isExpanded ? '#eff6ff' : '#f8fafc',
                border: isExpanded ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: isExpanded ? '#1d4ed8' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isExpanded ? '0 1px 3px rgba(37,99,235,0.15)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{isExpanded ? 'Hide Options' : 'Options & Details'}</span>
              <ChevronDown
                size={14}
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            </button>
          </div>
        </div>

        {/* Dropdown Container: Detailed actions, edit tools, assignees & banners */}
        {isExpanded && (
          <div
            className="task-dropdown-details"
            style={{
              marginTop: '0.65rem',
              paddingTop: '0.65rem',
              borderTop: '1px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}
          >
            {/* CEO Final Approval Governance Banner */}
            {isAwaitingCeo && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fef3c7, #fef9c3)',
                  border: '1.5px solid #fde68a',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  boxShadow: '0 1px 3px rgba(180, 83, 9, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#fef08a',
                    color: '#854d0e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    ⏳
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#92400e' }}>
                      Pending Final Approval from CEO Mr. Sukh Sagar Singh Bhati
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '1px' }}>
                      {task.ceoApprovalRequestedBy ? `Submitted by ${task.ceoApprovalRequestedBy} • ` : ''}Executive approval required prior to marking deliverable completed.
                    </div>
                  </div>
                </div>

                {isCeo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const note = prompt('Optional CEO endorsement / approval note:', 'Final approval granted. Deliverable completed per standards.');
                        if (note === null) return;
                        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                        approveTaskByCeo(task.id, note.trim());
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                      }}
                      title="Grant CEO Final Approval to mark this deliverable Completed (Done)"
                    >
                      <Check size={13} />
                      <span>Approve & Complete (Done)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const reason = prompt('Enter CEO feedback / revision instructions for staff:');
                        if (!reason || !reason.trim()) return;
                        rejectTaskByCeo(task.id, reason.trim());
                      }}
                      style={{
                        background: '#ffffff',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Return deliverable to staff with instructions for revision"
                    >
                      <X size={13} />
                      <span>Request Revision</span>
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', background: '#fef08a', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde047' }}>
                    Routed to CEO Desk for Final Sign-Off
                  </span>
                )}
              </div>
            )}

            {/* CEO Endorsement Granted Confirmation Badge */}
            {isCompleted && task.ceoApprovedAt && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.74rem',
                  color: '#166534',
                  fontWeight: 600
                }}
              >
                <span>✓ Final Approval granted by {task.ceoApprovedBy || 'Mr. Sukh Sagar Singh Bhati (CEO)'}</span>
              </div>
            )}

            {/* Dedicated Action Toolbar Row */}
            <div
              className="task-actions-group"
              style={{
                width: '100%',
                maxWidth: '100%',
                marginLeft: 0,
                marginRight: 0,
                paddingLeft: 0,
                paddingRight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.45rem',
                paddingTop: '0.2rem',
                boxSizing: 'border-box'
              }}
            >
              {/* Primary Workflow Actions (Text + Icons) */}
              <div className="task-actions-workflow">
                {/* Quick Reschedule Overdue Task to Today */}
                {isOverdue && (
                  <button
                    type="button"
                    className="btn-secondary task-btn-overdue-today"
                    onClick={() => {
                      updateTask(task.id, { scheduledDate: todayStr, dueDate: todayStr }, `Rescheduled overdue deliverable to today (${todayStr})`);
                    }}
                    title="Reschedule this overdue task to today"
                  >
                    <CalendarIcon size={13} color="#b91c1c" />
                    <span>Move to Today</span>
                  </button>
                )}

                {/* Flowchart 21: Add / Edit Reason Button for overdue tasks */}
                {isOverdue && (
                  <button
                    type="button"
                    className="btn-secondary task-btn-delay-reason"
                    onClick={() => {
                      setDelayReasonInput(task.delayReason || task.pastDueReason || '');
                      setShowDelayReasonModal(true);
                    }}
                    title={hasDelayReason ? `FC 21: Delay reason recorded: "${task.delayReason || task.pastDueReason}". Click to edit.` : 'FC 21: Overdue deliverable without reason — click to record justification.'}
                  >
                    <FileText size={13} color={hasDelayReason ? '#047857' : '#c2410c'} />
                    <span>{hasDelayReason ? 'Edit Reason' : 'Add Reason'}</span>
                  </button>
                )}

                {/* Edit Task Button */}
                <button
                  type="button"
                  className="btn-secondary task-btn-edit"
                  onClick={handleStartEdit}
                  title="Edit Task Details"
                >
                  <Edit3 size={13} color="#2563eb" />
                  <span>Edit Task</span>
                </button>

                {/* Reschedule Date Button */}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setRescheduleDateInput(task.scheduledDate);
                    setShowRescheduleModal(true);
                  }}
                  title="Reschedule Task Date"
                >
                  <CalendarIcon size={13} color="#64748b" />
                  <span>Reschedule</span>
                </button>

                {/* Flowchart 22: Reassign Task */}
                <button
                  type="button"
                  className="btn-secondary task-btn-reassign"
                  onClick={() => {
                    setReassignMode('REPLACE_ALL');
                    setSelectedNewAssigneeIds([]);
                    setSelectedRemoveAssigneeIds([]);
                    setReassignReasonInput('');
                    setShowReassignModal(true);
                  }}
                  title="Reassign Task"
                >
                  <UserPlus size={13} color="#2563eb" />
                  <span>Reassign</span>
                </button>

                {/* Flowchart 22: Cancel Task with Mandatory Reason (Strictly Admin & CEO Only) */}
                {canCancelOrDelete && task.status !== 'Cancelled' && task.status !== 'Done' && (
                  <button
                    type="button"
                    className="btn-secondary task-btn-cancel"
                    onClick={() => {
                      setCancelReasonInput('');
                      setShowCancelModal(true);
                    }}
                    title="Cancel Task with Mandatory Reason (Admin & CEO Only)"
                  >
                    <Ban size={13} color="#dc2626" />
                    <span>Cancel</span>
                  </button>
                )}

                {/* Flowchart 10: Reopen Completed Task with Justification */}
                {isCompleted && (
                  <button
                    type="button"
                    className="btn-secondary task-btn-reopen"
                    onClick={() => {
                      setShowReopenModal(true);
                      setReopenReasonInput('');
                    }}
                    title="FC 10: Reopen Completed Task with Justification"
                  >
                    <RotateCcw size={13} color="#1e40af" />
                    <span>Reopen</span>
                  </button>
                )}
              </div>

              {/* Quick Utility Icon Actions (Hold, Escalate, Audit, Delete) */}
              <div
                className="task-actions-utility"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  flexShrink: 0,
                  marginLeft: 'auto',
                  boxSizing: 'border-box'
                }}
              >
                {!isCompleted && (
                  <button
                    type="button"
                    className="btn-secondary task-icon-action-btn"
                    onClick={() => setShowHoldModal(true)}
                    title="FC 7: Put on Hold with mandatory reason"
                  >
                    <PauseCircle size={15} color="#d97706" />
                    <span className="task-utility-label">Hold</span>
                  </button>
                )}

                {!isCompleted && (
                  <button
                    type="button"
                    className="btn-secondary task-icon-action-btn"
                    onClick={() => setShowEscalateModal(true)}
                    title="FC 17: Escalate to Senior Leadership"
                  >
                    <AlertTriangle size={15} color="#dc2626" />
                    <span className="task-utility-label">Escalate</span>
                  </button>
                )}

                {/* Audit Trail Button (Strictly CEO Sir & Aakash Das ONLY) */}
                {canViewAuditTrail(currentUser) && (
                  <button
                    type="button"
                    className="btn-secondary task-icon-action-btn"
                    onClick={() => setViewingAuditForTaskId(task.id)}
                    title="FC 12: View Immutable Audit Trail"
                  >
                    <ShieldCheck size={15} color="#059669" />
                    <span className="task-utility-label">Audit Trail</span>
                  </button>
                )}

                {/* Delete Deliverable (Strictly Admin & CEO Only) */}
                {canCancelOrDelete && (
                  <button
                    type="button"
                    className="btn-secondary task-icon-action-btn btn-delete-task"
                    onClick={() => setShowDeleteModal(true)}
                    title="Delete Deliverable (Admin & CEO Only)"
                  >
                    <Trash2 size={15} color="#dc2626" />
                    <span className="task-utility-label">Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Full-Width Meta Row (Date of Creation, Scheduled Date, Due Date, Time, Assignees, Priority, Live Progress) */}
            <div className="task-meta-line" style={{ paddingLeft: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box', gap: '0.65rem' }}>
              {/* 1. Date of Creation */}
              <div
                className="task-meta-item"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  color: '#475569',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title={`Created on: ${task.createdAt || 'Initial Task'}`}
              >
                <CalendarPlus size={12} color="#64748b" />
                <span>Created: <strong style={{ color: '#1e293b' }}>{creationDateFormatted}</strong></span>
              </div>

              {/* 2. Due Date */}
              <div
                className="task-meta-item"
                style={{
                  background: isOverdue ? '#fff1f2' : (dueDateInfo.isToday ? '#eff6ff' : (dueDateInfo.isTomorrow ? '#f0fdf4' : '#f8fafc')),
                  border: isOverdue ? '1px solid #fecdd3' : (dueDateInfo.isToday ? '1px solid #bfdbfe' : (dueDateInfo.isTomorrow ? '1px solid #bbf7d0' : '1px solid #e2e8f0')),
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  color: isOverdue ? '#be123c' : (dueDateInfo.isToday ? '#1d4ed8' : (dueDateInfo.isTomorrow ? '#15803d' : '#1e293b')),
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title={`Due Date: ${task.dueDate || task.scheduledDate} ${task.time || ''}`}
              >
                <CalendarClock size={12} color={isOverdue ? '#e11d48' : (dueDateInfo.isToday ? '#2563eb' : (dueDateInfo.isTomorrow ? '#16a34a' : '#64748b'))} />
                <span>Due: <strong>{dueDateInfo.formatted}</strong></span>
              </div>

              {task.project && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0
                }}>
                  {task.project}
                </span>
              )}

              <div className="task-meta-item" style={{ flex: '1 1 auto', minWidth: '220px' }}>
                <User size={13} color="#64748b" />
                <span>
                  Assigned to:{' '}
                  <strong>{task.assignees.map(a => `${a.name}${a.department ? ` (${a.department})` : ''}`).join(', ')}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: 'auto' }}>
                <span className={getPriorityBadgeClass(task.priority)}>
                  {task.priority} {task.priority !== 'URGENT' ? 'PRIORITY' : ''}
                </span>
              </div>
            </div>

            {/* Flowchart 22: Cancellation Rationale Banner */}
            {task.cancellationReason && (
              <div style={{
                fontSize: '0.72rem',
                color: '#991b1b',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                marginLeft: 0,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px'
              }}>
                <span><strong>Cancellation Rationale:</strong> {task.cancellationReason}</span>
                <span style={{ color: '#dc2626', fontSize: '0.68rem', fontWeight: 600, flexShrink: 0 }}>
                  Excluded from Performance Reports
                </span>
              </div>
            )}

            {/* Optional Hold or Escalation Rationale Banner */}
            {task.holdReason && (
              <div style={{
                fontSize: '0.72rem',
                color: '#854d0e',
                background: '#fefce8',
                border: '1px solid #fef08a',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                marginLeft: 0,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
                <strong>Hold Reason:</strong> {task.holdReason}
              </div>
            )}

            {/* Flowchart 21: Delay Reason Display Banner */}
            {task.delayReason && (
              <div style={{
                fontSize: '0.72rem',
                color: '#9a3412',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                marginLeft: 0,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px'
              }}>
                <span><strong>FC 21 Delay Justification:</strong> {task.delayReason}</span>
                {task.delayReasonSubmittedAt && (
                  <span style={{ color: '#c2410c', fontSize: '0.68rem', flexShrink: 0 }}>
                    Submitted: {new Date(task.delayReasonSubmittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(task.delayReasonSubmittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}

            {/* Flowchart 3: Senior Escalation Interventions Banner & Actions */}
            {task.status === 'Escalated' && (
              <div style={{
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                marginLeft: 0,
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991b1b', fontWeight: 800, fontSize: '0.78rem' }}>
                    <AlertTriangle size={14} color="#dc2626" />
                    <span>Escalated to {task.escalatedTo || 'Senior Leadership'}</span>
                    {task.autoEscalatedToManager && (
                      <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px' }}>
                        SLA Breached (&gt;24h)
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#b91c1c' }}>
                    SLA Clock: 24h
                  </span>
                </div>

                {task.escalationReason && (
                  <div style={{ fontSize: '0.72rem', color: '#7f1d1d' }}>
                    <strong>Blocker Justification:</strong> "{task.escalationReason}"
                  </div>
                )}

                {/* Senior Actions (Flowchart 3): Advise, Reassign, Resolve, Return */}
                {(isCeo || currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || (task.escalatedTo && task.escalatedTo.toLowerCase().includes(currentUser.name.toLowerCase()))) && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '2px', borderTop: '1px solid #fecdd3', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9a3412', alignSelf: 'center', marginRight: '4px' }}>
                      Senior Action:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSeniorActionModal({ isOpen: true, action: 'advise', note: '', targetAssigneeId: activeMembers[0]?.id || '' })}
                      style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      Advise
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeniorActionModal({ isOpen: true, action: 'reassign', note: '', targetAssigneeId: activeMembers[0]?.id || '' })}
                      style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    >
                      Reassign
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeniorActionModal({ isOpen: true, action: 'resolve', note: '', targetAssigneeId: activeMembers[0]?.id || '' })}
                      style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', cursor: 'pointer' }}
                    >
                      ✓ Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeniorActionModal({ isOpen: true, action: 'return', note: '', targetAssigneeId: activeMembers[0]?.id || '' })}
                      style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', cursor: 'pointer' }}
                    >
                      Return
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Resolved or Advised Banners */}
            {task.seniorAdvisoryComment && (
              <div style={{ fontSize: '0.72rem', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.35rem 0.65rem', borderRadius: '6px', marginLeft: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <strong>Senior Advisory Guidance:</strong> {task.seniorAdvisoryComment}
              </div>
            )}

            {task.seniorReturnReason && (
              <div style={{ fontSize: '0.72rem', color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa', padding: '0.35rem 0.65rem', borderRadius: '6px', marginLeft: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <strong>Returned by Senior:</strong> {task.seniorReturnReason}
              </div>
            )}

            {task.seniorResolutionNote && (
              <div style={{ fontSize: '0.72rem', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.35rem 0.65rem', borderRadius: '6px', marginLeft: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <strong>✓ Senior Resolution Note:</strong> {task.seniorResolutionNote}
              </div>
            )}

            {/* Flowchart 8: Multi-Assignee Interactive Component Breakdown (Full Width) */}
            {task.assignees && task.assignees.length > 0 && (
              <div className="multi-assignee-breakdown-card">
                <div className="multi-assignee-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Multi-Assignee Breakdown ({task.assignees.length} {task.assignees.length === 1 ? 'member' : 'members'} • {comp.progressText}):
                  </span>
                  <span style={{ color: comp.progressPercent === 100 ? '#15803d' : '#2563eb', fontWeight: 800 }}>
                    {comp.progressPercent}% Completed
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                  gap: '0.55rem',
                  width: '100%'
                }}>
                  {task.assignees.map(a => {
                    const isMyAssignee = currentUser.id === a.id || currentUser.email?.toLowerCase() === a.email?.toLowerCase();
                    const canManageThisAssignee = isMyAssignee || isCeo || currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';
                    const isCreatorOrAdmin = isCeo || currentUser.role === 'ADMIN' || task.creator?.id === currentUser.id || task.creator?.email?.toLowerCase() === currentUser.email?.toLowerCase();

                    return (
                      <div key={a.id} className="assignee-item-card">
                        <div className="assignee-info-col" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                          <span style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: a.status === 'Done' ? '#16a34a' : '#2563eb',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            overflow: 'hidden'
                          }}>
                            {a.avatar?.startsWith('/') || a.avatar?.startsWith('http') ? (
                              <img src={a.avatar} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                              a.avatar || a.name.slice(0, 2).toUpperCase()
                            )}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.name} {isMyAssignee ? ' (You)' : ''}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.designation || a.department || 'Specialist'}
                            </div>
                          </div>
                        </div>

                        <div className="assignee-actions-col" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, marginLeft: 'auto' }}>
                          {/* Assignee individual status updater (Flowchart 8 Step 5) */}
                          {canManageThisAssignee ? (
                            <select
                              className="assignee-status-select"
                              value={a.status || 'Not Started'}
                              onChange={(e) => {
                                const newStat = e.target.value as TaskStatus;
                                if (newStat === 'Done') {
                                  confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
                                }
                                updateAssigneeStatus(task.id, a.id, newStat);
                              }}
                              style={{
                                background: a.status === 'Done' ? '#f0fdf4' : a.status === 'On Hold' ? '#fefce8' : a.status === 'Escalated' ? '#fef2f2' : '#ffffff',
                                color: a.status === 'Done' ? '#15803d' : a.status === 'On Hold' ? '#854d0e' : a.status === 'Escalated' ? '#b91c1c' : '#1e293b',
                                borderColor: a.status === 'Done' ? '#86efac' : a.status === 'On Hold' ? '#fde047' : a.status === 'Escalated' ? '#fca5a5' : '#cbd5e1'
                              }}
                              title="Update individual assignee status"
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Done">Done</option>
                              <option value="On Hold">On Hold</option>
                              <option value="Escalated">Escalated</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: a.status === 'Done' ? '#dcfce7' : '#f1f5f9',
                              color: a.status === 'Done' ? '#15803d' : '#475569'
                            }}>
                              {a.status || 'Not Started'}
                            </span>
                          )}

                          {/* Flowchart 8 Step 12: Assignee left or resigned? Creator/Admin reassign or close */}
                          {isCreatorOrAdmin && a.status !== 'Done' && (
                            <button
                              type="button"
                              onClick={() => {
                                setManageAssigneeData({
                                  isOpen: true,
                                  assignee: a,
                                  action: 'reassign',
                                  newAssigneeId: activeMembers.find(m => m.id !== a.id && !task.assignees.some(other => other.id === m.id))?.id || activeMembers[0]?.id || '',
                                  notes: '',
                                });
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                minHeight: '30px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                whiteSpace: 'nowrap'
                              }}
                              title="Assignee left or resigned? Reassign or close this component"
                            >
                              Shift/Close
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Mandatory Hold Justification (Flowchart 7) */}
      {showHoldModal && (
        <div className="stream-overlay" onClick={() => setShowHoldModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>
                Put Task On Hold (Governance Rule)
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

      {/* Modal: Flowchart 21 Overdue Delay Justification */}
      {showDelayReasonModal && (
        <div className="stream-overlay" onClick={() => setShowDelayReasonModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#c2410c' }}>
                Document Overdue Delay Reason
              </h3>
              <button className="calendar-nav-btn" onClick={() => setShowDelayReasonModal(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Per company policy, overdue tasks without a recorded explanation trigger manager notifications and escalation. Record your reason below:
            </p>
            <form onSubmit={handleConfirmDelayReason} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Delay Reason / Root Cause *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  required
                  placeholder="Detail the cause of the delay (e.g. Blocked on third-party security approval, rescheduled to next sprint)..."
                  value={delayReasonInput}
                  onChange={e => setDelayReasonInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowDelayReasonModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#ea580c' }}>Submit Justification</button>
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
                Escalate Deliverable to Senior Leadership
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
                  <optgroup label="Executive Leadership">
                    <option value="Mr. Sukh Sagar Singh Bhati (CEO)">
                      Mr. Sukh Sagar Singh Bhati (CEO)
                    </option>
                  </optgroup>
                  <optgroup label="Talent & People Operations">
                    {escalationLeaders.filter(l => l !== 'Mr. Sukh Sagar Singh Bhati (CEO)').map(leader => (
                      <option key={leader} value={leader}>{leader}</option>
                    ))}
                  </optgroup>
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
          <div className="stream-modal-card" style={{ maxWidth: '440px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarClock size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Reschedule Deliverable</h3>
              </div>
              <button className="calendar-nav-btn" type="button" onClick={() => setShowRescheduleModal(false)}><X size={16} /></button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.8rem',
              color: '#334155'
            }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>{task.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Current Due Date: <strong style={{ color: '#1e293b' }}>{task.dueDate || task.scheduledDate}</strong> • Current Date: <strong style={{ color: '#2563eb' }}>{todayStr}</strong>
              </div>
            </div>

            <form onSubmit={handleConfirmReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-field-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                  <label className="form-field-label" style={{ margin: 0 }}>New Target Date</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setRescheduleDateInput(todayStr)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: rescheduleDateInput === todayStr ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: rescheduleDateInput === todayStr ? '#2563eb' : '#f8fafc',
                        color: rescheduleDateInput === todayStr ? '#ffffff' : '#334155',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Today ({todayStr})
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  className="form-input"
                  value={rescheduleDateInput}
                  onChange={e => setRescheduleDateInput(e.target.value)}
                  required
                />
              </div>
              <div className="stream-modal-footer-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
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
      {/* Modal: Delete Task Confirmation */}
      {showDeleteModal && (
        <div className="stream-overlay" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '440px', borderTop: '4px solid #dc2626' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0
                }}>
                  <Trash2 size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                    Delete Deliverable
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Permanent removal from ledger & database
                  </div>
                </div>
              </div>
              <button className="calendar-nav-btn" onClick={() => !isDeleting && setShowDeleteModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                Are you sure you want to delete this task?
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                  {task.title}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <span><strong>Created:</strong> {creationDateFormatted}</span>
                  <span><strong>Due:</strong> {task.scheduledDate} {task.time}</span>
                  <span>{task.department}</span>
                  <span className={getPriorityBadgeClass(task.priority)} style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem' }}>
                    {task.priority}
                  </span>
                </div>
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: '#b91c1c',
                background: '#fef2f2',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                fontWeight: 500
              }}>
                This deliverable will be permanently deleted across all devices and MongoDB Atlas.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.1rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#dc2626', borderColor: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                disabled={isDeleting}
                onClick={async () => {
                  if (!canCancelOrDelete) {
                    alert("Access Restricted: Only Admin, Super Admin, and CEO have permission to permanently delete deliverables.");
                    setShowDeleteModal(false);
                    return;
                  }
                  setIsDeleting(true);
                  await deleteTask(task.id);
                  setIsDeleting(false);
                  setShowDeleteModal(false);
                }}
              >
                <Trash2 size={13} />
                {isDeleting ? 'Deleting...' : 'Yes, Delete Task (CEO)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Flowchart 8 Step 12 — Reassign or Close Assignee */}
      {manageAssigneeData.isOpen && manageAssigneeData.assignee && (
        <div className="stream-overlay" onClick={() => setManageAssigneeData(prev => ({ ...prev, isOpen: false }))}>
          <div className="stream-modal-card" style={{ maxWidth: '480px', borderTop: '4px solid #2563eb' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="#2563eb" />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Manage Assignee Component
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Assignee left or resigned protocol
                  </div>
                </div>
              </div>
              <button
                className="calendar-nav-btn"
                onClick={() => setManageAssigneeData(prev => ({ ...prev, isOpen: false }))}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.8rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Target Assignee:</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                {manageAssigneeData.assignee.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {manageAssigneeData.assignee.designation} • {manageAssigneeData.assignee.department}
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!manageAssigneeData.notes.trim()) {
                alert('A documented justification note is mandatory per corporate governance.');
                return;
              }
              if (manageAssigneeData.action === 'reassign' && !manageAssigneeData.newAssigneeId) {
                alert('Please select an active colleague to reassign this deliverable to.');
                return;
              }
              reassignOrCloseAssignee(
                task.id,
                manageAssigneeData.assignee!.id,
                manageAssigneeData.action,
                manageAssigneeData.newAssigneeId,
                manageAssigneeData.notes.trim()
              );
              setManageAssigneeData(prev => ({ ...prev, isOpen: false }));
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>

              {/* Action Selector: Reassign vs Close */}
              <div>
                <label className="form-field-label" style={{ fontWeight: 700 }}>Action Required *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setManageAssigneeData(prev => ({ ...prev, action: 'reassign' }))}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: manageAssigneeData.action === 'reassign' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: manageAssigneeData.action === 'reassign' ? '#eff6ff' : '#ffffff',
                      color: manageAssigneeData.action === 'reassign' ? '#1d4ed8' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <UserPlus size={14} />
                    Reassign to Colleague
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageAssigneeData(prev => ({ ...prev, action: 'close' }))}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: manageAssigneeData.action === 'close' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: manageAssigneeData.action === 'close' ? '#fef2f2' : '#ffffff',
                      color: manageAssigneeData.action === 'close' ? '#b91c1c' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <UserX size={14} />
                    Close / Waive Component
                  </button>
                </div>
              </div>

              {/* If Reassign: Colleague Dropdown */}
              {manageAssigneeData.action === 'reassign' && (
                <div className="form-field-group">
                  <label className="form-field-label">Select Successor Colleague *</label>
                  <select
                    className="form-input"
                    value={manageAssigneeData.newAssigneeId}
                    onChange={e => setManageAssigneeData(prev => ({ ...prev, newAssigneeId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>-- Select active employee from roster --</option>
                    {activeMembers
                      .filter(m => m.id !== manageAssigneeData.assignee?.id && !task.assignees.some(other => other.id === m.id))
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.designation} • {m.department})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Mandatory Justification Notes */}
              <div className="form-field-group">
                <label className="form-field-label">
                  {manageAssigneeData.action === 'reassign' ? 'Reassignment Reason & Handover Notes *' : 'Component Closure / Staff Departure Justification *'}
                </label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder={
                    manageAssigneeData.action === 'reassign'
                      ? 'e.g. Elena shifted to Q4 Expansion project; deliverable component transferred to Rahul Sharma.'
                      : 'e.g. Employee departed/resigned; individual component formally closed with management sign-off.'
                  }
                  value={manageAssigneeData.notes}
                  onChange={e => setManageAssigneeData(prev => ({ ...prev, notes: e.target.value }))}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setManageAssigneeData(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    background: manageAssigneeData.action === 'close' ? '#dc2626' : '#2563eb',
                    borderColor: manageAssigneeData.action === 'close' ? '#b91c1c' : '#1d4ed8'
                  }}
                >
                  {manageAssigneeData.action === 'reassign' ? 'Confirm Reassignment' : 'Confirm Component Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Flowchart 3: Senior Action Modal (Advise, Reassign, Resolve, Return) */}
      {seniorActionModal.isOpen && (
        <div className="stream-overlay" onClick={() => setSeniorActionModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {seniorActionModal.action === 'advise' && 'Provide Senior Advisory Guidance'}
                {seniorActionModal.action === 'reassign' && 'Reassign Escalated Deliverable'}
                {seniorActionModal.action === 'resolve' && '✓ Resolve Escalated Deliverable'}
                {seniorActionModal.action === 'return' && 'Return Deliverable to Assignee'}
              </h3>
              <button className="calendar-nav-btn" onClick={() => setSeniorActionModal(prev => ({ ...prev, isOpen: false }))}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem' }}>
              Deliverable: <strong>"{task.title}"</strong> (Escalated: {task.escalationReason || 'Senior review required'})
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (seniorActionModal.action === 'advise') {
                  seniorAdviseTask(task.id, seniorActionModal.note.trim());
                } else if (seniorActionModal.action === 'reassign') {
                  seniorReassignTask(task.id, seniorActionModal.targetAssigneeId, seniorActionModal.note.trim());
                } else if (seniorActionModal.action === 'resolve') {
                  seniorResolveTask(task.id, seniorActionModal.note.trim());
                } else if (seniorActionModal.action === 'return') {
                  seniorReturnTask(task.id, seniorActionModal.note.trim());
                }
                setSeniorActionModal(prev => ({ ...prev, isOpen: false }));
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              {seniorActionModal.action === 'reassign' && (
                <div className="form-field-group">
                  <label className="form-field-label">Select New Assignee *</label>
                  <select
                    className="form-select"
                    value={seniorActionModal.targetAssigneeId}
                    onChange={e => setSeniorActionModal(prev => ({ ...prev, targetAssigneeId: e.target.value }))}
                    required
                  >
                    {activeMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.designation} • {m.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-field-group">
                <label className="form-field-label">
                  {seniorActionModal.action === 'advise' && 'Advisory Guidance / Technical Recommendations *'}
                  {seniorActionModal.action === 'reassign' && 'Handover Instructions *'}
                  {seniorActionModal.action === 'resolve' && 'Senior Resolution Summary *'}
                  {seniorActionModal.action === 'return' && 'Return Instructions / Reason for Returning *'}
                </label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  value={seniorActionModal.note}
                  onChange={e => setSeniorActionModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Enter documented instructions..."
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSeniorActionModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    background: seniorActionModal.action === 'resolve' ? '#10b981' : seniorActionModal.action === 'return' ? '#ea580c' : '#2563eb'
                  }}
                >
                  {seniorActionModal.action === 'advise' && 'Post Advisory & Return to In Progress'}
                  {seniorActionModal.action === 'reassign' && 'Execute Reassignment'}
                  {seniorActionModal.action === 'resolve' && 'Mark Resolved (Done)'}
                  {seniorActionModal.action === 'return' && 'Return to Assignee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Flowchart 22: Cancel Task Modal (Left Branch) */}
      {showCancelModal && (
        <div className="stream-overlay" onClick={() => !isSubmittingCancel && setShowCancelModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px', borderTop: '4px solid #dc2626' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                  <Ban size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                    Cancel Deliverable
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Mandatory Cancellation Reason • Excluded from Performance Reports
                  </div>
                </div>
              </div>
              <button className="calendar-nav-btn" onClick={() => !isSubmittingCancel && setShowCancelModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{task.title}</div>
                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Assignees: <strong>{task.assignees.map(a => a.name).join(', ') || 'Unassigned'}</strong>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.55rem 0.75rem', marginBottom: '0.85rem', lineHeight: 1.45 }}>
                <strong>Policy:</strong> Cancelling this deliverable marks its status as <strong>Cancelled</strong>, sets all assignees to Cancelled, notifies all assignees and creator, and <strong>strictly excludes this task from all performance ratio calculations</strong>.
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!cancelReasonInput.trim()) {
                  alert('Cancellation reason is required per corporate governance.');
                  return;
                }
                setIsSubmittingCancel(true);
                await cancelTask(task.id, cancelReasonInput.trim());
                setIsSubmittingCancel(false);
                setShowCancelModal(false);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-field-group">
                  <label className="form-field-label" style={{ fontWeight: 700 }}>
                    Mandatory Cancellation Reason *
                  </label>
                  <textarea
                    className="form-input"
                    required
                    rows={3}
                    placeholder="Document why this deliverable is being cancelled (e.g., Client cancelled scope, merged into deliverable #T-402, obsolete milestone)..."
                    value={cancelReasonInput}
                    onChange={e => setCancelReasonInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowCancelModal(false)}
                    disabled={isSubmittingCancel}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ background: '#dc2626', borderColor: '#b91c1c' }}
                    disabled={isSubmittingCancel || !cancelReasonInput.trim()}
                  >
                    {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Flowchart 22: Reassign Task Modal (Right Branch) */}
      {showReassignModal && (
        <div className="stream-overlay" onClick={() => !isSubmittingReassign && setShowReassignModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '540px', borderTop: '4px solid #2563eb' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Reassign Deliverable
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Existing Assignees Decision Matrix: Replace All, Add Alongside, or Remove Specific
                  </div>
                </div>
              </div>
              <button className="calendar-nav-btn" onClick={() => !isSubmittingReassign && setShowReassignModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{task.title}</div>
                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Current Assignees: <strong>{task.assignees.map(a => a.name).join(', ') || 'Unassigned'}</strong>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (reassignMode === 'REPLACE_ALL' && selectedNewAssigneeIds.length === 0) {
                  alert('Please select at least one new assignee to replace existing assignees.');
                  return;
                }
                if (reassignMode === 'ADD_ALONGSIDE' && selectedNewAssigneeIds.length === 0) {
                  alert('Please select at least one colleague to add alongside existing assignees.');
                  return;
                }
                if (reassignMode === 'REMOVE_SPECIFIC' && selectedRemoveAssigneeIds.length === 0) {
                  alert('Please select at least one assignee to remove.');
                  return;
                }
                if (reassignMode === 'REMOVE_SPECIFIC' && selectedRemoveAssigneeIds.length >= task.assignees.length) {
                  alert('Cannot remove all assignees without adding a replacement. Use "Replace all" instead.');
                  return;
                }

                setIsSubmittingReassign(true);
                await reassignTask({
                  taskId: task.id,
                  mode: reassignMode,
                  newAssigneeIds: selectedNewAssigneeIds,
                  removeAssigneeIds: selectedRemoveAssigneeIds,
                  reason: reassignReasonInput.trim()
                });
                setIsSubmittingReassign(false);
                setShowReassignModal(false);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

                {/* Flowchart 22 Diamond: Existing assignees? (3 Modes) */}
                <div>
                  <label className="form-field-label" style={{ fontWeight: 800, color: '#1e293b' }}>
                    Existing Assignees Decision? *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <div
                      onClick={() => setReassignMode('REPLACE_ALL')}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: '8px',
                        border: reassignMode === 'REPLACE_ALL' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: reassignMode === 'REPLACE_ALL' ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: reassignMode === 'REPLACE_ALL' ? '#1d4ed8' : '#0f172a' }}>
                        Replace all
                      </div>
                      <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                        Remove old, add new
                      </div>
                    </div>

                    <div
                      onClick={() => setReassignMode('ADD_ALONGSIDE')}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: '8px',
                        border: reassignMode === 'ADD_ALONGSIDE' ? '2px solid #059669' : '1px solid #cbd5e1',
                        background: reassignMode === 'ADD_ALONGSIDE' ? '#ecfdf5' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: reassignMode === 'ADD_ALONGSIDE' ? '#047857' : '#0f172a' }}>
                        Add alongside
                      </div>
                      <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                        Keep old, add new
                      </div>
                    </div>

                    <div
                      onClick={() => setReassignMode('REMOVE_SPECIFIC')}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: '8px',
                        border: reassignMode === 'REMOVE_SPECIFIC' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        background: reassignMode === 'REMOVE_SPECIFIC' ? '#fef2f2' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: reassignMode === 'REMOVE_SPECIFIC' ? '#b91c1c' : '#0f172a' }}>
                        Remove specific
                      </div>
                      <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                        Remove selected only
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-interface: New Assignee selection for REPLACE_ALL or ADD_ALONGSIDE */}
                {(reassignMode === 'REPLACE_ALL' || reassignMode === 'ADD_ALONGSIDE') && (
                  <div className="form-field-group">
                    <label className="form-field-label">
                      {reassignMode === 'REPLACE_ALL' ? 'Select New Assignees *' : 'Select Colleague(s) to Add Alongside *'}
                    </label>
                    <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {activeMembers
                        .filter(m => reassignMode === 'REPLACE_ALL' || !task.assignees.some(a => a.id === m.id))
                        .map(m => {
                          const isSelected = selectedNewAssigneeIds.includes(m.id);
                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedNewAssigneeIds(prev =>
                                  isSelected ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                );
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                background: isSelected ? '#eff6ff' : '#ffffff',
                                border: isSelected ? '1px solid #93c5fd' : '1px solid #f1f5f9',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => { }}
                                style={{ cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                                  {m.name}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                  {m.designation || 'Specialist'} • {m.department}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Sub-interface: Remove Specific Assignees */}
                {reassignMode === 'REMOVE_SPECIFIC' && (
                  <div className="form-field-group">
                    <label className="form-field-label">
                      Select Existing Assignees to Remove *
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.5rem', background: '#fff5f5' }}>
                      {task.assignees.map(a => {
                        const isMarked = selectedRemoveAssigneeIds.includes(a.id);
                        return (
                          <div
                            key={a.id}
                            onClick={() => {
                              setSelectedRemoveAssigneeIds(prev =>
                                isMarked ? prev.filter(id => id !== a.id) : [...prev, a.id]
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background: isMarked ? '#fee2e2' : '#ffffff',
                              border: isMarked ? '1px solid #f87171' : '1px solid #e2e8f0',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isMarked}
                              onChange={() => { }}
                              style={{ cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                                {a.name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                Status: {a.status} • {a.department}
                              </div>
                            </div>
                            {isMarked && (
                              <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700 }}>
                                Will be removed
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Optional Reassignment Justification / Notes */}
                <div className="form-field-group">
                  <label className="form-field-label">
                    Handover Notes / Reason (Sent in notification)
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="e.g. Workload rebalance, sprint reallocation, department handoff..."
                    value={reassignReasonInput}
                    onChange={e => setReassignReasonInput(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowReassignModal(false)}
                    disabled={isSubmittingReassign}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmittingReassign}
                  >
                    {isSubmittingReassign ? 'Reassigning...' : 'Confirm Reassignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
