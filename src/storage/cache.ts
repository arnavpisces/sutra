import { db } from './db.js';

const getStmt = db.prepare(
  'SELECT value, expires_at FROM cache WHERE namespace = ? AND key = ?'
);
const setStmt = db.prepare(
  `INSERT INTO cache (namespace, key, value, expires_at, updated_at)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(namespace, key)
   DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at, updated_at = excluded.updated_at`
);
const deleteStmt = db.prepare(
  'DELETE FROM cache WHERE namespace = ? AND key = ?'
);
const clearStmt = db.prepare('DELETE FROM cache WHERE namespace = ?');
const clearExpiredStmt = db.prepare('DELETE FROM cache WHERE expires_at < ?');

const EXPIRED_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastExpiredSweepAt = 0;

export class PersistentCache<T> {
  private namespace: string;
  private ttlMs: number;

  constructor(namespace: string, ttlSeconds: number = 300) {
    this.namespace = namespace;
    this.ttlMs = ttlSeconds * 1000;
    this.sweepExpiredIfNeeded();
  }

  get(key: string): T | null {
    const row = getStmt.get(this.namespace, key) as
      | { value: string; expires_at: number }
      | undefined;
    if (!row) return null;
    if (Date.now() > row.expires_at) {
      this.delete(key);
      return null;
    }
    try {
      return JSON.parse(row.value) as T;
    } catch {
      this.delete(key);
      return null;
    }
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    this.sweepExpiredIfNeeded();
    const now = Date.now();
    const expiresAt = now + (ttlSeconds ? ttlSeconds * 1000 : this.ttlMs);
    setStmt.run(
      this.namespace,
      key,
      JSON.stringify(value),
      expiresAt,
      now
    );
  }

  delete(key: string): void {
    deleteStmt.run(this.namespace, key);
  }

  clear(): void {
    clearStmt.run(this.namespace);
  }

  clearExpired(): void {
    clearExpiredStmt.run(Date.now());
  }

  private sweepExpiredIfNeeded(): void {
    const now = Date.now();
    if (now - lastExpiredSweepAt < EXPIRED_SWEEP_INTERVAL_MS) return;
    lastExpiredSweepAt = now;
    clearExpiredStmt.run(now);
  }
}
