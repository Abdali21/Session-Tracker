import type { SessionType } from "@/types/session";

export const ACCOUNTABILITY_VIOLATION_TYPES = [
  "started_late",
  "distracted",
  "missed_session",
] as const;

export type AccountabilityViolationType =
  (typeof ACCOUNTABILITY_VIOLATION_TYPES)[number];

export const ACCOUNTABILITY_VIOLATION_LABELS = {
  started_late: "Started Late",
  distracted: "Distracted",
  missed_session: "Missed Session",
} satisfies Record<AccountabilityViolationType, string>;

export type AccountabilityStatus = "pending" | "completed";

export interface AccountabilityViolation {
  id: string;
  date: string;
  sessionId: string;
  sessionType: SessionType;
  type: AccountabilityViolationType;
  details: string;
  pageInstruction: string;
  status: AccountabilityStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface AccountabilityDay {
  date: string;
  activatedAt: string | null;
  violations: AccountabilityViolation[];
}
