import {
  calculateLateMinutes,
  formatTime,
  todayDateString,
} from "@/lib/session";
import {
  type AccountabilityDay,
  type AccountabilityViolation,
  type AccountabilityViolationType,
  ACCOUNTABILITY_VIOLATION_TYPES,
} from "@/types/accountability";
import {
  type Session,
  type SessionType,
  SESSION_SCHEDULE,
  SESSION_TYPES,
} from "@/types/session";

const ACCOUNTABILITY_STORAGE_KEY_PREFIX =
  "work-session-tracker:accountability:";
const ACCOUNTABILITY_STORAGE_VERSION = 4;
const LEGACY_ACCOUNTABILITY_STORAGE_VERSIONS = new Set([1, 2, 3]);
const ACCOUNTABILITY_CHANGED_EVENT =
  "work-session-tracker:accountability-changed";
const VIOLATION_TYPE_SET = new Set<AccountabilityViolationType>(
  ACCOUNTABILITY_VIOLATION_TYPES
);
const SESSION_TYPE_SET = new Set<SessionType>(SESSION_TYPES);

interface StoredAccountabilityDay {
  version: typeof ACCOUNTABILITY_STORAGE_VERSION;
  activatedAt: string | null;
  violations: AccountabilityViolation[];
}

export interface AccountabilityStore {
  getSnapshot: () => AccountabilityDay;
  getServerSnapshot: () => AccountabilityDay;
  subscribe: (listener: () => void) => () => void;
  activate: (now?: Date) => void;
  reconcile: (sessions: Session[], now?: Date) => void;
  recordDistraction: (session: Session, now?: Date) => void;
  removeDistraction: (sessionType: SessionType) => void;
  markCompleted: (violationId: string, now?: Date) => void;
}

export interface AccountabilityHistoryStore {
  getSnapshot: () => AccountabilityDay[];
  getServerSnapshot: () => AccountabilityDay[];
  subscribe: (listener: () => void) => () => void;
}

export interface AccountabilityOverviewStore {
  getSnapshot: () => number;
  getServerSnapshot: () => number;
  subscribe: (listener: () => void) => () => void;
}

export function createAccountabilityStore(date: string): AccountabilityStore {
  const key = accountabilityKey(date);
  const listeners = new Set<() => void>();
  const serverSnapshot = emptyDay(date);
  let cachedRaw: string | null | undefined;
  let cachedDay = serverSnapshot;

  function getSnapshot(): AccountabilityDay {
    const raw = window.localStorage.getItem(key);
    if (raw === cachedRaw) return cachedDay;

    cachedRaw = raw;
    cachedDay = parseAccountabilityDay(raw, date);
    return cachedDay;
  }

  function notifyListeners() {
    cachedRaw = undefined;
    listeners.forEach((listener) => listener());
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) notifyListeners();
  }

  function handleAccountabilityChanged(event: Event) {
    const changedDate = (event as CustomEvent<string>).detail;
    if (changedDate === date) notifyListeners();
  }

  function writeLocalDay(day: AccountabilityDay) {
    writeAccountabilityDay(day);
    cachedRaw = undefined;
  }

  return {
    getSnapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        ACCOUNTABILITY_CHANGED_EVENT,
        handleAccountabilityChanged
      );

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", handleStorage);
          window.removeEventListener(
            ACCOUNTABILITY_CHANGED_EVENT,
            handleAccountabilityChanged
          );
        }
      };
    },
    activate(now = new Date()) {
      if (date > todayDateString(now)) return;

      const day = getSnapshot();
      if (day.activatedAt !== null) return;

      writeLocalDay({
        ...day,
        activatedAt: now.toISOString(),
      });
    },
    reconcile(sessions, now = new Date()) {
      if (date > todayDateString(now)) return;

      const day = getSnapshot();
      if (day.activatedAt === null) return;

      const violations = reconcileCurrentViolations(day, sessions, now);
      if (violationsEqual(day.violations, violations)) return;

      writeLocalDay({
        ...day,
        violations,
      });
    },
    recordDistraction(session, now = new Date()) {
      if (session.date !== date || date !== todayDateString(now)) return;

      const day = getSnapshot();
      const activeDay =
        day.activatedAt === null
          ? { ...day, activatedAt: now.toISOString() }
          : day;
      const violation = preserveViolationState(
        createDistractionViolation(session, now),
        activeDay.violations
      );
      const violations = sortViolations([
        ...activeDay.violations.filter(({ id }) => id !== violation.id),
        violation,
      ]);
      if (violationsEqual(activeDay.violations, violations)) return;

      writeLocalDay({
        ...activeDay,
        violations,
      });
    },
    removeDistraction(sessionType) {
      const day = getSnapshot();
      const id = getAccountabilityViolationId(
        date,
        sessionType,
        "distracted"
      );
      const violations = day.violations.filter(
        (violation) => violation.id !== id
      );
      if (violations.length === day.violations.length) return;

      writeLocalDay({ ...day, violations });
    },
    markCompleted(violationId, now = new Date()) {
      markViolationCompleted(date, violationId, now);
    },
  };
}

