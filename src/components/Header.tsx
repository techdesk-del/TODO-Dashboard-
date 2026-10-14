import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Role } from '@/types';
import { 
  Mail, 
  Moon, 
  ChevronDown, 
  Check, 
  Compass, 
  Menu, 
  X as XIcon, 
  Bell, 
  Lock, 
  LogIn, 
  LogOut, 
  Trash2,
  CalendarDays
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useTaskDeadlines } from '@/hooks/useTaskDeadlines';
import { formatDateDisplay, formatDateShort } from '@/lib/dateUtils';
import { isCeoUser, canAccessWorkflows } from '@/lib/rosterData';

export const Header: React.FC = () => {
  const {
    currentUser,
    switchRole,
    selectedDate,
    setShowMorningDigestModal,
    runNightlyRolloverSimulation,
    setActiveView,
    activeView,
    isMobileNavOpen,
    setIsMobileNavOpen,
    clearAllTasks,
    logoutUser,
    tasks
  } = useApp();

  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const { notificationPermission, requestPermission } = useTaskDeadlines();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close dropdown on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRoleMenuOpen(false);
      }
    };

    if (isRoleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRoleMenuOpen]);

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

  const roleOptions: { role: Role; label: string; desc: string }[] = [
    { role: 'SUPER_ADMIN', label: 'Super Admin / Director', desc: 'Full Executive Command & Audit' },
    { role: 'ADMIN',       label: 'Admin / Talent HR',      desc: 'People Ops & Oversight' },
    { role: 'MANAGER',     label: 'Reporting Manager',      desc: 'Team Balancing & Escalations' },
    { role: 'EMPLOYEE',    label: 'Employee / Staff',       desc: 'Daily Register & Voice AI' }
  ];

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
  const canViewFlows = isMounted && canAccessWorkflows(currentUser);

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
        <div className="active-date-pill" title="Current Active Calendar Date">
          <CalendarDays size={13} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
          <span className="date-pill-full">{formatDateDisplay(selectedDate)}</span>
          <span className="date-pill-compact">{formatDateShort(selectedDate)}</span>
        </div>

        {/* Clear Data Button (Strictly CEO Mr. Sukh Sagar Singh Bhati Only) */}
        {isCeo && (
          <button
            onClick={handleClearData}
            className="btn-secondary"
            title="Clear all tasks from MongoDB to test with fresh data (CEO Sukh Sagar ji Only)"
            style={{
              padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)',
              color: '#dc2626',
              borderColor: '#fca5a5',
              background: '#fef2f2'
            }}
          >
            <Trash2 size={13} color="#dc2626" />
            <span className="nav-btn-text-full">Clear Data ({tasks.length})</span>
            <span className="nav-btn-text-compact">Clear ({tasks.length})</span>
          </button>
        )}

        {/* Executive Actions strictly restricted to CEO */}
        {isCeo && (
          <>
            <button
              onClick={() => setShowMorningDigestModal(true)}
              className="btn-secondary"
              title="FC 13: Simulated 08:30 AM Morning Email Digest (CEO Only)"
              style={{ padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)' }}
            >
              <Mail size={14} color="#2563eb" />
              <span className="nav-btn-text-full">8:30 Digest</span>
              <span className="nav-btn-text-compact">Digest</span>
            </button>

            <button
              onClick={runNightlyRolloverSimulation}
              className="btn-secondary"
              title="FC 11: Simulated 00:05 AM Midnight Carry-Forward (CEO Only)"
              style={{ padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)' }}
            >
              <Moon size={14} color="#8b5cf6" />
              <span className="nav-btn-text-full">Rollover</span>
              <span className="nav-btn-text-compact">Rollover</span>
            </button>

          </>
        )}

        {/* 28 Workflows Manual (Strictly CEO & Talent Team Only) */}
        {canViewFlows && (
          <button
            onClick={() => setActiveView('workflow_manual')}
            className="btn-secondary"
            style={{
              padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)',
              background: activeView === 'workflow_manual' ? '#eff6ff' : undefined,
              borderColor: activeView === 'workflow_manual' ? '#bfdbfe' : undefined
            }}
            title="28 Flowcharts Executive Manual (CEO & Talent Team Only)"
          >
            <Compass size={14} color="#d97706" />
            <span className="nav-btn-text-full">Flows</span>
            <span className="nav-btn-text-compact">Flows</span>
          </button>
        )}

        {/* Explicit Sign In / Log In Button */}
        {isGuest ? (
          <button
            onClick={() => setIsAuthModalOpen(true)}
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
            className="btn-secondary"
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
            title={`Logged in as ${currentUser.name} (${currentUser.role}) — Click to view profile & roles`}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setIsRoleMenuOpen(prev => !prev); }}
          >
            <div className="avatar-circle">{isMounted ? currentUser.avatar : 'GU'}</div>
            <div className="user-info-text">
              <span className="user-name">{isMounted ? getDisplayName(currentUser.name) : 'Guest'}</span>
              <span className="user-role-label">{isMounted ? currentUser.role.replace('_', ' ') : 'EMPLOYEE'}</span>
            </div>
            <ChevronDown
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
                  flexShrink: 0
                }}>
                  {currentUser.avatar || 'AD'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.email}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb' }}>
                      {currentUser.role.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                      {currentUser.department || 'UrbanGaon'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credentials Sign In Trigger */}
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
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e40af' }}>
                    {isGuest ? 'Sign In / Employee Login' : 'Switch Account (Login)'}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                    Flowchart 1-5 Credentials Auth
                  </div>
                </div>
              </div>

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
                    marginBottom: '0.5rem',
                    color: '#dc2626',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <LogOut size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                    Log Out ({currentUser.name})
                  </span>
                </div>
              )}

              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#94a3b8', padding: '0.3rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Quick Role Switching (Demo)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {roleOptions.map(opt => (
                  <div
                    key={opt.role}
                    onClick={() => {
                      if (!isCeo) {
                        alert("Access Restricted: Organizational role modifications are strictly restricted to CEO Mr. Sukh Sagar Singh Bhati.");
                        setIsRoleMenuOpen(false);
                        return;
                      }
                      if (opt.role === 'SUPER_ADMIN' && !isCeoUser(currentUser)) {
                        alert("Access Restricted: Super Admin / Executive privileges require executive credentials.");
                        setIsAuthModalOpen(true);
                        setIsRoleMenuOpen(false);
                        return;
                      }
                      switchRole(opt.role);
                      setIsRoleMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: currentUser.role === opt.role ? '#eff6ff' : 'transparent',
                      gap: '0.5rem',
                      transition: 'background 0.12s ease'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: currentUser.role === opt.role ? '#2563eb' : '#1e293b', whiteSpace: 'nowrap' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#64748b' }}>{opt.desc}</div>
                    </div>
                    {currentUser.role === opt.role && <Check size={14} color="#2563eb" style={{ flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Enterprise Authentication Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
};
