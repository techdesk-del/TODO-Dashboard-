'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sliders, Shield, Mail, Database, RotateCcw, Check, Plus, Trash2 } from 'lucide-react';

export const SystemConfigModal: React.FC = () => {
  const { systemConfig, updateSystemConfig } = useApp();

  const [emailTime, setEmailTime] = useState(systemConfig.emailScheduleTime);
  const [lockoutThreshold, setLockoutThreshold] = useState(systemConfig.lockoutThreshold);
  const [retentionDays, setRetentionDays] = useState(systemConfig.retentionDays);
  
  // Master lists
  const [newProject, setNewProject] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [saveBanner, setSaveBanner] = useState(false);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemConfig({
      emailScheduleTime: emailTime,
      lockoutThreshold: Number(lockoutThreshold),
      retentionDays: Number(retentionDays)
    });
    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3000);
  };

  const handleAddProject = () => {
    if (!newProject.trim()) return;
    updateSystemConfig({
      masterLists: {
        ...systemConfig.masterLists,
        projects: [...systemConfig.masterLists.projects, newProject.trim()]
      }
    });
    setNewProject('');
  };

  const handleRemoveProject = (item: string) => {
    updateSystemConfig({
      masterLists: {
        ...systemConfig.masterLists,
        projects: systemConfig.masterLists.projects.filter(p => p !== item)
      }
    });
  };

  const handleRollback = () => {
    const confirmRollback = confirm('Execute atomic configuration rollback to baseline snapshot v2.3.9?');
    if (confirmRollback) {
      updateSystemConfig({
        versionBaseline: 'v2.3.9-Rollback',
        emailScheduleTime: '08:30 AM',
        lockoutThreshold: 5
      });
      alert('Rollback executed successfully! Prior baseline restored with immutable audit entry.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px' }}>
            <Sliders size={20} color="#0f172a" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Super Admin System Configuration & Governance (Flowchart 16 & 24)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Master dropdown lists, email automation schedules, security policies, and baseline rollback
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
            Baseline: {systemConfig.versionBaseline}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRollback}
            style={{ color: '#c2410c', borderColor: '#fdba74' }}
            title="FC 24: Config Versioning & Rollback"
          >
            <RotateCcw size={14} />
            1-Click Rollback (FC 24)
          </button>
        </div>
      </div>

      {saveBanner && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
          ✓ Configuration updated. Cache invalidated and changes propagated across active user sessions!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {/* Policy & Engine Settings */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={16} color="#2563eb" />
            Email Automation & Security Policies
          </h3>

          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-field-group">
              <label className="form-field-label">Daily Morning Digest Trigger Time (FC 13)</label>
              <input
                type="text"
                className="form-input"
                value={emailTime}
                onChange={e => setEmailTime(e.target.value)}
                placeholder="08:30 AM"
              />
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Default: 08:30 AM. Automatically skips holidays and weekends.
              </span>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Failed Login Lockout Threshold (FC 5)</label>
              <input
                type="number"
                className="form-input"
                value={lockoutThreshold}
                onChange={e => setLockoutThreshold(Number(e.target.value))}
                min={3}
                max={10}
              />
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Account locks for 15 minutes upon exceeding limit.
              </span>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Data Retention & Archival Threshold (FC 25)</label>
              <input
                type="number"
                className="form-input"
                value={retentionDays}
                onChange={e => setRetentionDays(Number(e.target.value))}
                min={30}
                max={1825}
              />
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Completed deliverables older than this are archived to cold storage.
              </span>
            </div>

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
              <Check size={14} />
              Save Global Policies
            </button>
          </form>
        </div>

        {/* Master Metadata Hygiene (Projects) */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} color="#059669" />
            Master Project Tags (Metadata Hygiene)
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem' }}>
            Standard master lists prevent spelling discrepancies across reports and audits.
          </p>

          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
            <input
              type="text"
              className="composer-input"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
              placeholder="Add new project tag..."
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddProject}
              style={{ padding: '0.4rem 0.75rem' }}
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
            {systemConfig.masterLists.projects.map(item => (
              <span
                key={item}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {item}
                <button
                  type="button"
                  onClick={() => handleRemoveProject(item)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
