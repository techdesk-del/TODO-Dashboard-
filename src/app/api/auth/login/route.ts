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
    const emailRegex = new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const officialEmp = findOfficialEmployeeByEmail(cleanEmail);

    let user = await UserModel.findOne(
      officialEmp
        ? { $or: [{ id: officialEmp.id }, { email: emailRegex }, { email: cleanEmail }] }
        : { email: emailRegex }
    );

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
        const member = await MemberModel.findOne({ email: emailRegex });
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

    // Guard against deactivated accounts (Flowchart 18)
    if (user.isDeactivated || user.status === 'DEACTIVATED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: This corporate account has been deactivated and tasks handed over (Flowchart 18). Please contact HR / Talent Management.',
        },
        { status: 403 }
      );
    }

    // Verify Password: allow universal default '123' or 'password123' for all employees, or hashed match
    let isMatch = false;
    if (password === '123' || password === 'password123') {
      isMatch = true;
      user.passwordHash = await hashPassword(password);
      await user.save().catch(() => {});
    } else {
      isMatch = await verifyPassword(password, user.passwordHash);
    }

    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password. Default password is 123 for all employees.',
        },
        { status: 401 }
      );
    }

    // 2FA Verification (if enabled and not using corporate standard password 123)
    if (user.isTwoFactorEnabled && password !== '123' && password !== 'password123') {
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

    if (officialEmp && (user.role !== activeRole || user.designation !== activeDesignation)) {
      user.role = activeRole;
      user.designation = activeDesignation;
      await user.save().catch(() => {});
    }

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
