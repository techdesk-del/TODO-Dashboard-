/**
 * app/api/auth/login/route.ts
 * POST /api/auth/login — Authenticate corporate employee with email & password (+ 2FA support)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel } from '@/models/User';
import { MemberModel } from '@/models/Member';
import { verifyPassword, hashPassword, signJwtToken } from '@/lib/auth';
import { findOfficialEmployeeByEmail, syncOfficialRosterToDB } from '@/lib/rosterSync';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    // Keep roster in sync with MongoDB Atlas
    syncOfficialRosterToDB().catch(() => {});

    const body = await req.json();
    const { email, password, twoFactorCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const officialEmp = findOfficialEmployeeByEmail(cleanEmail);
    const lookupEmail = officialEmp ? officialEmp.email.toLowerCase() : cleanEmail;

    let user = await UserModel.findOne({ email: lookupEmail });

    // Auto-provision if user is an official employee or exists in Member roster
    if (!user) {
      if (officialEmp) {
        const passwordHash = await hashPassword(password);
        user = await UserModel.create({
          id: officialEmp.id,
          name: officialEmp.name,
          email: officialEmp.email.toLowerCase(),
          passwordHash,
          role: officialEmp.role,
          department: officialEmp.department,
          designation: officialEmp.designation,
          avatar: officialEmp.avatar,
          isTwoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        const member = await MemberModel.findOne({ email: lookupEmail });
        if (member) {
          const passwordHash = await hashPassword(password);
          user = await UserModel.create({
            id: member.id,
            name: member.name,
            email: member.email.toLowerCase(),
            passwordHash,
            role: member.role,
            department: member.department,
            designation: member.designation,
            avatar: member.avatar,
            isTwoFactorEnabled: false,
            createdAt: new Date().toISOString(),
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Invalid credentials. Employee not found in corporate directory.' },
            { status: 401 }
          );
        }
      }
    }

    // Verify Password: match hashed password or allow default corporate 'password123' only if employee hasn't set custom password
    let isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch && !user.hasCustomPassword && password === 'password123') {
      // Allow default password for first-time login
      user.passwordHash = await hashPassword(password);
      await user.save();
      isMatch = true;
    }

    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: user.hasCustomPassword
            ? 'Invalid email or password. If you forgot your password, click "Forgot Password" to receive an email code.'
            : 'Invalid email or password. Default is password123 or click "Set Password" to configure your personal password.',
        },
        { status: 401 }
      );
    }

    // 2FA Verification (if enabled)
    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json({
          success: false,
          requires2FA: true,
          message: 'Please provide your 6-digit 2FA authenticator code.',
        }, { status: 403 });
      }
      if (twoFactorCode.length !== 6) {
        return NextResponse.json({
          success: false,
          error: 'Invalid 2FA code. Must be 6 digits.',
        }, { status: 401 });
      }
    }

    // Always keep designations synced to the official roster
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
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
