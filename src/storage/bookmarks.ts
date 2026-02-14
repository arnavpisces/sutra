import { db } from './db.js';

export type BookmarkKind = 'jira' | 'confluence';

export interface BookmarkEntry {
  id: number;
  kind: BookmarkKind;
  key: string;
  title: string;
  url: string | null;
  meta: any;
  createdAt: number;
}

const insertStmt = db.prepare(
  `INSERT INTO bookmarks (kind, key, title, url, meta, created_at)
   VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT(kind, key)
   DO UPDATE SET title = excluded.title, url = excluded.url, meta = excluded.meta`
);
const deleteStmt = db.prepare(
  'DELETE FROM bookmarks WHERE kind = ? AND key = ?'
);
const existsStmt = db.prepare(
  'SELECT 1 FROM bookmarks WHERE kind = ? AND key = ?'
);
const listStmt = db.prepare(
  `SELECT id, kind, key, title, url, meta, created_at
   FROM bookmarks
   WHERE kind = ?
   ORDER BY created_at DESC
   LIMIT ?`
);
const listAllStmt = db.prepare(
  `SELECT id, kind, key, title, url, meta, created_at
   FROM bookmarks
   ORDER BY created_at DESC
   LIMIT ?`
);

export function isBookmarked(kind: BookmarkKind, key: string): boolean {
  const row = existsStmt.get(kind, key) as { '1': number } | undefined;
  return !!row;
}

export function addBookmark(
  kind: BookmarkKind,
  key: string,
  title: string,
  url?: string,
  meta?: any
): void {
  insertStmt.run(kind, key, title, url ?? null, JSON.stringify(meta ?? {}), Date.now());
}

export function removeBookmark(kind: BookmarkKind, key: string): void {
  deleteStmt.run(kind, key);
}

export function toggleBookmark(
  kind: BookmarkKind,
  key: string,
  title: string,
  url?: string,
  meta?: any
): boolean {
  if (isBookmarked(kind, key)) {
    removeBookmark(kind, key);
    return false;
  }
  addBookmark(kind, key, title, url, meta);
  return true;
}

export function listBookmarks(kind?: BookmarkKind, limit: number = 50): BookmarkEntry[] {
  const rows = (kind
    ? listStmt.all(kind, limit)
    : listAllStmt.all(limit)) as Array<{
    id: number;
    kind: BookmarkKind;
    key: string;
    title: string;
    url: string | null;
    meta: string | null;
    created_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    key: row.key,
    title: row.title,
    url: row.url,
    meta: row.meta ? JSON.parse(row.meta) : {},
    createdAt: row.created_at,
  }));
}
