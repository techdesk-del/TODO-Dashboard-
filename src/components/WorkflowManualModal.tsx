'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { BookOpen, Check, Search, ShieldCheck, ChevronRight } from 'lucide-react';

export const WorkflowManualModal: React.FC = () => {
  const { setActiveView } = useApp();
  const [searchFilter, setSearchFilter] = useState('');

  const workflows = [
    { num: 1, name: 'Sign-Up / Invitation Landing Page', phase: 'Phase 1: Account Onboarding', role: 'Public / All Staff', outcome: 'User chooses to redeem invitation, request access, or sign in directly.' },
    { num: 2, name: 'Employee Self Sign-Up Request', phase: 'Phase 1: Account Onboarding', role: 'Public / New Staff', outcome: 'Registration request submitted and sent to HR & Admin for verification.' },
    { num: 3, name: 'Admin Approves Sign-Up Request', phase: 'Phase 1: Account Onboarding', role: 'Admin / Talent HR', outcome: 'New employee account created, credentials generated, and welcome email dispatched.' },
    { num: 4, name: 'Password Setup & First Login', phase: 'Phase 1: Account Onboarding', role: 'All Users / Employees', outcome: 'Password securely established, credentials encrypted, and user routed to active workspace.' },
    { num: 5, name: 'Login & Role Routing', phase: 'Phase 2: Authentication & Security', role: 'All Organizational Roles', outcome: 'Credentials authenticated, security verified, and user directed to designated dashboard tier.' },
    { num: 6, name: 'Employee – Add Task', phase: 'Phase 3: Daily Work & Task Operations', role: 'Employee / All Staff', outcome: 'Task registered with full metadata, assignees designated, and work queued for execution.' },
    { num: 7, name: 'Employee – Edit or Update Task', phase: 'Phase 3: Daily Work & Task Operations', role: 'Employee / Assignees', outcome: 'Status updated with mandatory justifications where required; audit trail fully updated.' },
    { num: 8, name: 'Multi-Assignee Task Flow', phase: 'Phase 3: Daily Work & Task Operations', role: 'All Collaborative Teams', outcome: 'Multi-person task tracked independently per person; consolidated overall status rolled up automatically.' },
    { num: 9, name: 'Admin – Create Employee Login (Direct Invitation)', phase: 'Phase 3: Daily Work & Task Operations', role: 'Admin / Talent HR', outcome: 'Employee credentials formally created by HR; official activation email sent.' },
    { num: 10, name: 'Admin – View User Tasks via Dropdown', phase: 'Phase 3: Daily Work & Task Operations', role: 'Admin / Talent HR', outcome: 'Full managerial oversight of any employee’s tasks with ability to edit, reopen, reassign, or export.' },
    { num: 11, name: 'Admin – Reports and Performance Ratio', phase: 'Phase 4: Reporting, Visibility & Auditing', role: 'Admin / Directors', outcome: 'Fair, standardized productivity metrics generated across employees, teams, and departments.' },
    { num: 12, name: 'Super Admin – Audit Log View', phase: 'Phase 4: Reporting, Visibility & Auditing', role: 'Super Admin / Director', outcome: '100% transparency and traceability into every system modification with immutable tamper-proof logs.' },
    { num: 13, name: 'Morning Email Reminder Flow', phase: 'Phase 4: Reporting, Visibility & Auditing', role: 'Automated System Routine', outcome: 'Targeted, clutter-free morning reminder emails sent to every employee with pending commitments.' },
    { num: 14, name: 'Excel Export Flow', phase: 'Phase 4: Reporting, Visibility & Auditing', role: 'All Authorized Roles', outcome: 'Standardized, multi-sheet Excel workbooks generated for offline analysis and board reviews.' },
    { num: 15, name: 'Calendar View Flow', phase: 'Phase 4: Reporting, Visibility & Auditing', role: 'All Organizational Roles', outcome: 'Interactive visual scheduling of tasks by month, week, or day with instant edit and drag capabilities.' },
    { num: 16, name: 'Super Admin – System Configuration', phase: 'Phase 4: Reporting, Visibility & Auditing', role: 'Super Admin / Director', outcome: 'Global system policies, master dropdown lists, and schedules updated with versioning controls.' },
    { num: 17, name: 'Escalation Resolution Flow', phase: 'Phase 5: Exception Handling & Governance', role: 'Senior Management / Department Heads', outcome: 'Task bottlenecks reviewed by senior leadership; decisive intervention executed with SLA tracking.' },
    { num: 18, name: 'Account Deactivation and Task Handover', phase: 'Phase 5: Exception Handling & Governance', role: 'Admin / HR / Management', outcome: 'Departing employee’s tasks smoothly reassigned; complete historical accountability preserved.' },
    { num: 19, name: 'Reporting Manager Team View', phase: 'Phase 5: Exception Handling & Governance', role: 'Reporting Managers / Team Leads', outcome: 'Team leaders monitor subordinate workloads, approve delay reasons, and balance assignments.' },
    { num: 20, name: 'Notification Dispatch Flow', phase: 'Phase 5: Exception Handling & Governance', role: 'Automated Communication Engine', outcome: 'Intelligent, timely notifications routed to appropriate recipients with zero email clutter.' },
    { num: 21, name: 'Overdue and No-Reason Auto-Flag Flow', phase: 'Phase 5: Exception Handling & Governance', role: 'Automated System Routine', outcome: 'Lapsed deadlines automatically flagged; delays without reasons escalated for immediate attention.' },
    { num: 22, name: 'Task Cancellation and Reassignment Flow', phase: 'Phase 5: Exception Handling & Governance', role: 'Creator / Admin / Managers', outcome: 'Obsolete tasks properly cancelled with documented reasons; reassignments handled seamlessly.' },
    { num: 23, name: 'Leave and Holiday Handling Flow', phase: 'Phase 5: Exception Handling & Governance', role: 'Automated System Routine', outcome: 'Reminders paused during employee leaves; tasks due on holidays handled intelligently.' },
    { num: 24, name: 'Config Versioning and Rollback Flow', phase: 'Phase 5: Exception Handling & Governance', role: 'Super Admin / Director', outcome: 'Configuration modifications tracked as versioned baselines with instantaneous rollback readiness.' },
    { num: 25, name: 'Data Retention and Archive Flow', phase: 'Phase 5: Exception Handling & Governance', role: 'Automated System Routine', outcome: 'Historical data transferred to secure archives; active database maintained at maximum speed.' },
    { num: 26, name: 'Complete System Overview – Master Flow', phase: 'Phase 6: Executive Synthesis & Architecture', role: 'Senior Management / Directors / CEO', outcome: 'Unified single-page architectural overview connecting all roles, workflows, and automated routines.' },
    { num: 27, name: 'System Trigger Map (Event Cascade)', phase: 'Phase 6: Executive Synthesis & Architecture', role: 'System Architecture & Automation', outcome: 'Complete event-driven matrix mapping operational triggers to corresponding downstream actions.' },
    { num: 28, name: 'System Module Index & Operational Map', phase: 'Phase 6: Executive Synthesis & Architecture', role: 'Senior Management / Directors / CEO', outcome: 'Comprehensive operational roadmap grouping all 26 procedures into 6 structured business phases.' }
  ];

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    w.phase.toLowerCase().includes(searchFilter.toLowerCase()) ||
    w.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
    w.outcome.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '8px' }}>
            <BookOpen size={24} color="#2563eb" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              UrbanGaon Todos Platform — 28 Verified Technical Workflows
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Executive Operating Manual & Single Source of Truth • Version 2.0 Production Blueprint
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '320px' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            className="composer-input"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            placeholder="Search all 28 technical workflows..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
          />
        </div>
      </div>

      {/* 5 Non-Negotiable Governance Principles Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 800 }}>PRINCIPLE 1</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>1. Nothing Hidden</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Every mutation is permanently recorded in the immutable audit log.
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 800 }}>PRINCIPLE 2</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>2. Nothing Lost</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Unfinished tasks roll over automatically at 00:05 AM with carry badges.
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 800 }}>PRINCIPLE 3</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>3. Multi-Assignee Fairness</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Tasks spawn independent tracking rows; each employee evaluated on own timely finish.
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 800 }}>PRINCIPLE 4</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>4. Mandatory Justification</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Tasks cannot be put on hold or cancelled without documented business rationale.
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 800 }}>PRINCIPLE 5</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>5. Targeted Morning Focus</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            8:30 AM personalized digest emails ensure zero spam and zero unassigned delays.
          </div>
        </div>
      </div>

      {/* 28 Workflows Reference Table */}
      <div className="enterprise-table-wrapper">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>#</th>
              <th>Workflow Name</th>
              <th>Operational Phase</th>
              <th>Assigned Role</th>
              <th>Primary Technical Outcome</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkflows.map(w => (
              <tr key={w.num}>
                <td>
                  <span style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    FC {w.num}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{w.name}</span>
                </td>
                <td>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{w.phase}</span>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: w.role.includes('Director') || w.role.includes('CEO') ? '#d97706' : '#334155'
                  }}>
                    {w.role}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '0.78rem', color: '#334155' }}>{w.outcome}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
