/**
 * app/api/auth/register/route.ts
 * POST /api/auth/register — Register new employee account
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel } from '@/models/User';
import { MemberModel } from '@/models/Member';
import { hashPassword, signJwtToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, email, password, role, department, designation } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr-${Date.now()}`;
    const userRole = role || 'EMPLOYEE';
    const userDept = department || 'General';
    const userDesig = designation || 'Staff Member';

    const user = await UserModel.create({
      id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: userRole,
      department: userDept,
      designation: userDesig,
      avatar: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      isTwoFactorEnabled: false,
    });

    // Also sync to Member collection for roster visibility
    await MemberModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          id: userId,
          name,
          email: email.toLowerCase(),
          role: userRole,
          department: userDept,
          designation: userDesig,
          avatar: user.avatar,
          status: 'ACTIVE',
        }
      },
      { upsert: true }
    );

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
    }, { status: 201 });

    response.cookies.set('urbangaon_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
