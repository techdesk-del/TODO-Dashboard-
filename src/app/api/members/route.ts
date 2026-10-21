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
import { AuditLogModel } from '@/models/AuditLog';
import { hashPassword } from '@/lib/auth';
import { INITIAL_MEMBERS } from '@/lib/mockData';
import { syncOfficialRosterToDB } from '@/lib/rosterSync';
import { sendSetPasswordEmail } from '@/lib/email';

async function seedMembersIfEmpty() {
  const count = await MemberModel.countDocuments();
  if (count === 0) {
    console.log('[API/members] Empty collection — seeding with official team roster...');
    await MemberModel.insertMany(INITIAL_MEMBERS, { ordered: false });
    console.log(`[API/members] ✓ Seeded ${INITIAL_MEMBERS.length} members`);
  }
}

export async function GET() {
  try {
    await connectDB();
    await seedMembersIfEmpty();
    // Keep roster in sync with official designations and roles
    await syncOfficialRosterToDB().catch(() => {});

    const members = await MemberModel.find({}).lean().exec();

    return NextResponse.json({
      success: true,
      data: members,
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

    // Generate avatar initials if none provided
    const initials = avatar || name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    let memberRecord;
    if (existing && allowReactivate) {
      existing.name = name.trim();
      existing.role = role;
      existing.designation = designation.trim();
      existing.department = department.trim();
      existing.phone = phone || existing.phone || '';
      existing.employeeId = assignedEmpId;
      existing.status = status;
      if (initials) existing.avatar = initials;
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
        avatar: initials,
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
            avatar: initials,
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
        fieldChanged: 'Employee Provisioning (Flowchart: Create Employee)',
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
      reason,
      actor = 'Admin / Talent HR',
      actorRole = 'ADMIN',
      updateTaskAssignees = true,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Member ID is required for updates.' }, { status: 400 });
    }

    const member = await MemberModel.findOne({ id }).exec();
    if (!member) {
      return NextResponse.json({ success: false, error: `Employee with ID "${id}" was not found.` }, { status: 404 });
    }

    const oldEmail = member.email;
    const updates: Record<string, unknown> = {};

    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ success: false, error: `"${cleanEmail}" is not a valid email address.` }, { status: 400 });
      }

      // Check if another member already has this email
      if (cleanEmail !== oldEmail.toLowerCase()) {
        const existing = await MemberModel.findOne({ email: cleanEmail, id: { $ne: id } }).exec();
        if (existing) {
          return NextResponse.json({
            success: false,
            error: `Email "${cleanEmail}" is already registered to employee ${existing.name} (${existing.id}).`
          }, { status: 409 });
        }
        updates.email = cleanEmail;
      }
    }

    if (name && typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (department && typeof department === 'string' && department.trim()) updates.department = department.trim();
    if (designation && typeof designation === 'string' && designation.trim()) updates.designation = designation.trim();
    if (role) updates.role = role;
    if (status) updates.status = status;

    // Apply updates to MemberModel
    const updatedMember = await MemberModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    ).exec();

    // Also sync to UserModel so login works with new credentials
    if (updates.email || updates.name || updates.role || updates.department || updates.designation) {
      await UserModel.updateOne(
        { $or: [{ id }, { email: oldEmail.toLowerCase() }] },
        {
          $set: {
            id,
            ...(updates.email ? { email: updates.email } : {}),
            ...(updates.name ? { name: updates.name } : {}),
            ...(updates.role ? { role: updates.role } : {}),
            ...(updates.department ? { department: updates.department } : {}),
            ...(updates.designation ? { designation: updates.designation } : {}),
          }
        }
      ).exec().catch(() => {});
    }

    // If email changed and updateTaskAssignees is true, update TaskModel assignees
    if (updates.email && updates.email !== oldEmail && updateTaskAssignees) {
      try {
        const { TaskModel } = await import('@/models/Task');
        await TaskModel.updateMany(
          { 'assignees.id': id },
          {
            $set: {
              'assignees.$[elem].email': updates.email,
              ...(updates.name ? { 'assignees.$[elem].name': updates.name } : {}),
            }
          },
          {
            arrayFilters: [{ 'elem.id': id }]
          }
        ).exec().catch(() => {});
      } catch (err) {
        console.warn('[API/members PATCH] Task assignees update note:', err);
      }
    }

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
