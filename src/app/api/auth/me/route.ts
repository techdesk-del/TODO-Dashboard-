/**
 * app/api/auth/me/route.ts & logout
 * GET  /api/auth/me — Validate session token
 * POST /api/auth/me — Logout (clears cookie)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('urbangaon_auth_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }

  const payload = verifyJwtToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    user: payload,
  });
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete('urbangaon_auth_token');
  return response;
}
