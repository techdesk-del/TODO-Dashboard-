'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  BadgeCheck,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { isStrictCeo } from '@/shared/lib/rosterData';

interface EmployeeLoginGateProps {
  onSuccess?: () => void;
}

export const EmployeeLoginGate: React.FC<EmployeeLoginGateProps> = ({ onSuccess }) => {
  const { setCurrentUser, setActiveView, setBannerNotification, setIsAuthModalOpen, setAuthModalInitialMode } = useApp();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = employeeId.trim();
    if (!cleanId || !password) {
      setError('Please enter your Employee ID (or Corporate Email) and Password.');
      return;
    }
    if (requires2FA && twoFactorCode.trim().length < 6) {
      setError('Please enter the 6-digit verification code sent to your corporate email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          employeeId: cleanId,
          email: cleanId,
          password,
          ...(requires2FA ? { twoFactorCode: twoFactorCode.trim() } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (data.requires2FA) {
        setRequires2FA(true);
        setInfoMessage(
          data.message || 'A 6-digit verification code has been dispatched to your corporate email.'
        );
        if (data.error) setError(data.error);
        setLoading(false);
        return;
      }

      if (data.twoFactorExceeded) {
        setRequires2FA(false);
        setTwoFactorCode('');
        setError(data.error || 'Maximum 2FA attempts exceeded. Please sign in again.');
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success || !data.user) {
        setError(data.error || 'Invalid Employee ID or password. Please try again.');
        setLoading(false);
        return;
      }

      const loggedInUser = {
        ...data.user,
        status: data.user.status || 'ACTIVE',
        totalTasks: data.user.totalTasks ?? 0,
        completedTasks: data.user.completedTasks ?? 0,
        activeTasks: data.user.activeTasks ?? 0,
        overdueTasks: data.user.overdueTasks ?? 0,
        velocity: data.user.velocity ?? 100,
      };

      try {
        sessionStorage.setItem('urbangaon_session_active', '1');
        sessionStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(loggedInUser));
        localStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(loggedInUser));
      } catch {
        // Ignore storage quota errors
      }

      setCurrentUser(loggedInUser);
      setActiveView(isStrictCeo(loggedInUser) ? 'ceo_portal' : 'workspace');
      setBannerNotification({
        badge: 'AUTHENTICATED',
        message: `Welcome back, ${loggedInUser.name}. Your workspace is synced in real time.`,
      });

      if (onSuccess) onSuccess();
    } catch {
      setError('Unable to reach authentication server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(145deg, #f8fafc 0%, #eff6ff 50%, #f1f5f9 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.14)',
          overflow: 'hidden',
        }}
      >
        {/* Top Branded Header with Official UrbanGaon Logo */}
        <div
          style={{
            padding: '28px 28px 20px',
            textAlign: 'center',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <img
              src="/urbangaon-logo.png"
              alt="UrbanGaon"
              style={{
                height: '54px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            <ShieldCheck size={14} />
            Employee Portal
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            {requires2FA ? 'Two-Step Verification' : 'Employee Sign In'}
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '0.84rem',
              color: '#64748b',
            }}
          >
            {requires2FA
              ? 'Enter the 6-digit OTP sent to your corporate email'
              : 'Sign in with your Employee ID and password to open the TODO Dashboard'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>
          {infoMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Employee ID / Corporate Email */}
          <div style={{ marginBottom: '14px' }}>
            <label
              htmlFor="ug-emp-id"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Employee ID or Corporate Email
            </label>
            <div style={{ position: 'relative' }}>
              <BadgeCheck
                size={17}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                id="ug-emp-id"
                type="text"
                autoComplete="username"
                disabled={requires2FA || loading}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. UG00010 or name@urbangaon.com"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  background: requires2FA ? '#f8fafc' : '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: requires2FA ? '14px' : '20px' }}>
            <label
              htmlFor="ug-emp-pass"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={17}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                id="ug-emp-pass"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={requires2FA || loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  background: requires2FA ? '#f8fafc' : '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* 2FA OTP Input */}
          {requires2FA && (
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="ug-emp-otp"
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                6-Digit Verification Code (OTP)
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={17}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#2563eb',
                  }}
                />
                <input
                  id="ug-emp-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 38px',
                    borderRadius: '10px',
                    border: '1.5px solid #2563eb',
                    fontSize: '1rem',
                    fontWeight: 700,
                    letterSpacing: '0.25em',
                    color: '#0f172a',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 18px',
              borderRadius: '10px',
              border: 'none',
              background: loading ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            {loading
              ? 'Verifying...'
              : requires2FA
              ? 'Verify OTP & Enter TODO App'
              : 'Sign In to TODO App'}
            {!loading && <ArrowRight size={17} />}
          </button>

          {requires2FA && (
            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setTwoFactorCode('');
                setError(null);
                setInfoMessage(null);
              }}
              style={{
                width: '100%',
                marginTop: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              Change Employee ID / Password
            </button>
          )}

          {/* Helper Links */}
          <div
            style={{
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthModalInitialMode('INVITATION_INPUT');
                setIsAuthModalOpen(true);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Have an invite code?
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalInitialMode('REQUEST_ACCESS');
                setIsAuthModalOpen(true);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Request Employee Access
            </button>
          </div>
        </form>
      </div>

      <p style={{ marginTop: '16px', fontSize: '0.76rem', color: '#64748b', textAlign: 'center' }}>
        UrbanGaon Properties Pvt. Ltd. • Secure Employee Deliverables Portal
      </p>
    </div>
  );
};
