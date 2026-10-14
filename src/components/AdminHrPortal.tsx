'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { isCeoUser } from '@/lib/rosterData';
import { TeamMember, Task, TaskStatus } from '@/types';
import { 
  UserPlus, 
  Users, 
  UserX, 
  Check, 
  X, 
  Search, 
  Mail, 
  Building, 
  Briefcase, 
  Shield, 
  RefreshCw,
  Send,
  RotateCcw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Trash2,
  User,
  Phone,
  Key,
  Building2,
  ArrowRight,
  AlertCircle,
  FileText,
  ShieldAlert
} from 'lucide-react';

import { OFFICIAL_HOLIDAYS_2026_27, HOLIDAY_METADATA } from '@/lib/holidayData';

export const AdminHrPortal: React.FC = () => {
  const { members, tasks, updateTask, reopenTask, deleteTask, addMember, deactivateMember, currentUser, systemConfig } = useApp();
  const isCeo = isCeoUser(currentUser);

  const [activeTab, setActiveTab] = useState<'oversight' | 'create_user' | 'pending_approvals' | 'deactivation' | 'holidays'>('oversight');
  const [selectedUserForOversight, setSelectedUserForOversight] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Reopen Task Modal State
  const [taskToReopen, setTaskToReopen] = useState<Task | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  
  // Direct Invite Form state (FC 9)
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserDept, setNewUserDept] = useState('');
  const [newUserDesignation, setNewUserDesignation] = useState('');
  const [newUserRole, setNewUserRole] = useState<'EMPLOYEE' | 'MANAGER' | 'ADMIN' | ''>('');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Deactivation Handover state (Flowchart 18)
  const [departingMemberId, setDepartingMemberId] = useState<string>('');
  const [successorMemberId, setSuccessorMemberId] = useState<string>('');
  const [deactivationReason, setDeactivationReason] = useState<string>('Resignation / Voluntary Transition');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [handoverAcknowledged, setHandoverAcknowledged] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivationError, setDeactivationError] = useState<string | null>(null);

  // Active vs Deactivated members
  const activeMembers = useMemo(() => {
    return members.filter(m => m.status !== 'DEACTIVATED');
  }, [members]);

  // Offboardable active members (excluding deactivated staff and CEO)
  const offboardableMembers = useMemo(() => {
    return activeMembers.filter(m => !isCeoUser(m));
  }, [activeMembers]);

  // Derived current departing and successor members
  const departingMember = useMemo(() => {
    if (departingMemberId) {
      return offboardableMembers.find(m => m.id === departingMemberId) || offboardableMembers[0] || null;
    }
    return offboardableMembers[0] || null;
  }, [departingMemberId, offboardableMembers]);

  const successorMember = useMemo(() => {
    if (successorMemberId) {
      return members.find(m => m.id === successorMemberId) || null;
    }
    return activeMembers.find(m => m.id !== departingMember?.id) || members.find(m => m.id !== departingMember?.id) || null;
  }, [successorMemberId, activeMembers, departingMember?.id, members]);

  // Active in-flight tasks for departing member
  const departingActiveTasks = useMemo(() => {
    if (!departingMember) return [];
    const activeStatuses: TaskStatus[] = ['In Progress', 'Queued', 'On Hold', 'Escalated', 'Review'];
    return tasks.filter(t => {
      if (!activeStatuses.includes(t.status)) return false;
      return t.assignees.some(a => 
        a.id === departingMember.id || 
        a.name.toLowerCase() === departingMember.name.toLowerCase() ||
        (departingMember.email && a.email.toLowerCase() === departingMember.email.toLowerCase())
      );
    });
  }, [departingMember, tasks]);

  // Pending sign-up requests queue (FC 2 & 3)
  const [pendingRequests, setPendingRequests] = useState<Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    manager: string;
    appliedAt: string;
  }>>([]);
  const [approvalBanner, setApprovalBanner] = useState<string | null>(null);

  // Calculate filtered deliverables
  const isAllUsers = selectedUserForOversight === 'ALL';
  const targetOversightMember = isAllUsers ? null : members.find(m => m.name === selectedUserForOversight);

  const baseTasks = isAllUsers
    ? tasks
    : tasks.filter(t => t.assignees.some(a => a.name.toLowerCase().includes(selectedUserForOversight.toLowerCase())));

  const filteredTasks = baseTasks.filter(t => {
    // Status filter
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    // Search query filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchProject = (t.project || '').toLowerCase().includes(q);
      const matchAssignee = t.assignees.some(a => a.name.toLowerCase().includes(q));
      if (!matchTitle && !matchProject && !matchAssignee) return false;
    }
    return true;
  });

  // KPI calculations
  const totalMonitored = baseTasks.length;
  const completedCount = baseTasks.filter(t => t.status === 'Done').length;
  const inProgressCount = baseTasks.filter(t => t.status === 'In Progress').length;
  const onHoldCount = baseTasks.filter(t => t.status === 'On Hold').length;
  const escalatedCount = baseTasks.filter(t => t.status === 'Escalated').length;

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert('Full legal name and official email are required.');
      return;
    }
    if (!newUserDept) {
      alert('Please select a Master Department.');
      return;
    }
    if (!newUserRole) {
      alert('Please select an Initial Access Role Tier.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const created = await addMember({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        department: newUserDept,
        designation: newUserDesignation.trim(),
        role: (newUserRole || 'EMPLOYEE') as 'EMPLOYEE' | 'MANAGER' | 'ADMIN',
      });

      setInviteSuccessMsg(`✓ Official account active for ${created.name} (${created.id}). Welcome credentials dispatched to ${created.email}!`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserDept('');
      setNewUserDesignation('');
      setNewUserRole('');
      setTimeout(() => setInviteSuccessMsg(null), 6000);
    } catch (err) {
      console.error('Create employee failed', err);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleApproveRequest = async (req: typeof pendingRequests[0]) => {
    try {
      const created = await addMember({
        name: req.name,
        email: req.email,
        department: req.department,
        designation: req.designation,
        role: 'EMPLOYEE'
      });

      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
      setApprovalBanner(`✓ Account approved for ${created.name} (${created.id}). Direct access provisioned to MongoDB Atlas!`);
      setTimeout(() => setApprovalBanner(null), 5000);
    } catch (err) {
      console.error('Approval failed', err);
    }
  };

  const handleRejectRequest = (id: string, name: string) => {
    const reason = prompt(`Enter mandatory written rejection reason for ${name}:`);
    if (reason) {
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      setApprovalBanner(`Applicant ${name} rejected. Formal rejection email recorded.`);
      setTimeout(() => setApprovalBanner(null), 4000);
    }
  };

  const handleConfirmReopen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToReopen) return;
    if (!reopenReason.trim()) {
      alert('Mandatory justification is required to reopen this task.');
      return;
    }

    reopenTask(taskToReopen.id, reopenReason.trim());
    setTaskToReopen(null);
    setReopenReason('');
  };

  const handleConfirmDeactivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departingMember) {
      setDeactivationError('Please select an employee to offboard.');
      return;
    }
    if (isCeoUser(departingMember)) {
      setDeactivationError('Executive Command Protection: CEO Mr. Sukh Sagar Singh Bhati cannot be deactivated under corporate governance.');
      return;
    }
    if (!successorMember) {
      setDeactivationError('Please designate an active successor to receive the deliverables.');
      return;
    }
    if (departingMember.id === successorMember.id) {
      setDeactivationError('Successor cannot be the same departing employee. Please select another active team member.');
      return;
    }
    if (!handoverAcknowledged) {
      setDeactivationError('Please acknowledge the transfer and credentials deactivation confirmation before proceeding.');
      return;
    }

    setIsDeactivating(true);
    setDeactivationError(null);

    try {
      const fullReason = handoverNotes.trim()
        ? `${deactivationReason} — Notes: ${handoverNotes.trim()}`
        : deactivationReason;

      await deactivateMember(departingMember.id, successorMember.id, fullReason);

      setHandoverAcknowledged(false);
      setHandoverNotes('');
      // Automatically advance to the next active non-CEO employee
      const nextDeparting = activeMembers.find(m => m.id !== departingMember.id && !isCeoUser(m));
      if (nextDeparting) {
        setDepartingMemberId(nextDeparting.id);
      }
    } catch (err: unknown) {
      setDeactivationError(err instanceof Error ? err.message : 'Deactivation failed.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Enterprise Portal Header Card */}
      <div className="admin-portal-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Admin & Talent HR Operations Center (Flowcharts 1 to 10)
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
              Direct employee provisioning, 7 master department governance, real-time oversight & task intervention
            </div>
          </div>
        </div>

        {/* Quick Enterprise Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.65rem', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            🏢 7 Master Depts
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.65rem', borderRadius: '6px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>
            👥 {activeMembers.length} Active Staff
          </span>
          {pendingRequests.length > 0 && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.65rem', borderRadius: '6px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
              ⏳ {pendingRequests.length} Pending
            </span>
          )}
        </div>
      </div>

      {/* Dedicated Modern Tab Strip */}
      <div className="admin-portal-tabs-bar">
        <button
          className={`admin-portal-tab-pill ${activeTab === 'oversight' ? 'active' : ''}`}
          onClick={() => setActiveTab('oversight')}
        >
          <Layers size={14} />
          <span>Task Monitoring</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'create_user' ? 'active' : ''}`}
          onClick={() => setActiveTab('create_user')}
        >
          <UserPlus size={14} />
          <span>Create Account</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'pending_approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending_approvals')}
        >
          <CheckCircle2 size={14} />
          <span>Approvals{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'deactivation' ? 'active' : ''}`}
          onClick={() => setActiveTab('deactivation')}
        >
          <UserX size={14} />
          <span>Deactivation & Handover</span>
        </button>
        <button
          className={`admin-portal-tab-pill ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
          style={{
            color: activeTab === 'holidays' ? '#92400e' : undefined,
            background: activeTab === 'holidays' ? '#fef3c7' : undefined
          }}
        >
          <Sparkles size={14} />
          <span>Company Holidays</span>
        </button>
      </div>

      {/* Tab 1: User Oversight & Company-wide Monitoring (FC 10) */}
      {activeTab === 'oversight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Controls Bar: Employee Filter & Search */}
          <div className="admin-filter-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 300px', minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', whiteSpace: 'nowrap' }}>
                MONITORING SCOPE:
              </span>
              <select
                className="form-select"
                style={{ flex: 1, minWidth: '220px', maxWidth: '420px', fontWeight: 700 }}
                value={selectedUserForOversight}
                onChange={e => setSelectedUserForOversight(e.target.value)}
              >
                <option value="ALL">🏢 ALL EMPLOYEES — Full Company Overview ({tasks.length} Deliverables)</option>
                {activeMembers.map(m => (
                  <option key={m.id} value={m.name}>
                    👤 {m.name} — {m.designation} ({tasks.filter(t => t.assignees.some(a => a.name.toLowerCase().includes(m.name.toLowerCase()))).length} Tasks)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter deliverables or assignees..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.75rem', height: '34px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {!isAllUsers && targetOversightMember && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b', flexShrink: 0 }}>
                  <span>Dept: <strong>{targetOversightMember.department}</strong></span>
                  <span>Velocity: <strong style={{ color: '#2563eb' }}>{targetOversightMember.velocity}%</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Quick KPI Bar */}
          <div className="admin-kpi-grid">
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>TOTAL MONITORED</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalMonitored}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563eb' }}>IN PROGRESS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>{inProgressCount}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a' }}>COMPLETED (DONE)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>{completedCount}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#d97706' }}>ON HOLD</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>{onHoldCount}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>ESCALATED</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{escalatedCount}</div>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {['ALL', 'In Progress', 'Done', 'On Hold', 'Escalated', 'Queued'].map(st => (
              <button
                key={st}
                className={`btn-secondary ${statusFilter === st ? 'active' : ''}`}
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', fontWeight: statusFilter === st ? 700 : 500 }}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'ALL' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          {/* Deliverables Oversight Table */}
          <div className="enterprise-table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '220px' }}>Deliverable Title & Project</th>
                  <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Assignee(s)</th>
                  <th style={{ minWidth: '135px', whiteSpace: 'nowrap' }}>Scheduled Date & Time</th>
                  <th style={{ minWidth: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>Priority</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Status & Progress</th>
                  <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>Managerial Interventions (FC 10)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(t => {
                  const isDone = t.status === 'Done';
                  const isOnHold = t.status === 'On Hold';
                  const isCancelled = t.status === 'Cancelled';
                  const canReopen = isDone || isOnHold || isCancelled;

                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Project: {t.project || 'General Operations'} • {t.department}
                        </div>
                        {t.holdReason && (
                          <div style={{ fontSize: '0.68rem', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                            ⏸️ Hold: {t.holdReason}
                          </div>
                        )}
                        {t.escalationReason && (
                          <div style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                            🚨 Escalated to {t.escalatedTo || 'Senior Leadership'}: {t.escalationReason}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {t.assignees.map(a => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: '#e2e8f0',
                                color: '#1e293b',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {a.avatar || a.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{t.scheduledDate}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>{t.time}</div>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          color: isDone ? '#16a34a' : isOnHold ? '#d97706' : t.status === 'Escalated' ? '#dc2626' : '#2563eb'
                        }}>
                          {t.status}
                        </span>
                        {t.progressPercent !== undefined && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            Progress: {t.progressPercent}%
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              const newTime = prompt('Modify task scheduled time:', t.time);
                              if (newTime) updateTask(t.id, { time: newTime }, 'Admin modified task time');
                            }}
                          >
                            Modify
                          </button>

                          {canReopen ? (
                            <button
                              className="btn-primary"
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.7rem',
                                background: '#1e40af',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={() => {
                                setTaskToReopen(t);
                                setReopenReason('');
                              }}
                              title="Reopen task with mandatory management justification (FC 10)"
                            >
                              <RotateCcw size={12} />
                              Reopen
                            </button>
                          ) : (
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                              onClick={() => {
                                setTaskToReopen(t);
                                setReopenReason('');
                              }}
                              title="Administrative Reopen Intervention"
                            >
                              <RotateCcw size={11} />
                              Reopen
                            </button>
                          )}

                          {/* Delete Deliverable (Strictly CEO Mr. Sukh Sagar Singh Bhati Only) */}
                          {isCeo && (
                            <button
                              className="btn-secondary btn-delete-task"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem', color: '#dc2626', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => {
                                if (window.confirm(`CEO Action: Are you sure you want to permanently delete "${t.title}"?`)) {
                                  deleteTask(t.id);
                                }
                              }}
                              title="Delete Deliverable (CEO Sukh Sagar ji Only)"
                            >
                              <Trash2 size={12} color="#dc2626" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTasks.length === 0 && (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                No tasks match the selected monitoring filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Create Employee Login / Direct Invitation (FC 9) */}
      {activeTab === 'create_user' && (
        <div className="admin-create-account-container">
          {/* Left Column: Form Card */}
          <div className="admin-form-card">
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={18} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Direct Employee Account Provisioning (Flowchart 9)
                  </h3>
                  <p style={{ fontSize: '0.73rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    HR & Talent Operations synchronize formal employee accounts to MongoDB Atlas.
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                Atlas Synced
              </span>
            </div>

            {inviteSuccessMsg && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>{inviteSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="admin-form-grid-2col">
                {/* Full Legal Name */}
                <div className="form-field-group">
                  <label className="form-field-label">Full Legal Name *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><User size={15} /></span>
                    <input
                      type="text"
                      className="form-input admin-input-with-icon"
                      required
                      autoComplete="off"
                      placeholder="e.g. Vikramaditya Sen"
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Official Corporate Email */}
                <div className="form-field-group">
                  <label className="form-field-label">Official Corporate Email *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Mail size={15} /></span>
                    <input
                      type="email"
                      className="form-input admin-input-with-icon"
                      required
                      autoComplete="off"
                      placeholder="name@urbangaon.com"
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div className="form-field-group">
                  <label className="form-field-label">Mobile Phone Number</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Phone size={15} /></span>
                    <input
                      type="tel"
                      className="form-input admin-input-with-icon"
                      autoComplete="off"
                      placeholder="+91 98765 00000"
                      value={newUserPhone}
                      onChange={e => setNewUserPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Master Department (Strict 7 Depts) */}
                <div className="form-field-group">
                  <label className="form-field-label">Master Department *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Building size={15} /></span>
                    <select
                      className="form-select admin-input-with-icon"
                      required
                      value={newUserDept}
                      onChange={e => setNewUserDept(e.target.value)}
                    >
                      <option value="" disabled>-- Select Master Department * --</option>
                      {(systemConfig?.masterLists?.departments || [
                        'Civil',
                        'Sales',
                        'AI & IT',
                        'Talent',
                        'Purchase',
                        'Legal',
                        'Accounts'
                      ]).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Official Designation */}
                <div className="form-field-group">
                  <label className="form-field-label">Official Designation *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Briefcase size={15} /></span>
                    <input
                      type="text"
                      className="form-input admin-input-with-icon"
                      required
                      autoComplete="off"
                      placeholder="e.g. Senior Project Manager"
                      value={newUserDesignation}
                      onChange={e => setNewUserDesignation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Initial Access Role Tier */}
                <div className="form-field-group">
                  <label className="form-field-label">Initial Access Role Tier *</label>
                  <div className="admin-input-wrapper">
                    <span className="admin-input-icon"><Shield size={15} /></span>
                    <select
                      className="form-select admin-input-with-icon"
                      required
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value as 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | '')}
                    >
                      <option value="" disabled>-- Select Initial Access Role Tier * --</option>
                      <option value="EMPLOYEE">Employee / Staff (Daily Register & Deliverables)</option>
                      <option value="MANAGER">Reporting Manager (Team Rebalancing & Escalations)</option>
                      <option value="ADMIN">Admin / Talent HR (People Ops & Company Oversight)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Default Password Credential Notice */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{ background: '#e0e7ff', padding: '0.4rem', borderRadius: '6px', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={16} />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#334155', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 800, color: '#1e293b' }}>Default Credentials Provisioned: </span>
                  New account is automatically enabled with universal initial password <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, color: '#0f172a' }}>123</code>. The employee can sign in immediately through the <strong>Sign In</strong> modal.
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingUser}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.55rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.82rem'
                  }}
                >
                  <Send size={14} />
                  {isSubmittingUser ? 'Synchronizing with Database...' : 'Create Account & Dispatch Welcome Credentials'}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserPhone('');
                    setNewUserDept('');
                    setNewUserDesignation('');
                    setNewUserRole('');
                  }}
                  style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
                >
                  Reset Form
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Interactive Digital ID Card & Headcount Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Live Employee ID Card Preview */}
            <div className="corporate-id-badge-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                    UrbanGaon Corporate ID
                  </span>
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  ● Ready to Sync
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.1rem' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  flexShrink: 0
                }}>
                  {newUserName.trim()
                    ? newUserName.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
                    : 'UG'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {newUserName.trim() || 'Employee Full Name'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#93c5fd', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {newUserDesignation.trim() || 'Designation'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(255,255,255,0.12)', padding: '2px 7px', borderRadius: '4px', color: '#f1f5f9' }}>
                      {newUserDept || 'Unassigned Dept'}
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.3)', padding: '2px 7px', borderRadius: '4px', color: '#bfdbfe' }}>
                      {newUserRole || 'Role Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ color: '#94a3b8' }}>Corporate Email:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                    {newUserEmail.trim() || 'name@urbangaon.com'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ color: '#94a3b8' }}>Phone:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {newUserPhone.trim() || '+91 ••••• •••••'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  <span style={{ color: '#94a3b8' }}>Access Authority:</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                    {newUserRole === 'ADMIN' ? 'Full Admin & Talent HR' : newUserRole === 'MANAGER' ? 'Reporting Manager' : newUserRole === 'EMPLOYEE' ? 'Staff Deliverables' : 'Pending Selection'}
                  </span>
                </div>
              </div>
            </div>

            {/* Department Headcount Breakdown */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={15} color="#2563eb" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                    Master Department Headcounts
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>
                  {activeMembers.length} Active Staff
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                {[
                  'Civil',
                  'Sales',
                  'AI & IT',
                  'Talent',
                  'Purchase',
                  'Legal',
                  'Accounts'
                ].map(dept => {
                  const count = activeMembers.filter(m => m.department?.toLowerCase() === dept.toLowerCase()).length;
                  const isCurrentSelected = newUserDept.toLowerCase() === dept.toLowerCase();
                  return (
                    <div
                      key={dept}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        background: isCurrentSelected ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${isCurrentSelected ? '#bfdbfe' : '#e2e8f0'}`,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setNewUserDept(dept)}
                      title={`Click to set department to ${dept}`}
                    >
                      <span style={{ fontWeight: isCurrentSelected ? 800 : 600, color: isCurrentSelected ? '#1d4ed8' : '#334155' }}>
                        {dept}
                      </span>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        background: isCurrentSelected ? '#2563eb' : '#e2e8f0',
                        color: isCurrentSelected ? '#ffffff' : '#475569',
                        padding: '1px 6px',
                        borderRadius: '999px'
                      }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Sign-Up Approvals Queue (FC 2 & 3) */}
      {activeTab === 'pending_approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Review self-registration requests from new staff. Approving a request creates their active MongoDB Atlas credentials and generates their permanent employee ID.
          </div>

          {approvalBanner && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
              {approvalBanner}
            </div>
          )}

          {pendingRequests.length > 0 ? (
            <div className="enterprise-table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>Applicant Details</th>
                    <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Department & Designation</th>
                    <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Designated Manager</th>
                    <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Applied Timestamp</th>
                    <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>HR Verification Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(req => (
                    <tr key={req.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700 }}>{req.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>{req.email}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{req.phone}</div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{req.department}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{req.designation}</div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600 }}>{req.manager}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{req.appliedAt}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}>
                          <button
                            className="btn-success"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            onClick={() => handleApproveRequest(req)}
                          >
                            <Check size={13} />
                            Approve (Create Account)
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            onClick={() => handleRejectRequest(req.id, req.name)}
                          >
                            <X size={13} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                No Pending Applicant Approvals
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '420px', lineHeight: 1.45 }}>
                All staff accounts are currently verified, provisioned, and active in MongoDB Atlas. When new employees submit registration requests, they will appear here for HR review.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Deactivation & Mandatory Handover (FC 18) */}
      {activeTab === 'deactivation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Info Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Flowchart 18 Enforced
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b' }}>
                  Zero-Orphan Task Governance • MongoDB Atlas Integrated
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#7f1d1d', margin: 0 }}>
                Account Deactivation & Mandatory Task Handover
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#78350f', margin: '0.35rem 0 0 0', maxWidth: '750px' }}>
                Under UrbanGaon standard operating procedures, employees leaving or transitioning cannot be suspended with orphaned deliverables. All active commitments are atomically reallocated to an active successor and credentials are permanently blocked from login.
              </p>
            </div>
            <div style={{
              background: '#ffffff',
              border: '1px solid #fed7aa',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>
                Active Roster / Offboarded
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b' }}>
                {activeMembers.length} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Active</span> • {members.filter(m => m.status === 'DEACTIVATED').length} <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 500 }}>Deactivated</span>
              </div>
            </div>
          </div>



          {/* Error Notification Alert */}
          {deactivationError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#991b1b' }}>
                    Execution Blocked
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '3px' }}>
                    {deactivationError}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDeactivationError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 700, fontSize: '0.85rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* 2-Column Handover Cockpit */}
          <div className="admin-handover-cockpit">
            {/* Column 1: Handover Form Controls */}
            <div className="admin-cockpit-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <UserX size={18} color="#dc2626" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Step 1 & 2: Offboarding Parameters
                </h4>
              </div>

              <form onSubmit={handleConfirmDeactivation} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {/* 1. Employee to Deactivate */}
                <div className="form-field-group">
                  <label className="form-field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>1. Employee to Deactivate / Offboard</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Select departing staff</span>
                  </label>
                  <select
                    className="form-select"
                    value={departingMember?.id || ''}
                    onChange={e => {
                      setDepartingMemberId(e.target.value);
                      setDeactivationError(null);
                    }}
                    style={{ fontWeight: 600, width: '100%', boxSizing: 'border-box' }}
                  >
                    {offboardableMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        👤 {m.name} — {m.designation} ({m.department})
                      </option>
                    ))}
                    {offboardableMembers.length === 0 && (
                      <option value="" disabled>No active employees available for offboarding</option>
                    )}
                  </select>

                  {/* Departing Profile Card */}
                  {departingMember && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: isCeoUser(departingMember) ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${isCeoUser(departingMember) ? '#fecaca' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: '1 1 200px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: '#dc2626',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          flexShrink: 0
                        }}>
                          {departingMember.avatar || departingMember.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {departingMember.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {departingMember.email} • {departingMember.department}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: departingMember.status === 'DEACTIVATED' ? '#fee2e2' : '#dcfce7',
                          color: departingMember.status === 'DEACTIVATED' ? '#991b1b' : '#166534'
                        }}>
                          {departingMember.status}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>
                          {departingActiveTasks.length} in-flight tasks
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Mandatory Successor */}
                <div className="form-field-group">
                  <label className="form-field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>2. Mandatory Successor / Handover Recipient</span>
                    <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>Will receive all active tasks</span>
                  </label>
                  <select
                    className="form-select"
                    value={successorMember?.id || ''}
                    onChange={e => {
                      setSuccessorMemberId(e.target.value);
                      setDeactivationError(null);
                    }}
                    style={{ fontWeight: 600, width: '100%', boxSizing: 'border-box' }}
                  >
                    {activeMembers
                      .filter(m => m.id !== departingMember?.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          🎯 {m.name} — {m.designation} ({m.department})
                        </option>
                      ))}
                  </select>

                  {/* Successor Profile Card */}
                  {successorMember && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: '1 1 200px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: '#16a34a',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          flexShrink: 0
                        }}>
                          {successorMember.avatar || successorMember.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {successorMember.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {successorMember.email} • {successorMember.department}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#dcfce7',
                          color: '#166534'
                        }}>
                          ACTIVE SUCCESSOR
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, marginTop: '2px' }}>
                          +{departingActiveTasks.length} transferred
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Deactivation Reason */}
                <div className="form-field-group">
                  <label className="form-field-label">3. Official Deactivation Reason</label>
                  <select
                    className="form-select"
                    value={deactivationReason}
                    onChange={e => setDeactivationReason(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="Resignation / Voluntary Transition">Resignation / Voluntary Transition</option>
                    <option value="Role Reassignment / Internal Transfer">Role Reassignment / Internal Transfer</option>
                    <option value="Extended Maternity / Sabbatical Leave">Extended Maternity / Sabbatical Leave</option>
                    <option value="Administrative Termination / Separation">Administrative Termination / Separation</option>
                    <option value="Contract Expiration">Contract Expiration</option>
                  </select>
                </div>

                {/* 4. Transition Notes */}
                <div className="form-field-group">
                  <label className="form-field-label">4. Handover Notes & Remarks (Logged to Audit Trail)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Handover approved by HR; client deliverables shifted to Tech Lead"
                    value={handoverNotes}
                    onChange={e => setHandoverNotes(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Safety Checkbox */}
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  fontSize: '0.76rem',
                  color: '#334155',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <input
                    type="checkbox"
                    checked={handoverAcknowledged}
                    onChange={e => setHandoverAcknowledged(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span>
                    I confirm that all <strong>{departingActiveTasks.length}</strong> active deliverable(s) will be atomically transferred to <strong>{successorMember?.name || 'the successor'}</strong>, and <strong>{departingMember?.name || 'the employee'}</strong>&apos;s account will be revoked in MongoDB Atlas (Flowchart 18).
                  </span>
                </label>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isDeactivating || isCeoUser(departingMember) || !handoverAcknowledged || departingMember?.id === successorMember?.id}
                  style={{
                    background: (isDeactivating || isCeoUser(departingMember) || !handoverAcknowledged || departingMember?.id === successorMember?.id) ? '#94a3b8' : '#dc2626',
                    cursor: (isDeactivating || isCeoUser(departingMember) || !handoverAcknowledged || departingMember?.id === successorMember?.id) ? 'not-allowed' : 'pointer',
                    padding: '0.75rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    width: '100%',
                    marginTop: '0.25rem'
                  }}
                >
                  {isDeactivating ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      <span>Reassigning Tasks & Deactivating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserX size={15} />
                      <span>Reassign {departingActiveTasks.length} Tasks & Deactivate Account</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Column 2: Live Deliverables Manifest Preview */}
            <div className="admin-cockpit-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={18} color="#2563eb" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    In-Flight Deliverables Manifest
                  </h4>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: departingActiveTasks.length > 0 ? '#fef3c7' : '#dcfce7',
                  color: departingActiveTasks.length > 0 ? '#92400e' : '#166534'
                }}>
                  {departingActiveTasks.length} Deliverable(s)
                </span>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Live snapshot of active tasks currently assigned to <strong>{departingMember?.name || 'Selected Employee'}</strong> that will be reallocated to <strong>{successorMember?.name || 'Successor'}</strong>.
              </p>

              {/* Task Manifest List */}
              <div className="admin-manifest-scroll">
                {departingActiveTasks.map(t => (
                  <div
                    key={t.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.75rem 0.85rem',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: t.priority === 'URGENT' ? '#fee2e2' : t.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                        color: t.priority === 'URGENT' ? '#991b1b' : t.priority === 'HIGH' ? '#9a3412' : '#475569'
                      }}>
                        {t.priority}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} /> {t.time} • {t.scheduledDate}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                      {t.title}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.7rem',
                      color: '#64748b',
                      borderTop: '1px dashed #cbd5e1',
                      paddingTop: '0.4rem',
                      marginTop: '0.2rem'
                    }}>
                      <span>{t.department} • {t.project || 'General'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <span style={{ color: '#dc2626' }}>{departingMember?.avatar || 'SRC'}</span>
                        <ArrowRight size={11} color="#64748b" />
                        <span style={{ color: '#16a34a' }}>{successorMember?.avatar || 'DST'}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {departingActiveTasks.length === 0 && (
                  <div style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: '#f0fdf4',
                    border: '1px dashed #86efac',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle2 size={28} color="#16a34a" />
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
                      Clean Handover Ledger
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#15803d', maxWidth: '300px' }}>
                      <strong>{departingMember?.name || 'This employee'}</strong> has 0 in-flight deliverables. Account deactivation will revoke credentials and preserve historical audit logs without pending task reallocation.
                    </div>
                  </div>
                )}
              </div>

              {/* Protocol Footer */}
              <div style={{
                borderTop: '1px solid #f1f5f9',
                paddingTop: '0.75rem',
                fontSize: '0.7rem',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Shield size={13} color="#94a3b8" />
                <span>Audited per ISO/IEC 27001 Access Control & Offboarding Policy</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Official Company Holidays (Flowchart 23 & FY 2026-27 Master List) */}
      {activeTab === 'holidays' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: 'clamp(1rem, 2.5vw, 1.5rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Official Document Header */}
          <div style={{
            borderBottom: '2px solid #2563eb',
            paddingBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏢</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  UrbanGaon Holidays for Financial Year 2026-27
                </h3>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                Official Enterprise Holiday Register • Enforcing Flowcharts 13 & 23 (Automated Reminder & Action Suppression)
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: '#dcfce7',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Check size={14} /> Synced with Calendar & Email Engine
              </span>
            </div>
          </div>

          {/* Policy Guidance Alert */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #2563eb',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            fontSize: '0.78rem',
            color: '#334155',
            lineHeight: 1.5,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <strong>Automated Governance Rule:</strong> On all 8 official company holidays and every <strong>Sunday (Weekly Off)</strong>, the system automatically suppresses all morning reminder email dispatches, forward actions, and task delay alerts. No spam or confusion for employees during holidays.
          </div>

          {/* Official Table */}
          <div className="enterprise-table-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
            <table className="enterprise-table" style={{ width: '100%', minWidth: '580px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '8%', minWidth: '45px', whiteSpace: 'nowrap' }}>S.NO</th>
                  <th style={{ textAlign: 'left', width: '22%', minWidth: '125px', whiteSpace: 'nowrap' }}>Date Of Holidays</th>
                  <th style={{ textAlign: 'left', width: '32%', minWidth: '150px' }}>Name Of Holidays</th>
                  <th style={{ textAlign: 'center', width: '16%', minWidth: '90px', whiteSpace: 'nowrap' }}>No Of Holidays</th>
                  <th style={{ textAlign: 'left', width: '22%', minWidth: '165px', whiteSpace: 'nowrap' }}>System Action Status</th>
                </tr>
              </thead>
              <tbody>
                {OFFICIAL_HOLIDAYS_2026_27.map(h => (
                  <tr key={h.sNo}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                      {h.sNo}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {h.displayDate}
                    </td>
                    <td style={{ color: '#1e293b', fontWeight: 600 }}>
                      <span style={{ marginRight: '6px' }}>{h.icon}</span>
                      {h.name}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {h.days}
                    </td>
                    <td>
                      <span style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>⏸️</span> Auto-Paused (Zero Dispatches)
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={3} style={{ textAlign: 'right', color: '#0f172a' }}>
                    Total:
                  </td>
                  <td style={{ textAlign: 'center', color: '#2563eb', fontSize: '0.95rem' }}>
                    08
                  </td>
                  <td style={{ color: '#059669', fontSize: '0.75rem' }}>
                    ✓ 100% Policy Synchronized
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Signatures & Approvals (As in Original Document) */}
          <div className="admin-holiday-signatures">
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                Prepared By
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                Varun Mudgal
              </div>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                Manager - Talent
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                Approved By
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                Mr. Sukh Sagar Singh
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                Founder / CEO (UrbanGaon)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Reopen Task Modal (Flowchart 10 Governance) */}
      {taskToReopen && (
        <div className="stream-overlay" onClick={() => setTaskToReopen(null)}>
          <div className="stream-modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={18} color="#1e40af" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Administrative Task Reopen (Flowchart 10)
                </h3>
              </div>
              <button className="calendar-nav-btn" onClick={() => setTaskToReopen(null)}><X size={16} /></button>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a' }}>
                {taskToReopen.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#3b82f6', marginTop: '2px' }}>
                Current Status: <strong>{taskToReopen.status}</strong> • Assignees: {taskToReopen.assignees.map(a => a.name).join(', ')}
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.4 }}>
              As per UrbanGaon enterprise governance, reopening a completed, held, or cancelled task changes its status to <strong>In Progress (50%)</strong> and creates an immutable entry in the audit trail.
            </p>

            <form onSubmit={handleConfirmReopen} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Mandatory Management Justification *</label>
                <textarea
                  className="form-input"
                  required
                  rows={3}
                  placeholder="e.g. Scope revised: deliverable requires QA sign-off and multi-region deployment verification."
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTaskToReopen(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={14} />
                  Confirm Administrative Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
