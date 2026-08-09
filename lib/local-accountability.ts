import {
  getSessionLabel,
  getSessionTimeline,
  hasSessionWindowEnded,
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
  SESSION_TYPES,
} from "@/types/session";

const ACCOUNTABILITY_STORAGE_KEY_PREFIX =
  "work-session-tracker:accountability:";
const ACCOUNTABILITY_STORAGE_VERSION = 1;
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
  setPageCompleted: (violationId: string, completed: boolean) => void;
}

export interface AccountabilityHistoryStore {
  getSnapshot: () => AccountabilityDay[];
  getServerSnapshot: () => AccountabilityDay[];
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
      if (date !== todayDateString(now)) return;

      const day = getSnapshot();
      if (day.activatedAt !== null) return;

      writeLocalDay({
        ...day,
        activatedAt: now.toISOString(),
      });
    },
    reconcile(sessions, now = new Date()) {
      if (date !== todayDateString(now)) return;

      const day = getSnapshot();
      if (day.activatedAt === null) return;

      const additions = buildCurrentViolations(day, sessions, now);
      if (additions.length === 0) return;

      writeLocalDay({
        ...day,
        violations: sortViolations([...day.violations, ...additions]),
      });
    },
    recordDistraction(session, now = new Date()) {
      if (session.date !== date || date !== todayDateString(now)) return;

      const day = getSnapshot();
      const activeDay =
        day.activatedAt === null
          ? { ...day, activatedAt: now.toISOString() }
          : day;
      const violation = createViolation(
        session,
        "distracted",
        "Got distracted during session",
        `I allowed myself to get distracted during ${getSessionLabel(
          session.sessionType
        )}.`,
        now
      );
      if (activeDay.violations.some(({ id }) => id === violation.id)) return;

      writeLocalDay({
        ...activeDay,
        violations: sortViolations([...activeDay.violations, violation]),
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
    setPageCompleted(violationId, completed) {
      updateViolationCompletion(date, violationId, completed);
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

export function getAccountabilityViolationId(
  date: string,
  sessionType: SessionType,
  type: AccountabilityViolationType
): string {
  return `${date}:${sessionType}:${type}`;
}

export function setAccountabilityPageCompleted(
  date: string,
  violationId: string,
  completed: boolean
) {
  updateViolationCompletion(date, violationId, completed);
}

function buildCurrentViolations(
  day: AccountabilityDay,
  sessions: Session[],
  now: Date
): AccountabilityViolation[] {
  const additions: AccountabilityViolation[] = [];
  const knownIds = new Set(day.violations.map(({ id }) => id));

  function add(violation: AccountabilityViolation) {
    if (knownIds.has(violation.id)) return;
    knownIds.add(violation.id);
    additions.push(violation);
  }

  sessions.forEach((session) => {
    if (session.date !== day.date) return;

    const timeline = getSessionTimeline(session);
    if (
      timeline.startDifferenceMinutes !== null &&
      timeline.startDifferenceMinutes > 0
    ) {
      add(
        createViolation(
          session,
          "late_start",
          `Started ${formatDifference(
            timeline.startDifferenceMinutes
          )} late`,
          `I started my ${getSessionLabel(session.sessionType)} session late.`,
          now
        )
      );
    }

    if (
      session.status === "completed" &&
      timeline.finishDifferenceMinutes !== null &&
      timeline.finishDifferenceMinutes < 0
    ) {
      add(
        createViolation(
          session,
          "finished_early",
          `Finished ${formatDifference(
            Math.abs(timeline.finishDifferenceMinutes)
          )} early`,
          `I finished my ${getSessionLabel(
            session.sessionType
          )} session before the planned end.`,
          now
        )
      );
    }

    if (session.distracted) {
      add(
        createViolation(
          session,
          "distracted",
          "Got distracted during session",
          `I allowed myself to get distracted during ${getSessionLabel(
            session.sessionType
          )}.`,
          now
        )
      );
    }

    if (!hasSessionWindowEnded(session, now)) return;

    const missedId = getAccountabilityViolationId(
      day.date,
      session.sessionType,
      "missed_session"
    );
    const incompleteId = getAccountabilityViolationId(
      day.date,
      session.sessionType,
      "incomplete_session"
    );
    if (knownIds.has(missedId) || knownIds.has(incompleteId)) return;

    if (session.status === "not_started" || session.status === "skipped") {
      add(
        createViolation(
          session,
          "missed_session",
          "Session not started",
          `I did not complete my ${getSessionLabel(
            session.sessionType
          )} session today.`,
          now
        )
      );
    } else if (session.status === "in_progress") {
      add(
        createViolation(
          session,
          "incomplete_session",
          "Session started but not completed",
          `I did not complete my ${getSessionLabel(
            session.sessionType
          )} session properly.`,
          now
        )
      );
    }
  });

  return additions;
}

function createViolation(
  session: Session,
  type: AccountabilityViolationType,
  details: string,
  pageInstruction: string,
  now: Date
): AccountabilityViolation {
  return {
    id: getAccountabilityViolationId(session.date, session.sessionType, type),
    date: session.date,
    sessionType: session.sessionType,
    type,
    details,
    pageInstruction,
    pageCompleted: false,
    createdAt: now.toISOString(),
  };
}

function updateViolationCompletion(
  date: string,
  violationId: string,
  completed: boolean
) {
  const day = readAccountabilityDay(date);
  let changed = false;
  const violations = day.violations.map((violation) => {
    if (
      violation.id !== violationId ||
      violation.pageCompleted === completed
    ) {
      return violation;
    }

    changed = true;
    return { ...violation, pageCompleted: completed };
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
      parsed.version !== ACCOUNTABILITY_STORAGE_VERSION ||
      !Array.isArray(parsed.violations)
    ) {
      return emptyDay(date);
    }

    return {
      date,
      activatedAt:
        typeof parsed.activatedAt === "string" ? parsed.activatedAt : null,
      violations: sortViolations(
        parsed.violations.flatMap((violation) =>
          normalizeViolation(violation, date)
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
    !VIOLATION_TYPE_SET.has(value.type as AccountabilityViolationType) ||
    typeof value.details !== "string" ||
    typeof value.pageInstruction !== "string" ||
    typeof value.pageCompleted !== "boolean" ||
    typeof value.createdAt !== "string"
  ) {
    return [];
  }

  const sessionType = value.sessionType as SessionType;
  const type = value.type as AccountabilityViolationType;
  if (value.id !== getAccountabilityViolationId(date, sessionType, type)) {
    return [];
  }

  return [{
    id: value.id,
    date,
    sessionType,
    type,
    details: value.details,
    pageInstruction: value.pageInstruction,
    pageCompleted: value.pageCompleted,
    createdAt: value.createdAt,
  }];
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

function formatDifference(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h ${remainingMinutes}m`;
}

function emptyDay(date: string): AccountabilityDay {
  return { date, activatedAt: null, violations: [] };
}

function accountabilityKey(date: string): string {
  return `${ACCOUNTABILITY_STORAGE_KEY_PREFIX}${date}`;
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
