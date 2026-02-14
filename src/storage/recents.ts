import { db } from './db.js';

export type RecentKind = 'jira' | 'confluence';

export interface RecentEntry {
  id: number;
  kind: RecentKind;
  key: string;
  title: string;
  url: string | null;
  meta: any;
  accessedAt: number;
}

const insertStmt = db.prepare(
  `INSERT INTO recents (kind, key, title, url, meta, accessed_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const deleteStmt = db.prepare(
  'DELETE FROM recents WHERE kind = ? AND key = ?'
);
const listStmt = db.prepare(
  `SELECT id, kind, key, title, url, meta, accessed_at
   FROM recents
   WHERE kind = ?
   ORDER BY accessed_at DESC
   LIMIT ?`
);
const listAllStmt = db.prepare(
  `SELECT id, kind, key, title, url, meta, accessed_at
   FROM recents
   ORDER BY accessed_at DESC
   LIMIT ?`
);
const trimStmt = db.prepare(
  `DELETE FROM recents
   WHERE id NOT IN (
     SELECT id FROM recents
     WHERE kind = ?
     ORDER BY accessed_at DESC
     LIMIT ?
   ) AND kind = ?`
);

export function addRecent(
  kind: RecentKind,
  key: string,
  title: string,
  url?: string,
  meta?: any,
  limit: number = 50
): void {
  deleteStmt.run(kind, key);
  insertStmt.run(kind, key, title, url ?? null, JSON.stringify(meta ?? {}), Date.now());
  trimStmt.run(kind, limit, kind);
}

export function listRecents(kind?: RecentKind, limit: number = 50): RecentEntry[] {
  const rows = (kind
    ? listStmt.all(kind, limit)
    : listAllStmt.all(limit)) as Array<{
    id: number;
    kind: RecentKind;
    key: string;
    title: string;
    url: string | null;
    meta: string | null;
    accessed_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    key: row.key,
    title: row.title,
    url: row.url,
    meta: row.meta ? JSON.parse(row.meta) : {},
    accessedAt: row.accessed_at,
  }));
}
