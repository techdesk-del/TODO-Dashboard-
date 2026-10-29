/**
 * lib/db.ts — MongoDB Singleton Connection
 *
 * Pattern: Module-level cache prevents multiple Mongoose connections
 * during Next.js hot-reload in development. In production, the module
 * is instantiated once per serverless function cold start.
 *
 * Reference: https://mongoosejs.com/docs/connections.html
 */

import mongoose, { type Connection } from 'mongoose';

/* ── Module-level cache ──────────────────────────────────────────── */
interface MongoCache {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

// Augment NodeJS global so the cache survives hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __mongoCache: MongoCache | undefined;
}

const cache: MongoCache = global.__mongoCache ?? { conn: null, promise: null };
global.__mongoCache = cache;

/* ── Connection function ─────────────────────────────────────────── */
export async function connectDB(): Promise<Connection> {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://techdesk_db_user:aakash@cluster0.vgpa6s7.mongodb.net/urbangaon_todo?retryWrites=true&w=majority&appName=Cluster0';

  // Return existing live connection immediately
  if (cache.conn && cache.conn.readyState === 1) {
    return cache.conn;
  }

  // If a connection attempt is already in-flight, await it
  if (!cache.promise) {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: isServerless ? 10 : 50,
      minPoolSize: isServerless ? 1 : 5,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 to prevent AWS Lambda / Vercel IPv6 TLS handshake failures
      retryWrites: true,
    };

    cache.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        console.log('[DB] ✓ Connected to MongoDB Atlas');
        if (typeof window === 'undefined') {
          import('@/lib/cron').then(m => m.initServerCron()).catch(() => {});
        }
        return m.connection;
      })
      .catch((err) => {
        console.error('[DB] ✗ Connection failed:', err.message);
        cache.promise = null; // Allow retry on next call
        cache.conn = null;
        if (err?.message && (err.message.includes('SSL') || err.message.includes('tlsv1 alert internal error') || err.message.includes('0A000438') || err.message.includes('alert number 80'))) {
          throw new Error('MongoDB Atlas connection rejected (TLS alert internal error): Your Vercel deployment IP is not whitelisted. Please add 0.0.0.0/0 in MongoDB Atlas Network Access.');
        }
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export default connectDB;
