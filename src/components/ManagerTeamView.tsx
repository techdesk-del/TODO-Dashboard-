'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { isCeoUser } from '@/lib/rosterData';
import { Task, TeamMember, TaskStatus } from '@/types';
import { getTodayStr, formatDateDisplay } from '@/lib/dateUtils';
import { 
  Users, 
  Layers, 
  ArrowRightLeft, 
  Check, 
  AlertTriangle, 
  Clock, 
  Eye, 
  RotateCcw, 
  X, 
  Trash2, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Send, 
  ShieldAlert,
  MessageSquare,
  FileSpreadsheet
} from 'lucide-react';

export const ManagerTeamView: React.FC = () => {
  const { members, tasks, updateTask, reopenTask, deleteTask, currentUser, logAudit, setBannerNotification } = useApp();
  const isCeo = isCeoUser(currentUser);
  const todayStr = getTodayStr();

  const [activeTab, setActiveTab] = useState<'roster' | 'report'>('roster');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');

  // Active members excluding deactivated staff
  const activeMembers = useMemo(() => members.filter(m => m.status !== 'DEACTIVATED'), [members]);

  // Flowchart 5: Fetch all employees whose manager_id = current user
  const myTeamMembers = useMemo(() => {
    if (isCeo || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
      return activeMembers;
    }
    const cleanEmail = (currentUser.email || '').toLowerCase().trim();
    const cleanName = (currentUser.name || '').toLowerCase().trim();
    const directReports = activeMembers.filter(m => 
      m.managerId === currentUser.id ||
      (m.managerEmail && m.managerEmail.toLowerCase().trim() === cleanEmail) ||
      (m.manager && m.manager.toLowerCase().trim() === cleanName)
    );
    return directReports.length > 0 ? directReports : activeMembers;
  }, [activeMembers, currentUser, isCeo]);

  // Modals state for Manager Actions (Flowchart 5)
  // 1. Reassign task
  const [taskToReassign, setTaskToReassign] = useState<Task | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');

  // 2. Escalate to Admin
  const [taskToEscalateAdmin, setTaskToEscalateAdmin] = useState<Task | null>(null);
  const [adminEscalateReason, setAdminEscalateReason] = useState<string>('');

  // 3. Approve / Reject Reason
  const [taskReasonDecision, setTaskReasonDecision] = useState<{ task: Task; decision: 'APPROVE' | 'REJECT'; feedback: string } | null>(null);

  // 4. Reopen Modal
  const [taskToReopen, setTaskToReopen] = useState<Task | null>(null);
  const [managerReopenReason, setManagerReopenReason] = useState<string>('');

  // 5. Comment on task
  const [taskToComment, setTaskToComment] = useState<Task | null>(null);
  const [managerComment, setManagerComment] = useState<string>('');

  const isAllMembers = selectedMemberId === 'ALL';
  const selectedMember = isAllMembers ? null : (myTeamMembers.find(m => m.id === selectedMemberId) || myTeamMembers[0]);

  // Tasks belonging to team
  const memberTasks = useMemo(() => {
    return (isAllMembers
      ? tasks.filter(t => t.assignees.some(a => myTeamMembers.some(m => m.id === a.id || m.name.toLowerCase().includes(a.name.toLowerCase()))))
      : tasks.filter(t => t.assignees.some(a => a.id === selectedMember?.id || a.name.toLowerCase().includes((selectedMember?.name || '').toLowerCase())))
    ).slice().sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [isAllMembers, tasks, myTeamMembers, selectedMember]);

  // Helper: check if task is overdue
  const isTaskOverdue = (t: Task): boolean => {
    return t.scheduledDate < todayStr && t.status !== 'Done' && t.status !== 'Cancelled';
  };

  // Helper: compute Flowchart 5 counts for a member
  const getMemberCounts = (member: TeamMember) => {
    const assignedTasks = tasks.filter(t => t.assignees.some(a => a.id === member.id || a.name.toLowerCase().includes(member.name.toLowerCase())));
    const completed = assignedTasks.filter(t => t.status === 'Done').length;
    const pending = assignedTasks.filter(t => t.status === 'Pending Notice' || t.status === 'In Progress' || t.status === 'Not Started').length;
    const overdue = assignedTasks.filter(isTaskOverdue).length;
    const escalated = assignedTasks.filter(t => t.status === 'Escalated').length;

    return {
      assigned: assignedTasks.length,
      completed,
      pending,
      overdue,
      escalated
    };
  };

  // Team-level aggregated counts for Report (Flowchart 5)
  const teamAggregates = useMemo(() => {
    const teamTasks = tasks.filter(t => t.assignees.some(a => myTeamMembers.some(m => m.id === a.id || m.name.toLowerCase().includes(a.name.toLowerCase()))));
    const total = teamTasks.length;
    const done = teamTasks.filter(t => t.status === 'Done').length;
    const overdue = teamTasks.filter(isTaskOverdue).length;
    const escalated = teamTasks.filter(t => t.status === 'Escalated').length;
    const onHold = teamTasks.filter(t => t.status === 'On Hold').length;
    const timelyRatio = total > 0 ? (((done - overdue > 0 ? done - overdue : done) / total) * 100).toFixed(1) + '%' : '100%';

    return {
      total,
      done,
      overdue,
      escalated,
      onHold,
      timelyRatio
    };
  }, [tasks, myTeamMembers, todayStr]);

  // Action 1: Reassign Task (Flowchart 5)
  const handleConfirmReassignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToReassign) return;
    const targetMember = members.find(m => m.id === (newAssigneeId || activeMembers[0]?.id));
    if (!targetMember) return;

    updateTask(taskToReassign.id, {
      assignees: [
        {
          id: targetMember.id,
          name: targetMember.name,
          email: targetMember.email,
          department: targetMember.department,
          designation: targetMember.designation,
          avatar: targetMember.avatar,
          status: 'In Progress'
        }
      ],
      notes: `${taskToReassign.notes ? taskToReassign.notes + ' | ' : ''}Reassigned by Manager ${currentUser.name}: ${reassignReason || 'Team load balancing'}`
    }, `Manager Workload Rebalance: Reassigned to ${targetMember.name}`);

    logAudit({
      taskId: taskToReassign.id,
      action: 'REASSIGNED',
      fieldChanged: 'Manager Task Rebalance',
      oldValue: taskToReassign.assignees.map(a => a.name).join(', '),
      newValue: targetMember.name,
      notes: `Reporting Manager ${currentUser.name} reassigned deliverable: "${reassignReason || 'Workload rebalance'}" (Flowchart 5).`
    });

    setBannerNotification({
      message: `Reassigned "${taskToReassign.title}" to ${targetMember.name}.`,
      badge: '✓ Workload Balanced'
    });

    setTaskToReassign(null);
    setReassignReason('');
  };

  // Action 2: Escalate to Admin (Flowchart 5)
  const handleConfirmEscalateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToEscalateAdmin) return;
    if (!adminEscalateReason.trim()) {
      alert('Mandatory reason is required to flag task to Admin.');
      return;
    }

    updateTask(taskToEscalateAdmin.id, {
      status: 'Escalated',
      escalationReason: adminEscalateReason.trim(),
      escalatedTo: 'Admin HR Operations',
      notes: `${taskToEscalateAdmin.notes ? taskToEscalateAdmin.notes + ' | ' : ''}Manager ${currentUser.name} escalated to Admin: "${adminEscalateReason.trim()}"`
    }, `Manager flagged to Admin: "${adminEscalateReason.trim()}"`);

    logAudit({
      taskId: taskToEscalateAdmin.id,
      action: 'ESCALATED',
      fieldChanged: 'Flagged to Admin with Reason',
      oldValue: taskToEscalateAdmin.status,
      newValue: 'Escalated to Admin',
      notes: `Manager ${currentUser.name} escalated deliverable to Admin HR: "${adminEscalateReason.trim()}" (Flowchart 5).`
    });

    setBannerNotification({
      message: `Deliverable flagged to Admin HR with reason: "${adminEscalateReason.trim()}".`,
      badge: '🚨 Flagged to Admin'
    });

    setTaskToEscalateAdmin(null);
    setAdminEscalateReason('');
  };

  // Action 3: Approve / Reject Pending Reason (Flowchart 5)
  const handleConfirmReasonDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskReasonDecision) return;

    const { task, decision, feedback } = taskReasonDecision;
    const isApproved = decision === 'APPROVE';

    updateTask(task.id, {
      pastDueReason: isApproved ? `[Approved by Manager]: ${task.pastDueReason || task.holdReason}` : undefined,
      holdReason: isApproved ? `[Approved by Manager]: ${task.holdReason}` : undefined,
      notes: `${task.notes ? task.notes + ' | ' : ''}Manager ${currentUser.name} ${isApproved ? 'Approved' : 'Rejected'} Delay Reason: "${feedback || 'No remarks'}"`
    }, `Manager ${isApproved ? 'approved' : 'rejected'} delay justification`);

    logAudit({
      taskId: task.id,
      action: isApproved ? 'APPROVAL' : 'REJECTED',
      fieldChanged: 'Pending Delay Reason Review',
      oldValue: task.pastDueReason || task.holdReason || 'Pending Review',
      newValue: `${decision}: "${feedback || 'No remarks'}"`,
      notes: `Reporting Manager ${currentUser.name} ${isApproved ? 'approved' : 'rejected'} justification (Flowchart 5).`
    });

    setBannerNotification({
      message: `Delay reason ${isApproved ? 'Approved' : 'Rejected'} for "${task.title}".`,
      badge: isApproved ? '✓ Reason Approved' : '✕ Reason Rejected'
    });

    setTaskReasonDecision(null);
  };

  // Action 4: Manager Reopen Task (Flowchart 5)
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

  // Action 5: Add Comment / Note (Flowchart 5)
  const handleConfirmAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToComment) return;
    if (!managerComment.trim()) return;

    updateTask(taskToComment.id, {
      notes: `${taskToComment.notes ? taskToComment.notes + ' | ' : ''}[${currentUser.name} - ${new Date().toLocaleDateString()}]: ${managerComment.trim()}`
    }, `Manager added comment`);

    logAudit({
      taskId: taskToComment.id,
      action: 'UPDATED',
      fieldChanged: 'Manager Note Appended',
      oldValue: taskToComment.notes || 'None',
      newValue: managerComment.trim(),
      notes: `Manager ${currentUser.name} commented on deliverable (Flowchart 5).`
    });

    setTaskToComment(null);
    setManagerComment('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.2rem 1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '8px' }}>
            <Layers size={22} color="#d97706" />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Reporting Manager Command Center — "My Team" (Flowchart 5)
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Direct Reports Monitoring • Rebalance Workloads • Escalate to Admin • Reason Approvals • Team Performance Trends
            </div>
          </div>
        </div>

        {/* View Switcher: Team Roster vs Team Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: '#f1f5f9', padding: '3px', borderRadius: '7px', display: 'flex', gap: '3px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.85rem',
                border: 'none',
                borderRadius: '5px',
                background: activeTab === 'roster' ? '#ffffff' : 'transparent',
                boxShadow: activeTab === 'roster' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: activeTab === 'roster' ? 800 : 600,
                color: activeTab === 'roster' ? '#2563eb' : '#64748b',
                fontSize: '0.78rem'
              }}
              onClick={() => setActiveTab('roster')}
            >
              <Users size={13} />
              Team Roster &amp; Tasks
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.85rem',
                border: 'none',
                borderRadius: '5px',
                background: activeTab === 'report' ? '#ffffff' : 'transparent',
                boxShadow: activeTab === 'report' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: activeTab === 'report' ? 800 : 600,
                color: activeTab === 'report' ? '#2563eb' : '#64748b',
                fontSize: '0.78rem'
              }}
              onClick={() => setActiveTab('report')}
            >
              <BarChart3 size={13} />
              View Team Report (FC 5)
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* VIEW B: Team Report (Flowchart 5: "See team-level performance ratios and trends") */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
            gap: '1rem'
          }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>TOTAL TEAM DELIVERABLES</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{teamAggregates.total}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Across {myTeamMembers.length} team staff</div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>TIMELY COMPLETION RATIO</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{teamAggregates.timelyRatio}</div>
              <div style={{ fontSize: '0.7rem', color: '#15803d', marginTop: '2px' }}>{teamAggregates.done} completed deliverables</div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 700 }}>OVERDUE DELAYS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{teamAggregates.overdue}</div>
              <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '2px' }}>Requires manager review</div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#c2410c', fontWeight: 700 }}>ESCALATIONS COUNT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>{teamAggregates.escalated}</div>
              <div style={{ fontSize: '0.7rem', color: '#c2410c', marginTop: '2px' }}>Blocked on senior leadership</div>
            </div>
          </div>

          {/* Performance Distribution */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Team Operational Health &amp; Velocity
            </h3>
            <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '7px', display: 'flex', overflow: 'hidden', marginBottom: '0.75rem' }}>
              <div style={{ width: `${(teamAggregates.done / (teamAggregates.total || 1)) * 100}%`, background: '#10b981' }} title={`Completed: ${teamAggregates.done}`} />
              <div style={{ width: `${(teamAggregates.overdue / (teamAggregates.total || 1)) * 100}%`, background: '#ef4444' }} title={`Overdue: ${teamAggregates.overdue}`} />
              <div style={{ width: `${(teamAggregates.escalated / (teamAggregates.total || 1)) * 100}%`, background: '#f97316' }} title={`Escalated: ${teamAggregates.escalated}`} />
              <div style={{ width: `${(teamAggregates.onHold / (teamAggregates.total || 1)) * 100}%`, background: '#f59e0b' }} title={`On Hold: ${teamAggregates.onHold}`} />
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} /> Done ({teamAggregates.done})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} /> Overdue ({teamAggregates.overdue})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }} /> Escalated ({teamAggregates.escalated})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} /> On Hold ({teamAggregates.onHold})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* VIEW A: Team Roster & Tasks (Flowchart 5) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === 'roster' && (
        <>
          {/* Team Members Summary Grid: Display counts: assigned, completed, pending, overdue, escalated */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
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
                <div className="avatar-circle" style={{ width: '32px', height: '32px', background: '#2563eb', color: '#fff', fontWeight: 800 }}>ALL</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>Full Department</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{myTeamMembers.length} Direct Staff Members</div>
                </div>
              </div>

              {/* 5 Counts for All (Flowchart 5) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', textAlign: 'center', marginTop: '0.6rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 700 }}>ASGN</div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{tasks.length}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#15803d', fontWeight: 700 }}>DONE</div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#15803d' }}>{tasks.filter(t => t.status === 'Done').length}</div>
                </div>
                <div style={{ background: '#eff6ff', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#1d4ed8', fontWeight: 700 }}>PEND</div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1d4ed8' }}>{tasks.filter(t => t.status === 'Pending Notice' || t.status === 'In Progress' || t.status === 'Not Started').length}</div>
                </div>
                <div style={{ background: '#fef2f2', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#dc2626', fontWeight: 700 }}>OVRD</div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#dc2626' }}>{tasks.filter(isTaskOverdue).length}</div>
                </div>
                <div style={{ background: '#fff7ed', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.58rem', color: '#c2410c', fontWeight: 700 }}>ESCL</div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#c2410c' }}>{tasks.filter(t => t.status === 'Escalated').length}</div>
                </div>
              </div>
            </div>

            {/* Individual Member Cards */}
            {myTeamMembers.map(member => {
              const isSelected = member.id === selectedMemberId;
              const counts = getMemberCounts(member);

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
                    <div className="avatar-circle" style={{ width: '32px', height: '32px' }}>{member.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{member.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{member.designation}</div>
                    </div>
                  </div>

                  {/* Flowchart 5: "Show per member: assigned, completed, pending, overdue, escalated" */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', textAlign: 'center', marginTop: '0.6rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 700 }}>ASGN</div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{counts.assigned}</div>
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.58rem', color: '#15803d', fontWeight: 700 }}>DONE</div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#15803d' }}>{counts.completed}</div>
                    </div>
                    <div style={{ background: '#eff6ff', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.58rem', color: '#1d4ed8', fontWeight: 700 }}>PEND</div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1d4ed8' }}>{counts.pending}</div>
                    </div>
                    <div style={{ background: counts.overdue > 0 ? '#fee2e2' : '#f8fafc', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.58rem', color: counts.overdue > 0 ? '#b91c1c' : '#64748b', fontWeight: 700 }}>OVRD</div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: counts.overdue > 0 ? '#b91c1c' : '#475569' }}>{counts.overdue}</div>
                    </div>
                    <div style={{ background: counts.escalated > 0 ? '#ffedd5' : '#f8fafc', padding: '0.3rem 0.2rem', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.58rem', color: counts.escalated > 0 ? '#c2410c' : '#64748b', fontWeight: 700 }}>ESCL</div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: counts.escalated > 0 ? '#c2410c' : '#475569' }}>{counts.escalated}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Member Deliverables Table with All 5 Manager Actions (Flowchart 5) */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '1.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Active Tasks Portfolio: {isAllMembers ? 'All Department Deliverables' : selectedMember?.name}
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {isAllMembers ? 'Aggregated across all reporting team members' : `${selectedMember?.designation} • ${selectedMember?.department}`}
                </span>
              </div>

              <span className="filter-badge-count" style={{ background: '#eff6ff', color: '#2563eb' }}>
                {memberTasks.length} Assigned Deliverables
              </span>
            </div>

            <div className="enterprise-table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Deliverable Title</th>
                    <th>Assignee(s)</th>
                    <th>Due Date &amp; Time</th>
                    <th>Status &amp; Delay Justification</th>
                    <th>Manager Actions (Flowchart 5)</th>
                  </tr>
                </thead>
                <tbody>
                  {memberTasks.map((t, idx) => {
                    const overdue = isTaskOverdue(t);
                    const hasDelayReason = Boolean(t.pastDueReason || t.holdReason);
                    const canReopen = t.status === 'Done' || t.status === 'On Hold' || t.status === 'Cancelled';

                    return (
                      <tr key={t.id} style={{ background: overdue ? '#fff5f5' : undefined }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="task-sequence-badge" style={{ fontSize: '0.7rem' }}>#{idx + 1}</span>
                            <span style={{ fontWeight: 700, color: overdue ? '#991b1b' : '#0f172a' }}>{t.title}</span>
                          </div>

                          {t.notes && (
                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                              📝 {t.notes}
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
                          <div style={{ fontWeight: overdue ? 700 : 500, color: overdue ? '#dc2626' : undefined }}>
                            {t.scheduledDate}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{t.time}</div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{t.status}</span>
                            {overdue && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: '3px' }}>
                                OVERDUE
                              </span>
                            )}
                          </div>

                          {/* Delay Justification Display */}
                          {hasDelayReason && (
                            <div style={{ fontSize: '0.7rem', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', marginTop: '3px' }}>
                              <strong>Justification:</strong> {t.pastDueReason || t.holdReason}
                            </div>
                          )}
                        </td>

                        <td>
                          {/* Flowchart 5 Manager Actions: Reassign, Escalate to Admin, Approve Reason, Reopen, Comment */}
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {/* Action 1: Reassign Task */}
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem', gap: '3px' }}
                              onClick={() => {
                                setTaskToReassign(t);
                                setNewAssigneeId(myTeamMembers[0]?.id || '');
                                setReassignReason('');
                              }}
                              title="Flowchart 5: Reassign a task to another team member"
                            >
                              <ArrowRightLeft size={12} />
                              Reassign
                            </button>

                            {/* Action 2: Escalate to Admin */}
                            {t.status !== 'Done' && (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem', color: '#dc2626', borderColor: '#fca5a5', gap: '3px' }}
                                onClick={() => {
                                  setTaskToEscalateAdmin(t);
                                  setAdminEscalateReason('');
                                }}
                                title="Flowchart 5: Flag a task to Admin with reason"
                              >
                                <ShieldAlert size={12} color="#dc2626" />
                                Escalate Admin
                              </button>
                            )}

                            {/* Action 3: Approve / Reject Reason */}
                            {hasDelayReason && (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem', color: '#047857', borderColor: '#a7f3d0', background: '#ecfdf5', gap: '3px' }}
                                onClick={() => {
                                  setTaskReasonDecision({
                                    task: t,
                                    decision: 'APPROVE',
                                    feedback: ''
                                  });
                                }}
                                title="Flowchart 5: Approve or reject a pending reason"
                              >
                                <CheckCircle2 size={12} color="#059669" />
                                Reason Review
                              </button>
                            )}

                            {/* Action 4: Reopen Task */}
                            {canReopen && (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem', color: '#1e40af', background: '#eff6ff', borderColor: '#bfdbfe', gap: '3px' }}
                                onClick={() => {
                                  setTaskToReopen(t);
                                  setManagerReopenReason('');
                                }}
                                title="Flowchart 5: Reopen task as allowed"
                              >
                                <RotateCcw size={12} />
                                Reopen
                              </button>
                            )}

                            {/* Action 5: Add Comment */}
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem', gap: '3px' }}
                              onClick={() => {
                                setTaskToComment(t);
                                setManagerComment('');
                              }}
                              title="Flowchart 5: Add managerial advisory note or comment"
                            >
                              <MessageSquare size={12} />
                              Note
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {memberTasks.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No deliverables currently scheduled for this team selection.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 1: REASSIGN TASK (Flowchart 5) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {taskToReassign && (
        <div className="stream-overlay" onClick={() => setTaskToReassign(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                👥 Reassign Deliverable (Flowchart 5)
              </h3>
              <button className="calendar-nav-btn" onClick={() => setTaskToReassign(null)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
              Rebalancing <strong>"{taskToReassign.title}"</strong> to another team colleague.
            </p>

            <form onSubmit={handleConfirmReassignment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Select Target Colleague *</label>
                <select
                  className="form-select"
                  value={newAssigneeId}
                  onChange={e => setNewAssigneeId(e.target.value)}
                  required
                >
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.designation} • {m.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Reassignment Rationale / Instructions</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Workload balancing across sprint components"
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskToReassign(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Execute Reassignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 2: ESCALATE TO ADMIN (Flowchart 5) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {taskToEscalateAdmin && (
        <div className="stream-overlay" onClick={() => setTaskToEscalateAdmin(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={18} color="#dc2626" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#dc2626' }}>
                  Escalate Task to Admin (Flowchart 5)
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setTaskToEscalateAdmin(null)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
              Flagging <strong>"{taskToEscalateAdmin.title}"</strong> to Admin HR for corporate intervention.
            </p>

            <form onSubmit={handleConfirmEscalateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Mandatory Escalation Reason *</label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder="e.g. Chronic delay exceeding 5 days; vendor contract deadlock requires HR/Management intervention."
                  value={adminEscalateReason}
                  onChange={e => setAdminEscalateReason(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskToEscalateAdmin(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#dc2626', borderColor: '#b91c1c' }}>
                  Confirm Escalation to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 3: APPROVE / REJECT REASON (Flowchart 5) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {taskReasonDecision && (
        <div className="stream-overlay" onClick={() => setTaskReasonDecision(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                ⚖️ Review Delay Justification (Flowchart 5)
              </h3>
              <button className="calendar-nav-btn" onClick={() => setTaskReasonDecision(null)}><X size={16} /></button>
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.65rem 0.85rem', margin: '0.5rem 0' }}>
              <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700 }}>DOCUMENTED REASON:</div>
              <div style={{ fontSize: '0.8rem', color: '#78350f', fontWeight: 600 }}>
                "{taskReasonDecision.task.pastDueReason || taskReasonDecision.task.holdReason}"
              </div>
            </div>

            <form onSubmit={handleConfirmReasonDecision} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Manager Decision *</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#15803d' }}>
                    <input
                      type="radio"
                      name="decision"
                      checked={taskReasonDecision.decision === 'APPROVE'}
                      onChange={() => setTaskReasonDecision(prev => prev ? { ...prev, decision: 'APPROVE' } : null)}
                    />
                    <span>✓ Approve Delay Reason</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>
                    <input
                      type="radio"
                      name="decision"
                      checked={taskReasonDecision.decision === 'REJECT'}
                      onChange={() => setTaskReasonDecision(prev => prev ? { ...prev, decision: 'REJECT' } : null)}
                    />
                    <span>✕ Reject Reason</span>
                  </label>
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Manager Remarks &amp; Feedback</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Reason validated with client; deadline extended to Friday."
                  value={taskReasonDecision.feedback}
                  onChange={e => setTaskReasonDecision(prev => prev ? { ...prev, feedback: e.target.value } : null)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskReasonDecision(null)}>Cancel</button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    background: taskReasonDecision.decision === 'APPROVE' ? '#15803d' : '#dc2626',
                    borderColor: taskReasonDecision.decision === 'APPROVE' ? '#166534' : '#b91c1c'
                  }}
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 4: MANAGER REOPEN TASK (Flowchart 5) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {taskToReopen && (
        <div className="stream-overlay" onClick={() => setTaskToReopen(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={16} color="#1e40af" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Managerial Task Reopen (Flowchart 5)
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setTaskToReopen(null)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
              Reopening <strong>"{taskToReopen.title}"</strong> will restore status to <strong>In Progress (50%)</strong> and create an immutable audit record.
            </p>

            <form onSubmit={handleConfirmManagerReopen} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Mandatory Reopen Justification *</label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder="e.g. Quality assurance review revealed pending unit tests; reopening for follow-up sprint."
                  value={managerReopenReason}
                  onChange={e => setManagerReopenReason(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskToReopen(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#1e40af' }}>Confirm Reopen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL 5: ADD NOTE / COMMENT (Flowchart 5) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {taskToComment && (
        <div className="stream-overlay" onClick={() => setTaskToComment(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                📝 Add Managerial Note (Flowchart 5)
              </h3>
              <button className="calendar-nav-btn" onClick={() => setTaskToComment(null)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
              Appends a signed managerial remark to <strong>"{taskToComment.title}"</strong>.
            </p>

            <form onSubmit={handleConfirmAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Manager Note *</label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder="e.g. Discussed in 1-on-1; prioritized ahead of database migration."
                  value={managerComment}
                  onChange={e => setManagerComment(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setTaskToComment(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Append Note</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
