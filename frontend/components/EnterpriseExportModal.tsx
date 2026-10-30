'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  FileSpreadsheet, 
  X, 
  Download, 
  Calendar, 
  User, 
  ShieldCheck, 
  Filter, 
  Layers, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Mail
} from 'lucide-react';
import { 
  ExportType, 
  ExportFilterOptions, 
  filterTasksByRole, 
  filterTasksByType, 
  generateMultiSheetExcelWorkbook, 
  downloadWorkbook 
} from '@/frontend/lib/exportUtils';
import { getTodayStr } from '@/shared/lib/dateUtils';
import { canViewAuditTrail } from '@/shared/lib/rosterData';

interface EnterpriseExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ExportType;
  initialUserId?: string;
}

export const EnterpriseExportModal: React.FC<EnterpriseExportModalProps> = ({
  isOpen,
  onClose,
  initialType = 'WHOLE_TASKS',
  initialUserId,
}) => {
  const { tasks, members, activeMembers, auditLogs, currentUser, logAudit, setBannerNotification } = useApp();

  const [exportType, setExportType] = useState<ExportType>(initialType);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || (activeMembers[0]?.id || members[0]?.id || ''));
  const [includeAuditLogs, setIncludeAuditLogs] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [backgroundEmailMode, setBackgroundEmailMode] = useState<boolean>(false);

  // 1. Role-based scoping (Flowchart E: Which role?)
  const scopedTasks = useMemo(() => {
    return filterTasksByRole(tasks, currentUser);
  }, [tasks, currentUser]);

  // 2. Type-based filtering (Flowchart E: Export type?)
  const filterOpts: ExportFilterOptions = useMemo(() => {
    const selectedMember = members.find(m => m.id === selectedUserId);
    return {
      exportType,
      selectedDate,
      selectedMonth,
      startDate,
      endDate,
      selectedUserId,
      selectedUserName: selectedMember?.name,
      includeAuditLogs: canViewAuditTrail(currentUser) && includeAuditLogs,
    };
  }, [exportType, selectedDate, selectedMonth, startDate, endDate, selectedUserId, members, currentUser, includeAuditLogs]);

  const filteredTasks = useMemo(() => {
    return filterTasksByType(scopedTasks, filterOpts, members);
  }, [scopedTasks, filterOpts, members]);

  // Approximate assignee row count
  const estimatedAssigneeRows = useMemo(() => {
    return filteredTasks.reduce((acc, t) => acc + Math.max(1, t.assignees.length), 0);
  }, [filteredTasks]);

  const isOverThreshold = estimatedAssigneeRows > 500;

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    setIsExporting(true);

    try {
      if (backgroundEmailMode && isOverThreshold) {
        // Background export simulation (Flowchart E: Run export in background, email download link)
        logAudit({
          action: 'EXPORTED',
          fieldChanged: 'Enterprise Background Excel Export',
          newValue: `${filteredTasks.length} tasks (${estimatedAssigneeRows} rows) scheduled for email delivery`,
          notes: `Background export job queued for ${currentUser.email || currentUser.name}. Type: ${exportType}`
        });

        setBannerNotification({
          message: `Background export queued for ${currentUser.email || currentUser.name}. Download link sent!`,
          badge: '✓ Export Job Dispatched'
        });

        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 600);
        return;
      }

      // Immediate Generation (Flowchart E)
      const { workbook, filename, totalRowCount } = generateMultiSheetExcelWorkbook({
        tasks: filteredTasks,
        auditLogs: canViewAuditTrail(currentUser) && includeAuditLogs ? auditLogs : undefined,
        currentUser,
        filterOpts,
        includeAuditLogs: canViewAuditTrail(currentUser) && includeAuditLogs,
      });

      downloadWorkbook(workbook, filename);

      // Log export action in audit trail (Flowchart E requirement: Log export action in audit trail)
      logAudit({
        action: 'EXPORTED',
        fieldChanged: 'Multi-Sheet Excel Workbook Export',
        newValue: `${filename} (${totalRowCount} assignee rows across ${filteredTasks.length} tasks)`,
        notes: `Generated sanitized multi-sheet Excel file. Scope: ${currentUser.role}, Type: ${exportType}${includeAuditLogs ? ' (Includes Audit Trail)' : ''}`
      });

      setBannerNotification({
        message: `Successfully generated and downloaded ${filename}`,
        badge: '✓ Excel Downloaded'
      });

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err: unknown) {
      console.error('[Export Error]', err);
      alert('Export generation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsExporting(false);
    }
  };

  return (
    <div className="stream-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="stream-modal-card" 
        style={{ maxWidth: '640px', width: '95vw', padding: '1.25rem' }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="stream-modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: '#ecfdf5', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={20} color="#059669" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Enterprise Multi-Sheet Excel Export
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0 0' }}>
                OWASP formula injection sanitized • 2-Sheet structure • Role-governed export
              </p>
            </div>
          </div>
          <button className="calendar-nav-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Role Scoping Banner */}
        <div style={{ 
          background: currentUser.role === 'SUPER_ADMIN' ? '#faf5ff' : currentUser.role === 'ADMIN' ? '#eff6ff' : '#f8fafc',
          border: `1px solid ${currentUser.role === 'SUPER_ADMIN' ? '#d8b4fe' : currentUser.role === 'ADMIN' ? '#bfdbfe' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '0.65rem 0.85rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} color={currentUser.role === 'SUPER_ADMIN' ? '#7e22ce' : currentUser.role === 'ADMIN' ? '#1d4ed8' : '#475569'} />
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                Security Tier: {currentUser.role}
              </span>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {currentUser.role === 'SUPER_ADMIN' && 'Unrestricted company-wide export + Forensics Ledger'}
                {currentUser.role === 'ADMIN' && 'Full company-wide deliverable export across all 7 departments'}
                {currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN' && 'Restricted to your personal assigned & created deliverables'}
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}>
            {scopedTasks.length} in scope
          </span>
        </div>

        {/* Step 2: Export Type Selection (5 Flowchart E Pathways) */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Export Classification:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.4rem' }}>
            {[
              { id: 'WHOLE_TASKS', label: 'Whole Tasks', desc: 'All deliverables' },
              { id: 'DAILY', label: 'Daily', desc: 'Specific date' },
              { id: 'MONTHLY', label: 'Monthly', desc: 'Month & year' },
              { id: 'DATE_WISE', label: 'Date-wise', desc: 'Date range' },
              { id: 'USER_WISE', label: 'User-wise', desc: 'By employee' },
            ].map(type => (
              <button
                key={type.id}
                type="button"
                className={`btn-secondary ${exportType === type.id ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: exportType === type.id ? 800 : 500,
                  textAlign: 'center',
                  background: exportType === type.id ? '#eff6ff' : undefined,
                  borderColor: exportType === type.id ? '#3b82f6' : undefined,
                  color: exportType === type.id ? '#1d4ed8' : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px'
                }}
                onClick={() => setExportType(type.id as ExportType)}
              >
                <span>{type.label}</span>
                <span style={{ fontSize: '0.62rem', opacity: 0.75 }}>{type.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Type Specific Input Controls */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.9rem', marginBottom: '1rem' }}>
          {exportType === 'DAILY' && (
            <div className="form-field-group">
              <label className="form-field-label">Select Date (Daily Export):</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
            </div>
          )}

          {exportType === 'MONTHLY' && (
            <div className="form-field-group">
              <label className="form-field-label">Select Month &amp; Year (Monthly Export):</label>
              <input
                type="month"
                className="form-input"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
            </div>
          )}

          {exportType === 'DATE_WISE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-field-group">
                <label className="form-field-label">Start Date:</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
              <div className="form-field-group">
                <label className="form-field-label">End Date:</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>
          )}

          {exportType === 'USER_WISE' && (
            <div className="form-field-group">
              <label className="form-field-label">Select Employee (User-wise Export):</label>
              <select
                className="form-select"
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              >
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.designation || 'Specialist'} ({m.department})
                  </option>
                ))}
              </select>
            </div>
          )}

          {exportType === 'WHOLE_TASKS' && (
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Exporting complete inventory of matching deliverables with no date restrictions.
            </div>
          )}
        </div>

        {/* Executive Audit Logs Option (CEO & Aakash Das Only) */}
        {canViewAuditTrail(currentUser) && (
          <div style={{ marginBottom: '1rem', background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: '8px', padding: '0.65rem 0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={includeAuditLogs}
                onChange={e => setIncludeAuditLogs(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#a855f7' }}
              />
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#581c87' }}>
                  Include Sheet 3: Immutable Audit Trail Forensics ({auditLogs.length} Records)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#7e22ce' }}>
                  Appends append-only compliance ledger with actor, IP, timestamp, and field mutation history.
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Flowchart E Structure Preview */}
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.74rem' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Workbook Output Schema:</span>
            <span style={{ color: '#059669', fontWeight: 800 }}>
              {filteredTasks.length} Tasks • ~{estimatedAssigneeRows} Rows
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', lineHeight: 1.5 }}>
            <li><strong>Sheet 1:</strong> One row per assignee with individual status, progress, remarks &amp; department.</li>
            <li><strong>Sheet 2:</strong> One row per task with overall multi-assignee status, priority, and dates.</li>
            {includeAuditLogs && canViewAuditTrail(currentUser) && (
              <li><strong>Sheet 3:</strong> Master Immutable Compliance Audit Trail.</li>
            )}
            <li><strong>Security:</strong> All cells prefixed with &apos;=, +, -, @ sanitized against formula injection.</li>
          </ul>
        </div>

        {/* Threshold Check (Flowchart E: Row count over threshold?) */}
        {isOverThreshold && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
              <AlertCircle size={15} color="#b45309" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e' }}>
                High Volume Notice ({estimatedAssigneeRows} rows exceeds 500 threshold)
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.73rem', color: '#78350f' }}>
              <input
                type="checkbox"
                checked={backgroundEmailMode}
                onChange={e => setBackgroundEmailMode(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#d97706' }}
              />
              <span>Run export in background &amp; email download link</span>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{
              background: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1rem',
              fontWeight: 700
            }}
            onClick={handleExecuteExport}
            disabled={isExporting || filteredTasks.length === 0}
          >
            {isExporting ? (
              <>Generating Excel...</>
            ) : backgroundEmailMode ? (
              <>
                <Mail size={14} />
                Dispatch Background Export
              </>
            ) : (
              <>
                <Download size={14} />
                Download Excel Workbook
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
