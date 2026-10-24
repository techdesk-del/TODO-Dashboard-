/**
 * instrumentation.ts — Next.js Server Lifecycle Instrumentation
 *
 * Automatically boots server-side enterprise background schedulers
 * (08:30 AM Morning Email Digest & 00:05 AM Midnight Carry-Forward Rollover)
 * when Next.js server initializes.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initServerCron } = await import('@/lib/cron');
    initServerCron();
  }
}
