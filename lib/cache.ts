import "server-only";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";

/**
 * Disk-backed, stale-while-revalidate cache.
 *
 * The live Snowflake queries backing this app are slow (~50-60s cold). To keep
 * the UI snappy we (a) persist results to disk so server restarts / code edits
 * don't force a re-query, (b) serve stale data instantly while refreshing in the
 * background, and (c) dedupe concurrent loads so the heavy query never runs more
 * than once at a time. Disk is the source of truth shared across module contexts
 * (route handlers and the boot instrumentation hook may get separate in-memory
 * module instances, but they all read/write the same snapshot files).
 */

const CACHE_DIR = join(process.cwd(), ".data-cache");

interface Snapshot<T> {
  data: T;
  fetchedAt: number;
}

function ensureDir() {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
  } catch {
    // ignore — write will surface the real error
  }
}

function snapPath(name: string) {
  return join(CACHE_DIR, `${name}.json`);
}

function readSnap<T>(name: string): Snapshot<T> | null {
  try {
    const txt = readFileSync(snapPath(name), "utf8");
    const parsed = JSON.parse(txt) as Snapshot<T>;
    if (parsed && typeof parsed.fetchedAt === "number" && "data" in parsed) {
      return parsed;
    }
  } catch {
    // no snapshot yet / unreadable — treat as empty
  }
  return null;
}

function writeSnap<T>(name: string, data: T) {
  try {
    ensureDir();
    const payload: Snapshot<T> = { data, fetchedAt: Date.now() };
    // Atomic write: write to a temp file then rename so readers never see a
    // partially-written file.
    const tmp = snapPath(`${name}.${process.pid}.tmp`);
    writeFileSync(tmp, JSON.stringify(payload));
    renameSync(tmp, snapPath(name));
  } catch (e) {
    console.error(`[cache] snapshot write failed for "${name}":`, e);
  }
}

interface Entry<T> {
  data: T | null;
  fetchedAt: number;
  inFlight: Promise<T> | null;
}

const g = globalThis as unknown as { __dataCache?: Map<string, Entry<unknown>> };
const mem: Map<string, Entry<unknown>> = (g.__dataCache ??= new Map());

function entryFor<T>(name: string): Entry<T> {
  let e = mem.get(name) as Entry<T> | undefined;
  if (!e) {
    const snap = readSnap<T>(name);
    e = {
      data: snap?.data ?? null,
      fetchedAt: snap?.fetchedAt ?? 0,
      inFlight: null,
    };
    mem.set(name, e as Entry<unknown>);
  } else if (e.data === null) {
    // In-memory miss but a snapshot may have been written by another context.
    const snap = readSnap<T>(name);
    if (snap) {
      e.data = snap.data;
      e.fetchedAt = snap.fetchedAt;
    }
  }
  return e;
}

function refresh<T>(name: string, loader: () => Promise<T>, e: Entry<T>): Promise<T> {
  if (e.inFlight) return e.inFlight;
  e.inFlight = loader()
    .then((data) => {
      e.data = data;
      e.fetchedAt = Date.now();
      writeSnap(name, data);
      return data;
    })
    .finally(() => {
      e.inFlight = null;
    });
  return e.inFlight;
}

export interface CachedOptions<T> {
  name: string;
  /** Data younger than this is served without triggering a refresh. */
  ttlMs: number;
  loader: () => Promise<T>;
}

/**
 * Returns cached data instantly when available. If the data is stale it is still
 * returned immediately and a background refresh is kicked off (stale-while-
 * revalidate). Only the very first call with no snapshot at all blocks on the
 * loader.
 */
export async function getCached<T>({
  name,
  ttlMs,
  loader,
}: CachedOptions<T>): Promise<T> {
  const e = entryFor<T>(name);
  const hasData = e.data !== null;
  const age = Date.now() - e.fetchedAt;

  if (hasData && age < ttlMs) return e.data as T;
  if (hasData) {
    // Serve stale immediately, revalidate in the background.
    void refresh(name, loader, e).catch((err) =>
      console.error(`[cache] background refresh failed for "${name}":`, err),
    );
    return e.data as T;
  }
  // Cold: nothing cached anywhere — must wait once.
  return refresh(name, loader, e);
}

/** Fire-and-forget warm-up used on server boot. */
export function primeCache<T>(opts: CachedOptions<T>): void {
  void getCached(opts).catch((err) =>
    console.error(`[cache] prime failed for "${opts.name}":`, err),
  );
}

