import {
  type Session,
  type SessionStatus,
  type SessionTask,
  type SessionTaskStatus,
  type SessionType,
  SESSION_TYPES,
} from "@/types/session";
import { resolveExpiredSessions } from "@/lib/session";

const STORAGE_KEY_PREFIX = "work-session-tracker:daily-sessions:";
const STORAGE_VERSION = 2;
const LEGACY_STORAGE_VERSION = 1;
const LOCAL_SESSIONS_CHANGED_EVENT =
  "work-session-tracker:local-sessions-changed";
const SESSION_STATUSES = new Set<SessionStatus>([
  "upcoming",
  "running",
  "completed",
  "missed",
  "skipped",
]);
const TASK_STATUSES = new Set<SessionTaskStatus>([
  "pending",
  "running",
  "completed",
]);

interface StoredDailySessions {
  version: typeof STORAGE_VERSION;
  sessions: Session[];
}

export interface HistoryDay {
  date: string;
  sessions: Session[];
}

export interface DailySessionStore {
  getSnapshot: () => Session[];
  getServerSnapshot: () => Session[];
  subscribe: (listener: () => void) => () => void;
  update: (updater: (sessions: Session[]) => Session[]) => void;
  reconcileExpiredSessions: (timestamp?: Date) => boolean;
}

export interface HistoryStore {
  getSnapshot: () => HistoryDay[];
  getServerSnapshot: () => HistoryDay[];
  subscribe: (listener: () => void) => () => void;
  reconcileExpiredSessions: (timestamp?: Date) => boolean;
}

export function createDailySessionStore(date: string): DailySessionStore {
  const key = `${STORAGE_KEY_PREFIX}${date}`;
  const defaultSessions = createDefaultDailySessions(date);
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedSessions = defaultSessions;

  function getSnapshot(): Session[] {
    const raw = window.localStorage.getItem(key);

    if (raw === cachedRaw) {
      return cachedSessions;
    }

    cachedRaw = raw;
    cachedSessions = parseStoredSessions(raw, date);
    return cachedSessions;
  }

  function getServerSnapshot(): Session[] {
    return defaultSessions;
  }

  function emitChange() {
    listeners.forEach((listener) => listener());
  }

  function persist(nextSessions: Session[]) {
    const serialized = JSON.stringify({
      version: STORAGE_VERSION,
      sessions: nextSessions,
    } satisfies StoredDailySessions);

    window.localStorage.setItem(key, serialized);
    cachedRaw = serialized;
    cachedSessions = nextSessions;
    emitChange();
    window.dispatchEvent(new Event(LOCAL_SESSIONS_CHANGED_EVENT));
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) {
      cachedRaw = undefined;
      emitChange();
    }
  }

  return {
    getSnapshot,
    getServerSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      window.addEventListener("storage", handleStorage);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", handleStorage);
        }
      };
    },
    update(updater) {
      const nextSessions = updater(getSnapshot());
      persist(nextSessions);
    },
    reconcileExpiredSessions(timestamp = new Date()) {
      const currentSessions = getSnapshot();
      const nextSessions = resolveExpiredSessions(currentSessions, timestamp);
      if (nextSessions === currentSessions) return false;

      persist(nextSessions);
      return true;
    },
  };
}

