import {
  calculateDeepWorkDuration,
  calculateLateMinutes,
  getTrackedTaskTime,
} from "@/lib/session";
import { SESSION_TYPES, type Session } from "@/types/session";

export interface DailyExecutionMetrics {
  deepWorkMinutes: number;
  completedSessions: number;
  missedSessions: number;
  lateSessions: number;
  totalLateMinutes: number;
  distractedSessions: number;
  completedTasks: number;
  trackedTaskTimeSeconds: number;
}

export type ExecutionVerdict =
  | "better_than_yesterday"
  | "worse_than_yesterday"
  | "same_as_yesterday"
  | "day_in_progress"
  | "no_yesterday_data";

export interface ExecutionComparison {
  verdict: ExecutionVerdict;
  todayViolations: number;
  yesterdayViolations: number | null;
}

export interface ExecutionInsight {
  area: "Attendance" | "Focus" | "Punctuality" | "Deep Work";
  detail: string;
}

export function getDailyExecutionMetrics(
  sessions: Session[],
  timestamp = new Date()
): DailyExecutionMetrics {
  return sessions.reduce<DailyExecutionMetrics>(
    (metrics, session) => {
      const lateMinutes = calculateLateMinutes(session) ?? 0;

      metrics.deepWorkMinutes +=
        calculateDeepWorkDuration(session, timestamp) ?? 0;
      metrics.completedSessions += session.status === "completed" ? 1 : 0;
      metrics.missedSessions +=
        session.status === "missed" || session.status === "skipped" ? 1 : 0;
      metrics.lateSessions += lateMinutes > 0 ? 1 : 0;
      metrics.totalLateMinutes += lateMinutes;
      metrics.distractedSessions += session.distracted === true ? 1 : 0;
      metrics.completedTasks += session.tasks.filter(
        (task) => task.status === "completed"
      ).length;
      metrics.trackedTaskTimeSeconds += getTrackedTaskTime(
        session,
        timestamp
      );

      return metrics;
    },
    {
      deepWorkMinutes: 0,
      completedSessions: 0,
      missedSessions: 0,
      lateSessions: 0,
      totalLateMinutes: 0,
      distractedSessions: 0,
      completedTasks: 0,
      trackedTaskTimeSeconds: 0,
    }
  );
}

export function getViolationCount(metrics: DailyExecutionMetrics): number {
  return (
    metrics.missedSessions +
    metrics.lateSessions +
    metrics.distractedSessions
  );
}

export function isDailyExecutionFinal(sessions: Session[]): boolean {
  return (
    sessions.length === SESSION_TYPES.length &&
    sessions.every((session) => {
      if (session.status === "missed") return true;
      if (session.status !== "completed") return false;

      return session.startedAt !== null && session.distracted !== null;
    })
  );
}

export function compareExecutionDays(
  todaySessions: Session[],
  today: DailyExecutionMetrics,
  yesterday: DailyExecutionMetrics | null
): ExecutionComparison {
  const todayViolations = getViolationCount(today);
  const yesterdayViolations =
    yesterday === null ? null : getViolationCount(yesterday);

  if (!isDailyExecutionFinal(todaySessions)) {
    return {
      verdict: "day_in_progress",
      todayViolations,
      yesterdayViolations,
    };
  }

  if (yesterday === null || yesterdayViolations === null) {
    return {
      verdict: "no_yesterday_data",
      todayViolations,
      yesterdayViolations: null,
    };
  }

  if (todayViolations < yesterdayViolations) {
    return {
      verdict: "better_than_yesterday",
      todayViolations,
      yesterdayViolations,
    };
  }

  if (todayViolations > yesterdayViolations) {
    return {
      verdict: "worse_than_yesterday",
      todayViolations,
      yesterdayViolations,
    };
  }

  const verdict =
    today.deepWorkMinutes > yesterday.deepWorkMinutes
      ? "better_than_yesterday"
      : today.deepWorkMinutes < yesterday.deepWorkMinutes
        ? "worse_than_yesterday"
        : "same_as_yesterday";

  return { verdict, todayViolations, yesterdayViolations };
}

export function getImprovedAreas(
  today: DailyExecutionMetrics,
  yesterday: DailyExecutionMetrics | null
): ExecutionInsight[] {
  if (yesterday === null) return [];

  const improved: ExecutionInsight[] = [];
  if (today.missedSessions < yesterday.missedSessions) {
    improved.push({
      area: "Attendance",
      detail:
        today.missedSessions === 0
          ? "No missed sessions today."
          : `Missed sessions decreased from ${yesterday.missedSessions} to ${today.missedSessions}.`,
    });
  }

  if (today.distractedSessions < yesterday.distractedSessions) {
    improved.push({
      area: "Focus",
      detail:
        today.distractedSessions === 0
          ? "No distraction recorded today."
          : `Distracted sessions decreased from ${yesterday.distractedSessions} to ${today.distractedSessions}.`,
    });
  }

  if (today.lateSessions < yesterday.lateSessions) {
    improved.push({
      area: "Punctuality",
      detail:
        today.lateSessions === 0
          ? "Every attended session started on time."
          : `Late starts decreased from ${yesterday.lateSessions} to ${today.lateSessions}.`,
    });
  }

  if (today.deepWorkMinutes > yesterday.deepWorkMinutes) {
    improved.push({
      area: "Deep Work",
      detail: `Deep Work increased by ${formatDeepWork(
        today.deepWorkMinutes - yesterday.deepWorkMinutes
      )}.`,
    });
  }

  return improved;
}

export function getNeedsFocusAreas(
  today: DailyExecutionMetrics,
  yesterday: DailyExecutionMetrics | null
): ExecutionInsight[] {
  const needsFocus: ExecutionInsight[] = [];

  if (today.missedSessions > 0) {
    needsFocus.push({
      area: "Attendance",
      detail: `${today.missedSessions} ${
        today.missedSessions === 1 ? "session was" : "sessions were"
      } missed.`,
    });
  }

  if (today.distractedSessions > 0) {
    needsFocus.push({
      area: "Focus",
      detail: `${today.distractedSessions} ${
        today.distractedSessions === 1 ? "session had" : "sessions had"
      } distraction today.`,
    });
  }

  if (today.lateSessions > 0) {
    needsFocus.push({
      area: "Punctuality",
      detail: `${today.lateSessions} of 3 ${
        today.lateSessions === 1 ? "session started" : "sessions started"
      } late.`,
    });
  }

  if (
    yesterday !== null &&
    today.deepWorkMinutes < yesterday.deepWorkMinutes
  ) {
    needsFocus.push({
      area: "Deep Work",
      detail: `${formatDeepWork(
        yesterday.deepWorkMinutes - today.deepWorkMinutes
      )} lower than yesterday.`,
    });
  }

  return needsFocus;
}

export function formatDeepWork(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
}
