// In-memory + localStorage decision store. Lets /d/[id] and /verify/[id] render a
// freshly-proved decision+audit WITHOUT a database (seeded core). Keyed by recordId
// (== recordHash[:16], the same id the brain returns and persists its receipt under).
//
// Wave 1: swap the localStorage backend for Supabase but KEEP this module's API
// (saveRecord / getRecord / listRecords / subscribe) so callers don't change.

import type { StoredRecord } from "./types";

const LS_KEY = "gb_records_v1";

// Process-level mirror so a record saved this tick is readable synchronously even
// before localStorage round-trips (and on the server it's just empty, which is fine).
const mem = new Map<string, StoredRecord>();

type Listener = () => void;
const listeners = new Set<Listener>();

function isBrowser() {
  return typeof window !== "undefined";
}

function loadAll(): Record<string, StoredRecord> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredRecord>;
  } catch {
    return {};
  }
}

function persistAll(all: Record<string, StoredRecord>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    // quota / private mode — the in-memory mirror still serves this session.
  }
}

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* noop */
    }
  });
}

/** Save (or overwrite) a record by its recordId. Returns the id. */
export function saveRecord(rec: StoredRecord): string {
  const id = rec.audit.recordId;
  mem.set(id, rec);
  const all = loadAll();
  all[id] = rec;
  persistAll(all);
  emit();
  return id;
}

/** Read one record by id (in-memory first, then localStorage). */
export function getRecord(id: string): StoredRecord | null {
  if (mem.has(id)) return mem.get(id)!;
  const all = loadAll();
  const found = all[id] || null;
  if (found) mem.set(id, found);
  return found;
}

/** All records, newest first. */
export function listRecords(): StoredRecord[] {
  const all = loadAll();
  // merge in any mem-only entries not yet flushed
  for (const [id, rec] of mem) if (!all[id]) all[id] = rec;
  return Object.values(all).sort((a, b) => b.createdAt - a.createdAt);
}

/** Subscribe to store changes (for live dashboards). Returns an unsubscribe fn. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
