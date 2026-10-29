const fs = require('fs');
const path = require('path');

const contextPath = path.join(__dirname, '..', 'src', 'context', 'AppContext.tsx');
let content = fs.readFileSync(contextPath, 'utf8');

const normalizeCRLFs = (str) => str.replace(/\r\n/g, '\n');
const toCRLF = (str) => str.replace(/\r?\n/g, '\r\n');

// 1. In refreshMembersFromDB: save to localStorage 'urbangaon_members_v2'
const refreshTarget = `          setMembers(filteredMembers);

          // Live session sync: If this user's email/name/status was updated on another PC by an Admin, synchronize currentUser seamlessly`;

const refreshReplacement = `          setMembers(filteredMembers);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('urbangaon_members_v2', JSON.stringify(filteredMembers));
            }
          } catch { }

          // Live session sync: If this user's email/name/status was updated on another PC by an Admin, synchronize currentUser seamlessly`;

if (normalizeCRLFs(content).includes(normalizeCRLFs(refreshTarget))) {
  content = toCRLF(normalizeCRLFs(content).replace(normalizeCRLFs(refreshTarget), normalizeCRLFs(refreshReplacement)));
  console.log('✓ Added localStorage caching to refreshMembersFromDB');
} else {
  console.warn('Warning: Could not match refreshTarget');
}

// 2. On mount: hydrate from localStorage 'urbangaon_members_v2'
const mountTarget = `  // ── Load persisted data / fetch from API on mount
  useEffect(() => {
    // Check localStorage first for instant hydration
    try {
      const cachedPurged = localStorage.getItem('urbangaon_purged_members_v1');`;

const mountReplacement = `  // ── Load persisted data / fetch from API on mount
  useEffect(() => {
    // Check localStorage first for instant hydration
    try {
      const cachedMembers = localStorage.getItem('urbangaon_members_v2');
      if (cachedMembers) {
        const parsed = JSON.parse(cachedMembers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(parsed);
        }
      }
    } catch { }

    try {
      const cachedPurged = localStorage.getItem('urbangaon_purged_members_v1');`;

if (normalizeCRLFs(content).includes(normalizeCRLFs(mountTarget))) {
  content = toCRLF(normalizeCRLFs(content).replace(normalizeCRLFs(mountTarget), normalizeCRLFs(mountReplacement)));
  console.log('✓ Added instant hydration from localStorage for members');
} else {
  console.warn('Warning: Could not match mountTarget');
}

// 3. In SSE member_mutation: update localStorage
const sseTarget = `              // 1. Immediately update members list in memory across all connected PCs
              setMembers(prev => prev.map(m => {
                const isMatch = (memberId && m.id === memberId) ||
                  (oldEmail && m.email?.toLowerCase() === oldEmail) ||
                  (newEmail && m.email?.toLowerCase() === newEmail);
                if (!isMatch) return m;
                return {
                  ...m,
                  ...updatedMemberData,
                  ...(newEmail ? { email: newEmail } : {}),
                  ...(newName ? { name: newName } : {})
                };
              }));`;

const sseReplacement = `              // 1. Immediately update members list in memory across all connected PCs
              setMembers(prev => {
                const next = prev.map(m => {
                  const isMatch = (memberId && m.id === memberId) ||
                    (data.oldMemberId && m.id === data.oldMemberId) ||
                    (oldEmail && m.email?.toLowerCase() === oldEmail) ||
                    (newEmail && m.email?.toLowerCase() === newEmail);
                  if (!isMatch) return m;
                  return {
                    ...m,
                    ...updatedMemberData,
                    ...(newEmail ? { email: newEmail } : {}),
                    ...(newName ? { name: newName } : {})
                  };
                });
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('urbangaon_members_v2', JSON.stringify(next));
                  }
                } catch { }
                return next;
              });`;

if (normalizeCRLFs(content).includes(normalizeCRLFs(sseTarget))) {
  content = toCRLF(normalizeCRLFs(content).replace(normalizeCRLFs(sseTarget), normalizeCRLFs(sseReplacement)));
  console.log('✓ Added localStorage update to SSE member_mutation');
} else {
  console.warn('Warning: Could not match sseTarget');
}

