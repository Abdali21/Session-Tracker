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
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped";

export const SESSION_STATUS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
} satisfies Record<SessionStatus, string>;

export interface SessionTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  sessionType: SessionType;
  /** ISO 8601 string of actual start time */
  startedAt: string | null;
  /** ISO 8601 string of actual finish time */
  finishedAt: string | null;
  /** Projected finish clock time in HH:mm format while in progress */
  finishTarget: string | null;
  distracted: boolean;
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
