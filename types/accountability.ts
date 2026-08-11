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
  distracted: "Got Distracted",
  missed_session: "Missed Session",
} satisfies Record<AccountabilityViolationType, string>;

export interface AccountabilityViolation {
  id: string;
  date: string;
  sessionType: SessionType;
  type: AccountabilityViolationType;
  details: string;
  pageInstruction: string;
  pageCompleted: boolean;
  createdAt: string;
}

export interface AccountabilityDay {
  date: string;
  activatedAt: string | null;
  violations: AccountabilityViolation[];
}
