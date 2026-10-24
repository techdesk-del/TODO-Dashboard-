'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { isCeoUser, isStrictCeo } from '@/lib/rosterData';
import { getTodayStr, formatDateDisplay, formatDateShort } from '@/lib/dateUtils';
import { Task, TeamMember } from '@/types';
import { 
  Crown, 
  FileText, 
  Download, 
  ArrowLeft, 
  ChevronDown, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Users, 
  Trash2, 
  Search, 
  Eye, 
  X, 
  RotateCcw, 
  Calendar, 
  Layers, 
  Sparkles, 
  Building2, 
  MapPin, 
  Briefcase,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ExternalLink,
  Activity
} from 'lucide-react';

export const CeoPortal: React.FC = () => {
  const { 
    tasks, 
    members, 
    selectedMemberFilter, 
    setSelectedMemberFilter, 
    exportToExcel,
    setViewingAuditForTaskId,
    setActiveView,
    deleteTask,
    currentUser,
    setBannerNotification,
    refreshFromDB
  } = useApp();

  const isCeo = isCeoUser(currentUser);
  const isCeoMonitoring = isStrictCeo(currentUser);
  const todayStr = getTodayStr();

  // Local Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Not Started' | 'In Progress' | 'Done' | 'On Hold'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [inspectingTask, setInspectingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active members excluding deactivated staff
  const activeMembers = useMemo(() => {
    return members.filter(m => m.status !== 'DEACTIVATED' && (m as any).isDeactivated !== true);
  }, [members]);

  // Active member for drilldown
  const activeMember = useMemo(() => {
    if (!selectedMemberFilter) return null;
    return activeMembers.find(m => m.name.toLowerCase() === selectedMemberFilter.toLowerCase()) || null;
  }, [activeMembers, selectedMemberFilter]);

  // Unique departments for filter dropdown
  const departmentList = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.department) set.add(t.department);
    });
    activeMembers.forEach(m => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort();
  }, [tasks, activeMembers]);

  // Filter tasks based on member, search, status, and department
  const uncancelledTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'Cancelled');
  }, [tasks]);

  const memberFilteredTasks = useMemo(() => {
    if (!activeMember) return uncancelledTasks;
    const memberNameClean = activeMember.name.toLowerCase().trim();
    const memberEmailClean = (activeMember.email || '').toLowerCase().trim();
    return uncancelledTasks.filter(t => {
      const isAssignee = t.assignees?.some(a => 
        a.id === activeMember.id || 
        (a.name && a.name.toLowerCase().trim().includes(memberNameClean)) ||
        (a.email && a.email.toLowerCase().trim() === memberEmailClean)
      );
      const isCreator = t.creator?.id === activeMember.id || 
        (t.creator?.name && t.creator.name.toLowerCase().trim().includes(memberNameClean)) ||
        (t.creator?.email && t.creator.email.toLowerCase().trim() === memberEmailClean);
      return isAssignee || isCreator;
    });
  }, [uncancelledTasks, activeMember]);

  const displayedTasks = useMemo(() => {
    return memberFilteredTasks.filter(task => {
      // Status filter
      if (statusFilter !== 'ALL' && task.status !== statusFilter) {
        return false;
      }

      // Department filter
      if (departmentFilter !== 'ALL' && task.department !== departmentFilter) {
        return false;
      }

      // Search query (title, project, department, assignee, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesProject = (task.project || '').toLowerCase().includes(q);
        const matchesDept = (task.department || '').toLowerCase().includes(q);
        const matchesAssignees = task.assignees?.some(a => a.name.toLowerCase().includes(q));
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        const matchesHoldReason = (task.holdReason || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesProject && !matchesDept && !matchesAssignees && !matchesNotes && !matchesHoldReason) {
          return false;
        }
      }

      return true;
    }).slice().sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }, [memberFilteredTasks, statusFilter, departmentFilter, searchQuery]);

  // Executive KPI Calculations
  const totalTasksCount = memberFilteredTasks.length;
  const completedCount = memberFilteredTasks.filter(t => t.status === 'Done').length;
  const inProgressCount = memberFilteredTasks.filter(t => t.status === 'In Progress').length;
  const notStartedCount = memberFilteredTasks.filter(t => t.status === 'Not Started').length;
  const pendingBlockersCount = memberFilteredTasks.filter(t => 
    t.status === 'On Hold' || 
    t.status === 'Escalated' || 
    (t.scheduledDate < todayStr && t.status !== 'Done')
  ).length;

  const sprintVelocity = totalTasksCount > 0 
    ? Math.round((completedCount / totalTasksCount) * 100)
    : 100;

  // Handlers
  const handlePrintBoardReport = () => {
    window.print();
  };

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await refreshFromDB();
      setBannerNotification({
        message: 'Executive Ledger synchronized with MongoDB Atlas in real-time.',
        badge: 'SYNC COMPLETE'
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleExecuteDelete = (taskId: string) => {
    deleteTask(taskId);
    setDeletingTaskId(null);
    if (inspectingTask?.id === taskId) {
      setInspectingTask(null);
    }
    setBannerNotification({
      message: 'Deliverable permanently removed from corporate ledger by CEO authorization.',
      badge: 'GOVERNANCE AUDIT'
    });
  };

  const resetAllFilters = () => {
    setSelectedMemberFilter(null);
    setSearchQuery('');
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
  };

  const hasActiveFilters = Boolean(
    selectedMemberFilter || 
    searchQuery.trim() || 
    statusFilter !== 'ALL' || 
    departmentFilter !== 'ALL'
  );

  return (
    <div className="ceo-portal-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ─────────────────────────────────────────────────────────────
          1. EXECUTIVE HERO COMMAND BANNER
      ────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.1rem 1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)',
            flexShrink: 0
          }}>
            <Crown size={22} color="#fbbf24" strokeWidth={2.2} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Executive Command Center
              </h1>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Live Oversight
              </span>
            </div>

            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Real-time deliverable monitoring across <strong>{activeMembers.length} active team members</strong> • Tracking <strong>{uncancelledTasks.length} enterprise deliverables</strong>
            </p>
          </div>
        </div>

        {/* Executive Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Synchronize ledger with live MongoDB Atlas database"
          >
            <RotateCcw size={13} className={isRefreshing ? 'spin-animation' : ''} />
            <span>Sync Ledger</span>
          </button>

          <button
            type="button"
            onClick={handlePrintBoardReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              background: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Download executive board print/PDF dossier"
          >
            <Printer size={14} color="#2563eb" />
            <span>Board PDF Dossier</span>
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Export full multi-sheet audit & deliverables ledger to Microsoft Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXECUTIVE KPI CARDS (4-CARD GRID)
      ────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.9rem'
      }}>
        {/* KPI 1: Total Active Deliverables */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#3b82f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Deliverables
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {totalTasksCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Tasks</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            <span><strong>{inProgressCount}</strong> in progress</span>
            <span><strong>{notStartedCount}</strong> queued</span>
          </div>
          {/* Micro Progress Bar */}
          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${totalTasksCount > 0 ? ((inProgressCount + completedCount) / totalTasksCount) * 100 : 0}%`,
              height: '100%',
              background: '#3b82f6',
              borderRadius: '999px'
            }} />
          </div>
        </div>

        {/* KPI 2: Team Sprint Velocity */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#10b981' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sprint Velocity
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#059669" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>
            {sprintVelocity}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            <span><strong>{completedCount}</strong> of <strong>{totalTasksCount}</strong> done</span>
            <span style={{ color: '#059669', fontWeight: 700 }}>Pace: Strong</span>
          </div>
          {/* Micro Progress Bar */}
          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${sprintVelocity}%`,
              height: '100%',
              background: '#10b981',
              borderRadius: '999px'
            }} />
          </div>
        </div>

        {/* KPI 3: Bottleneck Watch */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: pendingBlockersCount > 0 ? '#f59e0b' : '#10b981'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Operational Bottlenecks
            </span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: pendingBlockersCount > 0 ? '#fffbeb' : '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={16} color={pendingBlockersCount > 0 ? '#d97706' : '#059669'} />
            </div>
          </div>
          <div style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: pendingBlockersCount > 0 ? '#d97706' : '#059669',
            lineHeight: 1.1
          }}>
            {pendingBlockersCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Items</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: pendingBlockersCount > 0 ? '#b45309' : '#059669', fontWeight: 600, marginTop: '2px' }}>
            {pendingBlockersCount > 0 ? '⚠️ Requires leadership intervention' : '✓ Zero critical halts'}
          </div>
          {/* Micro Bar */}
          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${totalTasksCount > 0 ? Math.min((pendingBlockersCount / totalTasksCount) * 100, 100) : 0}%`,
              height: '100%',
              background: pendingBlockersCount > 0 ? '#f59e0b' : '#10b981',
              borderRadius: '999px'
            }} />
          </div>
        </div>

        {/* KPI 4: Verified Completions */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#8b5cf6' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Finalized Milestones
            </span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} color="#7c3aed" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1.1 }}>
            {completedCount} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Tasks</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            {completedCount > 0 ? '✓ Audited & verified in database' : 'Awaiting deliverable sign-offs'}
          </div>
          {/* Micro Bar */}
          <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{
              width: `${totalTasksCount > 0 ? (completedCount / totalTasksCount) * 100 : 0}%`,
              height: '100%',
              background: '#8b5cf6',
              borderRadius: '999px'
            }} />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. UNIFIED EXECUTIVE TOOLBAR & FILTERS
      ────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '0.9rem 1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Top Controls Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '6px 11px',
            flex: '1 1 240px',
            maxWidth: '360px',
            transition: 'border-color 0.15s ease'
          }}>
            <Search size={15} color="#64748b" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deliverables, projects, staff..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.76rem',
                color: '#0f172a',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <X size={13} color="#94a3b8" />
              </button>
            )}
          </div>

          {/* Member Picker Dropdown */}
          <div style={{ position: 'relative', flex: '1 1 230px', maxWidth: '340px' }}>
            <button
              type="button"
              onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '6px 12px',
                background: activeMember ? '#eff6ff' : '#ffffff',
                border: activeMember ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: activeMember ? '#1d4ed8' : '#1e293b',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <Users size={14} color={activeMember ? '#2563eb' : '#64748b'} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeMember ? activeMember.name : `All Team Members (${activeMembers.length})`}
                </span>
              </div>
              <ChevronDown size={14} color="#64748b" />
            </button>

            {isMemberDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                zIndex: 60,
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '5px'
              }}>
                {/* Reset to All */}
                <div
                  onClick={() => {
                    setSelectedMemberFilter(null);
                    setIsMemberDropdownOpen(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: !activeMember ? '#eff6ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    color: !activeMember ? '#1d4ed8' : '#0f172a'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem'
                    }}>
                      🏢
                    </div>
                    <span>All Company Members</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                    {uncancelledTasks.length} tasks
                  </span>
                </div>

                {/* List each active member */}
                {activeMembers.map(m => {
                  const memberTasksCount = uncancelledTasks.filter(t => 
                    t.assignees?.some(a => a.id === m.id || a.name.toLowerCase() === m.name.toLowerCase()) ||
                    t.creator?.id === m.id
                  ).length;
                  const isSelected = activeMember?.id === m.id;

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedMemberFilter(m.name);
                        setIsMemberDropdownOpen(false);
                      }}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '2px',
                        transition: 'background 0.12s ease'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {m.avatar || m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.designation} • {m.department}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: isSelected ? '#1d4ed8' : '#64748b',
                        background: isSelected ? '#dbeafe' : '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}>
                        {memberTasksCount} tasks
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Cluster:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0f172a',
                background: '#ffffff',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">All Clusters / Depts</option>
              {departmentList.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Clear all active search and filter constraints"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Bottom Status Filter Chips */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '0.65rem'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px' }}>
            Status:
          </span>

          {[
            { id: 'ALL', label: 'All Tasks', count: memberFilteredTasks.length },
            { id: 'In Progress', label: 'In Progress', count: inProgressCount },
            { id: 'Not Started', label: 'Queued', count: notStartedCount },
            { id: 'Done', label: 'Completed', count: completedCount },
            { id: 'On Hold', label: 'On Hold / Blockers', count: memberFilteredTasks.filter(t => t.status === 'On Hold' || t.status === 'Escalated').length }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: isActive ? '#2563eb' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.12s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#475569',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontSize: '0.66rem'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. ACTIVE MEMBER DOSSIER CARD (WHEN A MEMBER IS SELECTED)
      ────────────────────────────────────────────────────────────── */}
      {activeMember && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1.5px solid #a7f3d0',
          borderRadius: '12px',
          padding: '0.9rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
        }}>
          {/* Member Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(5, 150, 105, 0.25)'
            }}>
              {activeMember.avatar || activeMember.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#064e3b' }}>
                  {activeMember.name}
                </span>
                <span style={{
                  background: '#d1fae5',
                  color: '#065f46',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  {activeMember.designation}
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '2px' }}>
                {activeMember.email} • {activeMember.department} Cluster
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Assigned</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#064e3b' }}>{totalTasksCount} Deliverables</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>In Progress</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>{inProgressCount} Active</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Velocity</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669' }}>{sprintVelocity}% Completed</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMemberFilter(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                background: '#ffffff',
                color: '#047857',
                border: '1px solid #6ee7b7',
                borderRadius: '7px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <ArrowLeft size={13} />
              <span>Reset to Company Overview</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. POLISHED EXECUTIVE DELIVERABLES TABLE
      ────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', width: '50px' }}>
                  #
                </th>
                <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Deliverable & Project
                </th>
                <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Department
                </th>
                <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assignee
                </th>
                <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Timeline & Due
                </th>
                <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Priority
                </th>
                <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status & Progress
                </th>
                <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  Executive Governance
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedTasks.map((task, idx) => {
                const isOverdue = task.scheduledDate < todayStr && task.status !== 'Done';
                const isConfirmingDelete = deletingTaskId === task.id;

                return (
                  <tr
                    key={`${task.id}-${idx}`}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    {/* Sequence Badge */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 800
                      }}>
                        #{idx + 1}
                      </span>
                    </td>

                    {/* Deliverable Title & Project */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                          {task.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {task.project && (
                            <span style={{
                              fontSize: '0.68rem',
                              color: '#475569',
                              background: '#f1f5f9',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <Briefcase size={10} color="#64748b" />
                              {task.project}
                            </span>
                          )}
                          {task.location && (
                            <span style={{
                              fontSize: '0.68rem',
                              color: '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}>
                              <MapPin size={10} />
                              {task.location}
                            </span>
                          )}
                        </div>
                        {task.notes && (
                          <div style={{ fontSize: '0.68rem', color: '#0284c7', fontStyle: 'italic', marginTop: '1px' }}>
                            Note: {task.notes.length > 50 ? `${task.notes.slice(0, 50)}...` : task.notes}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Department Cluster */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <span style={{
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #e2e8f0',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {task.department || 'Operations'}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.66rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {task.assignees?.[0]?.avatar || task.assignees?.[0]?.name?.slice(0, 2).toUpperCase() || 'TM'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {task.assignees?.map(a => a.name).join(', ') || 'Unassigned'}
                          </div>
                          {task.assignees?.[0]?.designation && (
                            <div style={{ fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {task.assignees[0].designation}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Timeline & Due */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', fontWeight: 700, color: isOverdue ? '#dc2626' : '#1e293b' }}>
                          <Calendar size={12} color={isOverdue ? '#dc2626' : '#64748b'} />
                          <span>{formatDateShort(task.scheduledDate) || task.scheduledDate}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#64748b' }}>
                          <Clock size={11} />
                          <span>{task.time || '09:00 AM'}</span>
                        </div>
                        {isOverdue && (
                          <span style={{
                            background: '#fee2e2',
                            color: '#b91c1c',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            display: 'inline-block',
                            width: 'fit-content'
                          }}>
                            PAST DUE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      {(() => {
                        const pri = (task.priority || 'NORMAL').toUpperCase();
                        let bg = '#eff6ff';
                        let text = '#1d4ed8';
                        let border = '#bfdbfe';

                        if (pri === 'URGENT') {
                          bg = '#fef2f2';
                          text = '#b91c1c';
                          border = '#fecaca';
                        } else if (pri === 'HIGH') {
                          bg = '#fff7ed';
                          text = '#c2410c';
                          border = '#fed7aa';
                        } else if (pri === 'LOW') {
                          bg = '#f8fafc';
                          text = '#64748b';
                          border = '#e2e8f0';
                        }

                        return (
                          <span style={{
                            background: bg,
                            color: text,
                            border: `1px solid ${border}`,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                          }}>
                            {pri}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Status & Progress */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: task.status === 'Done' ? '#10b981' : task.status === 'In Progress' ? '#3b82f6' : task.status === 'On Hold' ? '#f59e0b' : '#94a3b8'
                          }} />
                          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a' }}>
                            {task.status}
                          </span>
                          {task.progressPercent !== undefined && task.status === 'In Progress' && (
                            <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>
                              ({task.progressPercent}%)
                            </span>
                          )}
                        </div>

                        {/* Progress meter */}
                        <div style={{ width: '80px', height: '3px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${task.status === 'Done' ? 100 : task.status === 'In Progress' ? (task.progressPercent || 50) : 0}%`,
                            height: '100%',
                            background: task.status === 'Done' ? '#10b981' : '#3b82f6',
                            borderRadius: '999px'
                          }} />
                        </div>

                        {task.holdReason && (
                          <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>
                            Hold: {task.holdReason.slice(0, 25)}...
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Executive Governance Actions */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                        {/* Inspect Details Button */}
                        <button
                          type="button"
                          onClick={() => setInspectingTask(task)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '4px 8px',
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.12s ease'
                          }}
                          title="Inspect comprehensive deliverable dossier"
                        >
                          <Eye size={12} color="#0284c7" />
                          <span>Inspect</span>
                        </button>

                        {/* Audit Trail Button */}
                        <button
                          type="button"
                          onClick={() => setViewingAuditForTaskId(task.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '4px 8px',
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.12s ease'
                          }}
                          title="View complete immutable audit log history for this deliverable"
                        >
                          <ShieldCheck size={12} color="#059669" />
                          <span>Audit</span>
                        </button>

                        {/* Safe Delete Button */}
                        {isCeo && (
                          <>
                            {!isConfirmingDelete ? (
                              <button
                                type="button"
                                onClick={() => setDeletingTaskId(task.id)}
                                style={{
                                  padding: '4px 7px',
                                  background: '#ffffff',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '6px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease'
                                }}
                                title="CEO Action: Permanently remove deliverable"
                              >
                                <Trash2 size={12} color="#dc2626" />
                              </button>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleExecuteDelete(task.id)}
                                  style={{
                                    padding: '4px 7px',
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                  title="Confirm Permanent Deletion"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTaskId(null)}
                                  style={{
                                    padding: '4px 6px',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '5px',
                                    fontSize: '0.68rem',
                                    cursor: 'pointer'
                                  }}
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {displayedTasks.length === 0 && (
          <div style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={22} color="#94a3b8" />
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
              No deliverables found matching active filters
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '380px' }}>
              Try adjusting your search criteria or resetting filters to view all company deliverables.
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 14px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={13} />
                <span>Show All Company Tasks</span>
              </button>
            )}
          </div>
        )}

        {/* Table Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.72rem',
          color: '#64748b'
        }}>
          <div>
            Showing <strong>{displayedTasks.length}</strong> of <strong>{memberFilteredTasks.length}</strong> deliverables 
            {activeMember ? ` assigned to ${activeMember.name}` : ' across all corporate staff'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span>Executive Governance Ledger • Synchronized Real-Time</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. EXECUTIVE TASK DETAIL INSPECTION DRAWER / MODAL
      ────────────────────────────────────────────────────────────── */}
      {inspectingTask && (
        <div 
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setInspectingTask(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '0.66rem',
                    fontWeight: 800
                  }}>
                    {inspectingTask.department || 'General'}
                  </span>
                  <span style={{
                    background: inspectingTask.status === 'Done' ? '#ecfdf5' : '#eff6ff',
                    color: inspectingTask.status === 'Done' ? '#059669' : '#1d4ed8',
                    border: inspectingTask.status === 'Done' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '0.66rem',
                    fontWeight: 800
                  }}>
                    {inspectingTask.status}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {inspectingTask.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setInspectingTask(null)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Core Info Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem'
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Project</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                  {inspectingTask.project || 'Core Infrastructure'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Location</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                  {inspectingTask.location || 'Jaipur'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Due Date & Time</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                  {inspectingTask.scheduledDate} ({inspectingTask.time || '09:00 AM'})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Priority Level</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                  {inspectingTask.priority}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Deliverable Description
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: '#334155',
                lineHeight: 1.5,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem'
              }}>
                {inspectingTask.description || 'No detailed written description provided for this deliverable.'}
              </div>
            </div>

            {/* Assignees */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                Assigned Team Members ({inspectingTask.assignees?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {inspectingTask.assignees?.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#2563eb',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {a.avatar || a.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{a.name}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{a.status || 'Not Started'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Due / Hold Reason if any */}
            {inspectingTask.pastDueReason && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '0.7rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9f1239' }}>Past Due Justification</div>
                <div style={{ fontSize: '0.76rem', color: '#881337', marginTop: '2px' }}>{inspectingTask.pastDueReason}</div>
              </div>
            )}

            {inspectingTask.holdReason && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.7rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e' }}>Hold / Blocker Reason</div>
                <div style={{ fontSize: '0.76rem', color: '#78350f', marginTop: '2px' }}>{inspectingTask.holdReason}</div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem' }}>
              <button
                type="button"
                onClick={() => {
                  const id = inspectingTask.id;
                  setInspectingTask(null);
                  setViewingAuditForTaskId(id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '7px 12px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  borderRadius: '7px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck size={14} color="#2563eb" />
                <span>View Full Audit History</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectingTask(null)}
                style={{
                  padding: '7px 14px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '7px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
