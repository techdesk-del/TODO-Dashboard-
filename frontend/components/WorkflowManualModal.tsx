'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  BookOpen, 
  Search, 
  Table as TableIcon, 
  LayoutGrid, 
  ShieldCheck, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Network,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { canAccessWorkflows } from '@/shared/lib/rosterData';

export const WorkflowManualModal: React.FC = () => {
  const { currentUser } = useApp();
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'diagram'>('table');
  const [isDiagramExpanded, setIsDiagramExpanded] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  if (!canAccessWorkflows(currentUser)) {
    return null;
  }

  const workflows = useMemo(() => [
    { num: 1, name: 'Sign-Up / Invitation Landing Page', phase: 'Phase 1: Before Login', role: 'Public / All Staff', outcome: 'User chooses to redeem invitation, request access, or sign in directly.' },
    { num: 2, name: 'Employee Self Sign-Up Request', phase: 'Phase 1: Before Login', role: 'Public / New Staff', outcome: 'Registration request submitted and sent to HR & Admin for verification.' },
    { num: 3, name: 'Admin Approves Sign-Up Request', phase: 'Phase 1: Before Login', role: 'Admin / Talent HR', outcome: 'New employee account created, credentials generated, and welcome email dispatched.' },
    { num: 4, name: 'Password Reset & First Login', phase: 'Phase 1: Before Login', role: 'All Users / Employees', outcome: 'Password securely established, credentials encrypted, and user routed to active workspace.' },
    { num: 5, name: 'Login & Role Routing', phase: 'Phase 2: Login', role: 'All Organizational Roles', outcome: 'Credentials authenticated, security verified, and user directed to designated dashboard tier.' },
    { num: 6, name: 'Employee – Add Task', phase: 'Phase 3: Daily Work', role: 'Employee / All Staff', outcome: 'Task registered with full metadata, assignees designated, and work queued for execution.' },
    { num: 7, name: 'Employee – Edit or Update Task', phase: 'Phase 3: Daily Work', role: 'Employee / Assignees', outcome: 'Status updated with mandatory justifications where required; audit trail fully updated.' },
    { num: 8, name: 'Multi-Assignee Task Flow', phase: 'Phase 3: Daily Work', role: 'All Collaborative Teams', outcome: 'Multi-person task tracked independently per person; consolidated overall status rolled up automatically.' },
    { num: 9, name: 'Admin – Create Employee Login (Direct Invitation)', phase: 'Phase 3: Daily Work', role: 'Admin / Talent HR', outcome: 'Employee credentials formally created by HR; official activation email sent.' },
    { num: 10, name: 'Admin – View User Tasks via Dropdown', phase: 'Phase 3: Daily Work', role: 'Admin / Talent HR', outcome: 'Full managerial oversight of any employee’s tasks with ability to edit, reopen, reassign, or export.' },
    { num: 11, name: 'Admin – Reports and Performance Ratio', phase: 'Phase 4: Reporting and Configuration', role: 'Admin / Directors', outcome: 'Fair, standardized productivity metrics generated across employees, teams, and departments.' },
    { num: 12, name: 'Super Admin – Audit Log View', phase: 'Phase 4: Reporting and Configuration', role: 'Super Admin / Director', outcome: '100% transparency and traceability into every system modification with immutable tamper-proof logs.' },
    { num: 13, name: 'Morning Email Reminder Flow', phase: 'Phase 5: System Automation', role: 'Automated System Routine', outcome: 'Targeted, clutter-free morning reminder emails sent to every employee with pending commitments.' },
    { num: 14, name: 'Excel Export Flow', phase: 'Phase 4: Reporting and Configuration', role: 'All Authorized Roles', outcome: 'Standardized, multi-sheet Excel workbooks generated for offline analysis and board reviews.' },
    { num: 15, name: 'Calendar View Flow', phase: 'Phase 4: Reporting and Configuration', role: 'All Organizational Roles', outcome: 'Interactive visual scheduling of tasks by month, week, or day with instant edit and drag capabilities.' },
    { num: 16, name: 'Super Admin – System Configuration', phase: 'Phase 4: Reporting and Configuration', role: 'Super Admin / Director', outcome: 'Global system policies, master dropdown lists, and schedules updated with versioning controls.' },
    { num: 17, name: 'Escalation Resolution Flow', phase: 'Phase 6: Exception Paths', role: 'Senior Management / Department Heads', outcome: 'Task bottlenecks reviewed by senior leadership; decisive intervention executed with SLA tracking.' },
    { num: 18, name: 'Account Deactivation and Task Handover', phase: 'Phase 6: Exception Paths', role: 'Admin / HR / Management', outcome: 'Departing employee’s tasks smoothly reassigned; complete historical accountability preserved.' },
    { num: 19, name: 'Reporting Manager Team View', phase: 'Phase 4: Reporting and Configuration', role: 'Reporting Managers / Team Leads', outcome: 'Team leaders monitor subordinate workloads, approve delay reasons, and balance assignments.' },
    { num: 20, name: 'Notification Dispatch Flow', phase: 'Phase 5: System Automation', role: 'Automated Communication Engine', outcome: 'Intelligent, timely notifications routed to appropriate recipients with zero email clutter.' },
    { num: 21, name: 'Overdue and No-Reason Auto-Flag Flow', phase: 'Phase 5: System Automation', role: 'Automated System Routine', outcome: 'Lapsed deadlines automatically flagged; delays without reasons escalated for immediate attention.' },
    { num: 22, name: 'Task Cancellation and Reassignment Flow', phase: 'Phase 6: Exception Paths', role: 'Creator / Admin / Managers', outcome: 'Obsolete tasks properly cancelled with documented reasons; reassignments handled seamlessly.' },
    { num: 23, name: 'Leave and Holiday Handling Flow', phase: 'Phase 5: System Automation', role: 'Automated System Routine', outcome: 'Reminders paused during employee leaves; tasks due on holidays handled intelligently.' },
    { num: 24, name: 'Config Versioning and Rollback Flow', phase: 'Phase 5: System Automation', role: 'Super Admin / Director', outcome: 'Configuration modifications tracked as versioned baselines with instantaneous rollback readiness.' },
    { num: 25, name: 'Data Retention and Archive Flow', phase: 'Phase 5: System Automation', role: 'Automated System Routine', outcome: 'Historical data transferred to secure archives; active database maintained at maximum speed.' },
    { num: 26, name: 'Complete System Overview – Master Flow', phase: 'Phase 7: Management Overview', role: 'Senior Management / Directors / CEO', outcome: 'Unified single-page architectural overview connecting all roles, workflows, and automated routines.' },
    { num: 27, name: 'System Trigger Map (Event Cascade)', phase: 'Phase 7: Management Overview', role: 'System Architecture & Automation', outcome: 'Complete event-driven matrix mapping operational triggers to corresponding downstream actions.' },
    { num: 28, name: 'The Index Chart (Complete System Reference)', phase: 'Phase 7: Management Overview', role: 'Senior Management / Directors / CEO', outcome: 'Master architectural index roadmap grouping all 28 corporate procedures into 7 structured phases.' }
  ], []);

  // Phase color mapper
  const getPhaseColor = (phase: string) => {
    if (phase.includes('Phase 1')) return { dot: '#2563eb', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
    if (phase.includes('Phase 2')) return { dot: '#0891b2', bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' };
    if (phase.includes('Phase 3')) return { dot: '#059669', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
    if (phase.includes('Phase 4')) return { dot: '#d97706', bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
    if (phase.includes('Phase 5')) return { dot: '#6366f1', bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' };
    if (phase.includes('Phase 6')) return { dot: '#dc2626', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
    return { dot: '#7c3aed', bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' };
  };

  // Role style mapper
  const getRoleStyle = (role: string) => {
    if (role.includes('CEO') || role.includes('Director') || role.includes('Super Admin')) {
      return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    }
    if (role.includes('Admin') || role.includes('Talent')) {
      return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
    }
    if (role.includes('Manager') || role.includes('Leads')) {
      return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
    }
    if (role.includes('Automated') || role.includes('Routine') || role.includes('System')) {
      return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
    }
    return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
  };

  // Unique phases for filter bar per Flowchart 28: The Index Chart (7 Phases)
  const phases = [
    { id: 'ALL', label: 'All 28 Flowcharts', count: 28 },
    { id: 'Phase 1', label: 'Phase 1: Before Login', count: 4 },
    { id: 'Phase 2', label: 'Phase 2: Login', count: 1 },
    { id: 'Phase 3', label: 'Phase 3: Daily Work', count: 5 },
    { id: 'Phase 4', label: 'Phase 4: Reporting & Configuration', count: 6 },
    { id: 'Phase 5', label: 'Phase 5: System Automation', count: 6 },
    { id: 'Phase 6', label: 'Phase 6: Exception Paths', count: 3 },
    { id: 'Phase 7', label: 'Phase 7: Management Overview', count: 3 },
  ];

  // Filtered workflows based on search query and selected phase
  const filteredWorkflows = useMemo(() => {
    return workflows.filter(w => {
      const matchesPhase = selectedPhase === 'ALL' || w.phase.includes(selectedPhase);
      const matchesSearch = 
        w.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        w.phase.toLowerCase().includes(searchFilter.toLowerCase()) ||
        w.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
        w.outcome.toLowerCase().includes(searchFilter.toLowerCase()) ||
        `fc ${w.num}`.includes(searchFilter.toLowerCase());
      return matchesPhase && matchesSearch;
    });
  }, [workflows, selectedPhase, searchFilter]);

  // Reset to page 1 whenever search, phase, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, selectedPhase, pageSize]);

  // Pagination calculations
  const totalItems = filteredWorkflows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedWorkflows = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredWorkflows.slice(startIndex, startIndex + pageSize);
  }, [filteredWorkflows, safePage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  // Generate smart pagination page numbers list (with ellipsis if needed)
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%' }}>
      {/* ── Top Header & Search Control ───────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.25rem clamp(1rem, 2.5vw, 1.5rem)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Title Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              padding: '0.65rem',
              borderRadius: '10px',
              color: 'white',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <BookOpen size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  28 Verified Technical Workflows
                </h1>
                <span style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  borderRadius: '20px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  v2.0 Master Blueprint
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                Executive Operating Manual & Standard Operating Procedures (FC 1 – FC 28)
              </p>
            </div>
          </div>

          {/* Right Action Tools: Search + View Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', minWidth: '280px', flex: '1 1 320px', justifyContent: 'flex-end' }}>
            <div style={{
              position: 'relative',
              flex: '1 1 240px',
              maxWidth: '380px',
              minWidth: '200px'
            }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search procedures by name, role, FC#..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  background: '#f8fafc',
                  color: '#0f172a',
                  transition: 'border-color 0.2s ease'
                }}
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Mode Switcher (Table vs Cards) */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  color: viewMode === 'table' ? '#2563eb' : '#64748b',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Switch to detailed Table View"
              >
                <TableIcon size={14} />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                  color: viewMode === 'cards' ? '#2563eb' : '#64748b',
                  boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Switch to Responsive Visual Cards Grid"
              >
                <LayoutGrid size={14} />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('diagram')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: viewMode === 'diagram' ? '#ffffff' : 'transparent',
                  color: viewMode === 'diagram' ? '#7c3aed' : '#64748b',
                  boxShadow: viewMode === 'diagram' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Switch to Flowchart 28: Master Architecture Diagram"
              >
                <Network size={14} />
                <span>Roadmap (FC 28)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Phase Filter Chips Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          overflowX: 'auto',
          paddingBottom: '2px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {phases.map(p => {
            const isActive = selectedPhase === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPhase(p.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? 700 : 600,
                  borderRadius: '20px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: isActive ? '#2563eb' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{p.label}</span>
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5 Non-Negotiable Governance Principles (Fluid Responsive Grid) ──── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{
          fontSize: '0.74rem',
          fontWeight: 800,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <ShieldCheck size={14} color="#60a5fa" />
          <span>The 5 Non-Negotiable Governance Principles of UrbanGaon</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '0.75rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderLeft: '3px solid #60a5fa',
            borderRadius: '8px',
            padding: '0.75rem 0.85rem'
          }}>
            <div style={{ fontSize: '0.66rem', color: '#60a5fa', fontWeight: 800 }}>PRINCIPLE 1</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>1. Nothing Hidden</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Every modification is documented in the immutable audit trail.
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderLeft: '3px solid #34d399',
            borderRadius: '8px',
            padding: '0.75rem 0.85rem'
          }}>
            <div style={{ fontSize: '0.66rem', color: '#34d399', fontWeight: 800 }}>PRINCIPLE 2</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>2. Nothing Lost</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Unfinished tasks auto carry-forward at midnight with carry badges.
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderLeft: '3px solid #fbbf24',
            borderRadius: '8px',
            padding: '0.75rem 0.85rem'
          }}>
            <div style={{ fontSize: '0.66rem', color: '#fbbf24', fontWeight: 800 }}>PRINCIPLE 3</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>3. Assignee Fairness</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Multi-person tasks track each person independently for fair KPIs.
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderLeft: '3px solid #f87171',
            borderRadius: '8px',
            padding: '0.75rem 0.85rem'
          }}>
            <div style={{ fontSize: '0.66rem', color: '#f87171', fontWeight: 800 }}>PRINCIPLE 4</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>4. Justification Mandatory</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Zero silent holds or cancellations without documented business rationale.
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderLeft: '3px solid #c084fc',
            borderRadius: '8px',
            padding: '0.75rem 0.85rem'
          }}>
            <div style={{ fontSize: '0.66rem', color: '#c084fc', fontWeight: 800 }}>PRINCIPLE 5</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>5. Targeted Morning Focus</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
              8:30 AM personalized email digests prevent spam and eliminate unassigned delays.
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Bar / Counter ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0 0.25rem'
      }}>
        <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
          Displaying <strong>{startIndex}–{endIndex}</strong> of <strong>{totalItems}</strong> Standard Operating Procedures
          {selectedPhase !== 'ALL' && <span style={{ color: '#2563eb' }}> in {selectedPhase}</span>}
          {searchFilter && <span style={{ color: '#0f172a' }}> matching &quot;{searchFilter}&quot;</span>}
          {totalPages > 1 && <span style={{ color: '#64748b', fontWeight: 500 }}> (Page {safePage} of {totalPages})</span>}
        </div>

        {viewMode === 'table' && (
          <div style={{ fontSize: '0.73rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>← Scroll table horizontally to view full technical outcomes →</span>
          </div>
        )}
      </div>

      {/* ── View 1: Robust Table View (Proper min-widths, zero text squishing) ── */}
      {viewMode === 'table' ? (
        <div 
          className="enterprise-table-wrapper"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            width: '100%',
            maxWidth: '100%'
          }}
        >
          <table
            className="enterprise-table"
            style={{
              width: '100%',
              minWidth: '1040px',
              borderCollapse: 'collapse',
              textAlign: 'left'
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ width: '80px', minWidth: '80px', padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  #
                </th>
                <th style={{ width: '240px', minWidth: '220px', padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  Workflow Name
                </th>
                <th style={{ width: '200px', minWidth: '190px', padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  Operational Phase
                </th>
                <th style={{ width: '190px', minWidth: '170px', padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  Assigned Role
                </th>
                <th style={{ minWidth: '350px', padding: '10px 16px', whiteSpace: 'nowrap' }}>
                  Primary Technical Outcome
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedWorkflows.map((w, idx) => {
                const phaseCol = getPhaseColor(w.phase);
                const roleSt = getRoleStyle(w.role);
                return (
                  <tr 
                    key={w.num}
                    style={{
                      borderBottom: idx === paginatedWorkflows.length - 1 ? 'none' : '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Column 1: FC Badge (Nowrap guaranteed) */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap'
                      }}>
                        FC {w.num}
                      </span>
                    </td>

                    {/* Column 2: Workflow Name */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a', lineHeight: 1.4 }}>
                        {w.name}
                      </div>
                    </td>

                    {/* Column 3: Operational Phase */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: phaseCol.bg,
                        color: phaseCol.text,
                        border: `1px solid ${phaseCol.border}`,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: phaseCol.dot }} />
                        {w.phase}
                      </span>
                    </td>

                    {/* Column 4: Assigned Role */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: roleSt.bg,
                        color: roleSt.text,
                        border: `1px solid ${roleSt.border}`,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        {w.role}
                      </span>
                    </td>

                    {/* Column 5: Primary Technical Outcome */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.55 }}>
                        {w.outcome}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── View 2: Visual Responsive Cards Grid (Ideal for mobile / compact screens) ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '1rem',
          width: '100%'
        }}>
          {paginatedWorkflows.map(w => {
            const phaseCol = getPhaseColor(w.phase);
            const roleSt = getRoleStyle(w.role);
            return (
              <div
                key={w.num}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Card Header: FC Badge + Phase Pill */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    FC {w.num}
                  </span>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: phaseCol.bg,
                    color: phaseCol.text,
                    border: `1px solid ${phaseCol.border}`,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    fontWeight: 700
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: phaseCol.dot }} />
                    {w.phase}
                  </span>
                </div>

                {/* Workflow Title */}
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.35 }}>
                  {w.name}
                </h3>

                {/* Role Pill */}
                <div>
                  <span style={{
                    display: 'inline-block',
                    background: roleSt.bg,
                    color: roleSt.text,
                    border: `1px solid ${roleSt.border}`,
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {w.role}
                  </span>
                </div>

                {/* Technical Outcome */}
                <div style={{
                  fontSize: '0.8rem',
                  color: '#475569',
                  lineHeight: 1.5,
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '6px',
                  padding: '0.65rem 0.75rem',
                  marginTop: 'auto'
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Technical Outcome
                  </div>
                  {w.outcome}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── View 3: Flowchart 28: Master Architecture Roadmap Diagram ────────── */}
      {viewMode === 'diagram' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '1.25rem clamp(1rem, 2.5vw, 1.5rem)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Header & Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: '#f5f3ff',
                  color: '#7c3aed',
                  border: '1px solid #ddd6fe',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 800
                }}>
                  Flowchart 28: Master Taxonomy
                </span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  The Index Chart & 7-Phase Operational Lifecycle
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                Visual architecture mapping every procedure in UrbanGaon from pre-login onboarding to executive governance.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsDiagramExpanded(!isDiagramExpanded)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={13} />
                <span>{isDiagramExpanded ? 'Compact View' : 'Expand High-Res'}</span>
              </button>

              <a
                href="/flowchart28_index_chart.png"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: '1px solid #7c3aed',
                  background: '#7c3aed',
                  color: '#ffffff',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={13} />
                <span>Open Full HD Diagram</span>
              </a>
            </div>
          </div>

          {/* Diagram Container */}
          <div style={{
            position: 'relative',
            background: '#fafaf9',
            border: '1.5px solid #e7e5e4',
            borderRadius: '10px',
            overflow: 'auto',
            maxHeight: isDiagramExpanded ? '900px' : '480px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            transition: 'max-height 0.3s ease'
          }}>
            <img
              src="/flowchart28_index_chart.png"
              alt="Flowchart 28: The Index Chart"
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
            />
          </div>

          {/* 7 Lifecycle Phase Architecture Map Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: '0.85rem'
          }}>
            {[
              {
                phase: 'Phase 1: Before Login',
                fcs: 'FC 1, 2, 3, 4',
                desc: 'Public landing, employee self sign-up, admin verification, and credential setup.',
                color: '#2563eb',
                bg: '#eff6ff',
                border: '#bfdbfe'
              },
              {
                phase: 'Phase 2: Login',
                fcs: 'FC 5',
                desc: 'Secure multi-role authentication and tier-based routing to user workspace.',
                color: '#0891b2',
                bg: '#ecfeff',
                border: '#a5f3fc'
              },
              {
                phase: 'Phase 3: Daily Work',
                fcs: 'FC 6, 7, 8, 9, 10',
                desc: 'Task creation, status progression, multi-assignee rollup, HR onboarding, and user oversight.',
                color: '#059669',
                bg: '#ecfdf5',
                border: '#a7f3d0'
              },
              {
                phase: 'Phase 4: Reporting & Configuration',
                fcs: 'FC 11, 12, 14, 15, 16, 19',
                desc: 'Performance ratios, audit trails, Excel export, calendar view, config management, and team lead view.',
                color: '#d97706',
                bg: '#fffbeb',
                border: '#fde68a'
              },
              {
                phase: 'Phase 5: System Automation',
                fcs: 'FC 13, 20, 21, 23, 24, 25',
                desc: '8:30 AM digests, dispatch daemon, overdue auto-flag, holiday pausing, rollback, and data retention.',
                color: '#6366f1',
                bg: '#e0e7ff',
                border: '#c7d2fe'
              },
              {
                phase: 'Phase 6: Exception Paths',
                fcs: 'FC 17, 18, 22',
                desc: 'Managerial escalation resolution, offboarding handover, and task cancellation with reason.',
                color: '#dc2626',
                bg: '#fef2f2',
                border: '#fecaca'
              },
              {
                phase: 'Phase 7: Management Overview',
                fcs: 'FC 26, 27, 28',
                desc: 'Unified master flow overview, automated system trigger map, and Flowchart 28 index roadmap.',
                color: '#7c3aed',
                bg: '#f5f3ff',
                border: '#ddd6fe'
              }
            ].map(item => (
              <div
                key={item.phase}
                style={{
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                  borderLeft: `4px solid ${item.color}`,
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: item.color }}>{item.phase}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#ffffff', color: item.color, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${item.border}` }}>
                    {item.fcs}
                  </span>
                </div>
                <p style={{ fontSize: '0.76rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  {item.desc}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const phaseKey = item.phase.split(':')[0].trim();
                    setSelectedPhase(phaseKey);
                    setViewMode('table');
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '6px',
                    background: '#ffffff',
                    border: `1px solid ${item.border}`,
                    color: item.color,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View Workflows in Table →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pagination Controls Toolbar ─────────────────────────────── */}
      {totalItems > 0 && viewMode !== 'diagram' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Left: Summary & Page Size Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
              Showing <strong style={{ color: '#0f172a' }}>{startIndex}</strong>–<strong style={{ color: '#0f172a' }}>{endIndex}</strong> of <strong style={{ color: '#0f172a' }}>{totalItems}</strong> workflows
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Per page:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={28}>28 (All)</option>
              </select>
            </div>
          </div>

          {/* Right: Navigation Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              {/* First Page */}
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurrentPage(1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safePage === 1 ? '#f8fafc' : '#ffffff',
                  color: safePage === 1 ? '#cbd5e1' : '#334155',
                  cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="First Page"
                aria-label="First Page"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safePage === 1 ? '#f8fafc' : '#ffffff',
                  color: safePage === 1 ? '#cbd5e1' : '#334155',
                  cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page Number Buttons */}
              {pageNumbers.map((p, idx) => {
                if (typeof p === 'string') {
                  return (
                    <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.85rem' }}>
                      ...
                    </span>
                  );
                }
                const isActive = p === safePage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '32px',
                      height: '32px',
                      padding: '0 6px',
                      borderRadius: '6px',
                      border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                      background: isActive ? '#2563eb' : '#ffffff',
                      color: isActive ? '#ffffff' : '#334155',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safePage === totalPages ? '#f8fafc' : '#ffffff',
                  color: safePage === totalPages ? '#cbd5e1' : '#334155',
                  cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>

              {/* Last Page */}
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: safePage === totalPages ? '#f8fafc' : '#ffffff',
                  color: safePage === totalPages ? '#cbd5e1' : '#334155',
                  cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Last Page"
                aria-label="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty Search State */}
      {totalItems === 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px dashed #cbd5e1',
          borderRadius: '12px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Filter size={32} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
            No workflows match your search
          </div>
          <p style={{ fontSize: '0.8rem', margin: '0.4rem 0 1rem 0' }}>
            Try searching for another procedure name, FC number, or click &quot;All Workflows&quot;.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setSearchFilter(''); setSelectedPhase('ALL'); }}
            style={{ padding: '6px 16px', fontSize: '0.8rem', margin: '0 auto' }}
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
