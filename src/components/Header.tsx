import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Role } from '@/types';
import { 
  Mail, 
  Moon, 
  ChevronDown, 
  Check, 
  Menu, 
  X as XIcon, 
  Bell, 
  Lock, 
  LogIn, 
  LogOut, 
  Trash2,
  CalendarDays,
  Zap,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Plus,
  Edit3,
  Loader2,
  User
} from 'lucide-react';
import { useTaskDeadlines } from '@/hooks/useTaskDeadlines';
import { formatDateDisplay, formatDateShort, getTodayStr } from '@/lib/dateUtils';
import { isCeoUser, isStrictCeo } from '@/lib/rosterData';

export const Header: React.FC = () => {
  const {
    currentUser,
    selectedDate,
    setSelectedDate,
    setViewScope,
    setShowMorningDigestModal,
    setIsCreateTaskModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    runNightlyRolloverSimulation,
    setActiveView,
    activeView,
    isMobileNavOpen,
    setIsMobileNavOpen,
    clearAllTasks,
    logoutUser,
    updateTask,
    tasks,
    isAuthModalOpen,
    setIsAuthModalOpen,
    setAuthModalInitialMode,
    inAppNotifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    updateProfileName,
    updateProfile
  } = useApp();

  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [notifActiveTab, setNotifActiveTab] = useState<'alerts' | 'overdue'>('alerts');
  const [isMounted, setIsMounted] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [designationInput, setDesignationInput] = useState('');
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const opsMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const { notificationPermission, requestPermission, overdueTasks, dueSoonTasks, pendingCount } = useTaskDeadlines();
  const isCeoMonitoring = isMounted && isStrictCeo(currentUser);

  const handleOpenEditProfile = () => {
    setNameInput(currentUser.name || '');
    setEmailInput(currentUser.email || '');
    setDesignationInput(currentUser.designation || '');
    setEmployeeIdInput(currentUser.employeeId || currentUser.id || '');
    setProfileError('');
    setIsEditProfileModalOpen(true);
    setIsRoleMenuOpen(false);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = nameInput.trim();
    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedEmpId = employeeIdInput.trim();
    const trimmedDesignation = designationInput.trim();

    if (!trimmedName) {
      setProfileError('Display name cannot be empty.');
      return;
    }
    if (trimmedName.length < 2) {
      setProfileError('Display name must be at least 2 characters long.');
      return;
    }

    if (!trimmedEmail) {
      setProfileError('Corporate email cannot be empty.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setProfileError('Please enter a valid corporate email address.');
      return;
    }

    if (!trimmedEmpId) {
      setProfileError('Employee ID cannot be empty.');
      return;
    }

    if (
      trimmedName === currentUser.name &&
      trimmedEmail === currentUser.email?.toLowerCase() &&
      trimmedDesignation === (currentUser.designation || '') &&
      trimmedEmpId === (currentUser.employeeId || currentUser.id)
    ) {
      setIsEditProfileModalOpen(false);
      return;
    }

    setIsSavingProfile(true);
    setProfileError('');
    try {
      const res = await updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        designation: trimmedDesignation,
        employeeId: trimmedEmpId
      });
      if (res.success) {
        setIsEditProfileModalOpen(false);
      } else {
        setProfileError(res.error || 'Failed to update profile.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (
        searchParams.get('invite') ||
        searchParams.get('invitation') ||
        searchParams.get('code') ||
        searchParams.get('mode') ||
        searchParams.get('action') ||
        searchParams.get('auth') ||
        searchParams.get('login')
      ) {
        setAuthModalInitialMode('LOGIN');
        setIsAuthModalOpen(true);
      }
    }
  }, []);

  // Close dropdown on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (roleMenuRef.current && !roleMenuRef.current.contains(target)) {
        setIsRoleMenuOpen(false);
      }
      if (opsMenuRef.current && !opsMenuRef.current.contains(target)) {
        setIsOpsMenuOpen(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setIsNotificationCenterOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRoleMenuOpen(false);
        setIsOpsMenuOpen(false);
        setIsNotificationCenterOpen(false);
      }
    };

    if (isRoleMenuOpen || isOpsMenuOpen || isNotificationCenterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRoleMenuOpen, isOpsMenuOpen, isNotificationCenterOpen]);

  // Formats user name intelligently instead of just showing "Mr."
  const getDisplayName = (name?: string) => {
    if (!name) return 'Guest';
    const trimmed = name.trim();
    if (/^Mr\.?\s+/i.test(trimmed)) {
      const parts = trimmed.replace(/^Mr\.?\s+/i, '').split(' ');
      return `Mr. ${parts[0]}`;
    }
    if (/^Ms\.?\s+/i.test(trimmed)) {
      const parts = trimmed.replace(/^Ms\.?\s+/i, '').split(' ');
      return `Ms. ${parts[0]}`;
    }
    const parts = trimmed.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  };

  const handleClearData = async () => {
    if (!isCeo) {
      alert("Access Restricted: Only CEO Mr. Sukh Sagar Singh Bhati can clear company deliverables.");
      return;
    }
    const isConfirmed = confirm(
      'Are you sure you want to clear ALL deliverables from MongoDB Atlas and local memory?\n\nThis will reset the board to 0 tasks so you can test with fresh data.'
    );
    if (isConfirmed) {
      await clearAllTasks();
    }
  };

  const isGuest = !isMounted || currentUser.id === 'guest';
  const isCeo = isMounted && isCeoUser(currentUser);
  const isAdmin = isMounted && (isCeo || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN');

  return (
    <header className="app-header">
      {/* Left Sidebar-Aligned Brand Panel */}
      <div className="header-brand-panel">
        {/* Mobile Hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileNavOpen}
        >
          {isMobileNavOpen
            ? <XIcon size={18} color="#334155" />
            : <Menu size={18} color="#334155" />}
        </button>

        <div
          className="logo-container"
          onClick={() => setActiveView('workspace')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%' }}
          title="UrbanGaon — a perfect balance"
        >
          <img
            src="/urbangaon-logo.png"
            alt="UrbanGaon — a perfect balance"
            className="brand-official-logo"
          />
        </div>
      </div>

      {/* Main Workspace Header Bar */}
      <div className="header-main-section">
        <div className="platform-title-group">
          <div className="platform-title-main">
            Intelligent Voice & Calendar Todo
          </div>
          <div className="platform-subtitle">
            Real-Time Synchronized Daily Task Planner
          </div>
        </div>

      {/* Right: Meta actions + user */}
      <div className="header-meta-group">
        {/* Dynamic Synchronized Date Badge */}
        <button
          type="button"
          onClick={() => {
            setSelectedDate(getTodayStr());
            setViewScope('selected');
            setActiveView('workspace');
          }}
          className="active-date-pill"
          style={{ cursor: 'pointer', border: '1px solid var(--border-subtle)', background: '#f8fafc' }}
          title={`Active Date: ${formatDateDisplay(selectedDate)} — Click to view Today's deliverables`}
        >
          <CalendarDays size={14} color="#2563eb" />
          <span className="date-pill-full">{formatDateDisplay(selectedDate)}</span>
          <span className="date-pill-compact">{formatDateShort(selectedDate)}</span>
        </button>

        {/* Flowchart 6: Add Task Action Button (Disabled & Hidden for CEO - Executive Monitor Mode) */}
        {!isCeoMonitoring ? (
          <button
            type="button"
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="header-action-btn header-add-task-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              minHeight: '32px'
            }}
            title="Add New Deliverable / Task"
          >
            <Plus size={15} strokeWidth={2.75} />
            <span className="header-action-label">Add Task</span>
          </button>
        ) : (
          <div
            className="header-action-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 11px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#38bdf8',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12)',
              whiteSpace: 'nowrap',
              minHeight: '32px'
            }}
            title="Executive Oversight Active — Real-time Deliverable Monitoring across all employees"
          >
            
            <span>Executive Monitor</span>
          </div>
        )}

        {/* Flowchart E / 14: Enterprise Multi-Sheet Excel Export */}
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="header-action-btn header-export-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 11px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: '#15803d',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(16, 185, 129, 0.1)',
            minHeight: '32px'
          }}
          title="Export Deliverables to Excel"
        >
          <FileSpreadsheet size={14} color="#16a34a" />
          <span className="header-action-label">Export</span>
        </button>

        {/* Executive Ops Dropdown (Strictly CEO & Super Admin Only) */}
        {isCeo && (
          <div ref={opsMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsOpsMenuOpen(!isOpsMenuOpen)}
              className="btn-secondary header-icon-btn"
              style={{
                width: '32px',
                height: '32px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isOpsMenuOpen ? '#eff6ff' : '#ffffff',
                borderColor: isOpsMenuOpen ? '#2563eb' : '#cbd5e1',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                boxShadow: isOpsMenuOpen ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none'
              }}
              title="Automated Enterprise Engines (08:30 AM Digest, 00:05 AM Rollover & Data Reset)"
              aria-expanded={isOpsMenuOpen}
              aria-haspopup="true"
            >
              <Zap size={15} color="#2563eb" fill={isOpsMenuOpen ? '#2563eb' : 'none'} />
            </button>

            {isOpsMenuOpen && (
              <>
                <div 
                  className="mobile-dropdown-backdrop"
                  onClick={() => setIsOpsMenuOpen(false)}
                  aria-hidden="true"
                />
                <div 
                  className="header-dropdown-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '320px',
                    maxWidth: 'calc(100vw - 20px)',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(0,0,0,0.06)',
                    zIndex: 100,
                    padding: '8px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Header: Live Cron Status */}
                  <div style={{
                    padding: '8px 10px 10px',
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                        Automated System Engines
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 700, 
                          color: '#16a34a', 
                          background: '#f0fdf4', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                          Daemon Active
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsOpsMenuOpen(false)}
                          className="dropdown-close-btn"
                          title="Close"
                          aria-label="Close"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>
                      FC 11 (00:05 Rollover) & FC 13 (08:30 Digest) background schedulers
                    </div>
                  </div>

                {/* Option 1: 08:30 AM Morning Digest */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMorningDigestModal(true);
                    setIsOpsMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{ 
                    padding: '6px', 
                    borderRadius: '8px', 
                    background: '#eff6ff', 
                    color: '#2563eb',
                    marginTop: '2px' 
                  }}>
                    <Mail size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                        Morning Email Digest
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '1px 5px', borderRadius: '4px' }}>
                        08:30 AM
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                      Simulate & preview portfolio email briefing
                    </div>
                  </div>
                </button>

                {/* Option 2: 00:05 AM Midnight Carry-Forward Rollover */}
                <button
                  type="button"
                  onClick={() => {
                    runNightlyRolloverSimulation();
                    setIsOpsMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'background 0.15s ease',
                    marginTop: '2px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{ 
                    padding: '6px', 
                    borderRadius: '8px', 
                    background: '#f5f3ff', 
                    color: '#7c3aed',
                    marginTop: '2px' 
                  }}>
                    <Moon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                        Midnight Rollover
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', padding: '1px 5px', borderRadius: '4px' }}>
                        00:05 AM
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                      Auto-roll unfinished tasks to today with count++
                    </div>
                  </div>
                </button>

                {/* Divider */}
                <div style={{ height: '1px', background: '#e2e8f0', margin: '6px 4px' }} />

                {/* Option 3: Clear Deliverables Data */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpsMenuOpen(false);
                    handleClearData();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#fef2f2';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{ 
                    padding: '6px', 
                    borderRadius: '8px', 
                    background: '#fee2e2', 
                    color: '#dc2626',
                    marginTop: '2px' 
                  }}>
                    <Trash2 size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>
                        Reset Deliverables
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#b91c1c', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>
                        {tasks.length} tasks
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#991b1b', marginTop: '2px', lineHeight: 1.3 }}>
                      Clear company tasks to test with fresh data (CEO only)
                    </div>
                  </div>
                </button>

                {/* Footer Policy Badge */}
                <div style={{
                  padding: '6px 10px 4px',
                  marginTop: '4px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  color: '#64748b',
                  textAlign: 'center'
                }}>
                  Zero spam policy • Auto-suppressed on Sundays & Holidays
                </div>
              </div>
            </>
          )}
        </div>
      )}

        {/* Real-Time Notification Bell & Pending Alert Center */}
        {(() => {
          const totalNotifCount = unreadNotificationsCount + pendingCount;
          return (
            <div ref={notificationMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                className="btn-secondary header-icon-btn"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isNotificationCenterOpen ? '#fee2e2' : (totalNotifCount > 0 ? '#fff1f2' : '#ffffff'),
                  borderColor: isNotificationCenterOpen ? '#dc2626' : (totalNotifCount > 0 ? '#fca5a5' : '#cbd5e1'),
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: totalNotifCount > 0 ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : 'none'
                }}
                title={totalNotifCount > 0 ? `${totalNotifCount} Notifications (${unreadNotificationsCount} In-App Alerts, ${pendingCount} Overdue)` : 'Notification Center'}
                aria-expanded={isNotificationCenterOpen}
                aria-haspopup="true"
              >
                <Bell size={15} color={totalNotifCount > 0 ? '#dc2626' : '#64748b'} />
                {totalNotifCount > 0 && (
                  <span
                    className="notif-count-badge"
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#dc2626',
                      color: 'white',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      borderRadius: '10px',
                      minWidth: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                      border: '2px solid #ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                  >
                    {totalNotifCount}
                  </span>
                )}
              </button>

              {isNotificationCenterOpen && (
                <>
                  <div
                    className="mobile-dropdown-backdrop"
                    onClick={() => setIsNotificationCenterOpen(false)}
                    aria-hidden="true"
                  />
                  <div 
                    className="header-dropdown-panel"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      width: '380px',
                      maxWidth: 'calc(100vw - 20px)',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(0,0,0,0.06)',
                      zIndex: 100,
                      padding: '10px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header */}
                    <div style={{
                      padding: '4px 6px 8px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Bell size={14} color="#2563eb" />
                          Executive Notification Hub
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          Automated Dispatch Engine
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {unreadNotificationsCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#2563eb',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsNotificationCenterOpen(false)}
                          className="dropdown-close-btn"
                          title="Close Notification Center"
                          aria-label="Close"
                        >
                          <XIcon size={15} />
                        </button>
                      </div>
                    </div>

                  {/* Tabs: In-App Alerts (Flowchart 20) vs Overdue Deliverables */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', margin: '8px 0 6px', background: '#f8fafc', padding: '3px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setNotifActiveTab('alerts')}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: notifActiveTab === 'alerts' ? '#ffffff' : 'transparent',
                        color: notifActiveTab === 'alerts' ? '#2563eb' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        boxShadow: notifActiveTab === 'alerts' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>In-App Alerts</span>
                      {unreadNotificationsCount > 0 && (
                        <span style={{ background: '#2563eb', color: 'white', borderRadius: '10px', fontSize: '0.6rem', padding: '1px 5px', fontWeight: 800 }}>
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotifActiveTab('overdue')}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: notifActiveTab === 'overdue' ? '#ffffff' : 'transparent',
                        color: notifActiveTab === 'overdue' ? '#dc2626' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        boxShadow: notifActiveTab === 'overdue' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>Overdue Tasks</span>
                      {pendingCount > 0 && (
                        <span style={{ background: '#dc2626', color: 'white', borderRadius: '10px', fontSize: '0.72rem', padding: '1px 6px', fontWeight: 800 }}>
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Tab 1 Content: In-App Alerts (Flowchart 20) */}
                  {notifActiveTab === 'alerts' && (
                    <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {inAppNotifications.length > 0 ? (
                        inAppNotifications.map(notif => {
                          const typeBadge =
                            notif.type === 'TASK_ASSIGNED' ? { label: 'ASSIGNED', bg: '#eff6ff', color: '#1d4ed8' } :
                            notif.type === 'TASK_ESCALATED' ? { label: 'ESCALATED', bg: '#fef2f2', color: '#b91c1c' } :
                            notif.type === 'TASK_REOPENED' ? { label: 'REOPENED', bg: '#f0f9ff', color: '#0369a1' } :
                            notif.type === 'REASON_STATUS_CHANGED' ? { label: 'DECISION', bg: '#ecfdf5', color: '#047857' } :
                            notif.type === 'CHRONIC_DELAY' ? { label: 'DELAY ALERT', bg: '#fff7ed', color: '#c2410c' } :
                            { label: 'NOTICE', bg: '#f8fafc', color: '#475569' };

                          return (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (!notif.read) markNotificationRead(notif.id);
                                if (notif.taskId) {
                                  setActiveView('workspace');
                                  setIsNotificationCenterOpen(false);
                                }
                              }}
                              style={{
                                padding: '8px 10px',
                                background: notif.read ? '#ffffff' : '#f8fafc',
                                borderLeft: notif.read ? '3px solid #cbd5e1' : '3px solid #2563eb',
                                borderTop: '1px solid #f1f5f9',
                                borderRight: '1px solid #f1f5f9',
                                borderBottom: '1px solid #f1f5f9',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: typeBadge.bg,
                                  color: typeBadge.color,
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {typeBadge.label}
                                </span>
                                {!notif.read && (
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />
                                )}
                              </div>
                              <div style={{ fontSize: '0.8125rem', fontWeight: notif.read ? 600 : 700, color: '#0f172a' }}>
                                {notif.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                                {notif.message}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                          Zero pending in-app alerts. You are completely up to date!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2 Content: Overdue Tasks */}
                  {notifActiveTab === 'overdue' && (
                    <>
                      {pendingCount > 0 && (
                        <div style={{
                          margin: '6px 0',
                          padding: '6px 8px',
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#9f1239', fontWeight: 600 }}>
                            {pendingCount} overdue task(s)
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const today = getTodayStr();
                              overdueTasks.forEach(t => {
                                updateTask(t.id, { scheduledDate: today }, `Batch rescheduled to today (${today}) via Notification Center`);
                              });
                              setSelectedDate(today);
                              setActiveView('workspace');
                              setIsNotificationCenterOpen(false);
                            }}
                            style={{
                              background: '#e11d48',
                              color: 'white',
                              border: 'none',
                              padding: '3px 7px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Reschedule to Today
                          </button>
                        </div>
                      )}

                      <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {overdueTasks.map((task, idx) => (
                          <div
                            key={`${task.id}-${idx}`}
                            onClick={() => {
                              setSelectedDate(task.scheduledDate);
                              setActiveView('workspace');
                              setIsNotificationCenterOpen(false);
                            }}
                            style={{
                              padding: '8px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {task.title}
                              </span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                {task.scheduledDate}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={11} /> {task.time}
                              </span>
                              <span>• Priority: <strong>{task.priority}</strong></span>
                            </div>
                          </div>
                        ))}

                        {pendingCount === 0 && (
                          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                            No overdue pending deliverables. All tasks are up to date!
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Push Permission Toggle in Footer */}
                  {notificationPermission !== 'granted' && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={requestPermission}
                        style={{
                          width: '100%',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Bell size={13} />
                        Enable Desktop Push Notifications
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            </div>
          );
        })()}
        {/* Explicit Sign In / Log In Button */}
        {isGuest ? (
          <button
            onClick={() => { setAuthModalInitialMode('LOGIN'); setIsAuthModalOpen(true); }}
            className="btn-primary"
            style={{
              padding: 'clamp(0.3rem,1.5vw,0.38rem) clamp(0.6rem,2vw,0.85rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.75rem',
              background: '#2563eb'
            }}
            title="Sign In with Corporate Email & Password"
          >
            <LogIn size={14} />
            <span className="nav-btn-text-full">Sign In</span>
            <span className="nav-btn-text-compact">Sign In</span>
          </button>
        ) : (
          <button
            onClick={logoutUser}
            className="btn-secondary header-logout-btn"
            style={{
              padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#64748b'
            }}
            title="Sign Out of current user session"
          >
            <LogOut size={13} />
            <span className="nav-btn-text-full">Log Out</span>
            <span className="nav-btn-text-compact">Log Out</span>
          </button>
        )}

        {/* User Profile & Role Switcher */}
        <div ref={roleMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <div
            className="user-profile-badge"
            onClick={() => setIsRoleMenuOpen(prev => !prev)}
            title={isMounted ? `Logged in as ${currentUser.name} (${currentUser.designation || (currentUser.role !== 'EMPLOYEE' ? currentUser.role.replace('_', ' ') : 'Team Member')}) — Click to view profile` : 'Logged in as Guest'}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setIsRoleMenuOpen(prev => !prev); }}
          >
            <div className="avatar-circle">
              {isMounted && (currentUser.avatar?.startsWith('/') || currentUser.avatar?.startsWith('http')) ? (
                <img src={currentUser.avatar} alt={currentUser.name} />
              ) : (
                isMounted ? (currentUser.avatar || 'AD') : 'GU'
              )}
            </div>
            <div className="user-info-text">
              <span className="user-name">{isMounted ? getDisplayName(currentUser.name) : 'Guest'}</span>
              <span className="user-role-label">
                {isMounted ? (currentUser.designation || (currentUser.role !== 'EMPLOYEE' ? currentUser.role.replace('_', ' ') : 'Team Member')) : 'Guest'}
              </span>
            </div>
            <ChevronDown
              className="user-badge-chevron"
              size={12}
              color="#64748b"
              style={{
                flexShrink: 0,
                transform: isRoleMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>

          {isRoleMenuOpen && (
            <div className="user-profile-dropdown-menu">
              {/* User Identity Header Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.6rem 0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '0.65rem'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {currentUser.avatar?.startsWith('/') || currentUser.avatar?.startsWith('http') ? (
                    <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    currentUser.avatar || 'AD'
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser.name}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditProfile();
                      }}
                      title="Edit Profile & Email"
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#2563eb'
                      }}
                    >
                      <Edit3 size={11} />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.email}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                      {currentUser.designation || (currentUser.role !== 'EMPLOYEE' ? currentUser.role.replace('_', ' ') : 'Team Member')}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                      {currentUser.department || 'UrbanGaon'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Profile Action Tile */}
              <div
                onClick={handleOpenEditProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.55rem 0.75rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '0.45rem',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div style={{
                  padding: '4px',
                  borderRadius: '6px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Edit3 size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1e293b' }}>
                    Edit Profile & Email
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Update display name, username & corporate email
                  </div>
                </div>
              </div>

              {/* Credentials Sign In Trigger - strictly for Guest (to log in) or CEO/Director ONLY, NEVER for anyone else */}
              {(isGuest || isCeoUser(currentUser)) && (
                <div
                  onClick={() => { setIsAuthModalOpen(true); setIsRoleMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.55rem 0.75rem',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '0.45rem',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <Lock size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1e40af' }}>
                      {isGuest ? 'Sign In / Employee Login' : 'Switch Account (Login)'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Secure corporate sign-in
                    </div>
                  </div>
                </div>
              )}

              {!isGuest && (
                <div
                  onClick={() => { logoutUser(); setIsRoleMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#dc2626',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <LogOut size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                    Log Out ({currentUser.name})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Edit Profile & Corporate Email Modal */}
    {isEditProfileModalOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSavingProfile) {
            setIsEditProfileModalOpen(false);
          }
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, #ffffff, #f8fafc)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <User size={18} />
              </div>
              <div>
                <h3
                  id="edit-profile-title"
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.01em'
                  }}
                >
                  Update Profile & Email
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Synchronizes permanently across sessions, tasks & rosters
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !isSavingProfile && setIsEditProfileModalOpen(false)}
              disabled={isSavingProfile}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close dialog"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Modal Body / Form */}
          <form onSubmit={handleSaveProfile} style={{ padding: '1.25rem 1.5rem' }}>
            {profileError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>⚠</span>
                <span>{profileError}</span>
              </div>
            )}

            {/* Field 1: Name / Username */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="profile-name-input"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem'
                }}
              >
                Full Display Name / Username *
              </label>
              <input
                id="profile-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (profileError) setProfileError('');
                }}
                disabled={isSavingProfile}
                placeholder="e.g. Sukh Sagar Singh Bhati"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Field 2: Official Corporate Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="profile-email-input"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem'
                }}
              >
                Official Corporate Email *
              </label>
              <input
                id="profile-email-input"
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (profileError) setProfileError('');
                }}
                disabled={isSavingProfile}
                placeholder="e.g. ceo@urbangaon.com"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Field 3: Employee ID & Role / Designation Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label
                  htmlFor="profile-empid-input"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.4rem'
                  }}
                >
                  Employee ID *
                </label>
                <input
                  id="profile-empid-input"
                  type="text"
                  value={employeeIdInput}
                  onChange={(e) => {
                    setEmployeeIdInput(e.target.value);
                    if (profileError) setProfileError('');
                  }}
                  disabled={isSavingProfile}
                  placeholder="e.g. mem-12 or EMP-1001"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-designation-input"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.4rem'
                  }}
                >
                  Role / Designation (Custom) *
                </label>
                <input
                  id="profile-designation-input"
                  type="text"
                  list="common-designations-list"
                  value={designationInput}
                  onChange={(e) => {
                    setDesignationInput(e.target.value);
                    if (profileError) setProfileError('');
                  }}
                  disabled={isSavingProfile}
                  placeholder="e.g. Team Lead, Senior SDE, HR Lead..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
                <datalist id="common-designations-list">
                  <option value="Team Lead" />
                  <option value="Lead Developer" />
                  <option value="Project Manager" />
                  <option value="Senior Software Engineer" />
                  <option value="Full Stack Developer" />
                  <option value="Operations Lead" />
                  <option value="Talent Acquisition & HR Lead" />
                  <option value="Quality Assurance Specialist" />
                  <option value="Business Analyst" />
                  <option value="Executive Director" />
                  <option value="Founder & CEO" />
                </datalist>
              </div>
            </div>

            {/* Current Profile Summary */}
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.72rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '4px'
              }}
            >
              <span>Designation: <strong style={{ color: '#166534' }}>{currentUser.designation || (currentUser.role !== 'EMPLOYEE' ? currentUser.role.replace('_', ' ') : 'Team Member')}</strong></span>
              <span>Employee ID: <strong style={{ color: '#0f172a' }}>{currentUser.employeeId || currentUser.id}</strong></span>
              <span>Department: <strong style={{ color: '#475569' }}>{currentUser.department || 'UrbanGaon'}</strong></span>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #f1f5f9'
              }}
            >
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                disabled={isSavingProfile}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isSavingProfile ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile || !nameInput.trim() || !emailInput.trim() || !employeeIdInput.trim()}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: (isSavingProfile || !nameInput.trim() || !emailInput.trim() || !employeeIdInput.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isSavingProfile || !nameInput.trim() || !emailInput.trim() || !employeeIdInput.trim()) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save & Update</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </header>
  );
};
