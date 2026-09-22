'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { TeamMember, Task } from '@/types';
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
  Send
} from 'lucide-react';

export const AdminHrPortal: React.FC = () => {
  const { members, tasks, updateTask } = useApp();

  const [activeTab, setActiveTab] = useState<'oversight' | 'create_user' | 'pending_approvals' | 'deactivation'>('oversight');
  const [selectedUserForOversight, setSelectedUserForOversight] = useState<string>(members[1].name); // default Alex Rivera
  
  // Direct Invite Form state (FC 9)
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserDept, setNewUserDept] = useState('DevOps & DB');
  const [newUserDesignation, setNewUserDesignation] = useState('Cloud Operations Engineer');
  const [inviteSentBanner, setInviteSentBanner] = useState(false);

  // Deactivation Handover state (FC 18)
  const [userToDeactivate, setUserToDeactivate] = useState<string>(members[1].name);
  const [handoverSuccessBanner, setHandoverSuccessBanner] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<string>(members[0].name);

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

  const targetOversightMember = members.find(m => m.name === selectedUserForOversight) || members[1];
  const userTasks = tasks.filter(t => t.assignees.some(a => a.name.toLowerCase().includes(targetOversightMember.name.toLowerCase())));

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSentBanner(true);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setTimeout(() => setInviteSentBanner(false), 4000);
  };

  const handleApproveRequest = (id: string, name: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    alert(`Account approved for ${name}. Employee ID generated and welcome activation link dispatched!`);
  };

  const handleRejectRequest = (id: string, name: string) => {
    const reason = prompt(`Enter mandatory written rejection reason for ${name}:`);
    if (reason) {
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      alert(`Request rejected. Formal rejection email with explanation dispatched to applicant.`);
    }
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
              Admin & Talent HR Operations Center (FC 1 to 10)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Employee onboarding, direct invitations, multi-staff task oversight, and deactivation handovers
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn-secondary ${activeTab === 'oversight' ? 'active' : ''}`}
            onClick={() => setActiveTab('oversight')}
            style={{ fontWeight: activeTab === 'oversight' ? 700 : 500 }}
          >
            User Oversight (FC 10)
          </button>
          <button
            className={`btn-secondary ${activeTab === 'create_user' ? 'active' : ''}`}
            onClick={() => setActiveTab('create_user')}
            style={{ fontWeight: activeTab === 'create_user' ? 700 : 500 }}
          >
            Direct Invite (FC 9)
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

      {/* Tab 1: User Oversight via Dropdown (FC 10) */}
      {activeTab === 'oversight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af' }}>
                SELECT EMPLOYEE FOR DIRECT OVERSIGHT:
              </span>
              <select
                className="form-select"
                style={{ minWidth: '260px', fontWeight: 700 }}
                value={selectedUserForOversight}
                onChange={e => setSelectedUserForOversight(e.target.value)}
              >
                {members.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} — {m.designation} ({m.totalTasks} Tasks)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
              <span>Department: <strong>{targetOversightMember.department}</strong></span>
              <span>Status: <strong style={{ color: '#15803d' }}>{targetOversightMember.status}</strong></span>
              <span>Velocity: <strong style={{ color: '#2563eb' }}>{targetOversightMember.velocity}%</strong></span>
            </div>
          </div>

          <div className="enterprise-table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Scheduled Date & Time</th>
                  <th>Priority</th>
                  <th>Live Status</th>
                  <th>Managerial Interventions (FC 10)</th>
                </tr>
              </thead>
              <tbody>
                {userTasks.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Project: {t.project || 'General'}</div>
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
                      <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{t.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={() => {
                            const newTime = prompt('Modify task time:', t.time);
                            if (newTime) updateTask(t.id, { time: newTime }, 'Admin modified task time');
                          }}
                        >
                          Modify
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={() => {
                            const reason = prompt('Mandatory reason for administrative reopen:');
                            if (reason) updateTask(t.id, { status: 'In Progress' }, `Admin Reopen: ${reason}`);
                          }}
                        >
                          Reopen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Create Employee Login / Direct Invitation (FC 9) */}
      {activeTab === 'create_user' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem', maxWidth: '640px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>
            Direct Employee Invitation (Flowchart 9)
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem' }}>
            HR officers create accounts directly. The system generates secure one-time invitation credentials and sends an automated welcome email.
          </p>

          {inviteSentBanner && (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
              ✓ Official welcome email and one-time password link successfully dispatched to employee!
            </div>
          )}

          <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-field-group">
              <label className="form-field-label">Full Legal Name</label>
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
              <label className="form-field-label">Official Corporate Email</label>
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
                  value={newUserDesignation}
                  onChange={e => setNewUserDesignation(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>
              <Send size={14} />
              Generate Credentials & Dispatch Invite Link
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Sign-Up Approvals Queue (FC 2 & 3) */}
      {activeTab === 'pending_approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Review self-registration requests from new staff. All accounts require explicit HR verification to eliminate rogue registrations.
          </div>

          <div className="enterprise-table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Applicant Details</th>
                  <th>Department & Designation</th>
                  <th>Reporting Manager</th>
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
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                          onClick={() => handleApproveRequest(req.id, req.name)}
                        >
                          <Check size={13} />
                          Approve (Assign ID)
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: '#dc2626' }}
                          onClick={() => handleRejectRequest(req.id, req.name)}
                        >
                          <X size={13} />
                          Reject with Reason
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pendingRequests.length === 0 && (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#15803d', fontWeight: 600 }}>
                ✓ No pending applicant approvals. All requests resolved!
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
              ✓ All 4 deliverables smoothly handed over to {handoverTarget}. Employee credentials securely deactivated.
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
    </div>
  );
};
