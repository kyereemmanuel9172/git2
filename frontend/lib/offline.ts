const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const DB_PREFIX = 'cms-offline-v2';
const DB_VERSION = 1;
const STORE_MEMBERS = 'members';
const STORE_ATTENDANCE = 'attendance';

type OfflineScope = string;

const dbPromises = new Map<OfflineScope, Promise<IDBDatabase>>();
const syncPromises = new Map<OfflineScope, Promise<SyncResult>>();
const scopeGenerations = new Map<OfflineScope, number>();

function databaseName(scope: OfflineScope): string {
  const safeScope = scope.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'anonymous';
  return `${DB_PREFIX}-${safeScope}`;
}

function openDb(scope: OfflineScope): Promise<IDBDatabase> {
  const existing = dbPromises.get(scope);
  if (existing) return existing;

  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(databaseName(scope), DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MEMBERS)) {
        db.createObjectStore(STORE_MEMBERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ATTENDANCE)) {
        db.createObjectStore(STORE_ATTENDANCE, { keyPath: 'localId' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline storage'));
    request.onblocked = () => reject(new Error('Offline storage upgrade was blocked'));
  });

  dbPromises.set(scope, promise);
  promise.catch(() => {
    if (dbPromises.get(scope) === promise) dbPromises.delete(scope);
  });
  return promise;
}

function idb<T>(
  scope: OfflineScope,
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest | null,
): Promise<T> {
  return openDb(scope).then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const objectStore = transaction.objectStore(store);
        const request = run(objectStore);
        transaction.oncomplete = () => resolve(request ? (request.result as T) : (undefined as T));
        transaction.onerror = () => reject(transaction.error ?? new Error('Offline storage request failed'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Offline storage transaction aborted'));
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
  membershipStatus?: string | null;
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
  attemptCount?: number;
  lastError?: string | null;
  nextAttemptAt?: string | null;
  checkedOutAt?: string | null;
}

export function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError') return true;
  if (typeof e === 'object' && e !== null && 'name' in e && e.name === 'AbortError') return true;
  const message = e instanceof Error ? e.message : String(e);
  return /failed to fetch|networkerror|network request failed|econnreset|timeout|aborted/i.test(message);
}

export function saveMembers(scope: OfflineScope, members: OfflineMember[]): Promise<void> {
  return openDb(scope).then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_MEMBERS, 'readwrite');
        const objectStore = transaction.objectStore(STORE_MEMBERS);
        for (const member of members) objectStore.put(member);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save offline members'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Unable to save offline members'));
      }),
  );
}

export function getMembers(scope: OfflineScope): Promise<OfflineMember[]> {
  return idb<OfflineMember[]>(scope, STORE_MEMBERS, 'readonly', (store) => store.getAll());
}

export async function getMemberById(scope: OfflineScope, identifier: string): Promise<OfflineMember | null> {
  const normalized = identifier.trim().toLowerCase();
  const members = await getMembers(scope);
  return (
    members.find(
      (member) =>
        member.id.toLowerCase() === normalized || (member.memberId ?? '').toLowerCase() === normalized,
    ) ?? null
  );
}

export function putAttendance(scope: OfflineScope, record: OfflineAttendance): Promise<void> {
  return openDb(scope).then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_ATTENDANCE, 'readwrite');
        transaction.objectStore(STORE_ATTENDANCE).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save offline attendance'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Unable to save offline attendance'));
      }),
  );
}

export function getAttendanceAll(scope: OfflineScope): Promise<OfflineAttendance[]> {
  return idb<OfflineAttendance[]>(scope, STORE_ATTENDANCE, 'readonly', (store) => store.getAll());
}

export function getPendingRecords(scope: OfflineScope, includeDeferred = false): Promise<OfflineAttendance[]> {
  return getAttendanceAll(scope).then((all) => {
    const now = Date.now();
    return all
      .filter(
        (record) =>
          record.syncStatus === 'pending' ||
          (record.syncStatus === 'failed' &&
            (includeDeferred || !record.nextAttemptAt || new Date(record.nextAttemptAt).getTime() <= now)),
      )
      .sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt));
  });
}

export async function setAttendanceStatus(
  scope: OfflineScope,
  localIds: string[],
  status: SyncStatus,
  serverRecordId?: string,
): Promise<void> {
  if (localIds.length === 0) return;
  const all = await getAttendanceAll(scope);
  const ids = new Set(localIds);
  await Promise.all(
    all
      .filter((record) => ids.has(record.localId))
      .map((record) =>
        putAttendance(scope, {
          ...record,
          syncStatus: status,
          serverRecordId: serverRecordId ?? record.serverRecordId,
          updatedAt: new Date().toISOString(),
          ...(status === 'synced' ? { attemptCount: 0, lastError: null, nextAttemptAt: null } : {}),
        }),
      ),
  );
}

