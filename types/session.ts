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

export type SessionTaskStatus = "pending" | "running" | "completed";

export type StartTimeRule = "respected" | "broken" | "pending";

export type DistractionRule = "respected" | "broken" | "pending";

export interface SessionTask {
  id: string;
  title: string;
  status: SessionTaskStatus;
  /** ISO 8601 string of actual task start time */
  startedAt: string | null;
  /** ISO 8601 string of actual task finish time */
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    label: "Skill Mastery",
    plannedStart: "09:00",
    plannedFinish: "13:00",
  },
  client_acquisition: {
    label: "Client Acquisition",
    plannedStart: "14:00",
    plannedFinish: "17:00",
  },
  execution: {
    label: "Execution",
    plannedStart: "18:00",
    plannedFinish: "21:00",
  },
} satisfies Record<
  SessionType,
  { label: string; plannedStart: string; plannedFinish: string }
>;
