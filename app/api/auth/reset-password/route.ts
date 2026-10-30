/**
 * app/api/auth/reset-password/route.ts
 * GET /api/auth/reset-password — Validate reset link token validity & freshness (Flowchart 4)
 * POST /api/auth/reset-password — Verify code/link, hash password, create audit log, and complete authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel } from '@/models/User';
import { MemberModel } from '@/models/Member';
import { AuditLogModel } from '@/models/AuditLog';
import { hashPassword, signJwtToken } from '@/lib/auth';
import { findOfficialEmployeeByEmail } from '@/lib/rosterSync';

// GET: Validate if one-time reset link is valid and unused (Flowchart 4)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get('email');
    const code = searchParams.get('code') || searchParams.get('token');

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and verification code/link parameters are required.', offerResend: true },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const officialEmp = findOfficialEmployeeByEmail(cleanEmail);

    const user = await UserModel.collection.findOne(
      officialEmp
        ? { $or: [{ id: officialEmp.id }, { email: officialEmp.email.toLowerCase() }, { email: cleanEmail }] }
        : { email: cleanEmail }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, isInvalid: true, offerResend: true, error: 'Employee account not found.' },
        { status: 404 }
      );
    }

    if (!user.resetPasswordToken || String(user.resetPasswordToken).trim() !== cleanCode) {
      return NextResponse.json(
        { success: false, isInvalid: true, offerResend: true, error: 'This password reset link is invalid or has already been used.' },
        { status: 400 }
      );
    }

    if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
      return NextResponse.json(
        { success: false, isExpired: true, offerResend: true, error: 'This password reset link has expired (15-minute validity window exceeded).' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      email: cleanEmail,
      name: user.name,
      message: 'Reset link is valid and ready for password setup.',
    });
  } catch (err: unknown) {
    console.error('[Auth/ResetPassword/Validate] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Error validating reset link.', offerResend: true },
      { status: 500 }
    );
  }
}

// POST: Set new password meeting policy, save as hash, log audit entry, and issue auth token (Flowchart 4)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email, verification code/link, and new password are required.', offerResend: true },
        { status: 400 }
      );
    }

    // Flowchart 4: "User sets new password meeting policy" (minimum 6 characters)
    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long to meet security policy.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();
    const officialEmp = findOfficialEmployeeByEmail(cleanEmail);

    const user = await UserModel.collection.findOne(
      officialEmp
        ? { $or: [{ id: officialEmp.id }, { email: officialEmp.email.toLowerCase() }, { email: cleanEmail }] }
        : { email: cleanEmail }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, isInvalid: true, offerResend: true, error: 'Employee account not found.' },
        { status: 404 }
      );
    }

    // Flowchart 4: "Link valid and unused?" -> No -> Show error offer to resend
    if (!user.resetPasswordToken || String(user.resetPasswordToken).trim() !== cleanCode) {
      return NextResponse.json(
        {
          success: false,
          isInvalid: true,
          offerResend: true,
          error: 'Invalid or already used verification link. Please request a new link.',
        },
        { status: 400 }
      );
    }

    // Verify token expiry window
    if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
      return NextResponse.json(
        {
          success: false,
          isExpired: true,
          offerResend: true,
          error: 'This password reset link has expired. Please request a new link.',
        },
        { status: 410 }
      );
    }

    // Flowchart 4: "Password saved as hash"
    const newHash = await hashPassword(String(newPassword));
    await UserModel.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newHash,
          hasCustomPassword: true,
          status: 'ACTIVE',
        },
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpires: 1,
          failedLoginAttempts: 1,
          lockUntil: 1,
        },
      }
    );

    // Sync status to Member model if present
    await MemberModel.collection.updateOne(
      { email: user.email.toLowerCase() },
      { $set: { status: 'ACTIVE' } }
    ).catch(() => {});

    // Synchronize designations from official roster
    const activeDesignation = officialEmp ? officialEmp.designation : user.designation;
    const activeDepartment = officialEmp ? officialEmp.department : user.department;
    const activeName = officialEmp ? officialEmp.name : user.name;
    const activeRole = officialEmp ? officialEmp.role : user.role;

    // Flowchart 4: "Audit log entry created"
    try {
      await AuditLogModel.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: 'CONFIG_CHANGED',
        fieldChanged: 'Corporate Password Hash',
        oldValue: '[ENCRYPTED_PREVIOUS]',
        newValue: '[ENCRYPTED_BCRYPT_HASH]',
        actor: activeName,
        actorRole: activeRole,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'UrbanGaon Web Client',
        notes: `Password reset and saved as hash for ${user.email}.`
      });
    } catch (auditErr) {
      console.warn('[Auth/ResetPassword] Audit log recording note:', auditErr);
    }

    console.log(`[Auth/ResetPassword] ✓ Successfully set custom password & created audit log for ${user.email}`);

    // Flowchart 4: Generate JWT token for role-based redirect
    const token = signJwtToken({
      userId: user.id,
      email: user.email,
      name: activeName,
      role: activeRole,
      department: activeDepartment,
    });

    const response = NextResponse.json({
      success: true,
      message: `Password set successfully! Logged in as ${activeName}.`,
      user: {
        id: user.id,
        name: activeName,
        email: user.email,
        role: activeRole,
        department: activeDepartment,
        designation: activeDesignation,
        avatar: user.avatar,
      },
      token,
    });

    response.cookies.set('urbangaon_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    console.error('[Auth/ResetPassword] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to set password.' },
      { status: 500 }
    );
  }
}
