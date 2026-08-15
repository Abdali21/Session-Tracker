import {
  TODAY_GOAL_PRIORITIES,
  type TodayGoal,
  type TodayGoalPriority,
} from "@/types/today-goal";

const STORAGE_KEY_PREFIX = "work-session-tracker:today-goal:";
const STORAGE_VERSION = 1;
const TODAY_GOAL_CHANGED_EVENT = "work-session-tracker:today-goal-changed";
const PRIORITY_VALUES = new Set<TodayGoalPriority>(TODAY_GOAL_PRIORITIES);

export interface TodayGoalStore {
  getSnapshot: () => TodayGoal | null;
  getServerSnapshot: () => TodayGoal | null;
  subscribe: (listener: () => void) => () => void;
  save: (
    goal: Pick<TodayGoal, "outcome" | "priority">,
    timestamp?: Date
  ) => void;
}

interface StoredTodayGoal extends TodayGoal {
  version: typeof STORAGE_VERSION;
}

export function createTodayGoalStore(date: string): TodayGoalStore {
  const key = `${STORAGE_KEY_PREFIX}${date}`;
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedGoal: TodayGoal | null = null;

  function getSnapshot(): TodayGoal | null {
    const raw = window.localStorage.getItem(key);
    if (raw === cachedRaw) return cachedGoal;
    cachedRaw = raw;
    cachedGoal = parseTodayGoal(raw);
    return cachedGoal;
  }

  function emitChange() {
    listeners.forEach((listener) => listener());
  }

  function refresh() {
    cachedRaw = undefined;
    emitChange();
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) refresh();
  }

  return {
    getSnapshot,
    getServerSnapshot: () => null,
    subscribe(listener) {
      listeners.add(listener);
      window.addEventListener("storage", handleStorage);
      window.addEventListener(TODAY_GOAL_CHANGED_EVENT, refresh);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", handleStorage);
          window.removeEventListener(TODAY_GOAL_CHANGED_EVENT, refresh);
        }
      };
    },
    save(goal, timestamp = new Date()) {
      const outcome = goal.outcome.trim();
      if (!outcome || !PRIORITY_VALUES.has(goal.priority)) return;
      const stored = {
        version: STORAGE_VERSION,
        outcome,
        priority: goal.priority,
        updatedAt: timestamp.toISOString(),
      } satisfies StoredTodayGoal;
      const raw = JSON.stringify(stored);
      window.localStorage.setItem(key, raw);
      cachedRaw = raw;
      cachedGoal = {
        outcome: stored.outcome,
        priority: stored.priority,
        updatedAt: stored.updatedAt,
      };
      window.dispatchEvent(new Event(TODAY_GOAL_CHANGED_EVENT));
    },
  };
}

export function parseTodayGoal(raw: string | null): TodayGoal | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== STORAGE_VERSION ||
      typeof value.outcome !== "string" ||
      !value.outcome.trim() ||
      !PRIORITY_VALUES.has(value.priority as TodayGoalPriority) ||
      typeof value.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(value.updatedAt))
    ) {
      return null;
    }
    return {
      outcome: value.outcome.trim(),
      priority: value.priority as TodayGoalPriority,
      updatedAt: new Date(value.updatedAt).toISOString(),
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
