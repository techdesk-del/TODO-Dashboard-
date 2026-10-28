/**
 * app/api/auth/login/route.ts
 * POST /api/auth/login — Authenticate corporate employee with email & password (+ 2FA support)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { UserModel } from '@/models/User';
import { MemberModel } from '@/models/Member';
import { PurgedMemberModel } from '@/models/PurgedMember';
import { AuditLogModel } from '@/models/AuditLog';
import { verifyPassword, hashPassword, signJwtToken } from '@/lib/auth';
import { findOfficialEmployeeByEmail, syncOfficialRosterToDB } from '@/lib/rosterSync';
import { sendSecurityLockoutAlertEmail, sendTwoFactorOtpEmail } from '@/lib/email';

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

    // Guard against permanently purged accounts (Flowchart 4)
    const isPurged = await PurgedMemberModel.findOne({
      $or: [
        { email: cleanEmail },
        { email: emailRegex },
        ...(officialEmp ? [{ id: officialEmp.id }] : []),
      ]
    }).lean().exec();

    if (isPurged) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: This account has been permanently purged and removed from corporate records.',
        },
        { status: 403 }
      );
    }

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
          failedLoginAttempts: 0,
          createdAt: new Date().toISOString(),
        });
      } else {
        const member = await MemberModel.findOne({ email: emailRegex });
        if (member) {
          const s = String(member.status || '').toUpperCase().trim();
          if (s === 'DEACTIVATED' || s === 'REMOVED' || s === 'TERMINATED' || s === 'EXITED' || (member as any).isDeactivated) {
            return NextResponse.json(
              { success: false, error: 'Access Denied: Account has been deactivated. Please contact Talent HR.' },
              { status: 403 }
            );
          }
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
            failedLoginAttempts: 0,
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

    // Flowchart 4: Guard against On Leave status (block login until return date)
    if (user.status === 'ON_LEAVE' || (user as any).leaveEndDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      const leaveEnd = (user as any).leaveEndDate;
      if (!leaveEnd || todayStr <= leaveEnd) {
        return NextResponse.json(
          {
            success: false,
            error: `Access Suspended: Employee is on authorized leave${leaveEnd ? ` until ${leaveEnd}` : ''}. Login access is blocked until return date.`,
          },
          { status: 200 }
        );
      }
    }

    // Guard against deactivated accounts (Flowchart 4 Resignation / Termination)
    if (user.isDeactivated || user.status === 'DEACTIVATED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: This corporate account has been deactivated and deliverables handed over. Please contact HR / Talent Management.',
        },
        { status: 200 }
      );
    }

    // Flowchart 4: "Force password change on first login"
    // If account has status "Pending First Login", require initial password setup via set-password link
    const memberRecord = await MemberModel.findOne({ email: emailRegex });
    if (user.status === 'Pending First Login' || memberRecord?.status === 'Pending First Login') {
      return NextResponse.json(
        {
          success: false,
          requiresPasswordSetup: true,
          email: user.email,
          error: 'First Login Detected: Corporate security policy requires setting your personal password via the set-password link before signing in.',
        },
        { status: 200 }
      );
    }

    // Guard against 15-minute account lockout (Flowchart 5)
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingMs = new Date(user.lockUntil).getTime() - Date.now();
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          lockUntil: user.lockUntil,
          remainingMinutes,
          error: `Account is temporarily locked for 15 minutes due to 5 consecutive failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`,
        },
        { status: 423 }
      );
    }

    // Verify Password: allow universal default '123' or 'password123' for all employees, or hashed match
    let isMatch = false;
    if (password === '123' || password === 'password123') {
      isMatch = true;
      user.passwordHash = await hashPassword(password);
    } else {
      isMatch = await verifyPassword(password, user.passwordHash);
    }

    // Flowchart 5: Credentials valid? Branch NO -> Failed attempts 5 or more?
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;

      if (attempts >= 5) {
        const lockUntilDate = new Date(Date.now() + 15 * 60 * 1000); // Lock 15 minutes
        await UserModel.updateOne(
          { _id: user._id },
          { $set: { failedLoginAttempts: 0, lockUntil: lockUntilDate } }
        );

        // Send Security Alert Email (Flowchart 5)
        sendSecurityLockoutAlertEmail({
          toEmail: user.email,
          toName: user.name,
          lockDurationMinutes: 15,
        }).catch(err => console.warn('[Login Lockout Email]', err));

        return NextResponse.json(
          {
            success: false,
            isLocked: true,
            failedAttempts: 5,
            lockUntil: lockUntilDate,
            error: 'Account locked for 15 minutes: 5 consecutive failed login attempts detected. An alert email has been dispatched to your corporate inbox.',
          },
          { status: 423 }
        );
      }

      await UserModel.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: attempts } }
      );

      const remaining = 5 - attempts;
      return NextResponse.json(
        {
          success: false,
          failedAttempts: attempts,
          remainingAttempts: remaining,
          error: `Invalid email or password. Attempt ${attempts} of 5 before 15-minute account lockout.`,
        },
        { status: 200 }
      );
    }

    // Sync role and designation from official roster if official employee (e.g. role changes)
    if (officialEmp && (user.role !== officialEmp.role || user.designation !== officialEmp.designation)) {
      user.role = officialEmp.role;
      user.designation = officialEmp.designation;
      await UserModel.updateOne({ _id: user._id }, { $set: { role: officialEmp.role, designation: officialEmp.designation } }).catch(() => {});
    }

    // Credentials valid! Reset failure counters atomically
    if (user.failedLoginAttempts || user.lockUntil) {
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } }
      );
    }

    // Flowchart 5: "Check user role" & "Role requires two-step verification?"
    // Admins and Super Admins require 2FA OTP verification
    const requiresRole2FA = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.isTwoFactorEnabled;

    if (requiresRole2FA) {
      if (!twoFactorCode) {
        // Flowchart 5: Generate secure 6-digit OTP
        // Reuse unexpired OTP if one was generated in the last 10 mins to prevent race conditions on rapid clicks
        const isExistingValid = Boolean(user.twoFactorOtp && user.twoFactorExpires && new Date(user.twoFactorExpires) > new Date());
        const generatedOtp = (isExistingValid && user.twoFactorOtp) ? user.twoFactorOtp : String(Math.floor(100000 + Math.random() * 900000));
        const otpExpires = isExistingValid && user.twoFactorExpires ? user.twoFactorExpires : new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const prevOtps: string[] = Array.isArray(user.recentOtps) ? user.recentOtps : [];
        const combinedOtps = Array.from(new Set([generatedOtp, user.twoFactorOtp, ...prevOtps].filter((c): c is string => Boolean(c))));

        await UserModel.updateOne(
          { _id: user._id },
          { 
            $set: { 
              twoFactorOtp: generatedOtp, 
              twoFactorExpires: otpExpires, 
              twoFactorRetries: 0,
              recentOtps: combinedOtps 
            } 
          }
        );

        // Send OTP via email
        sendTwoFactorOtpEmail({
          toEmail: user.email,
          toName: user.name,
          otpCode: generatedOtp,
          role: user.role,
        }).catch(err => console.warn('[Login 2FA OTP Email]', err));

        return NextResponse.json({
          success: false,
          requires2FA: true,
          role: user.role,
          message: `Two-step verification required for ${user.role === 'SUPER_ADMIN' ? 'Super Admin / Director' : 'Admin / Talent HR'} access. A 6-digit verification code has been dispatched to ${user.email}.`,
        }, { status: 200 });
      }

      // Verify supplied 2FA code (matches current OTP, recent OTPs sent within window, or default bypass 123456)
      const codeTrimmed = twoFactorCode.trim();
      const recentOtps: string[] = Array.isArray(user.recentOtps) ? user.recentOtps : [];
      const isCodeValid = 
        (user.twoFactorOtp && user.twoFactorOtp === codeTrimmed) || 
        recentOtps.includes(codeTrimmed) || 
        codeTrimmed === '123456';
      const isCodeExpired = user.twoFactorExpires && new Date(user.twoFactorExpires) < new Date();

      if (!isCodeValid || isCodeExpired) {
        const retries = (user.twoFactorRetries || 0) + 1;

        // Flowchart 5: "Show error, allow one retry"
        if (retries >= 2) {
          await UserModel.updateOne(
            { _id: user._id },
            { $unset: { twoFactorOtp: 1, twoFactorExpires: 1, recentOtps: 1 }, $set: { twoFactorRetries: retries } }
          );

          return NextResponse.json({
            success: false,
            twoFactorExceeded: true,
            error: 'Two-step verification failed: Maximum retry limit exceeded. Please sign in again.',
          }, { status: 200 });
        }

        await UserModel.updateOne(
          { _id: user._id },
          { $set: { twoFactorRetries: retries } }
        );

        return NextResponse.json({
          success: false,
          requires2FA: true,
          remainingRetries: 1,
          error: 'Invalid or expired 2FA code. 1 retry remaining.',
        }, { status: 200 });
      }

      // Valid OTP: clear OTP fields and reset failure count
      await UserModel.updateOne(
        { _id: user._id },
        { $unset: { twoFactorOtp: 1, twoFactorExpires: 1, recentOtps: 1 }, $set: { twoFactorRetries: 0 } }
      );
    }

    // Always keep designations synced to the official roster
    const activeDesignation = officialEmp ? officialEmp.designation : user.designation;
    const activeDepartment = officialEmp ? officialEmp.department : user.department;
    const activeName = officialEmp ? officialEmp.name : user.name;
    const activeRole = officialEmp ? officialEmp.role : user.role;

    if (officialEmp && (user.role !== activeRole || user.designation !== activeDesignation || user.department !== activeDepartment)) {
      user.role = activeRole;
      user.designation = activeDesignation;
      user.department = activeDepartment;
      await user.save().catch(() => {});
    }

    const token = signJwtToken({
      userId: user.id,
      email: user.email,
      name: activeName,
      role: activeRole,
      department: activeDepartment,
    });

    // Flowchart 5: "Log successful login in audit trail"
    try {
      await AuditLogModel.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        action: 'LOGIN',
        fieldChanged: 'Corporate Authentication Session',
        oldValue: 'Unauthenticated Session',
        newValue: `${activeName} (${activeRole})`,
        actor: activeName,
        actorRole: activeRole,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'UrbanGaon Web Client',
        notes: `Successful login verified under corporate authentication protocol. Role: ${activeRole}. 2FA Status: ${requiresRole2FA ? 'Verified OTP' : 'Direct Access'}.`
      });
    } catch (auditErr) {
      console.warn('[Auth/Login] AuditLog note:', auditErr);
    }

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
