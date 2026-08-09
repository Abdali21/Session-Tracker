import { getSessionTimeline } from "@/lib/session";
import type { Session } from "@/types/session";

const DEEP_WORK_TARGET_MINUTES = 6 * 60;
const DAILY_SESSION_COUNT = 3;

export interface DailyReportMetrics {
  deepWorkMinutes: number;
  completedTasks: number;
  totalTasks: number;
  completedSessions: number;
  respectedSessions: number;
  normalized: {
    deepWork: number;
    tasks: number;
    sessions: number;
    timeDiscipline: number;
  };
}

export function getDailyReportMetrics(
  sessions: Session[],
  deepWorkMinutes: number
): DailyReportMetrics {
  const safeDeepWorkMinutes = Math.max(0, deepWorkMinutes);
  const tasks = sessions.flatMap((session) => session.tasks);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const completedSessions = sessions.filter(
    (session) => session.status === "completed"
  ).length;
  const respectedSessions = sessions.filter(
    (session) => getSessionTimeline(session).result.tone === "success"
  ).length;

  return {
    deepWorkMinutes: safeDeepWorkMinutes,
    completedTasks,
    totalTasks: tasks.length,
    completedSessions,
    respectedSessions,
    normalized: {
      deepWork: normalize(safeDeepWorkMinutes, DEEP_WORK_TARGET_MINUTES),
      tasks: tasks.length === 0 ? 0 : normalize(completedTasks, tasks.length),
      sessions: normalize(completedSessions, DAILY_SESSION_COUNT),
      timeDiscipline: normalize(respectedSessions, DAILY_SESSION_COUNT),
    },
  };
}

export function formatDeepWork(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
}

export function getDailyInterpretation(metrics: DailyReportMetrics): string {
  const {
    completedSessions,
    respectedSessions,
    completedTasks,
    totalTasks,
    deepWorkMinutes,
  } = metrics;

  if (
    completedSessions === 0 &&
    completedTasks === 0 &&
    deepWorkMinutes === 0
  ) {
    return "No completed work is recorded yet. Add your Focus To-Do time as the day develops.";
  }

  let sessionSummary: string;
  if (completedSessions === DAILY_SESSION_COUNT) {
    sessionSummary =
      respectedSessions === DAILY_SESSION_COUNT
        ? "All three sessions were completed and respected their planned time."
        : `All three sessions were completed, but ${formatCount(
            respectedSessions
          )} respected the planned time.`;
  } else if (completedSessions === 0) {
    sessionSummary = "No sessions have been completed yet.";
  } else {
    sessionSummary = `${formatCount(
      completedSessions
    )} completed; ${formatCount(
      respectedSessions
    )} respected the planned time.`;
  }

  let workSummary: string;
  const taskRate = totalTasks === 0 ? 0 : completedTasks / totalTasks;
  if (deepWorkMinutes >= DEEP_WORK_TARGET_MINUTES && taskRate >= 0.75) {
    workSummary = "Deep work reached its target and task completion was strong.";
  } else if (deepWorkMinutes >= DEEP_WORK_TARGET_MINUTES) {
    workSummary = "Deep work reached its six-hour target.";
  } else if (totalTasks === 0) {
    workSummary = "No tasks were recorded today.";
  } else if (taskRate >= 0.75) {
    workSummary = "Task completion was strong, while deep work remained below target.";
  } else {
    workSummary = "Deep work and task completion both remained below target.";
  }

  return `${sessionSummary} ${workSummary}`;
}

function normalize(value: number, target: number): number {
  return Math.min(100, Math.max(0, Math.round((value / target) * 100)));
}

function formatCount(value: number): string {
  const words = ["none", "one", "two", "three"];
  return words[value] ?? String(value);
}
