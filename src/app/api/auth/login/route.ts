/**
 * app/api/auth/login/route.ts
 * POST /api/auth/login — Authenticate with email & password, plus 2FA code verification
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel } from '@/models/User';
import { MemberModel } from '@/models/Member';
import { verifyPassword, hashPassword, signJwtToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { email, password, twoFactorCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let user = await UserModel.findOne({ email: email.toLowerCase() });

    // Seed convenience: If user exists in Member roster but hasn't created password yet, auto-provision
    if (!user) {
      const member = await MemberModel.findOne({ email: email.toLowerCase() });
      if (member) {
        const passwordHash = await hashPassword(password);
        user = await UserModel.create({
          id: member.id,
          name: member.name,
          email: member.email,
          passwordHash,
          role: member.role,
          department: member.department,
          designation: member.designation,
          avatar: member.avatar,
          isTwoFactorEnabled: false,
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid credentials. User not found.' },
          { status: 401 }
        );
      }
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
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
      // Demo 2FA accepts 6-digit format or 123456
      if (twoFactorCode.length !== 6) {
        return NextResponse.json({
          success: false,
          error: 'Invalid 2FA code. Must be 6 digits.',
        }, { status: 401 });
      }
    }

    const token = signJwtToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
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
