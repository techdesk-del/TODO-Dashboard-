/**
 * app/api/auth/invitation/create/route.ts
 * POST /api/auth/invitation/create — Generate official employee invitation (FC 9)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { InvitationModel } from '@/models/Invitation';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const { email, name, role, department, designation, invitedBy } = body;

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Email and full name are required to generate an invitation.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `INV-${randomHex}`;

    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // If an existing unused invitation exists for this email, revoke or replace it
    await InvitationModel.deleteMany({ email: cleanEmail, isUsed: false });

    const invitation = await InvitationModel.create({
      code,
      email: cleanEmail,
      name: String(name).trim(),
      role: role || 'EMPLOYEE',
      department: department || 'General Staff',
      designation: designation || 'Specialist',
      invitedBy: invitedBy || 'Talent HR / Admin',
      expiresAt,
      isUsed: false,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation generated successfully for ${invitation.name}.`,
      invitation: {
        code: invitation.code,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        department: invitation.department,
        designation: invitation.designation,
        expiresAt: invitation.expiresAt,
        invitationUrl: `/api/auth?invite=${invitation.code}`,
      }
    });
  } catch (error: unknown) {
    console.error('[API] /api/auth/invitation/create error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating invitation.' },
      { status: 500 }
    );
  }
}
