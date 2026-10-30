'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { TaskPriority, TeamMember, AssigneeInfo } from '@/types';
import { getTodayStr, getTomorrowStr } from '@/shared/lib/dateUtils';
import { isStrictCeo } from '@/shared/lib/rosterData';
import {
  X,
  Mic,
  MicOff,
  Keyboard,
  User,
  Users,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Flag,
  Building2,
  MapPin,
  FolderKanban,
  FileText,
  MessageSquare,
  Sparkles,
  Loader2
} from 'lucide-react';

interface CreateTaskModalProps {
  onClose?: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose }) => {
  const {
    currentUser,
    members,
    activeMembers,
    systemConfig,
    addTask,
    setBannerNotification,
    isCreateTaskModalOpen,
    setIsCreateTaskModalOpen,
    selectedDate
  } = useApp();


  // Flowchart 6: Step 2 — Input Method (Speak vs Type)
  const [inputMethod, setInputMethod] = useState<'Speak' | 'Type'>('Type');
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Original Standard Master Departments (Per Company Policy)
  const departmentOptions = React.useMemo(() => {
    const base = systemConfig?.masterLists?.departments || [
      'Civil',
      'Sales',
      'AI & IT',
      'Talent',
      'Purchase',
      'Legal',
      'Accounts',
      'Front Desk'
    ];
    const list = [...base];
    if (currentUser?.department && !list.includes(currentUser.department)) {
      list.push(currentUser.department);
    }
    return Array.from(new Set(list));
  }, [systemConfig?.masterLists?.departments, currentUser?.department]);

  // Dynamic Project Master List
  const projectOptions = React.useMemo(() => {
    const list = [
      'Front Desk',
      'Site Development & Civil',
      'Sales & Client Acquisition',
      'IT & Digital Systems',
      'Procurement & Materials',
      'Legal & Land Documentation',
      'Finance & Accounts',
      'HR & Talent Operations',
      'General Operations',
      ...(systemConfig?.masterLists?.projects || [])
    ];
    return Array.from(new Set(list));
  }, [systemConfig?.masterLists?.projects]);

  // Universal Enterprise Role & Department-Based Auto-Fill Resolver (SDE-3 / CEO Architecture)
  // Maps every existing staff member and any newly provisioned employee account strictly
  // to their accurate master department, operational initiative, and priority.
  const getRoleBasedDefaults = useCallback(() => {
    const rawDept = String(currentUser?.department || '').toLowerCase().trim();
    const rawDesig = String(currentUser?.designation || '').toLowerCase().trim();
    const rawRole = String(currentUser?.role || '').toUpperCase().trim();
    const userId = String(currentUser?.id || '').trim();
    const userEmail = String(currentUser?.email || '').toLowerCase().trim();

    let resolvedDept = 'Civil';
    let resolvedProject = 'General Operations';

    // 1. Front Desk & Reception Operations (Kanchan Jain, Front Desk, Reception, Admin Desk)
    if (
      rawDept.includes('front') ||
      rawDept.includes('desk') ||
      rawDesig.includes('front desk') ||
      rawDesig.includes('admin desk') ||
      rawDesig.includes('reception') ||
      userId === 'mem-8' ||
      userEmail.includes('frontdesk') ||
      userEmail.includes('kanchan')
    ) {
      resolvedDept = 'Front Desk';
      resolvedProject = 'Front Desk';
    }
    // 2. Talent & People Operations (Talent Team, HR, Hiring)
    else if (
      rawDept.includes('talent') ||
      rawDept.includes('hr') ||
      rawDept.includes('people') ||
      rawDesig.includes('talent') ||
      rawDesig.includes('hr') ||
      userId === 'mem-9' ||
      userId === 'mem-10' ||
      userId === 'mem-11' ||
      userEmail.includes('rekha') ||
      userEmail.includes('sharmila') ||
      userEmail.includes('satya')
    ) {
      resolvedDept = 'Talent';
      resolvedProject = 'HR & Talent Operations';
    }
    // 3. AI & IT Operations (Software, Systems, Cloud, Tech, Developers)
    else if (
      rawDept.includes('ai') ||
      rawDept.includes('tech') ||
      rawDept.includes('software') ||
      rawDept.includes('developer') ||
      rawDept.includes('engineer') ||
      /(it|ai|tech|developer|software|cloud|systems)/i.test(rawDept) ||
      /(it|ai|developer|engineer|software|techdesk)/i.test(rawDesig) ||
      userId === 'mem-12' ||
      userEmail.includes('techdesk') ||
      userEmail.includes('aakash')
    ) {
      resolvedDept = 'AI & IT';
      resolvedProject = 'IT & Digital Systems';
    }
    // 4. Sales & Business Acquisition (Sales, BD, Growth, Client Outreach)
    else if (
      rawDept.includes('sale') ||
      rawDept.includes('client') ||
      rawDept.includes('market') ||
      rawDept.includes('growth') ||
      rawDesig.includes('sale') ||
      userId === 'mem-2' ||
      userEmail.includes('yudhister') ||
      userEmail.includes('sanjay')
    ) {
      resolvedDept = 'Sales';
      resolvedProject = 'Sales & Client Acquisition';
    }
    // 5. Civil & Site Infrastructure (Civil, Construction, Site, Architecture)
    else if (
      rawDept.includes('civil') ||
      rawDept.includes('site') ||
      rawDept.includes('const') ||
      rawDept.includes('infra') ||
      rawDesig.includes('civil') ||
      userId === 'mem-4' ||
      userId === 'usr-1791978627510-808' ||
      userEmail.includes('ayaz') ||
      userEmail.includes('vishvendra')
    ) {
      resolvedDept = 'Civil';
      resolvedProject = 'Site Development & Civil';
    }
    // 6. Purchase & Procurement (Purchase, Procurement, Vendor Management, Inventory)
    else if (
      rawDept.includes('purchase') ||
      rawDept.includes('procure') ||
      rawDept.includes('vendor') ||
      rawDept.includes('supply') ||
      rawDesig.includes('purchase') ||
      userId === 'mem-7' ||
      userId === 'EMP 2026' ||
      userEmail.includes('utkarsh') ||
      userEmail.includes('ravindra')
    ) {
      resolvedDept = 'Purchase';
      resolvedProject = 'Procurement & Materials';
    }
    // 7. Legal & Land Documentation (Legal Team, Counsel, Compliance, Contracts)
    else if (
      rawDept.includes('legal') ||
      rawDept.includes('law') ||
      rawDept.includes('compliance') ||
      rawDept.includes('contract') ||
      rawDesig.includes('legal') ||
      userId === 'UG00010' ||
      userId === 'mem-5' ||
      userEmail.includes('legal') ||
      userEmail.includes('shyamsunder')
    ) {
      resolvedDept = 'Legal';
      resolvedProject = 'Legal & Land Documentation';
    }
    // 8. Accounts & Finance (Accounts, Finance, Tax, Billing, Audit)
    else if (
      rawDept.includes('account') ||
      rawDept.includes('finance') ||
      rawDept.includes('tax') ||
      rawDept.includes('audit') ||
      rawDept.includes('billing') ||
      rawDesig.includes('account') ||
      userId === 'mem-6' ||
      userEmail.includes('accounts') ||
      userEmail.includes('pratap')
    ) {
      resolvedDept = 'Accounts';
      resolvedProject = 'Finance & Accounts';
    }
    // 9. Exact Match Fallback
    else {
      const exact = departmentOptions.find(d => d.toLowerCase() === rawDept);
      if (exact) resolvedDept = exact;
    }

    let resolvedPriority: TaskPriority = 'NORMAL';
    if (rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN') {
      resolvedPriority = 'HIGH';
    }

    return {
      department: resolvedDept,
      project: resolvedProject,
      location: systemConfig?.masterLists?.locations?.[0] || 'Jaipur',
      priority: resolvedPriority,
    };
  }, [currentUser, systemConfig, departmentOptions]);

  const initialDefaults = getRoleBasedDefaults();

  // Form fields per Flowchart 6 with automatic role-based defaults
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeMode, setAssigneeMode] = useState<'Self' | 'Others' | 'Both'>('Self');
  const [selectedOthersIds, setSelectedOthersIds] = useState<string[]>([]);
  const [project, setProject] = useState(initialDefaults.project);
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [customProjectName, setCustomProjectName] = useState('');
  const [location, setLocation] = useState(initialDefaults.location);
  const [department, setDepartment] = useState(initialDefaults.department);
  const [dueDate, setDueDate] = useState(selectedDate || getTodayStr());
  const [dueTime, setDueTime] = useState('05:00 PM');
  const [priority, setPriority] = useState<TaskPriority>(initialDefaults.priority);
  const [pastDueReason, setPastDueReason] = useState('');
  const [notes, setNotes] = useState('');

  // Validation state
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const todayStr = getTodayStr();
  const isPastDue = dueDate < todayStr;

  const resetForm = useCallback(() => {
    const defaults = getRoleBasedDefaults();
    setTitle('');
    setDescription('');
    setInputMethod('Type');
    setIsListening(false);
    setSpeechTranscript('');
    setAssigneeMode('Self');
    setSelectedOthersIds([]);
    setProject(defaults.project);
    setIsCustomProject(false);
    setCustomProjectName('');
    setLocation(defaults.location);
    setDepartment(defaults.department);
    setDueDate(selectedDate || getTodayStr());
    setDueTime('05:00 PM');
    setPriority(defaults.priority);
    setPastDueReason('');
    setNotes('');
    setMissingFields([]);
    setIsSubmitting(false);
    setServerError(null);
  }, [getRoleBasedDefaults, selectedDate]);

  // Whenever modal opens or logged-in user changes (including new accounts), re-sync form with role-based defaults
  useEffect(() => {
    if (isCreateTaskModalOpen) {
      resetForm();
    }
  }, [isCreateTaskModalOpen, currentUser?.id, currentUser?.department, currentUser?.role, resetForm]);

  const handleClose = () => {
    resetForm();
    if (onClose) onClose();
    setIsCreateTaskModalOpen(false);
  };

  // Initialize Speech Recognition if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setSpeechTranscript(currentTranscript);
          // If title is short or empty, populate title; otherwise append to description
          if (!title.trim()) {
            setTitle(currentTranscript);
          } else {
            setDescription(prev => prev ? `${prev} ${currentTranscript}` : currentTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[SpeechRecognition error]', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { }
      }
    };
  }, [title]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech-to-text is not supported in this browser. Please use keyboard typing.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setSpeechTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition start failed', err);
      }
    }
  };

  // Calculate final assignees list based on assigneeMode
  const getAssignees = (): AssigneeInfo[] => {
    const list: AssigneeInfo[] = [];

    const selfAssignee: AssigneeInfo = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      department: currentUser.department || department,
      designation: currentUser.designation,
      avatar: currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase(),
      status: 'Not Started',
    };

    if (assigneeMode === 'Self') {
      list.push(selfAssignee);
    } else if (assigneeMode === 'Others') {
      const others: AssigneeInfo[] = activeMembers
        .filter(m => selectedOthersIds.includes(m.id) && !isStrictCeo(m))
        .map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          department: m.department || department,
          designation: m.designation,
          avatar: m.avatar || m.name.slice(0, 2).toUpperCase(),
          status: 'Not Started',
        }));
      list.push(...others);
    } else if (assigneeMode === 'Both') {
      list.push(selfAssignee);
      const others: AssigneeInfo[] = activeMembers
        .filter(m => selectedOthersIds.includes(m.id) && m.id !== currentUser.id && !isStrictCeo(m))
        .map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          department: m.department || department,
          designation: m.designation,
          avatar: m.avatar || m.name.slice(0, 2).toUpperCase(),
          status: 'Not Started',
        }));
      list.push(...others);
    }

    return list;
  };

  // Validation function per Flowchart 6: "All mandatory fields filled?"
  const validateForm = () => {
    const missing: string[] = [];
    if (!title.trim()) missing.push('title');
    if (!project) missing.push('project');
    if (!location) missing.push('location');
    if (!department) missing.push('department');
    if (!dueDate) missing.push('dueDate');

    const assignees = getAssignees();
    if (assignees.length === 0) {
      missing.push('assignees');
    }

    // Past due check per Flowchart 6
    if (isPastDue && !pastDueReason.trim()) {
      missing.push('pastDueReason');
    }

    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setServerError(null);

    if (isStrictCeo(currentUser)) {
      setServerError('CEO account is restricted to deliverable monitoring & governance. Task creation is disabled.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const finalAssignees = getAssignees();
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const finalProject = isCustomProject ? (customProjectName.trim() || 'General Operations') : (project || 'General Operations');

    const payload = {
      id: taskId,
      title: title.trim(),
      description: description.trim(),
      inputMethod,
      scheduledDate: dueDate,
      time: dueTime,
      priority,
      status: 'Not Started', // Flowchart 6: Set initial status to Not Started
      requiresCeoApproval: true,
      pendingCeoApproval: false,
      project: finalProject,
      location,
      department,
      creator: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatar: currentUser.avatar,
      },
      assignees: finalAssignees,
      pastDueReason: isPastDue ? pastDueReason.trim() : '',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      let res: Response;
      try {
        res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        // Resilient auto-retry if dev server was briefly busy recompiling
        console.warn('[CreateTaskModal] Initial network call interrupted, retrying...', networkErr);
        await new Promise(r => setTimeout(r, 600));
        res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        setServerError(data.error || 'Failed to save task to server');
        if (data.missingFields) {
          setMissingFields(data.missingFields);
        }
        setIsSubmitting(false);
        return;
      }

      // Optimistically update AppContext without firing redundant /api/tasks POST
      addTask(data.data || payload, true);

      setBannerNotification({
        message: `Task "${title}" created with status "Not Started" & dispatched to ${finalAssignees.length} assignee(s).`,
        badge: 'DELIVERABLE CREATED'
      });

      setIsSubmitting(false);
      resetForm();
      handleClose();
    } catch (err: any) {
      console.error('[CreateTaskModal Submit Error]', err);
      setServerError(err.message || 'Network error occurred while creating task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCreateTaskModalOpen || isStrictCeo(currentUser)) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="modal-container"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Add New Deliverable
              </h2>
              <span style={{
                background: '#e0e7ff',
                color: '#3730a3',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid #c7d2fe'
              }}>
                Initial: Not Started
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Logged in as <strong>{currentUser.name}</strong> ({currentUser.role} • {currentUser.department})
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem 1.75rem', flex: 1 }}>
          {/* Missing Fields Error Alert */}
          {missingFields.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              color: '#991b1b',
              fontSize: '0.82rem',
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Please complete all mandatory fields:</strong>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.4' }}>
                  {missingFields.includes('title') && <li>Task Title is required</li>}
                  {missingFields.includes('assignees') && <li>At least one Assignee must be selected (Self, Others, or Both)</li>}
                  {missingFields.includes('project') && <li>Project selection is required</li>}
                  {missingFields.includes('location') && <li>Location selection is required</li>}
                  {missingFields.includes('department') && <li>Department selection is required</li>}
                  {missingFields.includes('dueDate') && <li>Due Date is required</li>}
                  {missingFields.includes('pastDueReason') && <li>A justification reason is strictly mandatory for past due dates</li>}
                </ul>
              </div>
            </div>
          )}

          {serverError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              color: '#991b1b',
              fontSize: '0.82rem',
            }}>
              <strong>Server Error:</strong> {serverError}
            </div>
          )}

          {/* Flowchart 6 Step 2: Input Method (Speak vs Type) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Input Method
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              background: '#f8fafc',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => {
                  setInputMethod('Speak');
                  if (!isListening && speechSupported) toggleListening();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: inputMethod === 'Speak' ? '#2563eb' : 'transparent',
                  color: inputMethod === 'Speak' ? '#ffffff' : '#64748b',
                  boxShadow: inputMethod === 'Speak' ? '0 2px 4px rgba(37,99,235,0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Mic size={16} />
                Speak (Speech to Text)
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputMethod('Type');
                  if (isListening) toggleListening();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: inputMethod === 'Type' ? '#2563eb' : 'transparent',
                  color: inputMethod === 'Type' ? '#ffffff' : '#64748b',
                  boxShadow: inputMethod === 'Type' ? '0 2px 4px rgba(37,99,235,0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Keyboard size={16} />
                Type (Keyboard Input)
              </button>
            </div>

            {/* Speech Recognition Active Indicator */}
            {inputMethod === 'Speak' && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.85rem',
                borderRadius: '8px',
                background: isListening ? '#eff6ff' : '#f8fafc',
                border: isListening ? '1px solid #bfdbfe' : '1px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isListening ? '#2563eb' : '#94a3b8',
                    animation: isListening ? 'pulse 1.2s infinite' : 'none'
                  }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isListening ? '#1e40af' : '#64748b' }}>
                    {isListening ? 'Listening in English... Speak clearly into your microphone' : 'Microphone idle. Click Start to speak in English.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleListening}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: isListening ? '#ef4444' : '#2563eb',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  {isListening ? 'Stop' : 'Start Speaking'}
                </button>
              </div>
            )}
          </div>

          {/* Flowchart 6 Step 3: Enter Task Title and Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: missingFields.includes('title') ? '#dc2626' : '#334155',
              marginBottom: '0.35rem'
            }}>
              Task Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Concrete audit of Tower B foundation and structural compliance"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (missingFields.includes('title')) {
                  setMissingFields(prev => prev.filter(f => f !== 'title'));
                }
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.88rem',
                borderRadius: '8px',
                border: missingFields.includes('title') ? '2px solid #ef4444' : '1px solid #cbd5e1',
                boxShadow: missingFields.includes('title') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Task Description
            </label>
            <textarea
              rows={2}
              placeholder="Provide background context, deliverables specification, or technical acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Flowchart 6 Step 4: Select one or more assignee (Self or others?) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: missingFields.includes('assignees') ? '#dc2626' : '#334155',
              marginBottom: '0.5rem'
            }}>
              Assignee Selection (Self or Others?) *
            </label>

            {/* 3 Options: Self / Others / Both */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <button
                type="button"
                onClick={() => setAssigneeMode('Self')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: assigneeMode === 'Self' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: assigneeMode === 'Self' ? '#eff6ff' : '#ffffff',
                  color: assigneeMode === 'Self' ? '#1d4ed8' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                <User size={15} />
                Self Only
              </button>

              <button
                type="button"
                onClick={() => setAssigneeMode('Others')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: assigneeMode === 'Others' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: assigneeMode === 'Others' ? '#eff6ff' : '#ffffff',
                  color: assigneeMode === 'Others' ? '#1d4ed8' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={15} />
                Others Only
              </button>

              <button
                type="button"
                onClick={() => setAssigneeMode('Both')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: assigneeMode === 'Both' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: assigneeMode === 'Both' ? '#eff6ff' : '#ffffff',
                  color: assigneeMode === 'Both' ? '#1d4ed8' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserPlus size={15} />
                Both (Self & Others)
              </button>
            </div>

            {/* If Others or Both is selected, render multi-select colleague list */}
            {(assigneeMode === 'Others' || assigneeMode === 'Both') && (
              <div style={{
                background: '#f8fafc',
                border: missingFields.includes('assignees') ? '2px solid #ef4444' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
                  Select colleagues from employee roster:
                </div>
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}>
                  {activeMembers
                    .filter(m => m.id !== currentUser.id && !isStrictCeo(m))
                    .length === 0 ? (
                    <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                      No other active team members available for assignment.
                    </div>
                  ) : (
                    activeMembers
                      .filter(m => m.id !== currentUser.id && !isStrictCeo(m))
                      .map(member => {
                        const isSelected = selectedOthersIds.includes(member.id);
                        return (
                          <label
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: isSelected ? '#dbeafe' : '#ffffff',
                              border: isSelected ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOthersIds(prev => [...prev, member.id]);
                                } else {
                                  setSelectedOthersIds(prev => prev.filter(id => id !== member.id));
                                }
                              }}
                            />
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#2563eb',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              overflow: 'hidden'
                            }}>
                              {member.avatar?.startsWith('/') || member.avatar?.startsWith('http') ? (
                                <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                member.avatar || member.name.slice(0, 2).toUpperCase()
                              )}
                            </span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{member.name}</span>
                            <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                              ({member.designation} • {member.department})
                            </span>
                          </label>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {/* Display Selected Assignees Summary */}
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned ({getAssignees().length}):</span>
              {getAssignees().map(a => (
                <span
                  key={a.id}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#334155'
                  }}
                >
                  {a.name} {a.id === currentUser.id ? '(You)' : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Flowchart 6 Steps 5, 6, 7: Project, Location, Department Dropdowns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            {/* Project / Operational Initiative */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155'
                }}>
                  Project / Initiative
                </label>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                  (Optional)
                </span>
              </div>
              <select
                value={isCustomProject ? '__CUSTOM__' : project}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomProject(true);
                  } else {
                    setIsCustomProject(false);
                    setProject(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                {projectOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="__CUSTOM__">Enter Custom Project / Site Name...</option>
              </select>

              {isCustomProject && (
                <div style={{ marginTop: '0.45rem' }}>
                  <input
                    type="text"
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    placeholder="Enter project or site name (e.g. Sunrise Enclave, Villa Project, Client Demo...)"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      border: '1.5px solid #3b82f6',
                      background: '#eff6ff',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: missingFields.includes('location') ? '#dc2626' : '#334155',
                marginBottom: '0.35rem'
              }}>
                Location *
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  border: missingFields.includes('location') ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                {(systemConfig?.masterLists?.locations || [
                  'Jaipur',
                  'Delhi NCR',
                  'Mumbai',
                  'Bengaluru',
                  'Remote'
                ]).map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: missingFields.includes('department') ? '#dc2626' : '#334155',
                marginBottom: '0.35rem'
              }}>
                Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  border: missingFields.includes('department') ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                {departmentOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Flowchart 6 Step 8: Set Due Date and Priority */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            {/* Due Date with Today / Tomorrow shortcuts */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: missingFields.includes('dueDate') ? '#dc2626' : '#334155',
                }}>
                  Due Date *
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDueDate(getTodayStr());
                      if (missingFields.includes('dueDate')) setMissingFields(prev => prev.filter(f => f !== 'dueDate'));
                    }}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid #bfdbfe',
                      background: dueDate === getTodayStr() ? '#2563eb' : '#eff6ff',
                      color: dueDate === getTodayStr() ? '#ffffff' : '#1d4ed8',
                      cursor: 'pointer'
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDueDate(getTomorrowStr());
                      if (missingFields.includes('dueDate')) setMissingFields(prev => prev.filter(f => f !== 'dueDate'));
                    }}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid #bfdbfe',
                      background: dueDate === getTomorrowStr() ? '#2563eb' : '#eff6ff',
                      color: dueDate === getTomorrowStr() ? '#ffffff' : '#1d4ed8',
                      cursor: 'pointer'
                    }}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (missingFields.includes('dueDate')) {
                    setMissingFields(prev => prev.filter(f => f !== 'dueDate'));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  border: missingFields.includes('dueDate') ? '2px solid #ef4444' : '1px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>

            {/* Priority */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Priority *
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['URGENT', 'HIGH', 'NORMAL'] as TaskPriority[]).map(p => {
                  const isSelected = priority === p;
                  const bg = p === 'URGENT' ? '#fee2e2' : p === 'HIGH' ? '#ffedd5' : '#e0e7ff';
                  const activeBg = p === 'URGENT' ? '#ef4444' : p === 'HIGH' ? '#f97316' : '#3b82f6';
                  const text = p === 'URGENT' ? '#991b1b' : p === 'HIGH' ? '#9a3412' : '#1e40af';
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: isSelected ? 'none' : '1px solid #cbd5e1',
                        background: isSelected ? activeBg : bg,
                        color: isSelected ? '#ffffff' : text,
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Flowchart 6 Step 9: Past Due Date Logic */}
          {isPastDue && (
            <div style={{
              background: '#fffbeb',
              border: missingFields.includes('pastDueReason') ? '2px solid #ef4444' : '1px solid #fde68a',
              borderRadius: '8px',
              padding: '0.9rem',
              marginBottom: '1.25rem',
              boxShadow: missingFields.includes('pastDueReason') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                <AlertTriangle size={16} />
                <span>Past Due Date Detected ({dueDate} is prior to today)</span>
              </div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#92400e' }}>
                Corporate governance mandates an audit justification reason when backdating deliverables.
              </p>
              <textarea
                rows={2}
                placeholder="Enter mandatory justification reason for past due date (e.g. Backfilled deliverable from weekend site inspection)..."
                value={pastDueReason}
                onChange={(e) => {
                  setPastDueReason(e.target.value);
                  if (missingFields.includes('pastDueReason')) {
                    setMissingFields(prev => prev.filter(f => f !== 'pastDueReason'));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  border: missingFields.includes('pastDueReason') ? '2px solid #ef4444' : '1px solid #fcd34d',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
            </div>
          )}

          {/* Flowchart 6 Step 10: Notes, Comments and Remarks */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Notes, Comments & Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Add supplementary notes, handover remarks, or operational comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.84rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Flowchart 6 Step 11: Set Initial Status to Not Started */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                Initial Workflow Status: <span style={{ color: '#2563eb' }}>Not Started</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Per standard operating procedure, new tasks enter the ledger in &quot;Not Started&quot; status.
              </div>
            </div>
            <span style={{
              background: '#e0e7ff',
              color: '#3730a3',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '9999px',
            }}>
              Not Started
            </span>
          </div>

          {/* Flowchart 6 Step 12: Click Save -> Validation Check */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 22px',
                fontSize: '0.85rem',
                fontWeight: 800,
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
                transition: 'background 0.15s ease'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Task...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Save & Assign Deliverable
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateTaskModal;