// 4. Update updateMember implementation
const updateMemberTarget = `  const updateMember = async (
    memberId: string,
    updates: Partial<TeamMember>,
    reason?: string
  ): Promise<{ success: boolean; member?: TeamMember; error?: string }> => {
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: memberId,
          ...updates,
          reason,
          actor: currentUser.name || 'Admin / Talent HR',
          actorRole: currentUser.role || 'ADMIN',
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update employee details.');
      }

      const updatedMember = json.data as TeamMember;
      const oldMemberEmail = members.find(m => m.id === memberId)?.email.toLowerCase();

      // Update members in state
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updatedMember } : m));

      // If current user is being updated, sync current user & storage
      if (currentUser.id === memberId || (oldMemberEmail && currentUser.email?.toLowerCase() === oldMemberEmail)) {
        const synced = { ...currentUser, ...updatedMember };
        setCurrentUser(synced);
        try {
          localStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(synced));
          sessionStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(synced));
        } catch { }
      }

      // If email or name was updated, sync task assignees and creator in local state immediately
      if (updates.email || updates.name) {
        setTasks(prev => prev.map(t => {
          let hasChange = false;
          const newAssignees = t.assignees.map(a => {
            if (a.id === memberId || (oldMemberEmail && a.email?.toLowerCase() === oldMemberEmail)) {
              hasChange = true;
              return {
                ...a,
                ...(updates.email ? { email: updates.email } : {}),
                ...(updates.name ? { name: updates.name } : {}),
                ...(updatedMember.avatar ? { avatar: updatedMember.avatar } : {})
              };
            }
            return a;
          });
          const isCreatorMatch = t.creator.id === memberId || (oldMemberEmail && t.creator.email?.toLowerCase() === oldMemberEmail);
          const newCreator = isCreatorMatch ? {
            ...t.creator,
            ...(updates.email ? { email: updates.email } : {}),
            ...(updates.name ? { name: updates.name } : {})
          } : t.creator;
          if (newCreator !== t.creator) hasChange = true;

          return hasChange ? { ...t, assignees: newAssignees, creator: newCreator } : t;
        }));
      }

      logAudit({
        action: 'UPDATED',
        fieldChanged: updates.email ? \`Employee Email (\${updatedMember.name})\` : \`Employee Profile (\${updatedMember.name})\`,
        oldValue: updates.email ? (members.find(m => m.id === memberId)?.email || '') : 'Profile Details',
        newValue: updates.email ? updates.email : JSON.stringify(updates),
        notes: reason || \`Updated employee details for \${updatedMember.name} by \${currentUser.name}\`
      });

      setBannerNotification({
        message: json.message || \`Employee \${updatedMember.name} updated successfully.\`,
        badge: '✓ Employee Updated'
      });

      return { success: true, member: updatedMember };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      console.error('[AppContext] updateMember error:', msg);
      return { success: false, error: msg };
    }
  };`;

const updateMemberReplacement = `  const updateMember = async (
    memberId: string,
    updates: Partial<TeamMember>,
    reason?: string
  ): Promise<{ success: boolean; member?: TeamMember; error?: string }> => {
    try {
      const oldMember = members.find(m => m.id === memberId || (m as any)._id === memberId);
      const oldMemberEmail = oldMember?.email?.toLowerCase();
      const targetEmpId = updates.employeeId || updates.id || memberId;

      const payload = {
        targetMemberId: memberId,
        id: memberId,
        currentEmail: oldMemberEmail,
        newEmployeeId: targetEmpId,
        employeeId: targetEmpId,
        ...updates,
        reason,
        actor: currentUser.name || 'Admin / Talent HR',
        actorRole: currentUser.role || 'ADMIN',
      };

      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update employee details.');
      }

      const updatedMember = (json.data || { ...oldMember, ...updates, id: targetEmpId, employeeId: targetEmpId }) as TeamMember;

      // Update members in state immediately (optimistic & accurate)
      setMembers(prev => {
        const next = prev.map(m => {
          const isMatch = m.id === memberId ||
            (oldMemberEmail && m.email?.toLowerCase() === oldMemberEmail) ||
            (updatedMember?.id && m.id === updatedMember.id) ||
            ((m as any)._id && (m as any)._id === (updatedMember as any)?._id);
          return isMatch ? { ...m, ...updatedMember } : m;
        });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('urbangaon_members_v2', JSON.stringify(next));
          }
        } catch { }
        return next;
      });

      // If current user is being updated, sync current user & storage
      if (currentUser.id === memberId || (oldMemberEmail && currentUser.email?.toLowerCase() === oldMemberEmail) || currentUser.id === updatedMember.id) {
        const synced = { ...currentUser, ...updatedMember };
        setCurrentUser(synced);
        try {
          localStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(synced));
          sessionStorage.setItem('urbangaon_auth_user_v2', JSON.stringify(synced));
        } catch { }
      }

      // If email, name, designation, role or ID was updated, sync task assignees and creator in local state immediately
      if (updates.email || updates.name || updates.designation || updates.id || updates.employeeId || updates.role) {
        setTasks(prev => prev.map(t => {
          let hasChange = false;
          const newAssignees = t.assignees.map(a => {
            if (a.id === memberId || (oldMemberEmail && a.email?.toLowerCase() === oldMemberEmail) || a.id === targetEmpId) {
              hasChange = true;
              return {
                ...a,
                id: targetEmpId,
                ...(updates.email ? { email: updates.email } : {}),
                ...(updates.name ? { name: updates.name } : {}),
                ...(updates.designation ? { designation: updates.designation } : {}),
                ...(updatedMember.avatar ? { avatar: updatedMember.avatar } : {})
              };
            }
            return a;
          });
          const isCreatorMatch = t.creator.id === memberId || (oldMemberEmail && t.creator.email?.toLowerCase() === oldMemberEmail) || t.creator.id === targetEmpId;
          const newCreator = isCreatorMatch ? {
            ...t.creator,
            id: targetEmpId,
            ...(updates.email ? { email: updates.email } : {}),
            ...(updates.name ? { name: updates.name } : {}),
            ...(updates.role ? { role: updates.role } : {})
          } : t.creator;
          if (newCreator !== t.creator) hasChange = true;

          return hasChange ? { ...t, assignees: newAssignees, creator: newCreator } : t;
        }));
      }

      logAudit({
        action: 'UPDATED',
        fieldChanged: updates.email ? \`Employee Email (\${updatedMember.name})\` : \`Employee Profile (\${updatedMember.name})\`,
        oldValue: updates.email ? (members.find(m => m.id === memberId)?.email || '') : 'Profile Details',
        newValue: updates.email ? updates.email : JSON.stringify(updates),
        notes: reason || \`Updated employee details for \${updatedMember.name} by \${currentUser.name}\`
      });

      setBannerNotification({
        message: json.message || \`Employee \${updatedMember.name} updated successfully.\`,
        badge: '✓ Employee Updated'
      });

      // Synchronize with database in background
      await refreshMembersFromDB();

      return { success: true, member: updatedMember };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      console.error('[AppContext] updateMember error:', msg);
      return { success: false, error: msg };
    }
  };`;

