/**
 * app/api/auth/request-access/[id]/route.ts
 * PATCH /api/auth/request-access/[id] — Admin Approves or Rejects Request (Flowchart 3)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { AccessRequestModel } from '@/models/AccessRequest';
import { InvitationModel } from '@/models/Invitation';
import { MemberModel } from '@/models/Member';
import { AuditLogModel } from '@/models/AuditLog';
import { 
  sendSetPasswordEmail, 
  sendManagerNewHireNotificationEmail, 
  sendRequestRejectionEmail 
} from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await connectDB();
    const resolvedParams = await ctx.params;
    const id = resolvedParams?.id;
    const body = await req.json().catch(() => ({}));
    const { 
      action, 
      reason, 
      role, 
      reviewedBy,
      department,
      designation,
      manager,
      managerEmail,
      employeeId
    } = body;

    const accessReq = await AccessRequestModel.findOne({ id });
    if (!accessReq) {
      return NextResponse.json(
        { success: false, error: 'Access request not found.' },
        { status: 404 }
      );
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const origin = `${proto}://${host}`;

    if (action === 'APPROVE') {
      // 1. Verify department, designation, manager (Flowchart 3)
      const assignedDept = String(department || accessReq.department || 'General Staff').trim();
      const assignedDesignation = String(designation || accessReq.designation || 'Specialist').trim();
      const assignedManager = String(manager || accessReq.manager || 'Talent Management Desk').trim();
      const assignedManagerEmail = String(managerEmail || accessReq.managerEmail || '').trim().toLowerCase();

      // 2. Assign unique employee ID (Flowchart 3)
      const assignedEmployeeId = String(employeeId || accessReq.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`).trim();

      // 3. Set role as Employee (Flowchart 3)
      const assignedRole = role || 'EMPLOYEE';

      // 4. Generate one-time set-password Link (Flowchart 3)
      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const inviteCode = `INV-${randomHex}`;
      const setPasswordLink = `${origin}/?invite=${inviteCode}`;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create official invitation record
      await InvitationModel.create({
        code: inviteCode,
        email: accessReq.email.toLowerCase(),
        name: accessReq.name,
        role: assignedRole,
        department: assignedDept,
        designation: assignedDesignation,
        invitedBy: reviewedBy || 'Admin / Talent HR',
        expiresAt,
        isUsed: false,
      });

      // 5. Create employee record status "Pending First Login" (Flowchart 3)
      await MemberModel.findOneAndUpdate(
        { email: accessReq.email.toLowerCase() },
        {
          $set: {
            id: assignedEmployeeId,
            name: accessReq.name,
            email: accessReq.email.toLowerCase(),
            role: assignedRole,
            department: assignedDept,
            designation: assignedDesignation,
            manager: assignedManager,
            managerEmail: assignedManagerEmail,
            status: 'Pending First Login',
            avatar: accessReq.name.slice(0, 2).toUpperCase(),
            totalTasks: 0,
            completedTasks: 0,
            activeTasks: 0,
            overdueTasks: 0,
            velocity: 100,
          }
        },
        { upsert: true }
      );

      // 6. Send set-password email to the user (Flowchart 3)
      sendSetPasswordEmail({
        toEmail: accessReq.email,
        toName: accessReq.name,
        employeeId: assignedEmployeeId,
        department: assignedDept,
        designation: assignedDesignation,
        manager: assignedManager,
        setPasswordLink,
        inviteCode,
      }).catch(err => console.warn('[FC3 Set-Password Email]', err));

      // 7. Notify reporting manager (Flowchart 3)
      if (assignedManagerEmail) {
        sendManagerNewHireNotificationEmail({
          managerEmail: assignedManagerEmail,
          managerName: assignedManager,
          employeeName: accessReq.name,
          employeeId: assignedEmployeeId,
          department: assignedDept,
          designation: assignedDesignation,
        }).catch(err => console.warn('[FC3 Manager Notification Email]', err));
      }

      // 8. Audit log entry created (Flowchart 3)
      await AuditLogModel.create({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: 'APPROVAL',
        fieldChanged: 'Employee Sign-Up Request Approval',
        oldValue: `Status: PENDING (${accessReq.email})`,
        newValue: `Status: APPROVED -> ID: ${assignedEmployeeId} (Pending First Login)`,
        actor: reviewedBy || 'Admin / Talent HR',
        actorRole: 'ADMIN',
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'Admin Dashboard',
        notes: `Approved ${accessReq.name}. Assigned ${assignedEmployeeId}, role: Employee, Dept: ${assignedDept}. Set-password email dispatched.`
      }).catch(err => console.warn('[Audit Log Approval]', err));

      // Update access request status
      accessReq.status = 'APPROVED';
      accessReq.reviewedBy = reviewedBy || 'Admin / Talent HR';
      accessReq.reviewedAt = new Date().toISOString();
      accessReq.invitationCode = inviteCode;
      accessReq.employeeId = assignedEmployeeId;
      accessReq.department = assignedDept;
      accessReq.designation = assignedDesignation;
      accessReq.manager = assignedManager;
      accessReq.managerEmail = assignedManagerEmail;
      await accessReq.save();

      return NextResponse.json({
        success: true,
        message: `Approved ${accessReq.name}. Assigned Employee ID: [${assignedEmployeeId}]. One-time set-password invitation link sent to ${accessReq.email} (Status: Pending First Login).`,
        employeeId: assignedEmployeeId,
        invitationCode: inviteCode,
        setPasswordLink,
      });

    } else if (action === 'REJECT') {
      if (!reason || !String(reason).trim()) {
        return NextResponse.json(
          { success: false, error: 'Mandatory justification reason is required for rejection.' },
          { status: 400 }
        );
      }

      const cleanReason = String(reason).trim();

      // 2. Send rejection email to the user (Flowchart 3)
      sendRequestRejectionEmail({
        toEmail: accessReq.email,
        toName: accessReq.name,
        reason: cleanReason,
      }).catch(err => console.warn('[FC3 Rejection Email]', err));

      await AuditLogModel.create({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: 'REJECTED',
        fieldChanged: 'Employee Sign-Up Request Rejection',
        oldValue: `Status: PENDING (${accessReq.email})`,
        newValue: `Status: REJECTED ("${cleanReason}")`,
        actor: reviewedBy || 'Admin / Talent HR',
        actorRole: 'ADMIN',
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'Admin Dashboard',
        notes: `Access request for ${accessReq.name} rejected by ${reviewedBy || 'Admin'}. Reason: "${cleanReason}". Rejection email sent.`
      }).catch(err => console.warn('[Audit Log Rejection]', err));

      accessReq.status = 'REJECTED';
      accessReq.rejectionReason = cleanReason;
      accessReq.reviewedBy = reviewedBy || 'Admin / Talent HR';
      accessReq.reviewedAt = new Date().toISOString();
      await accessReq.save();

      return NextResponse.json({
        success: true,
        message: `Access request for ${accessReq.name} rejected. Formal notification email sent with documented rationale.`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified. Must be APPROVE or REJECT.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[API] /api/auth/request-access/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing approval decision.' },
      { status: 500 }
    );
  }
}
