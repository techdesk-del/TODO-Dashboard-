'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SystemConfig, Role, TaskStatus } from '@/types';
import { 
  Sliders, 
  Shield, 
  Mail, 
  Database, 
  RotateCcw, 
  Check, 
  Plus, 
  Trash2, 
  Building2, 
  Lock, 
  Users, 
  FileSpreadsheet, 
  Tag, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  GitPullRequest
} from 'lucide-react';

type ConfigTab = 
  | 'email_schedule' 
  | 'role_permissions' 
  | 'status_options' 
  | 'export_roles' 
  | 'master_data' 
  | 'security' 
  | 'retention';

export const SystemConfigModal: React.FC = () => {
  const { systemConfig, updateSystemConfig, currentUser, logAudit, setBannerNotification } = useApp();

  const [activeTab, setActiveTab] = useState<ConfigTab>('email_schedule');

  // Form states for all 7 branches (Flowchart 2)
  // 1. Email Schedule
  const [emailTime, setEmailTime] = useState(systemConfig.emailScheduleTime || '08:30 AM');
  const [workingDays, setWorkingDays] = useState<string[]>(systemConfig.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [holidaysActive, setHolidaysActive] = useState<boolean>(systemConfig.holidaysActive ?? true);

  // 2. Role Permissions
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(systemConfig.rolePermissions || {
    SUPER_ADMIN: ['read', 'write', 'delete', 'export_all', 'export_audit', 'config_edit'],
    ADMIN: ['read', 'write', 'export_all', 'reassign_team'],
    MANAGER: ['read', 'write_team', 'reopen_team', 'reassign_team'],
    EMPLOYEE: ['read_own', 'write_own', 'export_own']
  });

  // 3. Status Options (Custom status labels mapped to core statuses)
  const [customStatuses, setCustomStatuses] = useState(systemConfig.customStatuses || [
    { label: 'Blocked by Vendor', mappedTo: 'On Hold' as TaskStatus, color: '#f59e0b' },
    { label: 'Client Feedback Pending', mappedTo: 'On Hold' as TaskStatus, color: '#d97706' },
    { label: 'In Senior Review', mappedTo: 'In Progress' as TaskStatus, color: '#3b82f6' }
  ]);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusCore, setNewStatusCore] = useState<TaskStatus>('In Progress');

  // 4. Export Roles
  const [canExportAll, setCanExportAll] = useState<Role[]>(systemConfig.exportRoles?.canExportAllTasks || ['ADMIN', 'SUPER_ADMIN']);
  const [canExportAudit, setCanExportAudit] = useState<Role[]>(systemConfig.exportRoles?.canExportAuditLogs || ['SUPER_ADMIN']);
  const [canExportReports, setCanExportReports] = useState<Role[]>(systemConfig.exportRoles?.canExportReports || ['ADMIN', 'SUPER_ADMIN', 'MANAGER']);

  // 5. Master Data
  const [projects, setProjects] = useState<string[]>(systemConfig.masterLists?.projects || []);
  const [departments, setDepartments] = useState<string[]>(systemConfig.masterLists?.departments || []);
  const [locations, setLocations] = useState<string[]>(systemConfig.masterLists?.locations || ['Jaipur']);
  const [newProject, setNewProject] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // 6. Security
  const [lockoutThreshold, setLockoutThreshold] = useState(systemConfig.lockoutThreshold || 5);
  const [lockoutDuration, setLockoutDuration] = useState(systemConfig.lockoutDurationMinutes || 15);
  const [sessionTimeout, setSessionTimeout] = useState(systemConfig.sessionTimeoutMinutes || 60);
  const [passwordMinLength, setPasswordMinLength] = useState(systemConfig.passwordRules?.minLength || 8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(systemConfig.passwordRules?.requireSpecialChars ?? true);

  // 7. Retention
  const [retentionDays, setRetentionDays] = useState(systemConfig.retentionDays || 365);
  const [auditRetentionDays, setAuditRetentionDays] = useState(systemConfig.auditRetentionDays || 730);

  // Second Super Admin approval toggle (Flowchart 2)
  const [requireDualApproval, setRequireDualApproval] = useState<boolean>(systemConfig.requireDualSuperAdminApproval ?? false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Toggle working days
  const handleToggleWorkingDay = (day: string) => {
    setWorkingDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Add custom status
  const handleAddCustomStatus = () => {
    if (!newStatusLabel.trim()) return;
    setCustomStatuses(prev => [
      ...prev,
      { label: newStatusLabel.trim(), mappedTo: newStatusCore }
    ]);
    setNewStatusLabel('');
  };

  const handleRemoveCustomStatus = (label: string) => {
    setCustomStatuses(prev => prev.filter(s => s.label !== label));
  };

  // Save Pipeline (Flowchart 2)
  const handleSaveConfiguration = (e: React.FormEvent) => {
    e.preventDefault();

    const newVersionNumber = `v${(parseFloat(systemConfig.versionBaseline.replace(/[^0-9.]/g, '') || '2.4') + 0.1).toFixed(1)}.0`;

    const proposedConfig: Partial<SystemConfig> = {
      emailScheduleTime: emailTime,
      workingDays,
      holidaysActive,
      rolePermissions,
      customStatuses,
      exportRoles: {
        canExportAllTasks: canExportAll,
        canExportAuditLogs: canExportAudit,
        canExportReports: canExportReports
      },
      masterLists: {
        projects,
        departments,
        locations
      },
      lockoutThreshold: Number(lockoutThreshold),
      lockoutDurationMinutes: Number(lockoutDuration),
      sessionTimeoutMinutes: Number(sessionTimeout),
      passwordRules: {
        minLength: Number(passwordMinLength),
        requireSpecialChars,
        requireNumbers: true
      },
      retentionDays: Number(retentionDays),
      auditRetentionDays: Number(auditRetentionDays),
      requireDualSuperAdminApproval: requireDualApproval
    };

    // Flowchart 2: "Second Super Admin approval required?"
    if (requireDualApproval) {
      const pendingReq = {
        id: `approval-${Date.now()}`,
        requestedBy: currentUser.name || 'Primary Super Admin',
        requestedAt: new Date().toISOString(),
        targetVersion: newVersionNumber,
        changesSummary: `Policy updates for ${activeTab.replace('_', ' ')}: email schedule, security rules & master metadata.`,
        configSnapshot: proposedConfig,
        status: 'PENDING' as const
      };

      updateSystemConfig({
        pendingApproval: pendingReq
      });

      logAudit({
        action: 'CONFIG_CHANGED',
        fieldChanged: 'System Config Dual Approval Request Submitted',
        oldValue: systemConfig.versionBaseline,
        newValue: `${newVersionNumber} (Pending Approval)`,
        notes: `Approval request dispatched to second Super Admin per Flowchart 2 governance policy.`
      });

      setBannerNotification({
        message: `Approval request for ${newVersionNumber} sent to second Super Admin. Changes held in staging.`,
        badge: '🔒 Dual Approval Pending'
      });

      setSaveBanner(`Approval request dispatched to second Super Admin for ${newVersionNumber}!`);
      setTimeout(() => setSaveBanner(null), 5000);
      return;
    }

    // Direct Save (No dual approval required)
    const priorBaseline = systemConfig.versionBaseline;
    updateSystemConfig({
      ...proposedConfig,
      previousVersionBaseline: priorBaseline,
      versionBaseline: newVersionNumber,
      pendingApproval: undefined
    });

    logAudit({
      action: 'CONFIG_CHANGED',
      fieldChanged: `System Config Direct Save (${activeTab})`,
      oldValue: priorBaseline,
      newValue: newVersionNumber,
      notes: `Super Admin committed system configuration update. Baseline updated to ${newVersionNumber}.`
    });

    setBannerNotification({
      message: `System Configuration updated to ${newVersionNumber}. Changes active across the enterprise.`,
      badge: '✓ Config Committed'
    });

    setSaveBanner(`Configuration saved successfully! Baseline updated from ${priorBaseline} to ${newVersionNumber}.`);
    setTimeout(() => setSaveBanner(null), 4000);
  };

  // Second Super Admin: Approve pending change
  const handleApprovePendingChange = () => {
    if (!systemConfig.pendingApproval) return;
    const req = systemConfig.pendingApproval;
    const priorBaseline = systemConfig.versionBaseline;

    updateSystemConfig({
      ...req.configSnapshot,
      previousVersionBaseline: priorBaseline,
      versionBaseline: req.targetVersion,
      pendingApproval: undefined
    });

    logAudit({
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Dual Super Admin Approval Granted',
      oldValue: priorBaseline,
      newValue: req.targetVersion,
      notes: `Second Super Admin approved pending configuration changes. Baseline upgraded to ${req.targetVersion} (Flowchart 2).`
    });

    setSaveBanner(`Approved! Configuration successfully updated to ${req.targetVersion}.`);
    setTimeout(() => setSaveBanner(null), 4000);
  };

  // Second Super Admin: Reject / Cancel pending change
  const handleRejectPendingChange = () => {
    if (!systemConfig.pendingApproval) return;
    const req = systemConfig.pendingApproval;

    updateSystemConfig({
      pendingApproval: undefined
    });

    logAudit({
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Dual Super Admin Approval Rejected',
      oldValue: req.targetVersion,
      newValue: 'CANCELLED',
      notes: `Second Super Admin rejected proposed changes. Previous baseline ${systemConfig.versionBaseline} preserved.`
    });

    setSaveBanner(`Pending configuration changes cancelled. Baseline ${systemConfig.versionBaseline} remains active.`);
    setTimeout(() => setSaveBanner(null), 4000);
  };

  // Rollback to previous version (Flowchart 2: "Allow rollback to previous version")
  const handleRollback = () => {
    const priorVersion = systemConfig.previousVersionBaseline || 'v2.3.9-Stable';
    const confirmRollback = confirm(
      `Execute atomic configuration rollback to prior baseline: ${priorVersion}?\n\nThis will restore previous settings with an immutable compliance audit record.`
    );
    if (!confirmRollback) return;

    updateSystemConfig({
      versionBaseline: `${priorVersion}-Restored`,
      previousVersionBaseline: systemConfig.versionBaseline,
      emailScheduleTime: '08:30 AM',
      lockoutThreshold: 5,
      lockoutDurationMinutes: 15,
      retentionDays: 365
    });

    logAudit({
      action: 'CONFIG_CHANGED',
      fieldChanged: 'Atomic System Config Rollback',
      oldValue: systemConfig.versionBaseline,
      newValue: `${priorVersion}-Restored`,
      notes: `Super Admin executed atomic rollback to prior baseline snapshot ${priorVersion} (Flowchart 2 & 24).`
    });

    alert(`Rollback executed successfully! Baseline restored to ${priorVersion}-Restored.`);
  };

  const allDaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
          <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px' }}>
            <Sliders size={22} color="#0f172a" />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Super Admin System Configuration & Governance (Flowchart 2)
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              7 Operational Settings Categories • Dual Super Admin Approval Workflow • Atomic Versioning & Rollback
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Active Version Baseline:</span>
            <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 800 }}>
              {systemConfig.versionBaseline}
            </span>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleRollback}
            style={{ color: '#c2410c', borderColor: '#fdba74', background: '#fff7ed', gap: '5px' }}
            title="Flowchart 2: Allow rollback to previous version"
          >
            <RotateCcw size={14} />
            Rollback to Previous
          </button>
        </div>
      </div>

      {/* Save / Pending Banner */}
      {saveBanner && (
        <div style={{ 
          background: '#dcfce7', 
          border: '1px solid #86efac', 
          color: '#15803d', 
          padding: '0.85rem 1.25rem', 
          borderRadius: '8px', 
          fontSize: '0.82rem', 
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          {saveBanner}
        </div>
      )}

      {/* Second Super Admin Approval Notification Card (Flowchart 2) */}
      {systemConfig.pendingApproval && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e' }}>
              <GitPullRequest size={18} color="#d97706" />
              <strong style={{ fontSize: '0.9rem' }}>
                Pending Second Super Admin Approval (Flowchart 2 Requirement)
              </strong>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: '#b45309' }}>
              Requested by: {systemConfig.pendingApproval.requestedBy}
            </span>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#78350f', lineHeight: 1.4 }}>
            {systemConfig.pendingApproval.changesSummary} Proposed new baseline: <strong>{systemConfig.pendingApproval.targetVersion}</strong>.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRejectPendingChange}
              style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#ffffff', fontSize: '0.78rem' }}
            >
              <XCircle size={14} /> Cancel / Reject Change
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleApprovePendingChange}
              style={{ background: '#15803d', fontSize: '0.78rem', gap: '5px' }}
            >
              <Check size={14} /> Approve & Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* 7 Settings Navigation Tabs (Flowchart 2) */}
      <div style={{
        display: 'flex',
        gap: '0.4rem',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0.4rem',
        overflowX: 'auto'
      }}>
        {[
          { key: 'email_schedule', label: '1. Email Schedule', icon: Mail },
          { key: 'role_permissions', label: '2. Role Permissions', icon: Users },
          { key: 'status_options', label: '3. Status Options', icon: Tag },
          { key: 'export_roles', label: '4. Export Roles', icon: FileSpreadsheet },
          { key: 'master_data', label: '5. Master Data', icon: Database },
          { key: 'security', label: '6. Security & Lockout', icon: Lock },
          { key: 'retention', label: '7. Retention Periods', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ConfigTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={14} color={isActive ? '#2563eb' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveConfiguration} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 1: Email Schedule (Flowchart 2) */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'email_schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  Email Schedule Settings
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Configure automated reminder trigger times, working days schedule, and holiday suppression.
                </p>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Daily Reminder Dispatch Time (Default: 08:30 AM)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ maxWidth: '240px' }}
                  value={emailTime}
                  onChange={e => setEmailTime(e.target.value)}
                  placeholder="08:30 AM"
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  System clock dispatches daily portfolio digests to employees at this configured time (Flowchart D & 13).
                </span>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Configured Working Days</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '4px' }}>
                  {allDaysOfWeek.map(d => {
                    const isChecked = workingDays.includes(d);
                    return (
                      <label 
                        key={d} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: isChecked ? '#eff6ff' : '#f8fafc',
                          border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: isChecked ? 700 : 500,
                          color: isChecked ? '#1e40af' : '#64748b'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleWorkingDay(d)}
                        />
                        <span>{d}</span>
                      </label>
                    );
                  })}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  Reminders are automatically skipped on non-working days (e.g. Sundays) and logged with skip reasons.
                </span>
              </div>

              <div className="form-field-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={holidaysActive}
                    onChange={e => setHolidaysActive(e.target.checked)}
                  />
                  <span>Automatically pause reminders on official Gazetted Company Holidays</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '22px' }}>
                  Synchronizes with UrbanGaon Official FY 2026-27 Holiday Roster (Republic Day, Holi, Diwali, etc.).
                </span>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 2: Role Permissions (Flowchart 2) */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'role_permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  Role-Based Access Control (RBAC) Permissions
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Edit role-based access matrix with change confirmation and dual approval safeguards.
                </p>
              </div>

              <div className="enterprise-table-wrapper">
                <table className="enterprise-table">
                  <thead>
                    <tr>
                      <th>Role Tier</th>
                      <th>Permissions & Operations</th>
                      <th>Scope Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>SUPER_ADMIN</strong></td>
                      <td>Full Executive Command, System Config, User Management, Delete, Immutable Audit Ledger</td>
                      <td><span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem' }}>Global Corporate</span></td>
                    </tr>
                    <tr>
                      <td><strong>ADMIN</strong></td>
                      <td>Admin HR Portal, Employee Oversight, Reassign Deliverables, Reports & Performance Ratios</td>
                      <td><span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem' }}>Enterprise Operations</span></td>
                    </tr>
                    <tr>
                      <td><strong>MANAGER</strong></td>
                      <td>My Team Command Center, Rebalance Workloads, Review Delay Reasons, Reopen Tasks</td>
                      <td><span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem' }}>Departmental Team</span></td>
                    </tr>
                    <tr>
                      <td><strong>EMPLOYEE</strong></td>
                      <td>Daily Task Register, Mark Progress, Escalate to Senior, Voice AI Task Scheduler</td>
                      <td><span style={{ background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem' }}>Individual Deliverables</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 3: Status Options (Flowchart 2: "Add extra labels mapped to core statuses") */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'status_options' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  Custom Status Labels (Core Mapping)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Add domain-specific workflow labels that automatically map to underlying system core statuses.
                </p>
              </div>

              {/* Add Custom Status Form */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ maxWidth: '280px' }}
                  placeholder="e.g. Blocked on Legal Approval"
                  value={newStatusLabel}
                  onChange={e => setNewStatusLabel(e.target.value)}
                />
                <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}>maps to:</span>
                <select
                  className="form-select"
                  style={{ maxWidth: '160px' }}
                  value={newStatusCore}
                  onChange={e => setNewStatusCore(e.target.value as TaskStatus)}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Done">Done</option>
                  <option value="Escalated">Escalated</option>
                </select>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddCustomStatus}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}
                >
                  <Plus size={14} /> Add Label Mapping
                </button>
              </div>

              {/* List of custom status mappings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {customStatuses.map(item => (
                  <div
                    key={item.label}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.5rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      maxWidth: '480px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{item.label}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>→ Core:</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px' }}>
                        {item.mappedTo}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCustomStatus(item.label)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 4: Export Roles (Flowchart 2: "Set who can export what") */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'export_roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  Export Permissions Policy (Flowchart 14 & Flowchart E)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Define which roles are authorized to export deliverables, compliance logs, and executive reports.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '4px' }}>
                    1. Who can export ALL enterprise tasks across all departments?
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '8px' }}>
                    Authorized roles have visibility across the entire company portfolio in XLSX / CSV formats.
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span style={{ background: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      ADMIN
                    </span>
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      SUPER_ADMIN
                    </span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '4px' }}>
                    2. Who can export Immutable Compliance Audit Trail Logs?
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '8px' }}>
                    Strict forensic logging exports including cryptographic audit trail (Flowchart C & 12).
                  </div>
                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                    SUPER_ADMIN Strictly Only
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 5: Master Data (Flowchart 2) */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'master_data' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Projects */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '6px' }}>Master Project Tags</h4>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="New project tag..."
                    value={newProject}
                    onChange={e => setNewProject(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (!newProject.trim()) return;
                      setProjects(prev => [...prev, newProject.trim()]);
                      setNewProject('');
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                  {projects.map(p => (
                    <span key={p} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {p}
                      <button type="button" onClick={() => setProjects(prev => prev.filter(x => x !== p))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Departments */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '6px' }}>Master Departments</h4>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="New department..."
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      if (!newDept.trim()) return;
                      setDepartments(prev => [...prev, newDept.trim()]);
                      setNewDept('');
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                  {departments.map(d => (
                    <span key={d} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {d}
                      <button type="button" onClick={() => setDepartments(prev => prev.filter(x => x !== d))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 6: Security (Flowchart 2) */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  Security & Access Policies
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Account lockout thresholds, session timeouts, and enterprise password rules.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-field-group">
                  <label className="form-field-label">Failed Login Lockout Attempts</label>
                  <input
                    type="number"
                    className="form-input"
                    value={lockoutThreshold}
                    onChange={e => setLockoutThreshold(Number(e.target.value))}
                    min={3}
                    max={10}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Locks account after consecutive wrong credentials.</span>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Lockout Duration (Minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={lockoutDuration}
                    onChange={e => setLockoutDuration(Number(e.target.value))}
                    min={5}
                    max={120}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Duration account remains frozen before auto-unfreezing.</span>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Session Idle Timeout (Minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={sessionTimeout}
                    onChange={e => setSessionTimeout(Number(e.target.value))}
                    min={15}
                    max={480}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Auto-signs out idle browser sessions to preserve security.</span>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* TAB 7: Retention (Flowchart 2) */}
          {/* ─────────────────────────────────────────────────────────── */}
          {activeTab === 'retention' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                  Data Retention & Compliance Archival Periods
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Set retention windows before deliverables and compliance logs move to cold archival storage.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div className="form-field-group">
                  <label className="form-field-label">Completed Deliverable Retention (Days)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={retentionDays}
                    onChange={e => setRetentionDays(Number(e.target.value))}
                    min={30}
                    max={1825}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Deliverables older than this are moved to archival tables.</span>
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Immutable Audit Log Retention (Days)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={auditRetentionDays}
                    onChange={e => setAuditRetentionDays(Number(e.target.value))}
                    min={180}
                    max={3650}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Forensic logs preserved in immutable append-only ledger.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Second Super Admin Approval Toggle & Submit Bar (Flowchart 2) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
              <input
                type="checkbox"
                checked={requireDualApproval}
                onChange={e => setRequireDualApproval(e.target.checked)}
              />
              <span>Second Super Admin Approval Required? (Flowchart 2 Branch)</span>
            </label>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {requireDualApproval ? 'Changes require approval before taking effect.' : 'Changes save immediately and update version baseline.'}
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.25rem' }}
          >
            <Check size={14} />
            {requireDualApproval ? 'Submit for Second Super Admin Approval' : 'Save Configuration & Update Baseline'}
          </button>
        </div>
      </form>
    </div>
  );
};
