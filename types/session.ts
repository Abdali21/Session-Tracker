/**
 * Domain types and schedule metadata for Work Session Tracker.
 */

export const SESSION_TYPES = [
  "skill_mastery",
  "client_acquisition",
  "execution",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

export type SessionStatus =
  | "upcoming"
  | "running"
  | "completed"
  | "missed"
  | "skipped";

export const SESSION_STATUS_LABELS = {
  upcoming: "Upcoming",
  running: "Running",
  completed: "Completed",
  missed: "Missed",
  skipped: "Skipped",
} satisfies Record<SessionStatus, string>;

export type SessionTaskStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed";

export const TASK_CATEGORIES = [
  "creative_mastery",
  "client_execution",
  "client_acquisition",
] as const;

export type SelectableTaskCategory = (typeof TASK_CATEGORIES)[number];

/** Stored values retained so older task records remain readable. */
export const LEGACY_TASK_CATEGORIES = [
  "business_operations",
  "low_value_misc",
] as const;

export type LegacyTaskCategory = (typeof LEGACY_TASK_CATEGORIES)[number];
export type TaskCategory = SelectableTaskCategory | LegacyTaskCategory;

export const TASK_CATEGORY_LABELS = {
  creative_mastery: "Creative Mastery",
  client_execution: "Client Execution",
  client_acquisition: "Client Acquisition",
} satisfies Record<SelectableTaskCategory, string>;

export function isSelectableTaskCategory(
  value: TaskCategory | string
): value is SelectableTaskCategory {
  return TASK_CATEGORIES.includes(value as SelectableTaskCategory);
}

export function getTaskCategoryLabel(category: TaskCategory): string {
  return isSelectableTaskCategory(category)
    ? TASK_CATEGORY_LABELS[category]
    : "Uncategorized";
}

export const DEFAULT_TASK_CATEGORY: SelectableTaskCategory = "creative_mastery";

export interface SessionTaskWorkInterval {
  /** ISO 8601 timestamp for the beginning of this focused work period. */
  startedAt: string;
  /** Null only while this task is the session's active task. */
  endedAt: string | null;
}

export type StartTimeRule = "respected" | "broken" | "pending";

export type DistractionRule = "respected" | "broken" | "pending";

export interface SessionTask {
  id: string;
  title: string;
  /** The result this task is intended to produce. Null for legacy tasks. */
  outcome: string | null;
  /** The immediate action to take after starting. Null when not specified. */
  firstAction: string | null;
  /** Workstream used for time-allocation analytics. */
  category: TaskCategory;
  /** Planned task duration in whole minutes. Null when it was not estimated. */
  expectedDurationMinutes: number | null;
  status: SessionTaskStatus;
  /** ISO 8601 string of actual task start time */
  startedAt: string | null;
  /** ISO 8601 string of actual task finish time */
  finishedAt: string | null;
  /** Focused work periods. This is the source of truth for task duration. */
  workIntervals: SessionTaskWorkInterval[];
  createdAt: string;
  updatedAt: string;
}

/** Outcome is the user-facing task name; title remains as a legacy fallback. */
export function getTaskDisplayName(
  task: Pick<SessionTask, "outcome" | "title">
): string {
  return task.outcome?.trim() || task.title;
}

export interface Session {
  id: string;
  sessionType: SessionType;
  /** ISO 8601 string of actual start time */
  startedAt: string | null;
  /** ISO 8601 string of actual finish time */
  finishedAt: string | null;
  /** Legacy projected finish value retained for stored-record compatibility. */
  finishTarget: string | null;
  /** Null until the user explicitly answers the distraction question. */
  distracted: boolean | null;
  distractionReason: string | null;
  status: SessionStatus;
  tasks: SessionTask[];
  /** Calendar date this session belongs to, e.g. "2026-08-09" */
  date: string;
}

export const SESSION_SCHEDULE = {
  skill_mastery: {
    label: "Session 1",
    plannedStart: "09:00",
    plannedFinish: "13:00",
  },
  client_acquisition: {
    label: "Session 2",
    plannedStart: "14:00",
    plannedFinish: "17:00",
  },
  execution: {
    label: "Session 3",
    plannedStart: "18:00",
    plannedFinish: "21:00",
  },
} satisfies Record<
  SessionType,
  { label: string; plannedStart: string; plannedFinish: string }
>;
