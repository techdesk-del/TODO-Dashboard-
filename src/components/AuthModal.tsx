'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ShieldCheck, Lock, Mail, User, X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { setCurrentUser, currentUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(currentUser.email || 'akash.das@urbangaon.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Product & Tech');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
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

        setCurrentUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          department: data.user.department,
          designation: data.user.designation || 'Staff',
          avatar: data.user.avatar || 'AD',
          status: 'ACTIVE',
          totalTasks: 4,
          completedTasks: 1,
          activeTasks: 3,
          overdueTasks: 0,
          velocity: 95,
        });

        setSuccess(`Welcome back, ${data.user.name}! Session authenticated.`);
        setTimeout(() => onClose(), 1200);
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, department, role: 'EMPLOYEE' }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        setSuccess('Account registered successfully! Logging you in...');
        setTimeout(() => {
          setMode('login');
          handleSubmit(e);
        }, 1000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stream-overlay" onClick={onClose}>
      <div className="stream-modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <div className="stream-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>
              <ShieldCheck size={20} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Enterprise Authentication
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                MongoDB Atlas • bcrypt • JWT • 2FA
              </div>
            </div>
          </div>
          <button className="calendar-nav-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', margin: '0.75rem 0' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '6px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: mode === 'login' ? '#ffffff' : 'transparent',
              color: mode === 'login' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
            onClick={() => { setMode('login'); setRequires2FA(false); setError(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '6px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: mode === 'register' ? '#ffffff' : 'transparent',
              color: mode === 'register' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
            onClick={() => { setMode('register'); setRequires2FA(false); setError(null); }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', fontSize: '0.75rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px', fontSize: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
            <CheckCircle2 size={14} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Full Name
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', background: '#ffffff' }}>
                  <User size={15} color="#94a3b8" style={{ marginRight: '8px' }} />
                  <input
                    type="text"
                    required
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem' }}
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Department
                </label>
                <input
                  type="text"
                  required
                  className="composer-input"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '6px 10px' }}
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Corporate Email
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', background: '#ffffff' }}>
              <Mail size={15} color="#94a3b8" style={{ marginRight: '8px' }} />
              <input
                type="email"
                required
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem' }}
                placeholder="name@urbangaon.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Password
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', background: '#ffffff' }}>
              <Lock size={15} color="#94a3b8" style={{ marginRight: '8px' }} />
              <input
                type="password"
                required
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.82rem' }}
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
              <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #2563eb', borderRadius: '6px', padding: '6px 10px', background: '#eff6ff' }}>
                <KeyRound size={15} color="#2563eb" style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '2px', background: 'transparent' }}
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
            style={{ width: '100%', justifyContent: 'center', padding: '8px', marginTop: '0.5rem', fontWeight: 700 }}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? (requires2FA ? 'Verify 2FA & Enter' : 'Sign In Securely') : 'Register Account'}
          </button>
        </form>

        <div style={{ marginTop: '0.75rem', padding: '8px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.7rem', color: '#64748b' }}>
          💡 <strong>Demo Quick Access:</strong> You can login with <code>akash.das@urbangaon.com</code> / <code>password123</code> or any seed email. Password will be auto-hashed with bcrypt and stored in MongoDB Atlas!
        </div>
      </div>
    </div>
  );
};
