import { getDailyExecutionMetrics } from "@/lib/report";
import type { Session } from "@/types/session";

export const WEEKLY_DEEP_WORK_TARGET_MINUTES = 50 * 60;

export interface WeeklyGoalDay {
  date: string;
  sessions: Session[] | null;
}

export interface WeeklyGoalSummary {
  currentMinutes: number;
  remainingMinutes: number;
  progressPercent: number;
  dailyMinutes: Array<{ date: string; minutes: number | null }>;
}

export function getWeeklyGoalSummary(
  days: WeeklyGoalDay[],
  timestamp = new Date()
): WeeklyGoalSummary {
  const dailyMinutes = days.map(({ date, sessions }) => ({
    date,
    minutes:
      sessions === null
        ? null
        : getDailyExecutionMetrics(sessions, timestamp).deepWorkMinutes,
  }));
  const currentMinutes = dailyMinutes.reduce(
    (total, day) => total + (day.minutes ?? 0),
    0
  );

  return {
    currentMinutes,
    remainingMinutes: Math.max(
      0,
      WEEKLY_DEEP_WORK_TARGET_MINUTES - currentMinutes
    ),
    progressPercent: Math.min(
      100,
      Math.round((currentMinutes / WEEKLY_DEEP_WORK_TARGET_MINUTES) * 100)
    ),
    dailyMinutes,
  };
}