export function createAccountabilityHistoryStore(
  today: string
): AccountabilityHistoryStore {
  const listeners = new Set<() => void>();
  const serverSnapshot: AccountabilityDay[] = [];
  let cachedSignature: string | undefined;
  let cachedDays = serverSnapshot;

  function getSnapshot(): AccountabilityDay[] {
    const entries: Array<{ date: string; raw: string }> = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(ACCOUNTABILITY_STORAGE_KEY_PREFIX)) continue;

      const date = key.slice(ACCOUNTABILITY_STORAGE_KEY_PREFIX.length);
      if (!isCalendarDate(date) || date >= today) continue;

      const raw = window.localStorage.getItem(key);
      if (raw !== null) entries.push({ date, raw });
    }

    entries.sort((left, right) => right.date.localeCompare(left.date));
    const signature = entries
      .map(({ date, raw }) => `${date}\u0000${raw}`)
      .join("\u0001");
    if (signature === cachedSignature) return cachedDays;

    cachedSignature = signature;
    cachedDays = entries.flatMap(({ date, raw }) => {
      const day = parseAccountabilityDay(raw, date);
      return day.violations.length > 0 ? [day] : [];
    });
    return cachedDays;
  }

  function notifyListeners() {
    cachedSignature = undefined;
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      const handleStorage = (event: StorageEvent) => {
        if (
          event.key === null ||
          event.key.startsWith(ACCOUNTABILITY_STORAGE_KEY_PREFIX)
        ) {
          notifyListeners();
        }
      };
      const handleAccountabilityChanged = () => notifyListeners();
      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        ACCOUNTABILITY_CHANGED_EVENT,
        handleAccountabilityChanged
      );

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", handleStorage);
          window.removeEventListener(
            ACCOUNTABILITY_CHANGED_EVENT,
            handleAccountabilityChanged
          );
        }
      };
    },
  };
}

export function createAccountabilityOverviewStore(): AccountabilityOverviewStore {
  const listeners = new Set<() => void>();
  let cachedSignature: string | undefined;
  let cachedPendingCount = 0;

  function getSnapshot(): number {
    const entries = getStoredAccountabilityEntries();
    const signature = entries
      .map(({ date, raw }) => `${date}\u0000${raw}`)
      .join("\u0001");
    if (signature === cachedSignature) return cachedPendingCount;

    cachedSignature = signature;
    cachedPendingCount = entries.reduce(
      (total, { date, raw }) =>
        total +
        parseAccountabilityDay(raw, date).violations.filter(
          ({ status }) => status === "pending"
        ).length,
      0
    );
    return cachedPendingCount;
  }

  function notifyListeners() {
    cachedSignature = undefined;
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot,
    getServerSnapshot: () => 0,
    subscribe(listener) {
      listeners.add(listener);
      const handleStorage = (event: StorageEvent) => {
        if (
          event.key === null ||
          event.key.startsWith(ACCOUNTABILITY_STORAGE_KEY_PREFIX)
        ) {
          notifyListeners();
        }
      };
      const handleAccountabilityChanged = () => notifyListeners();
      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        ACCOUNTABILITY_CHANGED_EVENT,
        handleAccountabilityChanged
      );

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", handleStorage);
          window.removeEventListener(
            ACCOUNTABILITY_CHANGED_EVENT,
            handleAccountabilityChanged
          );
        }
      };
    },
  };
}

export function getAccountabilityViolationId(
  date: string,
  sessionType: SessionType,
  type: AccountabilityViolationType
): string {
  return `${date}:${sessionType}:${type}`;
}

export function markAccountabilityCompleted(
  date: string,
  violationId: string,
  now = new Date()
) {
  markViolationCompleted(date, violationId, now);
}