if (normalizeCRLFs(content).includes(normalizeCRLFs(updateMemberTarget))) {
  content = toCRLF(normalizeCRLFs(content).replace(normalizeCRLFs(updateMemberTarget), normalizeCRLFs(updateMemberReplacement)));
  console.log('✓ Updated updateMember in AppContext');
} else {
  console.warn('Warning: Could not match updateMemberTarget');
}

// 5. In updateProfile: update localStorage and refreshMembersFromDB
const updateProfileTarget = `      // Sync members list in state
      setMembers(prev => prev.map(m => {
        if (m.id === currentUser.id || m.id === finalId || (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase())) {
          return {
            ...m,
            id: finalId,
            employeeId: finalId,
            name: finalName,
            email: finalEmail,
            role: finalRole,
            designation: finalDesignation,
            department: finalDepartment,
            avatar: finalAvatar
          };
        }
        return m;
      }));`;

const updateProfileReplacement = `      // Sync members list in state
      setMembers(prev => {
        const next = prev.map(m => {
          if (m.id === currentUser.id || m.id === finalId || (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase())) {
            return {
              ...m,
              id: finalId,
              employeeId: finalId,
              name: finalName,
              email: finalEmail,
              role: finalRole,
              designation: finalDesignation,
              department: finalDepartment,
              avatar: finalAvatar
            };
          }
          return m;
        });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('urbangaon_members_v2', JSON.stringify(next));
          }
        } catch { }
        return next;
      });`;

if (normalizeCRLFs(content).includes(normalizeCRLFs(updateProfileTarget))) {
  content = toCRLF(normalizeCRLFs(content).replace(normalizeCRLFs(updateProfileTarget), normalizeCRLFs(updateProfileReplacement)));
  console.log('✓ Added localStorage caching to updateProfile');
} else {
  console.warn('Warning: Could not match updateProfileTarget');
}

// 6. In updateProfile: call refreshMembersFromDB before returning
const profileReturnTarget = `      return { success: true, member: syncedUser };
    } catch (err: unknown) {`;

const profileReturnReplacement = `      await refreshMembersFromDB();

      return { success: true, member: syncedUser };
    } catch (err: unknown) {`;

if (normalizeCRLFs(content).includes(normalizeCRLFs(profileReturnTarget))) {
  content = toCRLF(normalizeCRLFs(content).replace(normalizeCRLFs(profileReturnTarget), normalizeCRLFs(profileReturnReplacement)));
  console.log('✓ Added refreshMembersFromDB call to updateProfile');
} else {
  console.warn('Warning: Could not match profileReturnTarget');
}

fs.writeFileSync(contextPath, content, 'utf8');
console.log('✓ Saved AppContext.tsx');
