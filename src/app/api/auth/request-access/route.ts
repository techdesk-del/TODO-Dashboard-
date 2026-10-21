/**
 * app/api/auth/request-access/route.ts
 * POST /api/auth/request-access — Submit Employee Self Sign-Up Request (FC 2)
 * GET  /api/auth/request-access — Retrieve requests queue for Admin / Talent HR (FC 3)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { AccessRequestModel } from '@/models/AccessRequest';
import { UserModel } from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const { name, email, phone, department, designation, reason } = body;

    if (!name || !email || !department || !designation) {
      return NextResponse.json(
        { success: false, error: 'Full name, official email, department, and designation are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Check if account already exists
    const existingUser = await UserModel.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An active employee account already exists with this email. Please sign in directly.' },
        { status: 409 }
      );
    }

    // Check if an existing request is pending
    const existingReq = await AccessRequestModel.findOne({ email: cleanEmail, status: 'PENDING' });
    if (existingReq) {
      return NextResponse.json(
        { success: false, error: 'An access request for this email is already under review by Talent HR & Admin.' },
        { status: 400 }
      );
    }

    const requestId = `req-${Date.now()}`;
    const newRequest = await AccessRequestModel.create({
      id: requestId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: String(phone || '').trim(),
      department: String(department).trim(),
      designation: String(designation).trim(),
      reason: String(reason || '').trim(),
      status: 'PENDING',
      appliedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Self sign-up request successfully dispatched to HR & Admin (FC 2). You will receive an invitation once approved.',
      data: newRequest
    });
  } catch (error: unknown) {
    console.error('[API] /api/auth/request-access POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while submitting access request.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const requests = await AccessRequestModel.find({ status: 'PENDING' })
      .sort({ appliedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: requests
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: unknown) {
    console.error('[API] /api/auth/request-access GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while retrieving access requests.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/request-access — Direct decision endpoint (Flowchart 3)
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const body = await req.json().catch(() => ({}));
    const id = body.id || searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required in body or query parameter.' },
        { status: 400 }
      );
    }

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
      const assignedDept = String(department || accessReq.department || 'General Staff').trim();
      const assignedDesignation = String(designation || accessReq.designation || 'Specialist').trim();
      const assignedManager = String(manager || accessReq.manager || 'Talent Management Desk').trim();
      const assignedManagerEmail = String(managerEmail || accessReq.managerEmail || '').trim().toLowerCase();
      const assignedEmployeeId = String(employeeId || accessReq.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`).trim();
      const assignedRole = role || 'EMPLOYEE';

      const crypto = await import('crypto');
      const randomHex = crypto.default.randomBytes(3).toString('hex').toUpperCase();
      const inviteCode = `INV-${randomHex}`;
      const setPasswordLink = `${origin}/?invite=${inviteCode}`;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { InvitationModel } = await import('@/models/Invitation');
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

      const { MemberModel } = await import('@/models/Member');
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

      const { sendSetPasswordEmail, sendManagerNewHireNotificationEmail } = await import('@/lib/email');
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

      const { AuditLogModel } = await import('@/models/AuditLog');
      await AuditLogModel.create({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: 'APPROVAL',
        fieldChanged: 'Employee Sign-Up Request Approval (Flowchart 3)',
        oldValue: `Status: PENDING (${accessReq.email})`,
        newValue: `Status: APPROVED -> ID: ${assignedEmployeeId} (Pending First Login)`,
        actor: reviewedBy || 'Admin / Talent HR',
        actorRole: 'ADMIN',
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'Admin Dashboard',
        notes: `Flowchart 3: Approved ${accessReq.name}. Assigned ${assignedEmployeeId}, role: Employee, Dept: ${assignedDept}. Set-password email dispatched.`
      }).catch(err => console.warn('[FC3 Audit Log Approval]', err));

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
          { success: false, error: 'Mandatory justification reason is required for rejection (Flowchart 3).' },
          { status: 400 }
        );
      }

      const cleanReason = String(reason).trim();
      const { sendRequestRejectionEmail } = await import('@/lib/email');
      sendRequestRejectionEmail({
        toEmail: accessReq.email,
        toName: accessReq.name,
        reason: cleanReason,
      }).catch(err => console.warn('[FC3 Rejection Email]', err));

      const { AuditLogModel } = await import('@/models/AuditLog');
      await AuditLogModel.create({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: 'REJECTED',
        fieldChanged: 'Employee Sign-Up Request Rejection (Flowchart 3)',
        oldValue: `Status: PENDING (${accessReq.email})`,
        newValue: `Status: REJECTED ("${cleanReason}")`,
        actor: reviewedBy || 'Admin / Talent HR',
        actorRole: 'ADMIN',
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'Admin Dashboard',
        notes: `Flowchart 3: Access request for ${accessReq.name} rejected by ${reviewedBy || 'Admin'}. Reason: "${cleanReason}". Rejection email sent.`
      }).catch(err => console.warn('[FC3 Audit Log Rejection]', err));

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
      { success: false, error: 'Invalid action specified. Must be APPROVE or REJECT (Flowchart 3).' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('[API] /api/auth/request-access PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing approval decision.' },
      { status: 500 }
    );
  }
}
