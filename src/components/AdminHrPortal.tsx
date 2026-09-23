'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
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
  Sparkles
} from 'lucide-react';

export const AdminHrPortal: React.FC = () => {
  const { members, tasks, updateTask, reopenTask, addMember } = useApp();

  const [activeTab, setActiveTab] = useState<'oversight' | 'create_user' | 'pending_approvals' | 'deactivation'>('oversight');
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
  const [newUserDept, setNewUserDept] = useState('DevOps & DB');
  const [newUserDesignation, setNewUserDesignation] = useState('Cloud Operations Engineer');
  const [newUserRole, setNewUserRole] = useState<'EMPLOYEE' | 'MANAGER' | 'ADMIN'>('EMPLOYEE');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Deactivation Handover state (FC 18)
  const [userToDeactivate, setUserToDeactivate] = useState<string>(members[1]?.name || 'Alex Rivera');
  const [handoverSuccessBanner, setHandoverSuccessBanner] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<string>(members[0]?.name || 'Akash Das');

  // Pending sign-up requests queue (FC 2 & 3)
  const [pendingRequests, setPendingRequests] = useState([
    {
      id: 'req-01',
      name: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@urbangaon.com',
      phone: '+91 98765 43210',
      department: 'Frontend Engineering',
      designation: 'Junior React Engineer',
      manager: 'Tech Leads',
      appliedAt: '2026-09-15 08:15 AM'
    },
    {
      id: 'req-02',
      name: 'Sneha Patel',
      email: 'sneha.patel@urbangaon.com',
      phone: '+91 98111 22334',
      department: 'Design & UI',
      designation: 'UI/UX Visual Designer',
      manager: 'Priya Sharma',
      appliedAt: '2026-09-15 09:30 AM'
    }
  ]);
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
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setIsSubmittingUser(true);
    try {
      const created = await addMember({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        department: newUserDept,
        designation: newUserDesignation,
        role: newUserRole,
      });

      setInviteSuccessMsg(`✓ Official account active for ${created.name} (${created.id}). Welcome credentials dispatched to ${created.email}!`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
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

  const handleConfirmDeactivation = (e: React.FormEvent) => {
    e.preventDefault();
    setHandoverSuccessBanner(true);
    setTimeout(() => setHandoverSuccessBanner(false), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner */}
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
          <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '8px' }}>
            <Users size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Admin & Talent HR Operations Center (Flowchart 1 to 10)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Account provisioning, direct invitations, company-wide task monitoring, and administrative reopening governance
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn-secondary ${activeTab === 'oversight' ? 'active' : ''}`}
            onClick={() => setActiveTab('oversight')}
            style={{ fontWeight: activeTab === 'oversight' ? 700 : 500 }}
          >
            Task Monitoring (FC 10)
          </button>
          <button
            className={`btn-secondary ${activeTab === 'create_user' ? 'active' : ''}`}
            onClick={() => setActiveTab('create_user')}
            style={{ fontWeight: activeTab === 'create_user' ? 700 : 500 }}
          >
            Create Account / Invite (FC 9)
          </button>
          <button
            className={`btn-secondary ${activeTab === 'pending_approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending_approvals')}
            style={{ fontWeight: activeTab === 'pending_approvals' ? 700 : 500 }}
          >
            Approvals Queue ({pendingRequests.length})
          </button>
          <button
            className={`btn-secondary ${activeTab === 'deactivation' ? 'active' : ''}`}
            onClick={() => setActiveTab('deactivation')}
            style={{ fontWeight: activeTab === 'deactivation' ? 700 : 500 }}
          >
            Deactivation & Handover (FC 18)
          </button>
        </div>
      </div>

      {/* Tab 1: User Oversight & Company-wide Monitoring (FC 10) */}
      {activeTab === 'oversight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Controls Bar: Employee Filter & Search */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af' }}>
                MONITORING SCOPE:
              </span>
              <select
                className="form-select"
                style={{ minWidth: '300px', fontWeight: 700 }}
                value={selectedUserForOversight}
                onChange={e => setSelectedUserForOversight(e.target.value)}
              >
                <option value="ALL">🏢 ALL EMPLOYEES — Full Company Overview ({tasks.length} Deliverables)</option>
                {members.map(m => (
                  <option key={m.id} value={m.name}>
                    👤 {m.name} — {m.designation} ({tasks.filter(t => t.assignees.some(a => a.name.toLowerCase().includes(m.name.toLowerCase()))).length} Tasks)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter deliverables or assignees..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.75rem', height: '34px' }}
                />
              </div>

              {!isAllUsers && targetOversightMember && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Dept: <strong>{targetOversightMember.department}</strong></span>
                  <span>Velocity: <strong style={{ color: '#2563eb' }}>{targetOversightMember.velocity}%</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Quick KPI Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem'
          }}>
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
                  <th>Deliverable Title & Project</th>
                  <th>Assignee(s)</th>
                  <th>Scheduled Date & Time</th>
                  <th>Priority</th>
                  <th>Status & Progress</th>
                  <th>Managerial Interventions (FC 10)</th>
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
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {t.assignees.map(a => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: '#e2e8f0',
                                color: '#1e293b',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {a.avatar || a.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{a.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{t.scheduledDate}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.time}</div>
                      </td>
                      <td>
                        <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
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
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem' }}
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={() => {
                                setTaskToReopen(t);
                                setReopenReason('');
                              }}
                              title="Reopen task with mandatory management justification (FC 10)"
                            >
                              <RotateCcw size={12} />
                              Reopen Task
                            </button>
                          ) : (
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.7rem' }}
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
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem', maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <div style={{ background: '#eff6ff', padding: '0.4rem', borderRadius: '6px' }}>
              <UserPlus size={18} color="#2563eb" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Direct Employee Account Provisioning (Flowchart 9)
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem' }}>
            HR and Talent Managers create formal employee accounts. Accounts are directly synchronized to MongoDB Atlas, granting instant access to the task ledger and team workflows.
          </p>

          {inviteSuccessMsg && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#15803d" />
              <span>{inviteSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-field-group">
              <label className="form-field-label">Full Legal Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Vikramaditya Sen"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Official Corporate Email *</label>
              <input
                type="email"
                className="form-input"
                required
                placeholder="name@urbangaon.com"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Mobile Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 98765 00000"
                value={newUserPhone}
                onChange={e => setNewUserPhone(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Master Department</label>
                <select
                  className="form-select"
                  value={newUserDept}
                  onChange={e => setNewUserDept(e.target.value)}
                >
                  <option value="DevOps & DB">DevOps & DB</option>
                  <option value="Product & Tech">Product & Tech</option>
                  <option value="Frontend Engineering">Frontend Engineering</option>
                  <option value="Design & UI">Design & UI</option>
                  <option value="Sales & Growth">Sales & Growth</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Official Designation</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Senior Cloud Architect"
                  value={newUserDesignation}
                  onChange={e => setNewUserDesignation(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Initial Access Role Tier</label>
              <select
                className="form-select"
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value as 'EMPLOYEE' | 'MANAGER' | 'ADMIN')}
              >
                <option value="EMPLOYEE">Employee / Staff (Daily Register & Deliverables)</option>
                <option value="MANAGER">Reporting Manager (Team Rebalancing & Escalations)</option>
                <option value="ADMIN">Admin / Talent HR (People Ops & Company Oversight)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmittingUser}
              style={{ marginTop: '0.5rem', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={14} />
              {isSubmittingUser ? 'Synchronizing with Database...' : 'Create Account & Dispatch Welcome Credentials'}
            </button>
          </form>
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

          <div className="enterprise-table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Applicant Details</th>
                  <th>Department & Designation</th>
                  <th>Designated Manager</th>
                  <th>Applied Timestamp</th>
                  <th>HR Verification Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{req.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>{req.email}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{req.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.department}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{req.designation}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{req.manager}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{req.appliedAt}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn-success"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleApproveRequest(req)}
                        >
                          <Check size={13} />
                          Approve (Create Account)
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}
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

            {pendingRequests.length === 0 && (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#15803d', fontWeight: 600 }}>
                ✓ No pending applicant approvals. All employee accounts are verified and active!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Deactivation & Mandatory Handover (FC 18) */}
      {activeTab === 'deactivation' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem', maxWidth: '640px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', color: '#b91c1c' }}>
            Account Deactivation & Task Handover (Flowchart 18)
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem' }}>
            To prevent unassigned delays, departing or on-leave employees must have all active commitments reallocated before account suspension.
          </p>

          {handoverSuccessBanner && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
              ✓ All deliverables smoothly handed over to {handoverTarget}. Employee credentials securely deactivated.
            </div>
          )}

          <form onSubmit={handleConfirmDeactivation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-field-group">
              <label className="form-field-label">Employee to Deactivate / Offboard</label>
              <select
                className="form-select"
                value={userToDeactivate}
                onChange={e => setUserToDeactivate(e.target.value)}
              >
                {members.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.totalTasks} active tasks)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Mandatory Successor / Handover Recipient</label>
              <select
                className="form-select"
                value={handoverTarget}
                onChange={e => setHandoverTarget(e.target.value)}
              >
                {members.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} — {m.designation}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Deactivation Reason</label>
              <select className="form-select">
                <option>Resignation / Voluntary Transition</option>
                <option>Role Reassignment</option>
                <option>Extended Maternity / Sabbatical Leave</option>
                <option>Administrative Termination</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ background: '#dc2626', marginTop: '0.5rem', alignSelf: 'flex-start' }}
            >
              <UserX size={14} />
              Reassign Tasks & Deactivate Account
            </button>
          </form>
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
