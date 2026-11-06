/**
 * backend/lib/rateLimiter.ts — SDE-3 Enterprise In-Memory Rate Limiter
 *
 * Implements sliding-window rate limiting for authentication and sensitive endpoints.
 * Prevents brute-force credential stuffing, password spray, and denial-of-service attempts.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit records every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  windowMs: number;     // Window size in ms (e.g. 60_000 for 1 minute)
  maxRequests: number;  // Maximum requests per window
  prefix?: string;      // Rate limit namespace key
}

/**
 * Checks rate limit for a client IP.
 * Returns null if allowed, or a 429 NextResponse if rate limit exceeded.
 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const { windowMs, maxRequests, prefix = 'rl' } = options;

  // Extract client IP (standard proxy forward or fallback)
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
  const key = `${prefix}:${ip}`;

  const now = Date.now();
  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Remove timestamps outside current sliding window
  const validTimestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

    const response = NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded: Too many requests. Please try again after ${retryAfterSec} seconds.`,
        rateLimited: true,
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((oldest + windowMs) / 1000)),
        },
      }
    );
    return response;
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });
  return null;
}

