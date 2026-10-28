/**
 * app/api/members/route.ts
 * GET /api/members — Fetch team members list
 * POST /api/members — Add new team member (internal HR/Admin)
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { UserModel } from '@/models/User';
import { InvitationModel } from '@/models/Invitation';
import { PurgedMemberModel } from '@/models/PurgedMember';
import { AuditLogModel } from '@/models/AuditLog';
import { hashPassword } from '@/lib/auth';
import { INITIAL_MEMBERS } from '@/lib/mockData';
import { syncOfficialRosterToDB } from '@/lib/rosterSync';
import { sendSetPasswordEmail } from '@/lib/email';
import { broadcastMemberMutation, broadcastTaskMutation } from '@/lib/events';
import { isCeoUser, OFFICIAL_ROSTER } from '@/lib/rosterData';

async function seedMembersIfEmpty() {
  const count = await MemberModel.countDocuments();
  if (count === 0) {
    console.log('[API/members] Empty collection — seeding with official team roster...');
    const purgedRecords = await PurgedMemberModel.find({}).lean().exec();
    const purgedIds = new Set(purgedRecords.map(p => p.id));
    const purgedEmails = new Set(purgedRecords.map(p => p.email.toLowerCase().trim()));
    const allowed = INITIAL_MEMBERS.filter(m => !purgedIds.has(m.id) && !purgedEmails.has(m.email.toLowerCase().trim()));
    if (allowed.length > 0) {
      await MemberModel.insertMany(allowed, { ordered: false });
    }
    console.log(`[API/members] ✓ Seeded ${allowed.length} members`);
  }
}

export async function GET() {
  try {
    await connectDB();
    await seedMembersIfEmpty();
    // Keep roster in sync with official designations and roles
    await syncOfficialRosterToDB().catch(() => {});

    const purgedRecords = await PurgedMemberModel.find({}).lean().exec();
    const purgedIds = new Set(purgedRecords.map(p => p.id));
    const purgedEmails = new Set(purgedRecords.map(p => p.email.toLowerCase().trim()));

    const sanitizeInitials = (nameStr: string) => {
      const parts = (nameStr || '').trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return (nameStr || 'EM').trim().slice(0, 2).toUpperCase() || 'EM';
    };

    const rawMembers = await MemberModel.find({}).lean().exec();
    const members = rawMembers
      .filter(m => !purgedIds.has(m.id) && !purgedEmails.has(m.email?.toLowerCase().trim()))
      .map(m => {
        const isCeoDept = m.id === 'mem-1' || m.email?.toLowerCase().trim() === 'ceo@urbangaon.com' || m.department === 'Leadership & CEO Desk' || m.department === 'Leadership & CEO';
        const nextDept = isCeoDept ? 'Founder & CEO' : m.department;
        const nextDesig = (m.id === 'mem-1' || m.email?.toLowerCase().trim() === 'ceo@urbangaon.com') ? 'Founder & CEO' : m.designation;
        if (isCeoDept && (m.department !== 'Founder & CEO' || m.designation !== 'Founder & CEO')) {
          MemberModel.updateOne({ _id: m._id }, { $set: { department: 'Founder & CEO', designation: 'Founder & CEO' } }).catch(() => {});
          UserModel.updateMany({ email: m.email?.toLowerCase().trim() }, { $set: { department: 'Founder & CEO', designation: 'Founder & CEO' } }).catch(() => {});
        }
        if (!m.avatar || m.avatar.includes('.png') || m.avatar.includes('urbangaon-employee-emblem')) {
          const initials = sanitizeInitials(m.name);
          MemberModel.updateOne({ _id: m._id }, { $set: { avatar: initials } }).catch(() => {});
          UserModel.updateMany({ email: m.email?.toLowerCase().trim() }, { $set: { avatar: initials } }).catch(() => {});
          return { ...m, department: nextDept, designation: nextDesig, avatar: initials };
        }
        return { ...m, department: nextDept, designation: nextDesig };
      });

    return NextResponse.json({
      success: true,
      data: members,
      purgedIds: Array.from(purgedIds),
      purgedEmails: Array.from(purgedEmails),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members GET]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      name,
      email,
      phone = '',
      employeeId,
      role = 'EMPLOYEE',
      designation = 'Specialist',
      department = 'Sales',
      avatar,
      managerId,
      manager,
      managerEmail,
      status = 'Pending First Login',
      allowReactivate = false,
      actor = 'Admin / Talent HR',
      actorRole = 'ADMIN',
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Full legal name and email address are required fields.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // ── Flowchart: Decision Diamond: Email already exists? ──
    const existing = await MemberModel.findOne({ email: cleanEmail }).exec();
    if (existing && !allowReactivate) {
      return NextResponse.json(
        {
          success: false,
          error: `Email already exists: An employee with email "${cleanEmail}" is already registered in the corporate roster.`,
          emailExists: true,
        },
        { status: 409 }
      );
    }

    // ── Flowchart: Assign unique employee ID check ──
    const requestedEmpId = (employeeId || body.id || '').trim();
    if (requestedEmpId) {
      const existingId = await MemberModel.findOne({
        $or: [{ id: requestedEmpId }, { employeeId: requestedEmpId }]
      }).exec();
      if (existingId && (!existing || existing.id !== existingId.id)) {
        return NextResponse.json(
          {
            success: false,
            error: `Employee ID "${requestedEmpId}" is already assigned to another employee. Please assign a unique employee ID.`,
            idExists: true,
          },
          { status: 409 }
        );
      }
    }

    const assignedEmpId = requestedEmpId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const sanitizeInitials = (nameStr: string) => {
      const parts = (nameStr || '').trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return (nameStr || 'EM').trim().slice(0, 2).toUpperCase() || 'EM';
    };

    // Use clean 2-letter uppercase initials as employee avatar badge
    const avatarBadge = (avatar && !avatar.includes('.png') && !avatar.includes('urbangaon-employee-emblem'))
      ? avatar.trim()
      : sanitizeInitials(name);

    let memberRecord;
    if (existing && allowReactivate) {
      existing.name = name.trim();
      existing.role = role;
      existing.designation = designation.trim();
      existing.department = department.trim();
      existing.phone = phone || existing.phone || '';
      existing.employeeId = assignedEmpId;
      existing.status = status;
      if (avatarBadge) existing.avatar = avatarBadge;
      if (managerId) existing.managerId = managerId;
      if (manager) existing.manager = manager;
      if (managerEmail) existing.managerEmail = managerEmail;
      await existing.save();
      memberRecord = existing;
      console.log(`[API/members POST] Re-activated existing member: ${cleanEmail}`);
    } else {
      memberRecord = await MemberModel.create({
        id: assignedEmpId,
        employeeId: assignedEmpId,
        name: name.trim(),
        email: cleanEmail,
        phone: String(phone).trim(),
        role,
        designation: designation.trim(),
        department: department.trim(),
        avatar: avatarBadge,
        managerId: managerId || undefined,
        manager: manager || undefined,
        managerEmail: managerEmail || undefined,
        status, // Strictly 'Pending First Login'
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        overdueTasks: 0,
        velocity: 100,
      });
      console.log(`[API/members POST] Created new employee: ${cleanEmail} (${assignedEmpId}) in status: ${status}`);
    }

    // ── Flowchart: Generate one-time set-password link ──
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `INV-${randomHex}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day validity

    await InvitationModel.deleteMany({ email: cleanEmail, isUsed: false });
    await InvitationModel.create({
      code,
      email: cleanEmail,
      name: name.trim(),
      role,
      department: department.trim(),
      designation: designation.trim(),
      invitedBy: typeof actor === 'string' ? actor : 'Admin / Talent HR',
      expiresAt,
      isUsed: false,
    });

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;
    const setPasswordLink = `${baseUrl}/?inviteCode=${code}&email=${encodeURIComponent(cleanEmail)}`;

    // ── Flowchart: Provision UserModel in status 'Pending First Login' ──
    try {
      const tempHash = await hashPassword(crypto.randomBytes(16).toString('hex'));
      await UserModel.findOneAndUpdate(
        { email: cleanEmail },
        {
          $set: {
            id: assignedEmpId,
            name: name.trim(),
            email: cleanEmail,
            passwordHash: tempHash,
            role,
            department: department.trim(),
            designation: designation.trim(),
            avatar: avatarBadge,
            isTwoFactorEnabled: false,
            hasCustomPassword: false,
            status,
            createdAt: new Date().toISOString(),
          }
        },
        { upsert: true, new: true }
      );
    } catch (userErr) {
      console.warn('[API/members POST] UserModel sync note:', userErr);
    }

    // ── Flowchart: Send set-password email to employee ──
    let emailDispatched = false;
    let emailError: string | undefined;

    try {
      const emailRes = await sendSetPasswordEmail({
        toEmail: cleanEmail,
        toName: name.trim(),
        employeeId: assignedEmpId,
        department: department.trim(),
        designation: designation.trim(),
        manager: manager || 'Talent Management Desk',
        setPasswordLink,
        inviteCode: code,
      });
      emailDispatched = emailRes.success;
    } catch (err) {
      console.error('[API/members POST] Email dispatch error:', err);
      emailError = err instanceof Error ? err.message : 'Email dispatch failed';
    }

    // ── Flowchart: Audit log entry created ──
    const creatorName = typeof actor === 'string' ? actor : (actor as any)?.name || 'Admin / Talent HR';
    const creatorRole = typeof actorRole === 'string' ? actorRole : (actor as any)?.role || 'ADMIN';
    try {
      await AuditLogModel.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        action: 'CREATED',
        fieldChanged: 'Employee Provisioning',
        oldValue: 'Unregistered',
        newValue: `Status: ${status} | Role: ${role} | Employee ID: ${assignedEmpId} | Dept: ${department.trim()} | Mgr: ${manager || 'None'}`,
        actor: creatorName,
        actorRole: creatorRole,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'Admin Dashboard',
        notes: `Employee record created in status "${status}". One-time set-password invitation link [${code}] dispatched to ${cleanEmail}. Reporting Manager: ${manager || 'None'}.`,
      });
    } catch (auditErr) {
      console.warn('[API/members POST] AuditLog error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      data: memberRecord.toObject ? memberRecord.toObject() : memberRecord,
      employeeId: assignedEmpId,
      invitationCode: code,
      setPasswordLink,
      emailDispatched,
      emailError,
      message: `Employee ${name} successfully provisioned in status "${status}". One-time set-password link dispatched.`,
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      id,
      email,
      name,
      department,
      designation,
      role,
      status,
      employeeId: inputEmployeeId,
      newEmployeeId,
      reason,
      actor = 'Admin / Talent HR',
      actorRole = 'ADMIN',
      updateTaskAssignees = true,
    } = body;

    if (!id && !email) {
      return NextResponse.json({ success: false, error: 'Member ID or Email is required for updates.' }, { status: 400 });
    }

    const cleanInputEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : '';
    let member = null;
    if (id && id !== 'guest') {
      member = await MemberModel.findOne({ id }).exec();
    }
    if (!member && cleanInputEmail) {
      member = await MemberModel.findOne({ email: cleanInputEmail }).exec();
    }

    if (!member) {
      return NextResponse.json({ success: false, error: `Employee record was not found.` }, { status: 404 });
    }

    const memberId = member.id;
    const oldEmail = member.email;
    const oldName = member.name;
    const oldRole = member.role;
    const updates: Record<string, unknown> = {};

    // 1. Update Employee ID if provided
    const targetEmployeeId = (newEmployeeId || inputEmployeeId || '').trim();
    if (targetEmployeeId && targetEmployeeId !== member.id) {
      const existingWithId = await MemberModel.findOne({
        $or: [{ id: targetEmployeeId }, { employeeId: targetEmployeeId }],
        _id: { $ne: member._id }
      }).exec();

      if (existingWithId) {
        return NextResponse.json({
          success: false,
          error: `Employee ID "${targetEmployeeId}" is already assigned to employee ${existingWithId.name} (${existingWithId.email}).`
        }, { status: 409 });
      }

      updates.id = targetEmployeeId;
      updates.employeeId = targetEmployeeId;
    }

    // 2. Update Email if provided
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ success: false, error: `"${cleanEmail}" is not a valid email address.` }, { status: 400 });
      }

      // Check if another member already has this email
      if (cleanEmail !== oldEmail.toLowerCase()) {
        const existing = await MemberModel.findOne({ email: cleanEmail, id: { $ne: memberId } }).exec();
        if (existing) {
          return NextResponse.json({
            success: false,
            error: `Email "${cleanEmail}" is already registered to employee ${existing.name} (${existing.id}).`
          }, { status: 409 });
        }
        updates.email = cleanEmail;
      }
    }

    // 3. Update Name if provided
    if (name && typeof name === 'string' && name.trim()) {
      const trimmedName = name.trim();
      updates.name = trimmedName;

      // If user had letter initials as avatar, update initials to match new name
      if (!member.avatar || (!member.avatar.startsWith('/') && !member.avatar.startsWith('http'))) {
        const parts = trimmedName.split(' ').filter(Boolean);
        const initials = (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2) || 'UG').toUpperCase();
        updates.avatar = initials;
      }
    }

    // 4. Update Role if provided
    if (role && typeof role === 'string' && role.trim()) {
      const cleanRole = role.trim().toUpperCase();
      const validRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
      if (validRoles.includes(cleanRole)) {
        updates.role = cleanRole;
      }
    }

    if (department && typeof department === 'string' && department.trim()) updates.department = department.trim();
    if (designation && typeof designation === 'string' && designation.trim()) updates.designation = designation.trim();
    if (status) updates.status = status;
    updates.updatedAt = new Date().toISOString();

    // Apply updates to MemberModel
    const updatedMember = await MemberModel.findByIdAndUpdate(
      member._id,
      { $set: updates },
      { new: true }
    ).exec();

    // Also sync to UserModel so session & login reflect the new ID, role, name & email
    const finalId = (updates.id as string) || memberId;
    const finalEmail = (updates.email as string) || oldEmail;
    const finalName = (updates.name as string) || oldName;

    if (updates.id || updates.email || updates.name || updates.role || updates.department || updates.designation || updates.avatar) {
      const userUpdateRes = await UserModel.updateOne(
        { $or: [{ id: memberId }, { id: finalId }, { email: oldEmail.toLowerCase() }, { email: finalEmail.toLowerCase() }] },
        {
          $set: {
            id: finalId,
            ...(updates.employeeId ? { employeeId: updates.employeeId } : {}),
            ...(updates.email ? { email: updates.email } : {}),
            ...(updates.name ? { name: updates.name } : {}),
            ...(updates.avatar ? { avatar: updates.avatar } : {}),
            ...(updates.role ? { role: updates.role } : {}),
            ...(updates.department ? { department: updates.department } : {}),
            ...(updates.designation ? { designation: updates.designation } : {}),
            updatedAt: new Date().toISOString(),
          }
        }
      ).exec().catch(() => null);

      if (!userUpdateRes || userUpdateRes.matchedCount === 0) {
        try {
          const defaultHash = await hashPassword('123');
          await UserModel.create({
            id: finalId,
            name: finalName,
            email: finalEmail.toLowerCase(),
            passwordHash: defaultHash,
            role: (updates.role as any) || member.role || 'EMPLOYEE',
            department: (updates.department as string) || member.department || 'General',
            designation: (updates.designation as string) || member.designation || 'Specialist',
            avatar: (updates.avatar as string) || member.avatar || 'UG',
            isTwoFactorEnabled: false,
            createdAt: new Date().toISOString(),
          });
        } catch { }
      }
    }

    // Cascade name, email, employeeId, or designation changes to TaskModel assignees & creator
    if ((updates.email || updates.name || updates.id || updates.designation) && updateTaskAssignees) {
      try {
        const { TaskModel } = await import('@/models/Task');
        // Update assignees
        await TaskModel.updateMany(
          { $or: [{ 'assignees.id': memberId }, { 'assignees.id': finalId }, { 'assignees.email': oldEmail.toLowerCase() }] },
          {
            $set: {
              ...(updates.id ? { 'assignees.$[elem].id': updates.id } : {}),
              ...(updates.email ? { 'assignees.$[elem].email': updates.email } : {}),
              ...(updates.name ? { 'assignees.$[elem].name': updates.name } : {}),
              ...(updates.avatar ? { 'assignees.$[elem].avatar': updates.avatar } : {}),
              ...(updates.designation ? { 'assignees.$[elem].designation': updates.designation } : {}),
              updatedAt: new Date().toISOString(),
            }
          },
          {
            arrayFilters: [{ $or: [{ 'elem.id': memberId }, { 'elem.id': finalId }, { 'elem.email': oldEmail.toLowerCase() }] }]
          }
        ).exec().catch(() => {});

        // Update task creator
        if (updates.name || updates.id || updates.email || updates.role) {
          await TaskModel.updateMany(
            { $or: [{ 'creator.id': memberId }, { 'creator.id': finalId }, { 'creator.email': oldEmail.toLowerCase() }] },
            {
              $set: {
                ...(updates.id ? { 'creator.id': updates.id } : {}),
                ...(updates.name ? { 'creator.name': updates.name } : {}),
                ...(updates.email ? { 'creator.email': updates.email } : {}),
                ...(updates.role ? { 'creator.role': updates.role } : {}),
                updatedAt: new Date().toISOString()
              }
            }
          ).exec().catch(() => {});
        }

        // Broadcast realtime task mutation so all worldwide clients refresh their tasks immediately
        broadcastTaskMutation({
          action: 'UPDATED',
          taskId: 'all',
          taskTitle: `Assignee profile synced (${updates.id || updates.email || updates.name})`,
          source: 'member-email-cascade'
        });
      } catch (err) {
        console.warn('[API/members PATCH] Task assignees update note:', err);
      }
    }

    broadcastMemberMutation({
      action: 'UPDATED',
      memberId: finalId,
      memberName: updatedMember?.name || oldName,
      memberEmail: updatedMember?.email || oldEmail,
      oldEmail: oldEmail,
      member: updatedMember
    });

    // Flowchart 12: Audit Log entry
    try {
      const creatorName = typeof actor === 'string' ? actor : (actor as any)?.name || 'Admin / Talent HR';
      const creatorRole = typeof actorRole === 'string' ? actorRole : (actor as any)?.role || 'ADMIN';
      await AuditLogModel.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        action: 'UPDATED',
        fieldChanged: updates.email ? `Employee Corporate Email Changed (${member.name})` : `Employee Profile Updated (${member.name})`,
        oldValue: updates.email ? oldEmail : JSON.stringify({ name: member.name, dept: member.department }),
        newValue: updates.email ? String(updates.email) : JSON.stringify(updates),
        actor: creatorName,
        actorRole: creatorRole,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'Admin Dashboard',
        notes: reason || `Updated employee email from ${oldEmail} to ${updates.email || oldEmail} via Enterprise Portal.`,
      });
    } catch (auditErr) {
      console.warn('[API/members PATCH] AuditLog error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: `Employee ${member.name} successfully updated. ${updates.email ? `Email updated from ${oldEmail} to ${updates.email}.` : ''}`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members PATCH]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('memberId');
    const body = await req.json().catch(() => ({}));
    const targetId = (id || body.id || body.memberId || '').trim();
    const targetEmail = (searchParams.get('email') || body.email || '').trim().toLowerCase();

    if (!targetId && !targetEmail) {
      return NextResponse.json({ success: false, error: 'Member ID or Email is required for removal' }, { status: 400 });
    }

    const member = await MemberModel.findOne({
      $or: [
        ...(targetId ? [{ id: targetId }] : []),
        ...(targetEmail ? [{ email: targetEmail }] : []),
      ]
    }).exec();

    let memberName = member?.name;
    let memberEmail = (member?.email || targetEmail).toLowerCase().trim();
    let memberEmpId = member?.id || targetId;
    let memberDept = member?.department || '';
    let memberDesig = member?.designation || '';

    if (!member) {
      const officialEmp = OFFICIAL_ROSTER.find(
        o => o.id === targetId || o.email.toLowerCase() === targetEmail || o.aliases?.some(a => a.toLowerCase() === targetEmail)
      );
      if (officialEmp) {
        memberName = officialEmp.name;
        memberEmail = officialEmp.email.toLowerCase().trim();
        memberEmpId = officialEmp.id;
        memberDept = officialEmp.department;
        memberDesig = officialEmp.designation;
      } else {
        return NextResponse.json({ success: false, error: 'Employee record not found in database or corporate roster' }, { status: 404 });
      }
    }

    if (isCeoUser({ id: memberEmpId, email: memberEmail, name: memberName })) {
      return NextResponse.json({ success: false, error: 'Executive Command Protection: CEO account cannot be deleted' }, { status: 403 });
    }

    // 1. Permanently register in PurgedMemberModel tombstone collection
    await PurgedMemberModel.findOneAndUpdate(
      { $or: [{ id: memberEmpId }, { email: memberEmail }] },
      {
        $set: {
          id: memberEmpId,
          email: memberEmail,
          name: memberName,
          department: memberDept,
          designation: memberDesig,
          purgedAt: new Date().toISOString(),
          purgedBy: body.actor || 'Super Admin',
          reason: 'Account Deactivation & Mandatory Handover Purge',
        }
      },
      { upsert: true }
    ).exec();

    // 2. Permanently purge from collections
    await MemberModel.deleteMany({ $or: [{ id: memberEmpId }, { email: memberEmail }] }).exec();
    await UserModel.deleteMany({ $or: [{ id: memberEmpId }, { email: memberEmail }] }).exec();
    await InvitationModel.deleteMany({ $or: [{ id: memberEmpId }, { email: memberEmail }] }).exec();

    // 3. Broadcast realtime event across all clients
    broadcastMemberMutation({
      action: 'DELETED',
      memberId: memberEmpId,
      memberName,
      memberEmail,
    });

    // 4. Create Audit Log
    try {
      const actorName = body.actor || 'Super Admin';
      const actorRole = body.actorRole || 'SUPER_ADMIN';
      await AuditLogModel.create({
        id: `audit-del-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        action: 'DELETED',
        fieldChanged: `Employee Account Permanently Purged (${memberName})`,
        oldValue: JSON.stringify({ id: memberEmpId, name: memberName, email: memberEmail }),
        newValue: 'PERMANENTLY_PURGED',
        actor: actorName,
        actorRole: actorRole,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'Admin Dashboard',
        notes: `Permanently purged employee record for ${memberName} (${memberEmail}) from corporate database and registered tombstone.`,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Employee ${memberName} permanently purged from system.`,
      purgedId: memberEmpId,
      purgedEmail: memberEmail,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

