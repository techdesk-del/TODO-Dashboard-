'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  X, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  ChevronRight, 
  UserCheck,
  ArrowLeft,
  Send,
  Check,
  Search
} from 'lucide-react';
import { OFFICIAL_ROSTER } from '@/lib/rosterData';
import { Role, TeamMember } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthViewMode = 'LOGIN' | 'FORGOT_REQUEST' | 'FORGOT_VERIFY';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { setCurrentUser, currentUser, members, setActiveView, setBannerNotification } = useApp();
  const [authMode, setAuthMode] = useState<AuthViewMode>('LOGIN');

  // Login credentials
  const [email, setEmail] = useState(currentUser?.email || OFFICIAL_ROSTER[0].email);
  const [password, setPassword] = useState('123');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);

  // Password Reset / Set state
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRosterQuickPick, setShowRosterQuickPick] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [extraMembers, setExtraMembers] = useState<TeamMember[]>([]);

  // Ref to prevent timer overlap or auto-close when user is interacting
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleModalClose = () => {
    clearCloseTimer();
    setSuccess(null);
    setError(null);
    onClose();
  };

  // Reset transient error/success states, timers, and fetch latest members whenever modal opens
  useEffect(() => {
    if (isOpen) {
      clearCloseTimer();
      setSuccess(null);
      setError(null);
      setLoading(false);
      setRequires2FA(false);
      setShowRosterQuickPick(false);
      setRosterSearch('');
      setPassword('123');
      if (currentUser?.email) {
        setEmail(currentUser.email);
      }

      // Fetch latest roster from MongoDB Atlas to guarantee freshly created employees are displayed
      fetch(`/api/members?_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setExtraMembers(json.data);
          }
        })
        .catch(() => {});
    }
    return () => {
      clearCloseTimer();
    };
  }, [isOpen, currentUser?.email]);

  // Unified dynamic directory combining live members from database and roster
  const allDirectoryMembers = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      email: string;
      role: Role;
      department: string;
      designation: string;
      avatar: string;
      aliases?: string[];
      totalTasks?: number;
      completedTasks?: number;
      activeTasks?: number;
      overdueTasks?: number;
      velocity?: number;
    }> = [];

    const seenEmails = new Set<string>();

    // 1. Add all members from live app state & latest API fetch (excluding deactivated employees!)
    const combinedLiveMembers = [...(Array.isArray(members) ? members : []), ...extraMembers];

    // Collect all deactivated emails to completely suppress them from directory quick-pick
    const deactivatedEmails = new Set<string>();
    for (const m of combinedLiveMembers) {
      if (m?.email && (m.status === 'DEACTIVATED' || (m as any).isDeactivated)) {
        deactivatedEmails.add(m.email.toLowerCase().trim());
      }
    }

    for (const m of combinedLiveMembers) {
      if (!m || !m.email) continue;
      const cleanEmail = m.email.toLowerCase().trim();
      if (seenEmails.has(cleanEmail)) continue;
      // Suppress deactivated employees
      if (deactivatedEmails.has(cleanEmail) || m.status === 'DEACTIVATED' || (m as any).isDeactivated) {
        continue;
      }
      seenEmails.add(cleanEmail);

      const officialMatch = OFFICIAL_ROSTER.find(
        o => o.email.toLowerCase() === cleanEmail || o.id === m.id
      );

      list.push({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role || 'EMPLOYEE',
        department: m.department || 'General',
        designation: m.designation || 'Specialist',
        avatar: m.avatar || (m.name ? m.name.slice(0, 2).toUpperCase() : 'EM'),
        aliases: officialMatch?.aliases,
        totalTasks: m.totalTasks ?? 0,
        completedTasks: m.completedTasks ?? 0,
        activeTasks: m.activeTasks ?? 0,
        overdueTasks: m.overdueTasks ?? 0,
        velocity: m.velocity ?? 100,
      });
    }

    // 2. Also ensure official roster defaults are included if not present and not deactivated
    for (const o of OFFICIAL_ROSTER) {
      const cleanEmail = o.email.toLowerCase().trim();
      if (deactivatedEmails.has(cleanEmail)) continue;
      if (!seenEmails.has(cleanEmail)) {
        seenEmails.add(cleanEmail);
        list.push(o);
      }
    }

    return list;
  }, [members, extraMembers]);

  const filteredDirectoryMembers = React.useMemo(() => {
    if (!rosterSearch.trim()) return allDirectoryMembers;
    const q = rosterSearch.toLowerCase().trim();
    return allDirectoryMembers.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.designation && m.designation.toLowerCase().includes(q)) ||
      (m.department && m.department.toLowerCase().includes(q))
    );
  }, [allDirectoryMembers, rosterSearch]);

  if (!isOpen) return null;

  const activeEmailForLookup = authMode === 'LOGIN' ? email : (resetEmail || email);
  const selectedEmployee = allDirectoryMembers.find(
    emp => emp.email.toLowerCase() === activeEmailForLookup.trim().toLowerCase() ||
      emp.aliases?.some(a => a.toLowerCase() === activeEmailForLookup.trim().toLowerCase())
  );

  // Standard Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCloseTimer();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, twoFactorCode: requires2FA ? twoFactorCode : undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requires2FA) {
          setRequires2FA(true);
          setError(data.message);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Authentication failed');
      }

      // Find matching member from unified directory, local members list, or official roster data
      const matchedMember = allDirectoryMembers.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase()) ||
        members.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase()) ||
        OFFICIAL_ROSTER.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase());

      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        department: data.user.department,
        designation: data.user.designation || 'Specialist',
        avatar: data.user.avatar || (data.user.name[0] || 'U'),
        status: 'ACTIVE',
        totalTasks: matchedMember?.totalTasks ?? 3,
        completedTasks: matchedMember?.completedTasks ?? 1,
        activeTasks: matchedMember?.activeTasks ?? 2,
        overdueTasks: matchedMember?.overdueTasks ?? 0,
        velocity: matchedMember?.velocity ?? 95,
      });

      // Immediately redirect to main workspace dashboard
      setActiveView('workspace');
      setBannerNotification({
        message: `Welcome, ${data.user.name} (${data.user.designation})! Authenticated successfully.`,
        badge: 'AUTHENTICATED',
      });

      // Close modal immediately
      clearCloseTimer();
      handleModalClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request Password Reset Code
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCloseTimer();
    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail) {
      setError('Please provide your corporate email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification email');
      }

      setResetEmail(data.email || targetEmail);
      setSuccess(`Verification code dispatched to ${data.email || targetEmail}! Check your inbox.`);
      setAuthMode('FORGOT_VERIFY');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code and Set New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCloseTimer();
    setError(null);
    setSuccess(null);

    if (!resetCode || resetCode.trim().length !== 6) {
      setError('Please enter the valid 6-digit verification code sent to your email.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      const targetEmail = (resetEmail || email).trim();
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          code: resetCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set new password');
      }

      // Automatically log the user in
      const matchedMember = allDirectoryMembers.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase()) ||
        members.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase()) ||
        OFFICIAL_ROSTER.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase());

      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        department: data.user.department,
        designation: data.user.designation || 'Specialist',
        avatar: data.user.avatar || (data.user.name[0] || 'U'),
        status: 'ACTIVE',
        totalTasks: matchedMember?.totalTasks ?? 3,
        completedTasks: matchedMember?.completedTasks ?? 1,
        activeTasks: matchedMember?.activeTasks ?? 2,
        overdueTasks: matchedMember?.overdueTasks ?? 0,
        velocity: matchedMember?.velocity ?? 95,
      });

      // Immediately redirect to main workspace dashboard
      setActiveView('workspace');
      setBannerNotification({
        message: `Personal password configured successfully! Logged in as ${data.user.name}.`,
        badge: 'AUTHENTICATED',
      });

      clearCloseTimer();
      handleModalClose();
      setAuthMode('LOGIN');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error setting password');
    } finally {
      setLoading(false);
    }
  };

  const selectEmployee = (empEmail: string) => {
    clearCloseTimer();
    setEmail(empEmail);
    setResetEmail(empEmail);
    setPassword('123');
    setError(null);
    setSuccess(null);
    setRequires2FA(false);
    setShowRosterQuickPick(false);
    setRosterSearch('');
  };

  return (
    <div 
      className="stream-overlay" 
      onClick={e => {
        // Only close if clicking directly on the backdrop, not bubbling from card
        if (e.target === e.currentTarget) {
          handleModalClose();
        }
      }}
    >
      <div 
        className="stream-modal-card" 
        style={{ maxWidth: '480px', width: '92vw', borderRadius: '14px', overflow: 'hidden' }} 
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="stream-modal-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px' }}>
              <ShieldCheck size={22} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {authMode === 'LOGIN' && 'Corporate Employee Sign In'}
                {authMode === 'FORGOT_REQUEST' && 'Reset / Set Personal Password'}
                {authMode === 'FORGOT_VERIFY' && 'Verify Email & Set Password'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {authMode === 'LOGIN' && 'UrbanGaon Task Register • Verified Directory Auth'}
                {authMode === 'FORGOT_REQUEST' && 'Enter corporate email to receive a secure 6-digit code'}
                {authMode === 'FORGOT_VERIFY' && 'Enter the verification code sent to your corporate email'}
              </div>
            </div>
          </div>
          <button className="calendar-nav-btn" onClick={handleModalClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Quick Select Employee Pill / Toggle (available across all views for convenience) */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                clearCloseTimer();
                setShowRosterQuickPick(!showRosterQuickPick);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.85rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={14} color="#2563eb" />
                {selectedEmployee ? (
                  <span>
                    Selected: <strong>{selectedEmployee.name}</strong> ({selectedEmployee.designation})
                  </span>
                ) : (
                  <span>Choose Employee from Directory ({allDirectoryMembers.length} Members)</span>
                )}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                {showRosterQuickPick ? 'Hide Roster ▲' : 'Quick Select ▼'}
              </span>
            </button>

            {/* Quick Pick Employee Drawer */}
            {showRosterQuickPick && (
              <div style={{
                marginTop: '0.5rem',
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                padding: '0.35rem'
              }}>
                {/* Search Filter */}
                <div style={{ padding: '0.2rem 0.3rem 0.4rem 0.3rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.35rem' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={13} style={{ position: 'absolute', left: '8px', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search by name, email or department..."
                      value={rosterSearch}
                      onChange={e => setRosterSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem 0.35rem 1.65rem',
                        fontSize: '0.74rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        background: '#f8fafc'
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                </div>

                {filteredDirectoryMembers.map((emp) => {
                  const isSelected = emp.email.toLowerCase() === activeEmailForLookup.toLowerCase();
                  return (
                    <div
                      key={emp.id}
                      onClick={() => selectEmployee(emp.email)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: emp.role === 'SUPER_ADMIN' ? '#dbeafe' : emp.role === 'ADMIN' ? '#fef3c7' : emp.role === 'MANAGER' ? '#f3e8ff' : '#f1f5f9',
                          color: emp.role === 'SUPER_ADMIN' ? '#1e40af' : emp.role === 'ADMIN' ? '#92400e' : emp.role === 'MANAGER' ? '#6b21a8' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {emp.avatar}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.name}
                          </div>
                          <div style={{ fontSize: '0.67rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {emp.email} • {emp.designation}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                          {emp.department}
                        </span>
                        <ChevronRight size={13} color="#94a3b8" />
                      </div>
                    </div>
                  );
                })}

                {filteredDirectoryMembers.length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.74rem', color: '#94a3b8' }}>
                    No corporate employees match &ldquo;{rosterSearch}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.76rem',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '0.85rem'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.76rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '0.85rem'
            }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* VIEW 1: LOGIN FORM */}
          {authMode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Corporate Email Address
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 11px',
                  background: '#ffffff'
                }}>
                  <Mail size={15} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
                  <input
                    type="email"
                    required
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#0f172a' }}
                    placeholder="employee@urbangaon.com"
                    value={email}
                    onChange={e => {
                      clearCloseTimer();
                      setSuccess(null);
                      setError(null);
                      setEmail(e.target.value);
                    }}
                  />
                </div>
                {selectedEmployee && (
                  <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={11} />
                    <span>{selectedEmployee.department || 'UrbanGaon'} — {selectedEmployee.designation}</span>
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearCloseTimer();
                      setResetEmail(email);
                      setAuthMode('FORGOT_REQUEST');
                      setError(null);
                      setSuccess(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Forgot Password? / Set Password
                  </button>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 11px',
                  background: '#ffffff'
                }}>
                  <Lock size={15} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
                  <input
                    type="password"
                    required
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#0f172a' }}
                    placeholder="Enter password (default: 123)"
                    value={password}
                    onChange={e => {
                      clearCloseTimer();
                      setSuccess(null);
                      setError(null);
                      setPassword(e.target.value);
                    }}
                  />
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.68rem', color: '#64748b' }}>
                  Default password: <code>123</code> (or password123).
                </div>
              </div>

              {requires2FA && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>
                    6-Digit 2FA Authenticator Code
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '2px solid #2563eb',
                    borderRadius: '8px',
                    padding: '7px 11px',
                    background: '#eff6ff'
                  }}>
                    <KeyRound size={15} color="#2563eb" style={{ marginRight: '8px', flexShrink: 0 }} />
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        letterSpacing: '2px',
                        background: 'transparent'
                      }}
                      placeholder="123456"
                      value={twoFactorCode}
                      onChange={e => {
                        clearCloseTimer();
                        setTwoFactorCode(e.target.value);
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '9px',
                  marginTop: '0.35rem',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  borderRadius: '8px'
                }}
              >
                {loading ? 'Authenticating...' : (requires2FA ? 'Verify 2FA & Enter' : 'Sign In Securely')}
              </button>
            </form>
          )}

          {/* VIEW 2: FORGOT / SET PASSWORD - REQUEST CODE */}
          {authMode === 'FORGOT_REQUEST' && (
            <form onSubmit={handleRequestResetCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.74rem',
                color: '#1e40af',
                lineHeight: 1.5
              }}>
                📧 <strong>Self-Service Password Setup:</strong> Enter your corporate email address below. A 6-digit verification code will be sent to your inbox to authenticate and set your personal password.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Corporate Email Address
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 11px',
                  background: '#ffffff'
                }}>
                  <Mail size={15} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
                  <input
                    type="email"
                    required
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#0f172a' }}
                    placeholder="employee@urbangaon.com"
                    value={resetEmail || email}
                    onChange={e => {
                      clearCloseTimer();
                      setResetEmail(e.target.value);
                      setEmail(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    clearCloseTimer();
                    setAuthMode('LOGIN');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '8px',
                    fontSize: '0.8rem',
                    borderRadius: '8px'
                  }}
                >
                  <ArrowLeft size={14} style={{ marginRight: '4px' }} />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    flex: 2,
                    justifyContent: 'center',
                    padding: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    borderRadius: '8px'
                  }}
                >
                  <Send size={14} style={{ marginRight: '6px' }} />
                  {loading ? 'Sending Code...' : 'Send Email Code'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    clearCloseTimer();
                    setAuthMode('FORGOT_VERIFY');
                    setError(null);
                    setSuccess(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Already have a 6-digit verification code? Click here
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: FORGOT / SET PASSWORD - ENTER CODE & NEW PASSWORD */}
          {authMode === 'FORGOT_VERIFY' && (
            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.74rem',
                color: '#334155',
                lineHeight: 1.45
              }}>
                Target Account: <strong>{resetEmail || email}</strong>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Please check your inbox (including Spam/Promotions folder) for the 6-digit code.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>
                  6-Digit Verification Code
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '2px solid #2563eb',
                  borderRadius: '8px',
                  padding: '7px 11px',
                  background: '#eff6ff'
                }}>
                  <KeyRound size={15} color="#2563eb" style={{ marginRight: '8px', flexShrink: 0 }} />
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    style={{
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      letterSpacing: '4px',
                      background: 'transparent',
                      color: '#0f172a'
                    }}
                    placeholder="123456"
                    value={resetCode}
                    onChange={e => {
                      clearCloseTimer();
                      setResetCode(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  New Personal Password (Min 6 characters)
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 11px',
                  background: '#ffffff'
                }}>
                  <Lock size={15} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
                  <input
                    type="password"
                    required
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#0f172a' }}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => {
                      clearCloseTimer();
                      setNewPassword(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Confirm New Password
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '7px 11px',
                  background: '#ffffff'
                }}>
                  <Check size={15} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
                  <input
                    type="password"
                    required
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#0f172a' }}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={e => {
                      clearCloseTimer();
                      setConfirmPassword(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    clearCloseTimer();
                    setAuthMode('LOGIN');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    padding: '8px',
                    fontSize: '0.8rem',
                    borderRadius: '8px'
                  }}
                >
                  <ArrowLeft size={14} style={{ marginRight: '4px' }} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    flex: 2,
                    justifyContent: 'center',
                    padding: '8px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    borderRadius: '8px'
                  }}
                >
                  {loading ? 'Saving...' : 'Set Password & Sign In'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={handleRequestResetCode}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Didn't receive code? Resend email
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearCloseTimer();
                    setAuthMode('FORGOT_REQUEST');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}
                >
                  Change Email
                </button>
              </div>
            </form>
          )}

          {/* Enterprise Directory Note */}
          <div style={{
            marginTop: '1rem',
            padding: '10px 12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.7rem',
            color: '#64748b',
            lineHeight: 1.45
          }}>
            🔒 <strong>Enterprise Self-Service Security:</strong> Every employee is authorized to set and manage their own password via corporate email verification. Default credentials are automatically deactivated once your custom password is set.
          </div>
        </div>
      </div>
    </div>
  );
};
