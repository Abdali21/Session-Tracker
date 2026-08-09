import type { SessionType } from "@/types/session";

export const ACCOUNTABILITY_VIOLATION_TYPES = [
  "late_start",
  "finished_early",
  "missed_session",
  "incomplete_session",
  "distracted",
] as const;

export type AccountabilityViolationType =
  (typeof ACCOUNTABILITY_VIOLATION_TYPES)[number];

export const ACCOUNTABILITY_VIOLATION_LABELS = {
  late_start: "Late Start",
  finished_early: "Finished Early",
  missed_session: "Missed Session",
  incomplete_session: "Incomplete Session",
  distracted: "Distracted",
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
