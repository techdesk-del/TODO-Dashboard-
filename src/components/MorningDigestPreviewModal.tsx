'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDateDisplay, getTodayStr } from '@/lib/dateUtils';
import { isStrictCeo } from '@/lib/rosterData';
import { 
  Mail, 
  Clock, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  X, 
  Check, 
  Send, 
  Users, 
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const MorningDigestPreviewModal: React.FC = () => {
  const { 
    showMorningDigestModal, 
    setShowMorningDigestModal, 
    currentUser, 
    tasks, 
    selectedDate,
    setBannerNotification
  } = useApp();

  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ 
    success: boolean; 
    message: string; 
    previewUrl?: string | null;
    count?: number;
    failedDeliveries?: any[];
  } | null>(null);

  const [previewMode, setPreviewMode] = useState<'PERSONAL' | 'ALL_STAFF'>('PERSONAL');

  const isCeo = isStrictCeo(currentUser);
  const todayStr = getTodayStr();
  const displayDate = formatDateDisplay(todayStr);

  // Active uncancelled tasks
  const uncancelledTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'Cancelled');
  }, [tasks]);

  // Tasks for current user vs all tasks
  const currentCleanEmail = (currentUser.email || '').toLowerCase().trim();
  const currentCleanName = (currentUser.name || '').toLowerCase().trim();

  const userTasks = useMemo(() => {
    if (previewMode === 'ALL_STAFF' || (isCeo && previewMode === 'PERSONAL')) {
      return uncancelledTasks;
    }
    return uncancelledTasks.filter(t => 
      t.assignees?.some(a => 
        (a.email && a.email.toLowerCase().trim() === currentCleanEmail) ||
        (a.name && a.name.toLowerCase().trim().includes(currentCleanName)) ||
        a.id === currentUser.id
      )
    );
  }, [uncancelledTasks, previewMode, isCeo, currentCleanEmail, currentCleanName, currentUser.id]);

  const overdueTasks = useMemo(() => {
    return userTasks.filter(t => (t.isOverdue || t.scheduledDate < todayStr) && t.status !== 'Done');
  }, [userTasks, todayStr]);

  const todayTasks = useMemo(() => {
    return userTasks.filter(t => !t.isOverdue && t.scheduledDate === todayStr && t.status !== 'Done');
  }, [userTasks, todayStr]);

  const upcomingTasks = useMemo(() => {
    return userTasks.filter(t => !t.isOverdue && t.scheduledDate > todayStr && t.status !== 'Done');
  }, [userTasks, todayStr]);

  const handleSendLiveEmail = async (dispatchAll: boolean = false) => {
    setIsSending(true);
    setSendResult(null);

    try {
      const payload: Record<string, any> = {
        force: true,
        actor: `${currentUser.name} (${currentUser.role})`
      };

      if (!dispatchAll) {
        payload.email = currentUser.email;
        payload.name = currentUser.name;
      }

      const res = await fetch('/api/reminders/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch email');

      if (data.suppressed) {
        setSendResult({
          success: false,
          message: `Notice: ${data.message}`,
        });
        return;
      }

      const firstRes = data.results?.[0];
      const count = data.count || (data.results?.length || 0);

      setSendResult({
        success: true,
        count,
        message: dispatchAll
          ? `✓ Morning Digest delivered live to ${count} active staff member(s) with pending commitments via corporate Gmail SMTP.`
          : `✓ Morning Digest successfully dispatched to ${currentUser.email}!`,
        previewUrl: firstRes?.previewUrl,
        failedDeliveries: data.failedDeliveries
      });

      setBannerNotification({
        message: dispatchAll 
          ? `Morning Email Digest dispatched to ${count} staff member(s) via SMTP.`
          : `Morning Email Digest dispatched to ${currentUser.email}.`,
        badge: '08:30 AM DIGEST SENT'
      });
    } catch (err: unknown) {
      setSendResult({
        success: false,
        message: `SMTP Dispatch Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!showMorningDigestModal) return null;

  return (
    <div className="stream-overlay" onClick={() => setShowMorningDigestModal(false)}>
      <div 
        className="stream-modal-card" 
        style={{ maxWidth: '680px', width: '92%', borderRadius: '14px', padding: '1.25rem' }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={17} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                08:30 AM Morning Email Digest
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Automated operational briefing for all corporate staff
              </div>
            </div>
          </div>

          <button 
            type="button"
            className="calendar-nav-btn" 
            onClick={() => setShowMorningDigestModal(false)}
            style={{ width: '28px', height: '28px' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* View Scope Toggle (Personal vs All Staff) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '0.85rem 0',
          padding: '6px 10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
            Active Date: <strong>{displayDate}</strong>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setPreviewMode('PERSONAL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: previewMode === 'PERSONAL' ? '#2563eb' : 'transparent',
                color: previewMode === 'PERSONAL' ? '#ffffff' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isCeo ? 'All Deliverables' : 'My Deliverables'}
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('ALL_STAFF')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: previewMode === 'ALL_STAFF' ? '#2563eb' : 'transparent',
                color: previewMode === 'ALL_STAFF' ? '#ffffff' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Company-Wide Briefing
            </button>
          </div>
        </div>

        {/* Email Metadata Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.74rem',
          color: '#334155',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          marginBottom: '0.85rem'
        }}>
          <div><strong>From:</strong> UrbanGaon Executive Dispatcher &lt;techdesk@urbangaon.com&gt;</div>
          <div><strong>To:</strong> {previewMode === 'ALL_STAFF' ? 'All Active Employees with Pending Deliverables' : `${currentUser.name} <${currentUser.email}>`}</div>
          <div><strong>Subject:</strong> Daily Operational Focus: {displayDate} — {currentUser.name}</div>
          <div><strong>Automated Cron Time:</strong> 08:30 AM IST Daily (Verified via Corporate Gmail SMTP)</div>
        </div>

        {/* Digest Content Body */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          maxHeight: '340px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
            Good morning <strong>{currentUser.name}</strong>, here is the targeted commitment briefing for <strong>{displayDate}</strong>. 
            All deliverables are isolated strictly to active assignments with zero spam.
          </p>

          {/* 1. Overdue Tasks */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#b91c1c',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <AlertCircle size={13} />
              <span>Overdue Deliverables ({overdueTasks.length})</span>
            </div>

            {overdueTasks.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontStyle: 'italic', background: '#ecfdf5', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                ✓ No overdue deliverables. All commitments on track!
              </div>
            ) : (
              overdueTasks.map(t => (
                <div key={t.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#991b1b' }}>{t.title}</div>
                  <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: '2px' }}>
                    Scheduled: {t.scheduledDate} ({t.time || '09:00 AM'}) • Priority: {t.priority} • Assignees: {t.assignees?.map(a => a.name).join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 2. Tasks Due Today */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#b45309',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <Clock size={13} />
              <span>Deliverables Due Today ({todayTasks.length})</span>
            </div>

            {todayTasks.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                No deliverables scheduled specifically for today.
              </div>
            ) : (
              todayTasks.map(t => (
                <div key={t.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#92400e' }}>{t.title}</div>
                  <div style={{ fontSize: '0.68rem', color: '#b45309', marginTop: '2px' }}>
                    Execution Target: {t.time || '09:00 AM'} • Priority: {t.priority} • Assignees: {t.assignees?.map(a => a.name).join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 3. Upcoming Deliverables */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#1e40af',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <CalendarIcon size={13} />
              <span>Upcoming Deliverables This Cycle ({upcomingTasks.length})</span>
            </div>

            {upcomingTasks.length === 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                No upcoming deliverables queued for this cycle.
              </div>
            ) : (
              upcomingTasks.map(t => (
                <div key={t.id} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1e40af' }}>{t.title}</div>
                  <div style={{ fontSize: '0.68rem', color: '#3b82f6', marginTop: '2px' }}>
                    Due: {t.scheduledDate} at {t.time || '09:00 AM'} • Assignees: {t.assignees?.map(a => a.name).join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Dispatch Feedback Result */}
        {sendResult && (
          <div style={{
            marginTop: '0.85rem',
            background: sendResult.success ? '#ecfdf5' : '#fef2f2',
            border: sendResult.success ? '1px solid #a7f3d0' : '1px solid #fecaca',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.75rem',
            color: sendResult.success ? '#065f46' : '#991b1b',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}>
            <div style={{ fontWeight: 700 }}>{sendResult.message}</div>
            {sendResult.previewUrl && (
              <a
                href={sendResult.previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline', marginTop: '2px' }}
              >
                View Delivered Message in Test Inbox ↗
              </a>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.85rem',
          marginTop: '0.85rem',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Flowchart 13 • 08:30 AM Automated Cron Protocol Active
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={isSending}
              onClick={() => handleSendLiveEmail(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Send size={13} color="#2563eb" />
              <span>Send to Me ({currentUser.name})</span>
            </button>

            <button
              type="button"
              disabled={isSending}
              onClick={() => handleSendLiveEmail(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 13px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '7px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Users size={13} />
              <span>{isSending ? 'Dispatching Live via SMTP...' : 'Dispatch Live to All Staff'}</span>
            </button>

            <button 
              type="button"
              className="btn-secondary" 
              onClick={() => setShowMorningDigestModal(false)}
              style={{ fontSize: '0.75rem' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
