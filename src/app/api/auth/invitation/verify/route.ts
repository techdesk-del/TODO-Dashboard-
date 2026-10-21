/**
 * app/api/auth/invitation/verify/route.ts
 * POST /api/auth/invitation/verify — Verify invitation code validity and expiration (Flowchart 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { InvitationModel } from '@/models/Invitation';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const rawCode = body.code || '';
    const cleanCode = String(rawCode).trim().toUpperCase();

    if (!cleanCode) {
      return NextResponse.json(
        { success: false, error: 'Invitation code is required.' },
        { status: 400 }
      );
    }

    const invitation = await InvitationModel.findOne({ code: cleanCode });

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid invitation code. Please check your invitation email or ask Admin to resend.',
          isInvalid: true,
          offerResend: true,
        },
        { status: 404 }
      );
    }

    if (invitation.isUsed) {
      return NextResponse.json(
        {
          success: false,
          error: 'This invitation has already been redeemed. Please sign in directly or ask Admin to resend.',
          isUsed: true,
          offerResend: true,
        },
        { status: 400 }
      );
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json(
        {
          success: false,
          error: 'This invitation has expired. Please contact Admin/HR to resend a fresh invitation.',
          isExpired: true,
          offerResend: true,
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        code: invitation.code,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        department: invitation.department,
        designation: invitation.designation,
        expiresAt: invitation.expiresAt,
      }
    });
  } catch (error: unknown) {
    console.error('[API] /api/auth/invitation/verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while verifying invitation.' },
      { status: 500 }
    );
  }
}
