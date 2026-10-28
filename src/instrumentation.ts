/**
 * instrumentation.ts — Next.js Server Lifecycle Instrumentation
 *
 * Automatically boots server-side enterprise background schedulers
 * (08:30 AM Morning Email Digest & 00:05 AM Midnight Carry-Forward Rollover)
 * when Next.js server initializes.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // In Next.js 15 webpack runtime, dynamic await import() can fail with __webpack_require__.C.
      // We safely try require first in Node.js runtime, falling back to dynamic import.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initServerCron } = require('./lib/cron');
      if (typeof initServerCron === 'function') {
        initServerCron();
      }
    } catch {
      try {
        const { initServerCron } = await import('./lib/cron');
        if (typeof initServerCron === 'function') {
          initServerCron();
        }
      } catch (err) {
        console.error('[Instrumentation] Background cron init error:', err);
      }
    }
  }
}
