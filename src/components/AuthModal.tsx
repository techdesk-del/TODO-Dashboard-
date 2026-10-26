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
  Search,
  Ticket,
  UserPlus,
  LogIn,
  Sparkles,
  Phone,
  Briefcase,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { OFFICIAL_ROSTER, isCeoUser } from '@/lib/rosterData';
import { Role, TeamMember } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'CHOOSER' | 'INVITATION_INPUT' | 'REQUEST_ACCESS' | 'LOGIN';
}

export type AuthViewMode =
  | 'CHOOSER'
  | 'INVITATION_INPUT'
  | 'INVITATION_SETUP'
  | 'REQUEST_ACCESS'
  | 'LOGIN'
  | 'FORGOT_REQUEST'
  | 'FORGOT_VERIFY';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode }) => {
  const { setCurrentUser, currentUser, members, setActiveView, setBannerNotification, logAudit } = useApp();

  // View mode - defaults directly to LOGIN so first screen shown is corporate sign in
  const [authMode, setAuthMode] = useState<AuthViewMode>(initialMode || 'LOGIN');

  // Login credentials & Flowchart 5 Authentication State
  const [email, setEmail] = useState(currentUser && currentUser.id !== 'guest' ? (currentUser.email || '') : '');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorRole, setTwoFactorRole] = useState<string | null>(null);
  const [twoFactorRetriesLeft, setTwoFactorRetriesLeft] = useState<number | null>(null);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockoutMsg, setLockoutMsg] = useState<string | null>(null);

  // Invitation Flow State (FC 1 Branch 1 & FC 4)
  const [inviteCode, setInviteCode] = useState('');
  const [verifiedInvitation, setVerifiedInvitation] = useState<{
    code: string;
    email: string;
    name: string;
    role: Role;
    department: string;
    designation: string;
    expiresAt?: string;
  } | null>(null);
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState('');
  const [invitationErrorDetails, setInvitationErrorDetails] = useState<{
    message: string;
    isExpired?: boolean;
    isInvalid?: boolean;
    isUsed?: boolean;
  } | null>(null);

  // Employee Self Sign-Up Request State (FC 1 Branch 2 & FC 2)
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqDept, setReqDept] = useState('');
  const [reqDesignation, setReqDesignation] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqSubmittedSuccess, setReqSubmittedSuccess] = useState<string | null>(null);

  // Password Reset / Set state (FC 4)
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetOfferResend, setResetOfferResend] = useState(false);

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
    setInvitationErrorDetails(null);
    onClose();
  };

  // Reset transient error/success states, timers, and check URL params whenever modal opens
  useEffect(() => {
    if (isOpen) {
      clearCloseTimer();
      setSuccess(null);
      setError(null);
      setInvitationErrorDetails(null);
      setLoading(false);
      setRequires2FA(false);
      setTwoFactorRetriesLeft(null);
      setShowRosterQuickPick(false);
      setRosterSearch('');
      setPassword('');

      // Check URL query parameters for deep-linked invitations, password reset links, or modes (Flowchart 4)
      let deepLinkProcessed = false;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const queryInvite = urlParams.get('invite') || urlParams.get('invitation');
        const queryResetCode = urlParams.get('resetCode') || urlParams.get('resetToken') || urlParams.get('reset');
        const queryResetEmail = urlParams.get('email') || urlParams.get('resetEmail');
        const queryCode = urlParams.get('code');
        const queryMode = urlParams.get('mode') || urlParams.get('action');

        if (queryInvite) {
          setInviteCode(queryInvite.toUpperCase().trim());
          setAuthMode('INVITATION_INPUT');
          deepLinkProcessed = true;
          // Auto-verify deep link code
          verifyInvitationCode(queryInvite.toUpperCase().trim());
        } else if (queryResetCode || (queryCode && queryResetEmail)) {
          const activeCode = (queryResetCode || queryCode || '').trim();
          setResetCode(activeCode);
          if (queryResetEmail) {
            setResetEmail(queryResetEmail.trim());
            setEmail(queryResetEmail.trim());
          }
          setAuthMode('FORGOT_VERIFY');
          deepLinkProcessed = true;
          setSuccess('✓ Password reset link loaded. Enter your new password meeting policy.');
        } else if (queryCode) {
          setInviteCode(queryCode.toUpperCase().trim());
          setAuthMode('INVITATION_INPUT');
          deepLinkProcessed = true;
          verifyInvitationCode(queryCode.toUpperCase().trim());
        } else if (queryMode === 'request' || queryMode === 'signup') {
          setAuthMode('REQUEST_ACCESS');
          deepLinkProcessed = true;
        } else if (queryMode === 'login') {
          setAuthMode('LOGIN');
          deepLinkProcessed = true;
        }
      }

      if (!deepLinkProcessed) {
        setAuthMode(initialMode || 'LOGIN');
      }

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
        .catch(() => { });
    }
    return () => {
      clearCloseTimer();
    };
  }, [isOpen, currentUser?.email, initialMode]);

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
    const seenIds = new Set<string>();

    const combinedLiveMembers = [...(Array.isArray(members) ? members : []), ...extraMembers];

    const deactivatedEmails = new Set<string>();
    const deactivatedIds = new Set<string>();
    for (const m of combinedLiveMembers) {
      if (!m) continue;
      const s = String(m.status || '').toUpperCase().trim();
      const isDeact = s === 'DEACTIVATED' || s === 'REMOVED' || s === 'TERMINATED' || s === 'EXITED' || (m as unknown as { isDeactivated?: boolean }).isDeactivated === true;
      if (isDeact) {
        if (m.email) deactivatedEmails.add(m.email.toLowerCase().trim());
        if (m.id) deactivatedIds.add(m.id.trim());
      }
    }

    for (const m of combinedLiveMembers) {
      if (!m || !m.email || !m.id) continue;
      const cleanEmail = m.email.toLowerCase().trim();
      const cleanId = m.id.trim();
      const s = String(m.status || '').toUpperCase().trim();
      const isDeact = s === 'DEACTIVATED' || s === 'REMOVED' || s === 'TERMINATED' || s === 'EXITED' || (m as unknown as { isDeactivated?: boolean }).isDeactivated === true;
      if (seenIds.has(cleanId) || seenEmails.has(cleanEmail)) continue;
      if (deactivatedIds.has(cleanId) || deactivatedEmails.has(cleanEmail) || isDeact) {
        continue;
      }

      const officialMatch = OFFICIAL_ROSTER.find(
        o => o.id === cleanId || o.email.toLowerCase() === cleanEmail || o.aliases?.some(a => a.toLowerCase() === cleanEmail)
      );

      seenIds.add(cleanId);
      seenEmails.add(cleanEmail);
      if (officialMatch) {
        seenIds.add(officialMatch.id);
        seenEmails.add(officialMatch.email.toLowerCase().trim());
        officialMatch.aliases?.forEach(a => seenEmails.add(a.toLowerCase().trim()));
      }

      list.push({
        id: cleanId,
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

    for (const o of OFFICIAL_ROSTER) {
      const cleanEmail = o.email.toLowerCase().trim();
      const cleanId = o.id.trim();
      if (deactivatedIds.has(cleanId) || deactivatedEmails.has(cleanEmail)) continue;
      if (seenIds.has(cleanId) || seenEmails.has(cleanEmail)) continue;

      const hasAliasMatch = o.aliases?.some(a => seenEmails.has(a.toLowerCase().trim()));
      if (hasAliasMatch) continue;

      seenIds.add(cleanId);
      seenEmails.add(cleanEmail);
      o.aliases?.forEach(a => seenEmails.add(a.toLowerCase().trim()));

      list.push(o);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // BRANCH 1: INVITATION VERIFICATION & FIRST LOGIN FLOW (FC 1 -> FC 4)
  // ─────────────────────────────────────────────────────────────────────────────
  const verifyInvitationCode = async (codeToVerify?: string) => {
    clearCloseTimer();
    const targetCode = (codeToVerify || inviteCode).trim().toUpperCase();
    if (!targetCode) {
      setError('Please enter your official invitation code.');
      return;
    }

    setLoading(true);
    setError(null);
    setInvitationErrorDetails(null);

    try {
      const res = await fetch('/api/auth/invitation/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        // Matching Flowchart 1: "Show error ask Admin to resend"
        setInvitationErrorDetails({
          message: data.error || 'Invitation code is invalid or has expired. Please ask Admin to resend.',
          isExpired: data.isExpired,
          isInvalid: data.isInvalid,
          isUsed: data.isUsed,
        });
        return;
      }

      // Valid and not expired! Transition to Password Setup (FC 4)
      setVerifiedInvitation(data.invitation);
      setSuccess(`✓ Invitation verified for ${data.invitation.name} (${data.invitation.email})! Please set your corporate password.`);
      setAuthMode('INVITATION_SETUP');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error validating invitation code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemInvitationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCloseTimer();
    setError(null);

    if (!verifiedInvitation) {
      setError('Session expired. Please re-enter your invitation code.');
      setAuthMode('INVITATION_INPUT');
      return;
    }

    if (!invitePassword || invitePassword.length < 6) {
      setError('Password must be at least 6 characters long for security compliance.');
      return;
    }

    if (invitePassword !== inviteConfirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }
    //


    setLoading(true);

    try {
      const res = await fetch('/api/auth/invitation/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verifiedInvitation.code,
          password: invitePassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete first login.');
      }

      // Log in immediately & route into workspace
      setCurrentUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        department: data.user.department,
        designation: data.user.designation || 'Specialist',
        avatar: data.user.avatar || (data.user.name[0] || 'U'),
        status: 'ACTIVE',
        totalTasks: 3,
        completedTasks: 1,
        activeTasks: 2,
        overdueTasks: 0,
        velocity: 100,
      });

      try {
        const payload = JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          department: data.user.department,
          designation: data.user.designation,
          avatar: data.user.avatar,
        });
        localStorage.setItem('urbangaon_auth_user_v2', payload);
        sessionStorage.setItem('urbangaon_auth_user_v2', payload);
        sessionStorage.setItem('urbangaon_session_active', 'true');
      } catch { }

      // Flowchart 5: Log onboarding login in audit trail
      try {
        logAudit({
          action: 'LOGIN',
          fieldChanged: 'First-Time Invitation Activation',
          oldValue: 'Unregistered Staff',
          newValue: `${data.user.name} (${data.user.role})`,
          actor: data.user.name,
          actorRole: data.user.role,
          notes: `Official invitation credentials activated under corporate security protocol.`
        });
      } catch { }

      // Flowchart 5: Role-based Dashboard Navigation
      if (isCeoUser(data.user) || data.user.role === 'SUPER_ADMIN') {
        setActiveView('ceo_portal');
      } else if (data.user.role === 'ADMIN') {
        setActiveView('admin_hr');
      } else if (data.user.role === 'MANAGER') {
        setActiveView('team_view');
      } else {
        setActiveView('workspace');
      }

      setBannerNotification({
        message: `Welcome aboard, ${data.user.name}! Official onboarding complete. Welcome to UrbanGaon!`,
        badge: 'ONBOARDED',
      });

      handleModalClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error setting password and logging in.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // BRANCH 2: EMPLOYEE SELF SIGN-UP REQUEST FLOW (FC 1 -> FC 2)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRequestAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCloseTimer();
    setError(null);
    setSuccess(null);

    if (!reqName.trim() || !reqEmail.trim() || !reqDept || !reqDesignation.trim()) {
      setError('Full legal name, corporate email, department, and designation are mandatory.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reqName.trim(),
          email: reqEmail.trim(),
          phone: reqPhone.trim(),
          department: reqDept,
          designation: reqDesignation.trim(),
          reason: reqReason.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit registration request.');
      }

      setReqSubmittedSuccess(data.message || 'Request submitted successfully to Admin & Talent HR.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit self sign-up request.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // BRANCH 3: STANDARD LOGIN FLOW (FC 1 -> FC 5)
  // ─────────────────────────────────────────────────────────────────────────────
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

      if (!res.ok || !data.success) {
        // Flowchart 5: Account Temporarily Locked (5 Failed attempts -> Lock 15 mins)
        if (data.isLocked) {
          setIsAccountLocked(true);
          setLockoutMsg(data.error);
          setError(data.error);
          setLoading(false);
          return;
        }

        // Flowchart 5: Role requires two-step verification? (Admin or Super Admin)
        if (data.requires2FA) {
          setRequires2FA(true);
          setTwoFactorRole(data.role || null);
          if (data.remainingRetries !== undefined) {
            setTwoFactorRetriesLeft(data.remainingRetries);
            setError(data.error || 'Invalid 2FA code. Please retry.');
          } else {
            setTwoFactorRetriesLeft(null);
            setError(null);
          }
          setLoading(false);
          return;
        }

        // Flowchart 5: Two-step verification failed retry limit (allow 1 retry)
        if (data.twoFactorExceeded) {
          setRequires2FA(false);
          setTwoFactorCode('');
          setError(data.error || 'Two-step verification failed. Maximum retry limit exceeded. Please sign in again.');
          setLoading(false);
          return;
        }

        // Flowchart 4: Force password change on first login
        if (data.requiresPasswordSetup) {
          setResetEmail(email);
          setAuthMode('FORGOT_REQUEST');
          setError(data.error || 'First login detected: Corporate policy requires setting your personal password before signing in.');
          setLoading(false);
          return;
        }

        throw new Error(data.error || 'Authentication failed');
      }

      // Successful credentials verification
      setIsAccountLocked(false);
      setLockoutMsg(null);
      setRequires2FA(false);

      const matchedMember = allDirectoryMembers.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase()) ||
        members.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase()) ||
        OFFICIAL_ROSTER.find(m => m.id === data.user.id || m.email.toLowerCase() === data.user.email.toLowerCase());

      const userObj = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        department: data.user.department,
        designation: data.user.designation || 'Specialist',
        avatar: data.user.avatar || (data.user.name[0] || 'U'),
        status: 'ACTIVE' as const,
        totalTasks: matchedMember?.totalTasks ?? 3,
        completedTasks: matchedMember?.completedTasks ?? 1,
        activeTasks: matchedMember?.activeTasks ?? 2,
        overdueTasks: matchedMember?.overdueTasks ?? 0,
        velocity: matchedMember?.velocity ?? 95,
      };

      setCurrentUser(userObj);

      try {
        const payload = JSON.stringify({
          id: userObj.id,
          name: userObj.name,
          email: userObj.email,
          role: userObj.role,
          department: userObj.department,
          designation: userObj.designation,
          avatar: userObj.avatar,
        });
        localStorage.setItem('urbangaon_auth_user_v2', payload);
        sessionStorage.setItem('urbangaon_auth_user_v2', payload);
        sessionStorage.setItem('urbangaon_session_active', 'true');
      } catch { }

      // Flowchart 5: "Log successful login in audit trail"
      try {
        logAudit({
          action: 'LOGIN',
          fieldChanged: 'Corporate Authentication Session',
          oldValue: 'Unauthenticated Session',
          newValue: `${userObj.name} (${userObj.role})`,
          actor: userObj.name,
          actorRole: userObj.role,
          notes: `Successful login verified under corporate security protocol. Role routed to ${isCeoUser(userObj) || userObj.role === 'SUPER_ADMIN' ? 'Super Admin Dashboard (CEO Portal)' :
              userObj.role === 'ADMIN' ? 'Admin / Talent HR Dashboard' :
                userObj.role === 'MANAGER' ? 'Manager Dashboard (My Team View)' : 'Employee Workspace'
            }.`
        });
      } catch (auditErr) {
        console.warn('[AuthModal] Audit log note:', auditErr);
      }

      // Flowchart 5: Role-based Dashboard Navigation
      // 1. Super Admin or Director -> Super Admin Dashboard ('ceo_portal')
      // 2. Admin or Talent HR -> Admin Dashboard ('admin_hr')
      // 3. Reporting Manager -> Manager Dashboard with My Team view ('team_view')
      // 4. Employee -> Employee Dashboard ('workspace')
      if (isCeoUser(userObj) || userObj.role === 'SUPER_ADMIN') {
        setActiveView('ceo_portal');
      } else if (userObj.role === 'ADMIN') {
        setActiveView('admin_hr');
      } else if (userObj.role === 'MANAGER') {
        setActiveView('team_view');
      } else {
        setActiveView('workspace');
      }

      setBannerNotification({
        message: `Welcome, ${data.user.name} (${data.user.designation})! Authenticated under corporate security protocol.`,
        badge: 'AUTHENTICATED',
      });

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
      setResetOfferResend(false);
      setSuccess(`Expiring reset link dispatched to ${data.email || targetEmail}! Check your inbox.`);
      setAuthMode('FORGOT_VERIFY');
    } catch (err: unknown) {
      setResetOfferResend(true);
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
        if (data.offerResend) {
          setResetOfferResend(true);
        }
        throw new Error(data.error || 'Failed to set new password');
      }

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

      try {
        const payload = JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          department: data.user.department,
          designation: data.user.designation,
          avatar: data.user.avatar,
        });
        localStorage.setItem('urbangaon_auth_user_v2', payload);
        sessionStorage.setItem('urbangaon_auth_user_v2', payload);
        sessionStorage.setItem('urbangaon_session_active', 'true');
      } catch { }

      // Flowchart 5: Log reset password login in audit trail
      try {
        logAudit({
          action: 'LOGIN',
          fieldChanged: 'Password Reset Authentication',
          oldValue: 'Password Reset Flow',
          newValue: `${data.user.name} (${data.user.role})`,
          actor: data.user.name,
          actorRole: data.user.role,
          notes: `Personal password configured and authenticated under corporate security protocol.`
        });
      } catch { }

      // Flowchart 5: Role-based Dashboard Navigation
      if (isCeoUser(data.user) || data.user.role === 'SUPER_ADMIN') {
        setActiveView('ceo_portal');
      } else if (data.user.role === 'ADMIN') {
        setActiveView('admin_hr');
      } else if (data.user.role === 'MANAGER') {
        setActiveView('team_view');
      } else {
        setActiveView('workspace');
      }
      setBannerNotification({
        message: `Personal password configured successfully! Logged in as ${data.user.name}.`,
        badge: 'AUTHENTICATED',
      });

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
        if (e.target === e.currentTarget) {
          handleModalClose();
        }
      }}
    >
      <div
        className="stream-modal-card auth-modal-responsive-card"
        style={{
          maxWidth: '520px',
          width: '95vw',
          maxHeight: 'min(90vh, 90dvh)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          padding: 0,
          margin: 'auto'
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
      >
        {/* Sticky Modal Header */}
        <div
          className="stream-modal-header"
          style={{
            flexShrink: 0,
            padding: 'clamp(0.75rem, 2vw, 1rem) clamp(0.9rem, 2.5vw, 1.35rem)',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
            {/* Official Homepage Brand Logo */}
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img
                src="/urbangaon-logo.png"
                alt="UrbanGaon — a perfect balance"
                style={{
                  height: 'clamp(26px, 3.5vw, 32px)',
                  width: 'auto',
                  maxWidth: 'clamp(120px, 20vw, 160px)',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', flexShrink: 0 }} />

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {authMode === 'CHOOSER' && 'Welcome Portal'}
                {authMode === 'INVITATION_INPUT' && 'Redeem Employee Invitation'}
                {authMode === 'INVITATION_SETUP' && 'Password Setup & First Login'}
                {authMode === 'REQUEST_ACCESS' && 'Employee Self Sign-Up'}
                {authMode === 'LOGIN' && 'Corporate Employee Sign In'}
                {authMode === 'FORGOT_REQUEST' && 'Reset / Set Personal Password'}
                {authMode === 'FORGOT_VERIFY' && 'Verify Email & Set Password'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {authMode === 'CHOOSER' && 'Select an onboarding or login option'}
                {authMode === 'INVITATION_INPUT' && 'Enter your invitation code or email link to proceed'}
                {authMode === 'INVITATION_SETUP' && 'Securely establish personal password'}
                {authMode === 'REQUEST_ACCESS' && 'Submit an access request to HR & Admin'}
                {authMode === 'LOGIN' && 'Sign in with your verified corporate account'}
                {authMode === 'FORGOT_REQUEST' && 'Enter corporate email to receive a secure 6-digit code'}
                {authMode === 'FORGOT_VERIFY' && 'Enter verification code sent to your corporate email'}
              </div>
            </div>
          </div>
          <button className="calendar-nav-btn" onClick={handleModalClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Modal Body Container (Prevents viewport clipping on small screens / mobile) */}
        <div
          className="stream-modal-scroll-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 'clamp(0.85rem, 2.5vw, 1.35rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            WebkitOverflowScrolling: 'touch'
          }}
        >

          {/* Error Banner */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '9px 12px',
              fontSize: '0.76rem',
              color: '#991b1b',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {authMode === 'LOGIN' && !isAccountLocked && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #fee2e2', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#b91c1c' }}>Forgot credentials or password not set?</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearCloseTimer();
                      setResetEmail(email);
                      setAuthMode('FORGOT_REQUEST');
                      setError(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Forgot Password? Reset Link →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '9px 12px',
              fontSize: '0.76rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '1rem'
            }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SCREEN 1: FLOWCHART 1 LANDING PAGE CHOOSER (3 OPTIONS)                */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {authMode === 'CHOOSER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                fontSize: '0.76rem',
                color: '#1e3a8a',
                lineHeight: 1.45
              }}>
                <strong>Welcome to UrbanGaon Enterprise Task Register.</strong> Please select which option describes your status to proceed with secure onboarding or workspace entry.
              </div>

              {/* Option 1: I have an invitation */}
              <div
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setInvitationErrorDetails(null);
                  setAuthMode('INVITATION_INPUT');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.9rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(37,99,235,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Ticket size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      I have an invitation
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af' }}>
                      Invited
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                    Enter the invitation code received from Admin/HR or redeem your official activation link to set up your corporate password.
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" style={{ marginTop: '10px', flexShrink: 0 }} />
              </div>

              {/* Option 2: I want to request access */}
              <div
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setReqSubmittedSuccess(null);
                  setAuthMode('REQUEST_ACCESS');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.9rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#059669';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(5,150,105,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UserPlus size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      I want to request access
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#d1fae5', color: '#065f46' }}>
                      New Joiner
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                    Prospective or newly joined employee? Submit your registration details for Talent HR & Admin verification and approval.
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" style={{ marginTop: '10px', flexShrink: 0 }} />
              </div>

              {/* Option 3: I already have an account */}
              <div
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setAuthMode('LOGIN');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.9rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#7c3aed';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(124,58,237,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#f5f3ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <LogIn size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      I already have an account
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#ede9fe', color: '#5b21b6' }}>
                      Employee
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                    Sign in with your verified corporate credentials, password, and secure role-based dashboard routing.
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" style={{ marginTop: '10px', flexShrink: 0 }} />
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SCREEN 2: INVITATION CODE INPUT & VALIDATION (BRANCH 1)                */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {authMode === 'INVITATION_INPUT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '0.74rem',
                color: '#1e40af',
                lineHeight: 1.45
              }}>
                <strong>Invitation Verification:</strong> Enter the invitation code (e.g. <code>INV-XXXX</code>) from your welcome email or HR provisioning letter.
              </div>

              {/* SPECIFIC FLOWCHART 1 ERROR ALERT: "Show error ask Admin to resend" */}
              {invitationErrorDetails && (
                <div style={{
                  background: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#be123c', fontWeight: 800, fontSize: '0.85rem' }}>
                    <AlertTriangle size={18} />
                    <span>
                      {invitationErrorDetails.isExpired ? 'Invitation Code Has Expired' :
                        invitationErrorDetails.isUsed ? 'Invitation Already Redeemed' :
                          'Invalid Invitation Code'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#9f1239', lineHeight: 1.45 }}>
                    {invitationErrorDetails.message}
                  </div>
                  <div style={{
                    marginTop: '0.25rem',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #fecdd3',
                    fontSize: '0.72rem',
                    color: '#881337',
                    fontWeight: 700
                  }}>
                    Resolution: Please contact your System Administrator or Talent HR team to resend an updated invitation link.
                  </div>
                  <div style={{ marginTop: '0.45rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('REQUEST_ACCESS');
                        setInvitationErrorDetails(null);
                        setError(null);
                      }}
                      style={{
                        background: '#e11d48',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Request New Access / Resend Invitation →
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={e => { e.preventDefault(); verifyInvitationCode(); }} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Corporate Invitation Code
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '2px solid #2563eb',
                    borderRadius: '8px',
                    padding: '8px 11px',
                    background: '#eff6ff'
                  }}>
                    <Ticket size={16} color="#2563eb" style={{ marginRight: '8px', flexShrink: 0 }} />
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="INV-XXXXXX"
                      value={inviteCode}
                      onChange={e => {
                        setInviteCode(e.target.value.toUpperCase());
                        setInvitationErrorDetails(null);
                        setError(null);
                      }}
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        letterSpacing: '2px',
                        color: '#0f172a',
                        background: 'transparent'
                      }}
                    />
                  </div>
                </div>




                <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('CHOOSER');
                      setInvitationErrorDetails(null);
                      setError(null);
                    }}
                    className="btn-secondary"
                    style={{ minWidth: '85px', flex: '1 1 85px', justifyContent: 'center', padding: '9px', fontSize: '0.8rem', borderRadius: '8px' }}
                  >
                    <ArrowLeft size={14} style={{ marginRight: '4px' }} />
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !inviteCode.trim()}
                    className="btn-primary"
                    style={{ minWidth: '180px', flex: '2 1 180px', justifyContent: 'center', padding: '9px', fontWeight: 700, fontSize: '0.82rem', borderRadius: '8px' }}
                  >
                    {loading ? 'Validating...' : 'Validate & Proceed →'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SCREEN 3: FIRST LOGIN & PASSWORD SETUP (FC 1 -> FC 4)                 */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {authMode === 'INVITATION_SETUP' && verifiedInvitation && (
            <form onSubmit={handleRedeemInvitationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  {verifiedInvitation.name ? verifiedInvitation.name.slice(0, 2).toUpperCase() : 'UR'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                    {verifiedInvitation.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>
                    {verifiedInvitation.email}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {verifiedInvitation.department} • {verifiedInvitation.designation} ({verifiedInvitation.role})
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Create Personal Corporate Password (Min 6 Characters)
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
                    placeholder="Enter confidential password"
                    value={invitePassword}
                    onChange={e => {
                      setInvitePassword(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Confirm Personal Corporate Password
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
                    placeholder="Re-enter password to confirm"
                    value={inviteConfirmPassword}
                    onChange={e => {
                      setInviteConfirmPassword(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
              </div>

              {/* Flowchart 4: Password Policy Checklist */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.72rem',
                color: '#475569',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                  Corporate Password Policy:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: invitePassword.length >= 6 ? '#16a34a' : '#64748b' }}>
                  {invitePassword.length >= 6 ? '✓' : '○'} Minimum 6 characters ({invitePassword.length}/6)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (inviteConfirmPassword && invitePassword === inviteConfirmPassword) ? '#16a34a' : '#64748b' }}>
                  {(inviteConfirmPassword && invitePassword === inviteConfirmPassword) ? '✓' : '○'} Passwords match
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('INVITATION_INPUT');
                    setError(null);
                  }}
                  className="btn-secondary"
                  style={{ minWidth: '85px', flex: '1 1 85px', justifyContent: 'center', padding: '9px', fontSize: '0.8rem', borderRadius: '8px' }}
                >
                  <ArrowLeft size={14} style={{ marginRight: '4px' }} />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ minWidth: '180px', flex: '2 1 180px', justifyContent: 'center', padding: '9px', fontWeight: 700, fontSize: '0.82rem', borderRadius: '8px' }}
                >
                  {loading ? 'Activating Account...' : 'Set Password & Enter Workspace'}
                </button>
              </div>
            </form>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SCREEN 4: EMPLOYEE SELF SIGN-UP REQUEST (FC 1 -> FC 2)                */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {authMode === 'REQUEST_ACCESS' && (
            <div>
              {reqSubmittedSuccess ? (
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  padding: '1.75rem 1.25rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={26} />
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Request Submitted to HR & Admin
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.5, maxWidth: '380px' }}>
                    {reqSubmittedSuccess}
                  </div>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.72rem',
                    color: '#64748b',
                    marginTop: '0.5rem'
                  }}>
                    Next Step: Admin/HR will review your request in their Approvals Queue. Once approved, you will receive an invitation code to complete your first login.
                  </div>
                  <button
                    onClick={() => {
                      setReqSubmittedSuccess(null);
                      setAuthMode('CHOOSER');
                    }}
                    className="btn-primary"
                    style={{ marginTop: '0.75rem', padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px' }}
                  >
                    Return to Portal Chooser
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestAccessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.73rem',
                    color: '#065f46',
                    lineHeight: 1.45
                  }}>
                    <strong>Employee Self Sign-Up:</strong> Submit your details below. Once Talent HR verifies your department and employment status, your official account will be provisioned.
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={reqName}
                      onChange={e => setReqName(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: '7px',
                        padding: '7px 10px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        color: '#0f172a'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                        Corporate Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="rahul@urbangaon.com"
                        value={reqEmail}
                        onChange={e => setReqEmail(e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #cbd5e1',
                          borderRadius: '7px',
                          padding: '7px 10px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          color: '#0f172a',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={reqPhone}
                        onChange={e => setReqPhone(e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #cbd5e1',
                          borderRadius: '7px',
                          padding: '7px 10px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          color: '#0f172a',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                        Department *
                      </label>
                      <select
                        required
                        value={reqDept}
                        onChange={e => setReqDept(e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #cbd5e1',
                          borderRadius: '7px',
                          padding: '7px 10px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          background: '#ffffff',
                          color: '#0f172a',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">Select Dept...</option>
                        <option value="Executive Management">Executive Management</option>
                        <option value="AI & IT Operations">AI & IT Operations</option>
                        <option value="Full-Stack Engineering">Full-Stack Engineering</option>
                        <option value="Product & UI/UX">Product & UI/UX</option>
                        <option value="Talent HR & People">Talent HR & People</option>
                        <option value="Marketing & Growth">Marketing & Growth</option>
                        <option value="Client Success & Support">Client Success & Support</option>
                        <option value="Finance & Compliance">Finance & Compliance</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                        Designation *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Software Engineer"
                        value={reqDesignation}
                        onChange={e => setReqDesignation(e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #cbd5e1',
                          borderRadius: '7px',
                          padding: '7px 10px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          color: '#0f172a',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                      Reason for Request / Assigned Projects
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief note on team, project, or role justification..."
                      value={reqReason}
                      onChange={e => setReqReason(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #cbd5e1',
                        borderRadius: '7px',
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        outline: 'none',
                        color: '#0f172a',
                        resize: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('CHOOSER');
                        setError(null);
                      }}
                      className="btn-secondary"
                      style={{ minWidth: '85px', flex: '1 1 85px', justifyContent: 'center', padding: '9px', fontSize: '0.8rem', borderRadius: '8px' }}
                    >
                      <ArrowLeft size={14} style={{ marginRight: '4px' }} />
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                      style={{ minWidth: '180px', flex: '2 1 180px', justifyContent: 'center', padding: '9px', fontWeight: 700, fontSize: '0.82rem', borderRadius: '8px', background: '#059669' }}
                    >
                      {loading ? 'Submitting...' : 'Submit Request to HR'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SCREEN 5: STANDARD LOGIN & ROLE ROUTING (FC 1 -> FC 5)                */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {authMode === 'LOGIN' && (
            <div>
              {/* Return to Chooser pill */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setAuthMode('CHOOSER');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  <ArrowLeft size={13} />
                  Back to Portal Options
                </button>

                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Secure Sign-In
                </span>
              </div>

              {/* Quick Select Employee Pill / Toggle */}
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

                    {filteredDirectoryMembers.map((emp, empIdx) => {
                      const isSelected = emp.email.toLowerCase() === activeEmailForLookup.toLowerCase();
                      return (
                        <div
                          key={`${emp.id}-${emp.email}-${empIdx}`}
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

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Flowchart 5: Account Temporarily Locked Alert */}
                {isAccountLocked && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    color: '#991b1b',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '2px' }}>
                        Account Temporarily Frozen for 15 Minutes
                      </div>
                      <div>
                        {lockoutMsg || '5 consecutive failed login attempts detected. To protect enterprise systems, this account is frozen for 15 minutes. A security alert email was dispatched.'}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(email);
                            setAuthMode('FORGOT_REQUEST');
                            setError(null);
                          }}
                          style={{
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Reset Password via OTP →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flowchart 5: Two-Step Verification Instruction Banner */}
                {requires2FA && !isAccountLocked && (
                  <div style={{
                    background: '#eff6ff',
                    border: '1px solid #93c5fd',
                    borderRadius: '8px',
                    padding: '0.75rem 0.95rem',
                    color: '#1e40af',
                    fontSize: '0.76rem',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <ShieldCheck size={17} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 800 }}>Role-Based Two-Step Verification</div>
                      <div>
                        Privileged access ({twoFactorRole || 'Admin / Super Admin'}) requires two-step verification. An official 6-digit OTP has been sent to <strong>{email}</strong> (or enter default test code <code>123456</code>). Under protocol, 1 retry is permitted upon error.
                      </div>
                    </div>
                  </div>
                )}

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
                        setIsAccountLocked(false);
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
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => {
                        clearCloseTimer();
                        setSuccess(null);
                        setError(null);
                        setPassword(e.target.value);
                      }}
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
                        onChange={e => {
                          clearCloseTimer();
                          setError(null);
                          setTwoFactorCode(e.target.value);
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || isAccountLocked}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '9px',
                    marginTop: '0.35rem',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    borderRadius: '8px',
                    background: isAccountLocked ? '#94a3b8' : undefined,
                    cursor: isAccountLocked ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAccountLocked
                    ? 'Account Frozen (15 Mins)'
                    : (loading
                      ? 'Authenticating...'
                      : (requires2FA
                        ? (twoFactorRetriesLeft !== null && twoFactorRetriesLeft < 2
                          ? `Authorize Session with OTP (${twoFactorRetriesLeft} Retry Left)`
                          : 'Authorize Session with OTP')
                        : 'Sign In Securely'))}
                </button>
              </form>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SCREEN 6: FORGOT / SET PASSWORD - REQUEST CODE (FC 4)                  */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
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
                <strong>Self-Service Password Setup:</strong> Enter your corporate email address below. A 6-digit verification code will be sent to your inbox to authenticate and set your personal password.
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

              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
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
                    minWidth: '85px',
                    flex: '1 1 85px',
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
                    minWidth: '160px',
                    flex: '2 1 160px',
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

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* SCREEN 7: FORGOT / SET PASSWORD - VERIFY CODE & SET (FC 4)             */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
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

              {/* Flowchart 4: Password Policy Checklist */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.72rem',
                color: '#475569',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                  Corporate Password Policy:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: newPassword.length >= 6 ? '#16a34a' : '#64748b' }}>
                  {newPassword.length >= 6 ? '✓' : '○'} Minimum 6 characters ({newPassword.length}/6)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (confirmPassword && newPassword === confirmPassword) ? '#16a34a' : '#64748b' }}>
                  {(confirmPassword && newPassword === confirmPassword) ? '✓' : '○'} Passwords match
                </div>
              </div>

              {/* Flowchart 4: Offer to Resend Button if link is invalid or expired */}
              {resetOfferResend && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 600 }}>
                    Link expired or invalid?
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestResetCode}
                    disabled={loading}
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Resend Reset Link
                  </button>
                </div>
              )}

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
                  Didn&apos;t receive code? Resend email
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

          {/* Enterprise Security Footer */}
          <div style={{
            marginTop: '1.15rem',
            padding: '9px 12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.7rem',
            color: '#64748b',
            lineHeight: 1.45
          }}>
            <strong>UrbanGaon Security Protocol:</strong> Secure invitation tokens, encrypted credentials, and verified role routing ensure complete enterprise confidentiality.
          </div>
        </div>
      </div>
    </div>
  );
};