export async function recordCheckIn(
  scope: OfflineScope,
  input: {
    memberId: string;
    memberName: string;
    serviceType: string;
    date: string;
    checkedInAt?: string;
  },
): Promise<{ already: boolean; record: OfflineAttendance }> {
  const localId = `${input.memberId}__${input.serviceType}__${input.date}`;
  const existing = await idb<OfflineAttendance | undefined>(scope, STORE_ATTENDANCE, 'readonly', (store) => store.get(localId));
  if (existing) return { already: true, record: existing };

  const now = new Date().toISOString();
  const record: OfflineAttendance = {
    localId,
    memberId: input.memberId,
    memberName: input.memberName,
    serviceType: input.serviceType,
    date: input.date,
    checkedInAt: input.checkedInAt ?? now,
    syncStatus: 'pending',
    updatedAt: now,
    attemptCount: 0,
    lastError: null,
    nextAttemptAt: null,
  };
  await putAttendance(scope, record);
  return { already: false, record };
}

export async function getLocalStats(
  scope: OfflineScope,
  date = toYMD(new Date()),
): Promise<{
  total: number;
  today: number;
  pending: number;
  synced: number;
  failed: number;
}> {
  const all = await getAttendanceAll(scope);
  return {
    total: all.length,
    today: all.filter((record) => record.date === date).length,
    pending: all.filter((record) => record.syncStatus === 'pending').length,
    synced: all.filter((record) => record.syncStatus === 'synced').length,
    failed: all.filter((record) => record.syncStatus === 'failed').length,
  };
}

export async function getLocalPresentIds(
  scope: OfflineScope,
  date: string,
  serviceType?: string,
): Promise<string[]> {
  const all = await getAttendanceAll(scope);
  return all
    .filter(
      (record) =>
        record.date === date &&
        (!serviceType || record.serviceType === serviceType) &&
        !record.checkedOutAt,
    )
    .map((record) => record.memberId);
}

function toYMD(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function clearOfflineScope(scope: OfflineScope): Promise<void> {
  scopeGenerations.set(scope, (scopeGenerations.get(scope) ?? 0) + 1);
  syncPromises.delete(scope);
  const existing = dbPromises.get(scope);
  dbPromises.delete(scope);
  const close = existing ? existing.then((db) => db.close()).catch(() => undefined) : Promise.resolve();
  return close.then(() => {
    if (typeof indexedDB === 'undefined') return;
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName(scope));
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Unable to clear offline storage'));
      request.onblocked = () => reject(new Error('Offline storage cleanup was blocked'));
    });
  });
}

export async function isServerReachable(timeoutMs = 4000): Promise<boolean> {
  if (typeof fetch === 'undefined') return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export interface SyncResult {
  offline: boolean;
  synced: number;
  failed: number;
}

export function syncPendingRecords(scope: OfflineScope, force = false): Promise<SyncResult> {
  const existing = syncPromises.get(scope);
  if (existing) return existing;
  const generation = scopeGenerations.get(scope) ?? 0;
  const promise = performSync(scope, force, generation).finally(() => {
    if (syncPromises.get(scope) === promise) syncPromises.delete(scope);
  });
  syncPromises.set(scope, promise);
  return promise;
}

async function performSync(scope: OfflineScope, force = false, generation = 0): Promise<SyncResult> {
  const pending = await getPendingRecords(scope, force);
  if (generation !== (scopeGenerations.get(scope) ?? 0)) return { offline: true, synced: 0, failed: 0 };
  if (pending.length === 0) return { offline: false, synced: 0, failed: 0 };
  if (!(await isServerReachable())) return { offline: true, synced: 0, failed: 0 };
  if (generation !== (scopeGenerations.get(scope) ?? 0)) return { offline: true, synced: 0, failed: 0 };

  const { api } = await import('./api');
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      const response = await api<{ alreadyCheckedIn: boolean; record?: { id: string } }>('/attendance/checkin', {
        method: 'POST',
        body: {
          memberId: record.memberId,
          serviceType: record.serviceType,
          date: record.date,
          checkedInAt: record.checkedInAt,
        },
      });
      if (generation !== (scopeGenerations.get(scope) ?? 0)) return { offline: true, synced, failed };
      await setAttendanceStatus(scope, [record.localId], 'synced', response.record?.id ?? record.serverRecordId);
      synced += 1;
    } catch (error) {
      if (generation !== (scopeGenerations.get(scope) ?? 0)) return { offline: true, synced, failed };
      if (isNetworkError(error)) return { offline: true, synced, failed };
      const attemptCount = (record.attemptCount ?? 0) + 1;
      const delay = Math.min(300000, 1000 * 2 ** Math.min(attemptCount, 8));
      await putAttendance(scope, {
        ...record,
        syncStatus: 'failed',
        attemptCount,
        lastError: error instanceof Error ? error.message : String(error),
        nextAttemptAt: new Date(Date.now() + delay).toISOString(),
        updatedAt: new Date().toISOString(),
      });
      failed += 1;
    }
  }

  return { offline: false, synced, failed };
}
