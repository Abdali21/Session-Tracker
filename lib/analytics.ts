import { getSessionTaskDurationBreakdown } from "@/lib/session";
import type { HistoryDay } from "@/lib/local-sessions";
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  getTaskDisplayName,
  isSelectableTaskCategory,
  type SelectableTaskCategory,
} from "@/types/session";

export type TaskAnalyticsPeriod = "today" | "last_7";

export interface TaskDeepWork {
  key: string;
  date: string;
  title: string;
  category: SelectableTaskCategory;
  categoryLabel: string;
  seconds: number;
}

export interface PriorityDeepWork {
  category: SelectableTaskCategory;
  label: string;
  seconds: number;
}

export interface DeepWorkSummary {
  totalSeconds: number;
  tasks: TaskDeepWork[];
  priorities: PriorityDeepWork[];
}

export interface DailyDeepWork {
  date: string;
  seconds: number;
}

/** Calculates only actual task-timer time. Session and estimated durations are ignored. */
export function calculateDeepWorkSummary(
  days: HistoryDay[],
  timestamp = new Date()
): DeepWorkSummary {
  let totalSeconds = 0;
  const tasks: TaskDeepWork[] = [];
  const secondsByPriority = Object.fromEntries(
    TASK_CATEGORIES.map((category) => [category, 0])
  ) as Record<SelectableTaskCategory, number>;

  days.forEach(({ date, sessions }) => {
    sessions.forEach((session) => {
      getSessionTaskDurationBreakdown(session, timestamp).forEach(
        ({ task, seconds }) => {
          if (seconds <= 0) return;
          totalSeconds += seconds;
          if (!isSelectableTaskCategory(task.category)) return;

          secondsByPriority[task.category] += seconds;
          tasks.push({
            key: `${date}:${session.id}:${task.id}`,
            date,
            title: getTaskDisplayName(task),
            category: task.category,
            categoryLabel: TASK_CATEGORY_LABELS[task.category],
            seconds,
          });
        }
      );
    });
  });

  return {
    totalSeconds,
    tasks: tasks.sort((left, right) => right.seconds - left.seconds),
    priorities: TASK_CATEGORIES.map((category) => ({
      category,
      label: TASK_CATEGORY_LABELS[category],
      seconds: secondsByPriority[category],
    })),
  };
}

/** Combines repeated task names within the same priority for multi-day views. */
export function aggregateDeepWorkTasks(
  tasks: TaskDeepWork[]
): TaskDeepWork[] {
  const totals = new Map<string, TaskDeepWork>();

  tasks.forEach((task) => {
    const normalizedTitle = task.title.trim().toLocaleLowerCase();
    const key = `${task.category}:${normalizedTitle}`;
    const current = totals.get(key);
    totals.set(
      key,
      current
        ? { ...current, seconds: current.seconds + task.seconds }
        : { ...task, key }
    );
  });

  return [...totals.values()].sort(
    (left, right) => right.seconds - left.seconds
  );
}

export function calculateDailyDeepWork(
  days: HistoryDay[],
  dates: readonly string[],
  timestamp = new Date()
): DailyDeepWork[] {
  const daysByDate = new Map(days.map((day) => [day.date, day]));
  return dates.map((date) => ({
    date,
    seconds: calculateDeepWorkSummary(
      daysByDate.has(date) ? [daysByDate.get(date)!] : [],
      timestamp
    ).totalSeconds,
  }));
}

export function selectAnalyticsDays(
  days: HistoryDay[],
  dates: readonly string[]
): HistoryDay[] {
  const selectedDates = new Set(dates);
  return days.filter((day) => selectedDates.has(day.date));
}

export function formatAnalyticsDuration(totalSeconds: number): string {
  const safeMinutes = Math.max(0, Math.round(totalSeconds / 60));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}
