/**
 * app/api/auth/invitation/redeem/route.ts
 * POST /api/auth/invitation/redeem — Complete first login & set permanent corporate password (FC 1 & FC 4)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { InvitationModel } from '@/models/Invitation';
import { UserModel } from '@/models/User';
import { MemberModel } from '@/models/Member';
import { AuditLogModel } from '@/models/AuditLog';
import { hashPassword, signJwtToken } from '@/lib/auth';
import { sendPasswordChangeConfirmationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const rawCode = body.code || '';
    const cleanCode = String(rawCode).trim().toUpperCase();
    const newPassword = String(body.password || '').trim();

    if (!cleanCode || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Invitation code and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long for security compliance.' },
        { status: 400 }
      );
    }

    const invitation = await InvitationModel.findOne({ code: cleanCode });

    if (!invitation) {
      return NextResponse.json(
        { success: false, isInvalid: true, offerResend: true, error: 'Invalid invitation code. Ask Admin to resend.' },
        { status: 404 }
      );
    }

    if (invitation.isUsed) {
      return NextResponse.json(
        { success: false, isUsed: true, offerResend: true, error: 'This invitation code has already been redeemed.' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json(
        { success: false, isExpired: true, offerResend: true, error: 'This invitation has expired. Ask Admin to resend.' },
        { status: 410 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const userId = `usr-${Date.now()}`;
    const cleanEmail = invitation.email.toLowerCase().trim();

    // Upsert User model
    const userDoc = await UserModel.findOneAndUpdate(
      { email: cleanEmail },
      {
        $set: {
          name: invitation.name,
          email: cleanEmail,
          passwordHash,
          role: invitation.role,
          department: invitation.department,
          designation: invitation.designation,
          avatar: invitation.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
          hasCustomPassword: true,
          status: 'ACTIVE',
          isDeactivated: false,
          isTwoFactorEnabled: false,
        },
        $setOnInsert: {
          id: userId,
          createdAt: new Date().toISOString(),
        }
      },
      { upsert: true, new: true }
    );

    // Sync to Member collection
    await MemberModel.findOneAndUpdate(
      { email: cleanEmail },
      {
        $set: {
          id: userDoc.id,
          name: invitation.name,
          email: cleanEmail,
          role: invitation.role,
          department: invitation.department,
          designation: invitation.designation,
          status: 'ACTIVE',
        }
      },
      { upsert: true }
    );

    // Mark invitation as redeemed
    invitation.isUsed = true;
    invitation.usedAt = new Date();
    await invitation.save();

    // Flowchart 4: "Audit log entry created"
    try {
      await AuditLogModel.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: 'APPROVAL',
        fieldChanged: 'First Login Password Setup & Account Activation',
        oldValue: 'Pending First Login',
        newValue: 'ACTIVE',
        actor: userDoc.name,
        actorRole: userDoc.role,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'UrbanGaon Web Client',
        notes: `First login password initialized, saved as hash, and corporate access activated for ${userDoc.email}.`
      });
    } catch (auditErr) {
      console.warn('[API] /api/auth/invitation/redeem AuditLog warning:', auditErr);
    }

    // Dispatch real-time organized confirmation email for initial password set
    sendPasswordChangeConfirmationEmail({
      toEmail: cleanEmail,
      toName: invitation.name,
      role: invitation.role,
      changeType: 'INITIAL_SET',
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: req.headers.get('user-agent') || 'UrbanGaon Web Client',
    }).catch(err => console.warn('[InvitationRedeem Confirmation Email]', err));

    // Generate JWT token
    const token = signJwtToken({
      userId: userDoc.id,
      email: userDoc.email,
      role: userDoc.role,
      name: userDoc.name,
      department: userDoc.department || 'General',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account activated successfully! First login complete.',
      user: {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        department: userDoc.department,
        designation: userDoc.designation,
        avatar: userDoc.avatar,
      },
      token
    });

    response.cookies.set('urbangaon_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    console.error('[API] /api/auth/invitation/redeem error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while redeeming invitation.' },
      { status: 500 }
    );
  }
}
