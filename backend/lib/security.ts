/**
 * backend/lib/security.ts — SDE-3 Enterprise Security & RBAC Module
 *
 * Implements:
 * 1. Cryptographic session extraction & validation (JWT from Bearer header or HTTP-only cookie)
 * 2. Role-Based Access Control (RBAC) guard
 * 3. NoSQL Injection & Prototype Pollution Sanitization
 * 4. OWASP Recommended Security Response Headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtToken, TokenPayload } from '@/lib/auth';
import type { Role } from '@/types';
import { isStrictCeo } from '@/shared/lib/rosterData';

export interface AuthenticatedUser extends TokenPayload {
  isFounder: boolean;
}

/**
 * Extract authenticated user session from NextRequest.
 * Supports:
 * - Authorization: Bearer <token>
 * - urbangaon_auth_token cookie
 */
export function getAuthenticatedUser(req: NextRequest): AuthenticatedUser | null {
  try {
    const authHeader = req.headers.get('authorization');
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = req.cookies.get('urbangaon_auth_token')?.value;
    }

    if (!token) return null;

    const payload = verifyJwtToken(token);
    if (!payload || !payload.email) return null;

    const isFounder = isStrictCeo({
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role
    });

    return {
      ...payload,
      isFounder,
    };
  } catch {
    return null;
  }
}

/**
 * RBAC Guard: Ensures caller is authenticated and optionally has one of the allowed roles.
 */
export function requireAuth(
  req: NextRequest,
  allowedRoles?: Role[]
): { user: AuthenticatedUser } | { errorResponse: NextResponse } {
  const user = getAuthenticatedUser(req);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Authentication Required: Valid corporate session token (JWT) is missing or expired. Please sign in.',
          unauthorized: true,
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(user.role) || (user.isFounder && allowedRoles.includes('SUPER_ADMIN'));
    if (!hasRole) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            error: `Access Denied: Role '${user.role}' lacks required permissions for this executive operation.`,
            forbidden: true,
          },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}

/**
 * Deep NoSQL Injection & Prototype Pollution Sanitizer.
 * Recursively strips keys starting with '$' or '.' and dangerous prototype keys.
 */
export function sanitizeInput<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput) as unknown as T;
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    // Block Mongo query operators ($where, $ne, $gt, etc.) and prototype pollution
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    cleanObj[key] = sanitizeInput(value);
  }
  return cleanObj as T;
}

/**
 * Applies OWASP hardened security response headers to a NextResponse.
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

