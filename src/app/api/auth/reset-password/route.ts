/**
 * app/api/auth/reset-password/route.ts
 * POST /api/auth/reset-password — Verify code and set employee's custom personal password
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel } from '@/models/User';
import { hashPassword, signJwtToken } from '@/lib/auth';
import { findOfficialEmployeeByEmail } from '@/lib/rosterSync';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email, verification code, and new password are required.' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long for security compliance.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();
    const officialEmp = findOfficialEmployeeByEmail(cleanEmail);
    const lookupEmail = officialEmp ? officialEmp.email.toLowerCase() : cleanEmail;

    const user = await UserModel.collection.findOne(
      officialEmp
        ? { $or: [{ id: officialEmp.id }, { email: officialEmp.email.toLowerCase() }, { email: cleanEmail }] }
        : { email: cleanEmail }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Employee account not found.' },
        { status: 404 }
      );
    }

    // Verify reset token
    if (!user.resetPasswordToken || String(user.resetPasswordToken).trim() !== cleanCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code. Please check your email or request a new code.' },
        { status: 400 }
      );
    }

    // Verify token expiry
    if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Hash new password and save
    const newHash = await hashPassword(String(newPassword));
    await UserModel.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newHash,
          hasCustomPassword: true,
        },
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpires: 1,
        },
      }
    );

    console.log(`[Auth/ResetPassword] ✓ Successfully set custom password for ${user.email}`);

    // Synchronize designations from official roster
    const activeDesignation = officialEmp ? officialEmp.designation : user.designation;
    const activeDepartment = officialEmp ? officialEmp.department : user.department;
    const activeName = officialEmp ? officialEmp.name : user.name;
    const activeRole = officialEmp ? officialEmp.role : user.role;

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
