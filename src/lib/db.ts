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
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      '[DB] MONGODB_URI is not defined. Please set MONGODB_URI in your .env.local file.'
    );
  }

  // Return existing live connection immediately
  if (cache.conn && cache.conn.readyState === 1) {
    return cache.conn;
  }

  // If a connection attempt is already in-flight, await it
  if (!cache.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,           // Max concurrent connections
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    cache.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        console.log('[DB] ✓ Connected to MongoDB Atlas');
        return m.connection;
      })
      .catch((err) => {
        console.error('[DB] ✗ Connection failed:', err.message);
        cache.promise = null; // Allow retry on next call
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export default connectDB;