export function createHistoryStore(today: string): HistoryStore {
  const listeners = new Set<() => void>();
  const serverSnapshot: HistoryDay[] = [];
  let cachedSignature: string | undefined;
  let cachedDays: HistoryDay[] = serverSnapshot;

  function getSnapshot(): HistoryDay[] {
    const entries = getHistoricalEntries(today);
    const signature = entries
      .map(({ date, raw }) => `${date}\u0000${raw}`)
      .join("\u0001");

    if (signature === cachedSignature) {
      return cachedDays;
    }

    cachedSignature = signature;
    cachedDays = entries.flatMap(({ date, raw }) => {
      const sessions = parseStoredSessions(raw, date, false);
      return sessions.length > 0 ? [{ date, sessions }] : [];
    });

    return cachedDays;
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key.startsWith(STORAGE_KEY_PREFIX)) {
      cachedSignature = undefined;
      listeners.forEach((listener) => listener());
    }
  }

  function handleLocalSessionsChanged() {
    cachedSignature = undefined;
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        LOCAL_SESSIONS_CHANGED_EVENT,
        handleLocalSessionsChanged
      );

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", handleStorage);
          window.removeEventListener(
            LOCAL_SESSIONS_CHANGED_EVENT,
            handleLocalSessionsChanged
          );
        }
      };
    },
    reconcileExpiredSessions(timestamp = new Date()) {
      let changed = false;

      getHistoricalEntries(today).forEach(({ date, raw }) => {
        const sessions = parseStoredSessions(raw, date, false);
        const nextSessions = resolveExpiredSessions(sessions, timestamp);
        if (nextSessions === sessions) return;

        window.localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${date}`,
          JSON.stringify({
            version: STORAGE_VERSION,
            sessions: nextSessions,
          } satisfies StoredDailySessions)
        );
        changed = true;
      });

      if (changed) {
        cachedSignature = undefined;
        window.dispatchEvent(new Event(LOCAL_SESSIONS_CHANGED_EVENT));
      }

      return changed;
    },
  };
}

export function createDefaultDailySessions(date: string): Session[] {
  return SESSION_TYPES.map((sessionType) => ({
    id: `${date}:${sessionType}`,
    sessionType,
    startedAt: null,
    finishedAt: null,
    finishTarget: null,
    distracted: null,
    distractionReason: null,
    status: "upcoming",
    tasks: [],
    date,
  }));
}

export function importDailySessionsIfMissing(
  date: string,
  sessions: Session[]
): boolean {
  const key = `${STORAGE_KEY_PREFIX}${date}`;
  if (window.localStorage.getItem(key) !== null) return false;

  window.localStorage.setItem(
    key,
    JSON.stringify({
      version: STORAGE_VERSION,
      sessions,
    } satisfies StoredDailySessions)
  );
  window.dispatchEvent(new Event(LOCAL_SESSIONS_CHANGED_EVENT));

  return true;
}

function parseStoredSessions(
  raw: string | null,
  date: string,
  includeMissing = true
): Session[] {
  if (!raw) {
    return includeMissing ? createDefaultDailySessions(date) : [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      (parsed.version !== STORAGE_VERSION &&
        parsed.version !== LEGACY_STORAGE_VERSION) ||
      !Array.isArray(parsed.sessions)
    ) {
      return includeMissing ? createDefaultDailySessions(date) : [];
    }

    const storedSessions = parsed.sessions;

    return SESSION_TYPES.flatMap((sessionType) => {
      const fallback = createDefaultSession(date, sessionType);
      const candidate = storedSessions.find(
        (session) =>
          isRecord(session) && session.sessionType === sessionType
      );

      if (!isRecord(candidate)) {
        return includeMissing ? [fallback] : [];
      }

      return [{
        ...fallback,
        startedAt: nullableString(candidate.startedAt),
        finishedAt: nullableString(candidate.finishedAt),
        finishTarget: nullableClockTime(candidate.finishTarget),
        distracted: normalizeDistraction(
          candidate.distracted,
          parsed.version
        ),
        distractionReason: nullableString(candidate.distractionReason),
        status: normalizeSessionStatus(candidate.status, fallback.status),
        tasks: Array.isArray(candidate.tasks)
          ? candidate.tasks.flatMap((task) => normalizeTask(task))
          : [],
      }];
    });
  } catch {
    return includeMissing ? createDefaultDailySessions(date) : [];
  }
}

function getHistoricalEntries(today: string) {
  const entries: Array<{ date: string; raw: string }> = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(STORAGE_KEY_PREFIX)) continue;

    const date = key.slice(STORAGE_KEY_PREFIX.length);
    if (!isCalendarDate(date) || date >= today) continue;

    const raw = window.localStorage.getItem(key);
    if (raw !== null) entries.push({ date, raw });
  }

  return entries.sort((left, right) => right.date.localeCompare(left.date));
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

function createDefaultSession(date: string, sessionType: SessionType): Session {
  return {
    id: `${date}:${sessionType}`,
    sessionType,
    startedAt: null,
    finishedAt: null,
    finishTarget: null,
    distracted: null,
    distractionReason: null,
    status: "upcoming",
    tasks: [],
    date,
  };
}

function normalizeTask(value: unknown): SessionTask[] {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return [];
  }

  const status = isTaskStatus(value.status)
    ? value.status
    : typeof value.completed === "boolean"
      ? value.completed
        ? "completed"
        : "pending"
      : null;
  if (status === null) return [];

  return [
    {
      id: value.id,
      title: value.title,
      status,
      startedAt: nullableString(value.startedAt),
      finishedAt: nullableString(value.finishedAt),
      createdAt: value.createdAt,
      updatedAt:
        typeof value.updatedAt === "string"
          ? value.updatedAt
          : value.createdAt,
    },
  ];
}

function normalizeDistraction(
  value: unknown,
  storageVersion: unknown
): boolean | null {
  if (value === true) return true;
  if (storageVersion === STORAGE_VERSION && value === false) return false;
  return null;
}

function normalizeSessionStatus(
  value: unknown,
  fallback: SessionStatus
): SessionStatus {
  if (isSessionStatus(value)) return value;
  if (value === "not_started") return "upcoming";
  if (value === "in_progress") return "running";
  return fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableClockTime(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, hour, minute] = match;
  return Number(hour) <= 23 && Number(minute) <= 59 ? value : null;
}

function isSessionStatus(value: unknown): value is SessionStatus {
  return typeof value === "string" && SESSION_STATUSES.has(value as SessionStatus);
}

function isTaskStatus(value: unknown): value is SessionTaskStatus {
  return typeof value === "string" && TASK_STATUSES.has(value as SessionTaskStatus);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