function reconcileCurrentViolations(
  day: AccountabilityDay,
  sessions: Session[],
  now: Date
): AccountabilityViolation[] {
  const violations: AccountabilityViolation[] = [];

  sessions.forEach((session) => {
    if (session.date !== day.date) return;

    const lateByMinutes = calculateLateMinutes(session);
    if (lateByMinutes !== null && lateByMinutes > 0) {
      violations.push(
        preserveViolationState(
          createLateStartViolation(session, lateByMinutes, now),
          day.violations
        )
      );
    }

    if (session.distracted) {
      violations.push(
        preserveViolationState(
          createDistractionViolation(session, now),
          day.violations
        )
      );
    }

    if (session.status === "missed") {
      violations.push(
        preserveViolationState(
          createMissedSessionViolation(session, now),
          day.violations
        )
      );
    }
  });

  const detectedIds = new Set(violations.map(({ id }) => id));
  const completedHistory = day.violations.filter(
    ({ id, status }) => status === "completed" && !detectedIds.has(id)
  );
  return sortViolations([...violations, ...completedHistory]);
}

function createLateStartViolation(
  session: Session,
  lateByMinutes: number,
  now: Date
): AccountabilityViolation {
  const schedule = SESSION_SCHEDULE[session.sessionType];
  const difference = formatDifference(lateByMinutes);

  return createViolation(
    session,
    "started_late",
    [
      `Official Start: ${formatClockTime(schedule.plannedStart)}`,
      `Actual Start: ${formatTime(session.startedAt)}`,
      `Late By: ${difference}`,
    ].join("\n"),
    now
  );
}

function createDistractionViolation(
  session: Session,
  now: Date
): AccountabilityViolation {
  const reason = session.distractionReason?.trim();

  return createViolation(
    session,
    "distracted",
    reason
      ? `Distracted during session\nReason: ${reason}`
      : "Distracted during session",
    now
  );
}

function createMissedSessionViolation(
  session: Session,
  now: Date
): AccountabilityViolation {
  return createViolation(
    session,
    "missed_session",
    "Session status: Missed",
    now
  );
}

function preserveViolationState(
  violation: AccountabilityViolation,
  existingViolations: AccountabilityViolation[]
): AccountabilityViolation {
  const existing = existingViolations.find(({ id }) => id === violation.id);
  return existing
    ? {
        ...violation,
        status: existing.status,
        createdAt: existing.createdAt,
        completedAt: existing.completedAt,
      }
    : violation;
}

function createViolation(
  session: Session,
  type: AccountabilityViolationType,
  details: string,
  now: Date
): AccountabilityViolation {
  return {
    id: getAccountabilityViolationId(session.date, session.sessionType, type),
    date: session.date,
    sessionId: session.id,
    sessionType: session.sessionType,
    type,
    details,
    pageInstruction: "Write one full page about this violation.",
    status: "pending",
    createdAt: now.toISOString(),
    completedAt: null,
  };
}

function markViolationCompleted(
  date: string,
  violationId: string,
  now: Date
) {
  const day = readAccountabilityDay(date);
  let changed = false;
  const violations = day.violations.map((violation) => {
    if (violation.id !== violationId || violation.status === "completed") {
      return violation;
    }

    changed = true;
    return {
      ...violation,
      status: "completed" as const,
      completedAt: now.toISOString(),
    };
  });
  if (changed) writeAccountabilityDay({ ...day, violations });
}

function writeAccountabilityDay(day: AccountabilityDay) {
  window.localStorage.setItem(
    accountabilityKey(day.date),
    JSON.stringify({
      version: ACCOUNTABILITY_STORAGE_VERSION,
      activatedAt: day.activatedAt,
      violations: day.violations,
    } satisfies StoredAccountabilityDay)
  );
  window.dispatchEvent(
    new CustomEvent<string>(ACCOUNTABILITY_CHANGED_EVENT, {
      detail: day.date,
    })
  );
}

function readAccountabilityDay(date: string): AccountabilityDay {
  return parseAccountabilityDay(
    window.localStorage.getItem(accountabilityKey(date)),
    date
  );
}

