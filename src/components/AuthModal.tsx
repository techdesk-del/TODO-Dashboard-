'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ShieldCheck, Lock, Mail, X, KeyRound, AlertCircle, CheckCircle2, Building2, ChevronRight, UserCheck } from 'lucide-react';
import { OFFICIAL_ROSTER } from '@/lib/rosterData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { setCurrentUser, currentUser, members } = useApp();
  const [email, setEmail] = useState(currentUser.email || OFFICIAL_ROSTER[0].email);
  const [password, setPassword] = useState('password123');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRosterQuickPick, setShowRosterQuickPick] = useState(false);

  if (!isOpen) return null;

  const selectedEmployee = OFFICIAL_ROSTER.find(
    emp => emp.email.toLowerCase() === email.trim().toLowerCase() ||
      emp.aliases?.some(a => a.toLowerCase() === email.trim().toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Find matching member from local members list or fallback to official roster data
      const matchedMember = members.find(m => m.email.toLowerCase() === data.user.email.toLowerCase()) ||
        OFFICIAL_ROSTER.find(m => m.email.toLowerCase() === data.user.email.toLowerCase());

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

      setSuccess(`Authenticated as ${data.user.name} (${data.user.designation})!`);
      setTimeout(() => onClose(), 1100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const selectEmployee = (empEmail: string) => {
    setEmail(empEmail);
    setPassword('password123');
    setError(null);
    setRequires2FA(false);
    setShowRosterQuickPick(false);
  };

  return (
    <div className="stream-overlay" onClick={onClose}>
      <div 
        className="stream-modal-card" 
        style={{ maxWidth: '480px', width: '92vw', borderRadius: '14px', overflow: 'hidden' }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="stream-modal-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px' }}>
              <ShieldCheck size={22} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Corporate Employee Sign In
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                UrbanGaon Task Register • Verified Directory Auth
              </div>
            </div>
          </div>
          <button className="calendar-nav-btn" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Quick Select Employee Pill / Toggle */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowRosterQuickPick(!showRosterQuickPick)}
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
                  <span>Choose Employee from Corporate Directory (11 Members)</span>
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
                maxHeight: '190px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                padding: '0.35rem'
              }}>
                {OFFICIAL_ROSTER.map((emp) => {
                  const isSelected = emp.email.toLowerCase() === email.toLowerCase();
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: emp.role === 'SUPER_ADMIN' ? '#dbeafe' : '#f1f5f9',
                          color: emp.role === 'SUPER_ADMIN' ? '#1e40af' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}>
                          {emp.avatar}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                            {emp.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {emp.designation} • {emp.department}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={13} color="#94a3b8" />
                    </div>
                  );
                })}
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              {selectedEmployee && (
                <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={11} />
                  <span>{selectedEmployee.department} — {selectedEmployee.designation}</span>
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  Password
                </label>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Default: <code>password123</code>
                </span>
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
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
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
                    onChange={e => setTwoFactorCode(e.target.value)}
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
            🔒 <strong>Enterprise Roster Security:</strong> Self-registration is restricted. All 11 employees are provisioned with their designated department and corporate credentials. Use <code>password123</code> to authenticate.
          </div>
        </div>
      </div>
    </div>
  );
};
