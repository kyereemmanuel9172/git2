const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

const DB_NAME = 'cms-offline';
const DB_VERSION = 1;
const STORE_MEMBERS = 'members';
const STORE_ATTENDANCE = 'attendance';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MEMBERS)) {
        db.createObjectStore(STORE_MEMBERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ATTENDANCE)) {
        db.createObjectStore(STORE_ATTENDANCE, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function idb<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest | null): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const req = run(s);
        t.oncomplete = () => resolve(req ? (req.result as T) : (undefined as T));
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export interface OfflineMember {
  id: string;
  firstName: string;
  lastName: string;
  memberId: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OfflineAttendance {
  localId: string;
  memberId: string;
  memberName: string;
  serviceType: string;
  date: string;
  checkedInAt: string;
  syncStatus: SyncStatus;
  serverRecordId?: string;
  updatedAt: string;
}

export function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /failed to fetch|networkerror|network request failed|econnreset|timeout/i.test(msg);
}

// ---- Members (offline lookup snapshot) ----

export function saveMembers(members: OfflineMember[]): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE_MEMBERS, 'readwrite');
        const s = t.objectStore(STORE_MEMBERS);
        for (const m of members) s.put(m);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export function getMembers(): Promise<OfflineMember[]> {
  return idb<OfflineMember[]>(STORE_MEMBERS, 'readonly', (s) => s.getAll());
}

export async function getMemberById(id: string): Promise<OfflineMember | null> {
  const members = await getMembers();
  return members.find((m) => m.id === id) ?? null;
}

// ---- Attendance (local records + sync queue) ----

export function putAttendance(rec: OfflineAttendance): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(STORE_ATTENDANCE, 'readwrite');
        const s = t.objectStore(STORE_ATTENDANCE);
        s.put(rec);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export function getAttendanceAll(): Promise<OfflineAttendance[]> {
  return idb<OfflineAttendance[]>(STORE_ATTENDANCE, 'readonly', (s) => s.getAll());
}

export function getPendingRecords(): Promise<OfflineAttendance[]> {
  return getAttendanceAll().then((all) =>
    all
      .filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed')
      .sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt)),
  );
}

export async function setAttendanceStatus(
  localIds: string[],
  status: SyncStatus,
  serverRecordId?: string,
): Promise<void> {
  if (localIds.length === 0) return;
  const all = await getAttendanceAll();
  await Promise.all(
    all
      .filter((r) => localIds.includes(r.localId))
      .map((r) =>
        putAttendance({
          ...r,
          syncStatus: status,
          serverRecordId: serverRecordId ?? r.serverRecordId,
          updatedAt: new Date().toISOString(),
        }),
      ),
  );
}

export async function recordCheckIn(input: {
  memberId: string;
  memberName: string;
  serviceType: string;
  date: string;
  checkedInAt?: string;
}): Promise<{ already: boolean; record: OfflineAttendance }> {
  const localId = `${input.memberId}__${input.serviceType}__${input.date}`;
  const existing = await idb<OfflineAttendance | undefined>(STORE_ATTENDANCE, 'readonly', (s) => s.get(localId));
  if (existing) return { already: true, record: existing };

  const record: OfflineAttendance = {
    localId,
    memberId: input.memberId,
    memberName: input.memberName,
    serviceType: input.serviceType,
    date: input.date,
    checkedInAt: input.checkedInAt ?? new Date().toISOString(),
    syncStatus: 'pending',
    updatedAt: new Date().toISOString(),
  };
  await putAttendance(record);
  return { already: false, record };
}

export async function getLocalStats(): Promise<{
  total: number;
  today: number;
  pending: number;
  synced: number;
  failed: number;
}> {
  const all = await getAttendanceAll();
  const today = toYMD(new Date());
  return {
    total: all.length,
    today: all.filter((r) => r.date === today).length,
    pending: all.filter((r) => r.syncStatus === 'pending').length,
    synced: all.filter((r) => r.syncStatus === 'synced').length,
    failed: all.filter((r) => r.syncStatus === 'failed').length,
  };
}

export async function getLocalPresentIds(date: string): Promise<string[]> {
  const all = await getAttendanceAll();
  return all.filter((r) => r.date === date).map((r) => r.memberId);
}

function toYMD(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ---- Connectivity ----

export async function isServerReachable(timeoutMs = 4000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// ---- Synchronization ----

export async function syncPendingRecords(): Promise<{ offline: boolean; synced: number; failed: number }> {
  const pending = await getPendingRecords();
  if (pending.length === 0) return { offline: false, synced: 0, failed: 0 };

  if (!(await isServerReachable())) return { offline: true, synced: 0, failed: 0 };

  const { api } = await import('./api');
  let synced = 0;
  let failed = 0;

  for (const rec of pending) {
    try {
      const res = await api<{ alreadyCheckedIn: boolean; record?: { id: string } }>('/attendance/checkin', {
        method: 'POST',
        body: { memberId: rec.memberId, serviceType: rec.serviceType, date: rec.date },
      });
      await setAttendanceStatus([rec.localId], 'synced', res.record?.id ?? rec.serverRecordId);
      synced += 1;
    } catch (e) {
      if (isNetworkError(e)) {
        return { offline: true, synced, failed };
      }
      await setAttendanceStatus([rec.localId], 'failed');
      failed += 1;
    }
  }
  return { offline: false, synced, failed };
}