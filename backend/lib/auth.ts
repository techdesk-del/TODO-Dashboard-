/**
 * lib/auth.ts — Password Hashing and JWT Token Management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Role } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'urbangaon_enterprise_jwt_secret_2026_default_key';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  department: string;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function signJwtToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
