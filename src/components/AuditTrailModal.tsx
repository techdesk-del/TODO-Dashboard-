'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AuditLogEntry } from '@/types';
import { ShieldCheck, Download, Search, Filter, X, ArrowUpDown } from 'lucide-react';

export const AuditTrailModal: React.FC = () => {
  const { 
    auditLogs, 
    viewingAuditForTaskId, 
    setViewingAuditForTaskId, 
    activeView, 
    setActiveView 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    if (viewingAuditForTaskId && log.taskId !== viewingAuditForTaskId) {
      return false;
    }
    if (filterAction !== 'ALL' && log.action !== filterAction) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        log.actor.toLowerCase().includes(q) ||
        (log.taskTitle && log.taskTitle.toLowerCase().includes(q)) ||
        (log.fieldChanged && log.fieldChanged.toLowerCase().includes(q)) ||
        (log.newValue && log.newValue.toLowerCase().includes(q)) ||
        (log.notes && log.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exportAuditCsv = () => {
    const headers = ['Timestamp', 'Action', 'Task Title', 'Field Changed', 'Old Value', 'New Value', 'Actor', 'Role', 'IP Address', 'Device', 'Notes'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.action,
      `"${(l.taskTitle || '').replace(/"/g, '""')}"`,
      `"${(l.fieldChanged || '').replace(/"/g, '""')}"`,
      `"${(l.oldValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      l.actor,
      l.actorRole,
      l.ipAddress,
      `"${l.deviceInfo.replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UrbanGaon_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isModalMode = Boolean(viewingAuditForTaskId);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          <div style={{ background: '#ecfdf5', padding: '0.5rem', borderRadius: '8px' }}>
            <ShieldCheck size={20} color="#059669" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Immutable Compliance Audit Trail (Flowchart 12 & 14)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Tamper-proof, append-only ledger tracking every operational change, actor credential, and timestamp
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={exportAuditCsv}
            style={{ background: '#059669' }}
          >
            <Download size={14} />
            Export Tamper-Proof CSV
          </button>

          {isModalMode && (
            <button
              className="calendar-nav-btn"
              onClick={() => setViewingAuditForTaskId(null)}
              title="Close Modal"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            className="composer-input"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            placeholder="Search by actor, task, field, or notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>ACTION FILTER:</span>
          <select
            className="form-select"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            <option value="CREATED">Created</option>
            <option value="UPDATED">Updated</option>
            <option value="CARRIED_FORWARD">Carried Forward</option>
            <option value="CONFIG_CHANGED">Config Changed</option>
            <option value="EXPORTED">Exported</option>
            <option value="LOGIN">Auth / Login</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="enterprise-table-wrapper" style={{ maxHeight: isModalMode ? '450px' : '650px', overflowY: 'auto' }}>
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Timestamp & Actor</th>
              <th>Action</th>
              <th>Task / Target</th>
              <th>Field Changed</th>
              <th>Audit Delta (Old → New)</th>
              <th>IP & Device</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>{log.actor}</div>
                  <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>{log.actorRole}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {new Date(log.timestamp).toLocaleString('en-GB')}
                  </div>
                </td>
                <td>
                  <span style={{
                    background: log.action === 'CREATED' ? '#dcfce7' : log.action === 'UPDATED' ? '#dbeafe' : log.action === 'CARRIED_FORWARD' ? '#fef3c7' : '#f1f5f9',
                    color: log.action === 'CREATED' ? '#15803d' : log.action === 'UPDATED' ? '#1e40af' : log.action === 'CARRIED_FORWARD' ? '#b45309' : '#334155',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    {log.action}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                    {log.taskTitle || log.taskId || 'System Global'}
                  </span>
                  {log.notes && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                      {log.notes}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                    {log.fieldChanged || 'General'}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {log.oldValue && log.oldValue !== 'None' && (
                      <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>
                        - {log.oldValue}
                      </span>
                    )}
                    <span style={{ color: '#15803d', fontWeight: 600 }}>
                      + {log.newValue}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>{log.ipAddress}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{log.deviceInfo}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
            No audit records found.
          </div>
        )}
      </div>
    </div>
  );

  if (isModalMode) {
    return (
      <div className="stream-overlay" onClick={() => setViewingAuditForTaskId(null)}>
        <div className="stream-modal-card" style={{ maxWidth: '980px', width: '95%' }} onClick={e => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};
