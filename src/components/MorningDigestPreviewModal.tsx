'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Mail, Clock, AlertCircle, Calendar as CalendarIcon, X, Check } from 'lucide-react';

export const MorningDigestPreviewModal: React.FC = () => {
  const { showMorningDigestModal, setShowMorningDigestModal, currentUser, tasks } = useApp();
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string; previewUrl?: string | null } | null>(null);

  const handleSendLiveEmail = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/reminders/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, name: currentUser.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch email');

      const firstRes = data.results?.[0];
      setSendResult({
        success: true,
        message: `✓ Email successfully dispatched to ${currentUser.email}! Check inbox or test console.`,
        previewUrl: firstRes?.previewUrl,
      });
    } catch (err: unknown) {
      setSendResult({
        success: false,
        message: `Failed: ${err instanceof Error ? err.message : 'SMTP dispatch error'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!showMorningDigestModal) return null;

  // Filter tasks for the logged in user
  const userTasks = tasks.filter(t => 
    t.assignees.some(a => a.id === currentUser.id || a.name.toLowerCase().includes(currentUser.name.toLowerCase()))
  );

  const overdueTasks = userTasks.filter(t => t.scheduledDate < '2026-09-15' && t.status !== 'Done');
  const todayTasks = userTasks.filter(t => t.scheduledDate === '2026-09-15' && t.status !== 'Done');
  const upcomingTasks = userTasks.filter(t => t.scheduledDate > '2026-09-15' && t.status !== 'Done');

  return (
    <div className="stream-overlay" onClick={() => setShowMorningDigestModal(false)}>
      <div className="stream-modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        {/* Email Header Simulation */}
        <div className="stream-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={18} color="#2563eb" />
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              Simulated 08:30 AM Morning Digest (Flowchart 13)
            </span>
          </div>
          <button className="calendar-nav-btn" onClick={() => setShowMorningDigestModal(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Email Metadata Card */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.75rem',
          color: '#475569',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem'
        }}>
          <div><strong>From:</strong> UrbanGaon Automated Dispatcher &lt;alerts@urbangaon.com&gt;</div>
          <div><strong>To:</strong> {currentUser.name} &lt;{currentUser.email}&gt;</div>
          <div><strong>Subject:</strong> 📋 Your Daily Operational Focus — Tuesday, 15 September 2026</div>
          <div><strong>Dispatch Time:</strong> Today at 08:30 AM (Corporate SMTP Verified)</div>
        </div>

        {/* Digest Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.82rem', color: '#334155' }}>
            Good morning <strong>{currentUser.name}</strong>, here is your targeted commitment digest for today. Zero spam, targeted strictly to your portfolio.
          </p>

          {/* 1. Overdue Tasks (Red) */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#b91c1c',
              marginBottom: '0.4rem'
            }}>
              <AlertCircle size={14} />
              OVERDUE DELIVERABLES (REQUIRES IMMEDIATE RESOLUTION)
            </div>
            {overdueTasks.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontStyle: 'italic', background: '#ecfdf5', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                ✓ No overdue deliverables. Outstanding punctuality!
              </div>
            ) : (
              overdueTasks.map(t => (
                <div key={t.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#991b1b' }}>{t.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#b91c1c' }}>Scheduled: {t.scheduledDate} ({t.time})</div>
                </div>
              ))
            )}
          </div>

          {/* 2. Tasks Due Today (Amber) */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#b45309',
              marginBottom: '0.4rem'
            }}>
              <Clock size={14} />
              DELIVERABLES DUE TODAY (TUESDAY, 15 SEP)
            </div>
            {todayTasks.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                No tasks scheduled for today.
              </div>
            ) : (
              todayTasks.map(t => (
                <div key={t.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#92400e' }}>{t.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#b45309' }}>Execution Target: {t.time} • Priority: {t.priority}</div>
                </div>
              ))
            )}
          </div>

          {/* 3. Upcoming Tasks This Week (Blue) */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#1e40af',
              marginBottom: '0.4rem'
            }}>
              <CalendarIcon size={14} />
              UPCOMING DELIVERABLES THIS WEEK
            </div>
            {upcomingTasks.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                No upcoming tasks this week.
              </div>
            ) : (
              upcomingTasks.map(t => (
                <div key={t.id} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e40af' }}>{t.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#3b82f6' }}>Due: {t.scheduledDate} at {t.time}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Send Result Status */}
        {sendResult && (
          <div style={{
            background: sendResult.success ? '#ecfdf5' : '#fef2f2',
            border: sendResult.success ? '1px solid #a7f3d0' : '1px solid #fecaca',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '0.75rem',
            color: sendResult.success ? '#065f46' : '#991b1b',
          }}>
            {sendResult.message}
            {sendResult.previewUrl && (
              <div style={{ marginTop: '4px' }}>
                <a
                  href={sendResult.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline' }}
                >
                  View Delivered Email in Ethereal Test Inbox ↗
                </a>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Flowchart 13 • Corporate Anti-Spam Guarantee
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn-primary"
              disabled={isSending}
              onClick={handleSendLiveEmail}
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderColor: '#059669', fontSize: '0.78rem' }}
            >
              <Mail size={14} style={{ marginRight: '4px' }} />
              {isSending ? 'Sending via SMTP...' : 'Send Live Email via SMTP'}
            </button>
            <button className="btn-secondary" onClick={() => setShowMorningDigestModal(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
