import React, { useState } from 'react';
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
import { formatDateDisplay } from '@/lib/dateUtils';

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
  const { notificationPermission, requestPermission } = useTaskDeadlines();

  const roleOptions: { role: Role; label: string; desc: string }[] = [
    { role: 'SUPER_ADMIN', label: 'Super Admin / Director', desc: 'Full Executive Command & Audit' },
    { role: 'ADMIN',       label: 'Admin / Talent HR',      desc: 'People Ops & Oversight' },
    { role: 'MANAGER',     label: 'Reporting Manager',      desc: 'Team Balancing & Escalations' },
    { role: 'EMPLOYEE',    label: 'Employee / Staff',       desc: 'Daily Register & Voice AI' }
  ];

  const handleClearData = async () => {
    const isConfirmed = confirm(
      'Are you sure you want to clear ALL deliverables from MongoDB Atlas and local memory?\n\nThis will reset the board to 0 tasks so you can test with fresh data.'
    );
    if (isConfirmed) {
      await clearAllTasks();
    }
  };

  const isGuest = currentUser.id === 'guest';

  return (
    <header className="app-header">
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

      {/* Brand */}
      <div className="brand-section">
        <div
          className="logo-container"
          onClick={() => setActiveView('workspace')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="UrbanGaon — a perfect balance"
        >
          <img
            src="/urbangaon-logo.png"
            alt="UrbanGaon — a perfect balance"
            className="brand-official-logo"
            style={{
              height: 'clamp(28px, 4vw, 36px)',
              width: 'auto',
              maxWidth: 'clamp(130px, 25vw, 175px)',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        <div className="platform-title-group">
          <div className="platform-title-main">
            Intelligent Voice & Calendar Todo
          </div>
          <div className="platform-subtitle">
            Real-Time Synchronized Daily Task Planner
          </div>
        </div>
      </div>

      {/* Right: Meta actions + user */}
      <div className="header-meta-group">
        {/* Dynamic Synchronized Date Badge */}
        <div className="active-date-pill" title="Current Active Calendar Date">
          <CalendarDays size={13} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
          {formatDateDisplay(selectedDate)}
        </div>

        {/* Clear Data Button for Fresh Testing */}
        <button
          onClick={handleClearData}
          className="btn-secondary"
          title="Clear all tasks from MongoDB to test with fresh data"
          style={{
            padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)',
            color: '#dc2626',
            borderColor: '#fca5a5',
            background: '#fef2f2'
          }}
        >
          <Trash2 size={13} color="#dc2626" />
          <span>Clear Data ({tasks.length})</span>
        </button>

        <button
          onClick={() => setShowMorningDigestModal(true)}
          className="btn-secondary"
          title="FC 13: Simulated 08:30 AM Morning Email Digest"
          style={{ padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)' }}
        >
          <Mail size={14} color="#2563eb" />
          <span>8:30 Digest</span>
        </button>

        <button
          onClick={runNightlyRolloverSimulation}
          className="btn-secondary"
          title="FC 11: Simulated 00:05 AM Midnight Carry-Forward"
          style={{ padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)' }}
        >
          <Moon size={14} color="#8b5cf6" />
          <span>Rollover</span>
        </button>

        <button
          onClick={() => setActiveView('workflow_manual')}
          className="btn-secondary"
          style={{
            padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)',
            background: activeView === 'workflow_manual' ? '#eff6ff' : undefined,
            borderColor: activeView === 'workflow_manual' ? '#bfdbfe' : undefined
          }}
          title="28 Flowcharts Executive Manual"
        >
          <Compass size={14} color="#d97706" />
          <span>Flows</span>
        </button>

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
            title="Sign In / Register with Email & Password"
          >
            <LogIn size={14} />
            <span>Sign In</span>
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
            <span>Log Out</span>
          </button>
        )}

        {/* User Profile & Role Switcher */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            className="user-profile-badge"
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            title="Click to view user menu, switch roles, or manage login"
          >
            <div className="avatar-circle">{currentUser.avatar}</div>
            <div className="user-info-text">
              <span className="user-name">{currentUser.name.split(' ')[0]}</span>
              <span className="user-role-label">{currentUser.role.replace('_', ' ')}</span>
            </div>
            <ChevronDown size={12} color="#64748b" style={{ flexShrink: 0 }} />
          </div>

          {isRoleMenuOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              width: 'min(280px, 90vw)',
              padding: '0.5rem',
              zIndex: 100
            }}>
              {/* Credentials Sign In Trigger */}
              <div
                onClick={() => { setIsAuthModalOpen(true); setIsRoleMenuOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.75rem',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                }}
              >
                <Lock size={15} color="#2563eb" />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af' }}>
                    {isGuest ? 'Sign In / Register' : 'Switch Account (Login)'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
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
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                    color: '#dc2626'
                  }}
                >
                  <LogOut size={14} color="#dc2626" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    Log Out ({currentUser.name})
                  </span>
                </div>
              )}

              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', padding: '0.4rem 0.6rem', textTransform: 'uppercase' }}>
                Quick Role Switching (Demo)
              </div>
              {roleOptions.map(opt => (
                <div
                  key={opt.role}
                  onClick={() => { switchRole(opt.role); setIsRoleMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: currentUser.role === opt.role ? '#eff6ff' : 'transparent',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: currentUser.role === opt.role ? '#2563eb' : '#1e293b', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{opt.desc}</div>
                  </div>
                  {currentUser.role === opt.role && <Check size={14} color="#2563eb" style={{ flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enterprise Authentication Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
};
