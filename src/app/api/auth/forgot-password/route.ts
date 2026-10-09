/**
 * app/api/auth/forgot-password/route.ts
 * POST /api/auth/forgot-password — Request self-service password reset code via corporate email
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel } from '@/models/User';
import { MemberModel } from '@/models/Member';
import { hashPassword } from '@/lib/auth';
import { findOfficialEmployeeByEmail, syncOfficialRosterToDB } from '@/lib/rosterSync';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    // Ensure roster is initialized
    syncOfficialRosterToDB().catch(() => {});

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Corporate email is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const officialEmp = findOfficialEmployeeByEmail(cleanEmail);
    const lookupEmail = officialEmp ? officialEmp.email.toLowerCase() : cleanEmail;

    let user = await UserModel.findOne({ email: lookupEmail });

    // Auto-provision if user exists in official roster or Member directory but not yet in UserModel
    if (!user) {
      if (officialEmp) {
        const defaultHash = await hashPassword('password123');
        user = await UserModel.create({
          id: officialEmp.id,
          name: officialEmp.name,
          email: officialEmp.email.toLowerCase(),
          passwordHash: defaultHash,
          role: officialEmp.role,
          department: officialEmp.department,
          designation: officialEmp.designation,
          avatar: officialEmp.avatar,
          isTwoFactorEnabled: false,
          hasCustomPassword: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        const member = await MemberModel.findOne({ email: lookupEmail });
        if (member) {
          const defaultHash = await hashPassword('password123');
          user = await UserModel.create({
            id: member.id,
            name: member.name,
            email: member.email.toLowerCase(),
            passwordHash: defaultHash,
            role: member.role,
            department: member.department,
            designation: member.designation,
            avatar: member.avatar,
            isTwoFactorEnabled: false,
            hasCustomPassword: false,
            createdAt: new Date().toISOString(),
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Employee not found in corporate roster. Please check email address.' },
            { status: 404 }
          );
        }
      }
    }

    // Generate secure 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresMinutes = 15;
    const expiresDate = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await UserModel.collection.updateOne(
      { email: user.email },
      {
        $set: {
          resetPasswordToken: resetCode,
          resetPasswordExpires: expiresDate,
        },
      }
    );

    // Dispatch email
    const emailResult = await sendPasswordResetEmail({
      toEmail: user.email,
      toName: user.name,
      resetCode,
      expiresMinutes,
    });

    console.log(`[Auth/ForgotPassword] ✓ Dispatched reset code to ${user.email} (MessageId: ${emailResult.messageId || 'ok'})`);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to corporate email ${user.email}. Check your inbox.`,
      email: user.email,
      name: user.name,
      isTestAccount: emailResult.isTestAccount,
      previewUrl: emailResult.previewUrl,
    });
  } catch (err: unknown) {
    console.error('[Auth/ForgotPassword] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to dispatch verification code.' },
      { status: 500 }
    );
  }
}
