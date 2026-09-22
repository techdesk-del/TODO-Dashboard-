import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Role } from '@/types';
import { Mail, Moon, ChevronDown, Check, Compass, Menu, X as XIcon, Bell, Lock } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { useTaskDeadlines } from '@/hooks/useTaskDeadlines';

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
    dbStatus
  } = useApp();
//


  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { notificationPermission, requestPermission } = useTaskDeadlines();

  const formatDateDisplay = (dateStr: string) => {
    if (dateStr === '2026-09-15') return 'Tue, 15 Sep 2026';
    if (dateStr === '2026-09-16') return 'Wed, 16 Sep 2026';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const roleOptions: { role: Role; label: string; desc: string }[] = [
    { role: 'SUPER_ADMIN', label: 'Super Admin / Director', desc: 'Full Executive Command & Audit' },
    { role: 'ADMIN',       label: 'Admin / Talent HR',      desc: 'People Ops & Oversight' },
    { role: 'MANAGER',     label: 'Reporting Manager',      desc: 'Team Balancing & Escalations' },
    { role: 'EMPLOYEE',    label: 'Employee / Staff',       desc: 'Daily Register & Voice AI' }
  ];

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
        <div className="active-date-pill">
          {formatDateDisplay(selectedDate)}
        </div>

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

        {/* Browser Push Notification Permission Button */}
        <button
          onClick={requestPermission}
          className="btn-secondary"
          title={notificationPermission === 'granted' ? 'Desktop Notifications Active (15m alerts)' : 'Click to enable Desktop Push Notifications'}
          style={{
            padding: 'clamp(0.28rem,1.5vw,0.35rem) clamp(0.4rem,2vw,0.65rem)',
            background: notificationPermission === 'granted' ? '#ecfdf5' : undefined,
            borderColor: notificationPermission === 'granted' ? '#a7f3d0' : undefined,
            color: notificationPermission === 'granted' ? '#047857' : undefined,
          }}
        >
          <Bell size={14} color={notificationPermission === 'granted' ? '#059669' : '#64748b'} />
          <span style={{ fontSize: '0.72rem' }}>
            {notificationPermission === 'granted' ? 'Alerts ON' : 'Enable Alerts'}
          </span>
        </button>

        {/* User Profile & Role Switcher */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            className="user-profile-badge"
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            title="Click to switch roles or sign in"
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
              width: 'min(260px, 90vw)',
              padding: '0.5rem',
              zIndex: 100
            }}>
              {/* Credentials Sign In Trigger */}
              <div
                onClick={() => { setIsAuthModalOpen(true); setIsRoleMenuOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.65rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                }}
              >
                <Lock size={14} color="#2563eb" />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e3a8a' }}>
                    Sign In / Register (2FA)
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    MongoDB Credentials Auth
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', padding: '0.4rem 0.6rem', textTransform: 'uppercase' }}>
                Quick Demo Role Switch
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