function parseAccountabilityDay(
  raw: string | null,
  date: string
): AccountabilityDay {
  if (!raw) return emptyDay(date);

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      (parsed.version !== ACCOUNTABILITY_STORAGE_VERSION &&
        !LEGACY_ACCOUNTABILITY_STORAGE_VERSIONS.has(
          typeof parsed.version === "number" ? parsed.version : -1
        )) ||
      !Array.isArray(parsed.violations)
    ) {
      return emptyDay(date);
    }

    return {
      date,
      activatedAt:
        typeof parsed.activatedAt === "string" ? parsed.activatedAt : null,
      violations: sortViolations(
        deduplicateViolations(
          parsed.violations.flatMap((violation) =>
            normalizeViolation(violation, date)
          )
        )
      ),
    };
  } catch {
    return emptyDay(date);
  }
}

function normalizeViolation(
  value: unknown,
  date: string
): AccountabilityViolation[] {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.date !== date ||
    typeof value.sessionType !== "string" ||
    !SESSION_TYPE_SET.has(value.sessionType as SessionType) ||
    typeof value.type !== "string" ||
    typeof value.details !== "string" ||
    typeof value.pageInstruction !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return [];
  }

  const sessionType = value.sessionType as SessionType;
  const type = normalizeViolationType(value.type);
  if (type === null) return [];
  const status =
    value.status === "pending" || value.status === "completed"
      ? value.status
      : typeof value.pageCompleted === "boolean"
        ? value.pageCompleted
          ? "completed"
          : "pending"
        : null;
  if (status === null) return [];

  const legacyId = `${date}:${sessionType}:${value.type}`;
  if (
    value.id !== getAccountabilityViolationId(date, sessionType, type) &&
    value.id !== legacyId
  ) {
    return [];
  }

  return [{
    id: getAccountabilityViolationId(date, sessionType, type),
    date,
    sessionId:
      typeof value.sessionId === "string"
        ? value.sessionId
        : `${date}:${sessionType}`,
    sessionType,
    type,
    details: value.details,
    pageInstruction: "Write one full page about this violation.",
    status,
    createdAt: value.createdAt,
    completedAt:
      status === "completed"
        ? typeof value.completedAt === "string"
          ? value.completedAt
          : value.createdAt
        : null,
  }];
}

function normalizeViolationType(
  value: string
): AccountabilityViolationType | null {
  if (value === "late_start") return "started_late";
  return VIOLATION_TYPE_SET.has(value as AccountabilityViolationType)
    ? (value as AccountabilityViolationType)
    : null;
}

function sortViolations(
  violations: AccountabilityViolation[]
): AccountabilityViolation[] {
  return [...violations].sort((left, right) => {
    const sessionOrder =
      SESSION_TYPES.indexOf(left.sessionType) -
      SESSION_TYPES.indexOf(right.sessionType);
    if (sessionOrder !== 0) return sessionOrder;

    return (
      ACCOUNTABILITY_VIOLATION_TYPES.indexOf(left.type) -
      ACCOUNTABILITY_VIOLATION_TYPES.indexOf(right.type)
    );
  });
}

function deduplicateViolations(
  violations: AccountabilityViolation[]
): AccountabilityViolation[] {
  const unique = new Map<string, AccountabilityViolation>();

  violations.forEach((violation) => {
    const existing = unique.get(violation.id);
    if (!existing) {
      unique.set(violation.id, violation);
      return;
    }

    unique.set(violation.id, {
      ...violation,
      status:
        existing.status === "completed" || violation.status === "completed"
          ? "completed"
          : "pending",
      createdAt:
        existing.createdAt < violation.createdAt
          ? existing.createdAt
          : violation.createdAt,
      completedAt: existing.completedAt ?? violation.completedAt,
    });
  });

  return [...unique.values()];
}

function formatDifference(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h ${remainingMinutes}m`;
}

function formatClockTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function violationsEqual(
  left: AccountabilityViolation[],
  right: AccountabilityViolation[]
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function emptyDay(date: string): AccountabilityDay {
  return { date, activatedAt: null, violations: [] };
}

function accountabilityKey(date: string): string {
  return `${ACCOUNTABILITY_STORAGE_KEY_PREFIX}${date}`;
}

function getStoredAccountabilityEntries(): Array<{
  date: string;
  raw: string;
}> {
  const entries: Array<{ date: string; raw: string }> = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(ACCOUNTABILITY_STORAGE_KEY_PREFIX)) continue;

    const date = key.slice(ACCOUNTABILITY_STORAGE_KEY_PREFIX.length);
    const raw = window.localStorage.getItem(key);
    if (isCalendarDate(date) && raw !== null) entries.push({ date, raw });
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
