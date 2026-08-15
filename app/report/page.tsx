"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  aggregateDeepWorkTasks,
  calculateDailyDeepWork,
  calculateDeepWorkSummary,
  formatAnalyticsDuration,
  selectAnalyticsDays,
  type PriorityDeepWork,
  type TaskAnalyticsPeriod,
  type TaskDeepWork,
} from "@/lib/analytics";
import {
  createDailySessionStore,
  createHistoryStore,
  type HistoryDay,
} from "@/lib/local-sessions";
import {
  WORK_SESSION_TIME_ZONE,
  addCalendarDays,
  casablancaWallTimeToDate,
  todayDateString,
} from "@/lib/session";
import { useSessionTiming } from "@/lib/use-session-timing";
import { cn } from "@/lib/utils";

const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: WORK_SESSION_TIME_ZONE,
});

export default function ReportPage() {
  const [anchorDate] = useState(todayDateString);
  const [taskPeriod, setTaskPeriod] =
    useState<TaskAnalyticsPeriod>("today");
  const todayStore = useMemo(
    () => createDailySessionStore(anchorDate),
    [anchorDate]
  );
  const historyStore = useMemo(
    () => createHistoryStore(anchorDate),
    [anchorDate]
  );
  const todaySessions = useSyncExternalStore(
    todayStore.subscribe,
    todayStore.getSnapshot,
    todayStore.getServerSnapshot
  );
  const historyDays = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot
  );
  const historicalSessions = useMemo(
    () => historyDays.flatMap((day) => day.sessions),
    [historyDays]
  );
  const timingNow = useSessionTiming(todayStore, todaySessions);
  useSessionTiming(historyStore, historicalSessions);

  const allDays = useMemo<HistoryDay[]>(
    () => [...historyDays, { date: anchorDate, sessions: todaySessions }],
    [anchorDate, historyDays, todaySessions]
  );
  const lastSevenDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addCalendarDays(anchorDate, index - 6)
      ),
    [anchorDate]
  );
  const timestamp = timingNow ?? new Date();
  const todaySummary = calculateDeepWorkSummary(
    selectAnalyticsDays(allDays, [anchorDate]),
    timestamp
  );
  const weekSummary = calculateDeepWorkSummary(
    selectAnalyticsDays(allDays, lastSevenDates),
    timestamp
  );
  const dailyDeepWork = calculateDailyDeepWork(
    allDays,
    lastSevenDates,
    timestamp
  );
  const selectedSummary = taskPeriod === "today" ? todaySummary : weekSummary;
  const displayedTasks =
    taskPeriod === "today"
      ? selectedSummary.tasks
      : aggregateDeepWorkTasks(selectedSummary.tasks);

  return (
    <AppShell activePage="report" compact fullWidth>
      <div className="space-y-6">
        <TopMetrics
          todaySeconds={todaySummary.totalSeconds}
          weekSeconds={weekSummary.totalSeconds}
        />

        <WeeklyDeepWorkChart
          days={dailyDeepWork}
          currentDate={anchorDate}
        />

        <TaskDeepWorkSection
          period={taskPeriod}
          onPeriodChange={setTaskPeriod}
          tasks={displayedTasks}
        />

        <PrioritySummary priorities={selectedSummary.priorities} />
      </div>
    </AppShell>
  );
}

function TopMetrics({
  todaySeconds,
  weekSeconds,
}: {
  todaySeconds: number;
  weekSeconds: number;
}) {
  return (
    <section className="grid grid-cols-2 gap-5" aria-label="Deep Work totals">
      <DeepWorkMetric
        icon={Clock3}
        label="Deep Work Today"
        seconds={todaySeconds}
      />
      <DeepWorkMetric
        icon={CalendarDays}
        label="Deep Work — Last 7 Days"
        seconds={weekSeconds}
      />
    </section>
  );
}

function DeepWorkMetric({
  icon: Icon,
  label,
  seconds,
}: {
  icon: typeof Clock3;
  label: string;
  seconds: number;
}) {
  return (
    <div className="border-y border-[#DDE1E9] bg-white px-7 py-6">
      <div className="flex items-center gap-2 text-brand-deep">
        <Icon className="size-[18px]" strokeWidth={1.9} />
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#727B8F]">
          {label}
        </p>
      </div>
      <p className="mt-4 text-[34px] font-bold leading-none tabular-nums text-[#202536]">
        {formatAnalyticsDuration(seconds)}
      </p>
    </div>
  );
}

function WeeklyDeepWorkChart({
  days,
  currentDate,
}: {
  days: Array<{ date: string; seconds: number }>;
  currentDate: string;
}) {
  const maxSeconds = Math.max(...days.map(({ seconds }) => seconds), 0);

  return (
    <section className="border-y border-[#DDE1E9] bg-white px-7 py-6">
      <SectionHeading
        title="Deep Work — Last 7 Days"
        description="Actual time accumulated while tasks were running"
      />
      {maxSeconds > 0 ? (
        <div className="mt-6 grid grid-cols-7 gap-4">
          {days.map((day) => {
            const isToday = day.date === currentDate;
            const height = (day.seconds / maxSeconds) * 100;
            return (
              <div key={day.date} className="min-w-0 text-center">
                <p className="h-5 text-[11px] font-bold tabular-nums text-[#60697C]">
                  {day.seconds > 0
                    ? formatAnalyticsDuration(day.seconds)
                    : "—"}
                </p>
                <div className="mt-2 flex h-40 items-end justify-center rounded-lg bg-[#F5F6F8] px-3">
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-[height] duration-300",
                      isToday ? "bg-brand-deep" : "bg-[#8E86C3]"
                    )}
                    style={{ height: `${height}%` }}
                    aria-label={`${formatDayLabel(day.date)}: ${formatAnalyticsDuration(day.seconds)}`}
                  />
                </div>
                <p
                  className={cn(
                    "mt-2 text-[11px] font-bold uppercase tracking-[0.06em]",
                    isToday ? "text-brand-deep" : "text-[#858E9F]"
                  )}
                >
                  {formatDayLabel(day.date)}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState text="No deep work tracked in the last 7 days." />
      )}
    </section>
  );
}

function TaskDeepWorkSection({
  period,
  onPeriodChange,
  tasks,
}: {
  period: TaskAnalyticsPeriod;
  onPeriodChange: (period: TaskAnalyticsPeriod) => void;
  tasks: TaskDeepWork[];
}) {
  const maxSeconds = Math.max(...tasks.map(({ seconds }) => seconds), 0);
  const title =
    period === "today"
      ? "Today's Deep Work by Task"
      : "Last 7 Days' Deep Work by Task";

  return (
    <section className="border-y border-[#DDE1E9] bg-white px-7 py-6">
      <div className="flex items-start justify-between gap-6">
        <SectionHeading
          title={title}
          description="Ranked by actual task-timer duration"
        />
        <div
          className="flex rounded-xl border border-[#DDE1E9] bg-[#F8F9FB] p-1"
          role="group"
          aria-label="Task analytics period"
        >
          {(["today", "last_7"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              aria-pressed={period === value}
              onClick={() => onPeriodChange(value)}
              className={cn(
                "h-8 rounded-lg px-4 text-[12px] font-bold shadow-none",
                period === value
                  ? "bg-brand-deep text-white hover:bg-brand-dark hover:text-white"
                  : "text-[#687184]"
              )}
            >
              {value === "today" ? "Today" : "Last 7 Days"}
            </Button>
          ))}
        </div>
      </div>

      {tasks.length > 0 ? (
        <ol className="mt-6 space-y-5">
          {tasks.map((task) => (
            <li key={task.key}>
              <div className="flex items-center justify-between gap-6">
                <div className="flex min-w-0 items-center gap-3">
                  <p className="truncate text-[14px] font-bold text-[#303648]">
                    {task.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-[#F1F0FA] px-2.5 py-1 text-[10px] font-bold text-brand-deep">
                    {task.categoryLabel}
                  </span>
                </div>
                <p className="shrink-0 text-[14px] font-bold tabular-nums text-[#303648]">
                  {formatAnalyticsDuration(task.seconds)}
                </p>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EFF1F5]">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(task.seconds / maxSeconds) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          text={
            period === "today"
              ? "No deep work tracked today."
              : "No deep work tracked in the last 7 days."
          }
        />
      )}
    </section>
  );
}

function PrioritySummary({ priorities }: { priorities: PriorityDeepWork[] }) {
  const totalSeconds = priorities.reduce(
    (sum, priority) => sum + priority.seconds,
    0
  );

  return (
    <section className="border-y border-[#DDE1E9] bg-white px-7 py-6">
      <SectionHeading
        title="Time by Priority"
        description="Actual Deep Work across the Big 3"
      />
      {totalSeconds > 0 ? (
        <div className="mt-6 space-y-5">
          {priorities.map((priority) => (
            <div key={priority.category}>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] font-bold text-[#343A4C]">
                  {priority.label}
                </p>
                <p className="text-[13px] font-bold tabular-nums text-[#596276]">
                  {formatAnalyticsDuration(priority.seconds)}
                </p>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EFF1F5]">
                <div
                  className="h-full rounded-full bg-brand-deep"
                  style={{
                    width: `${(priority.seconds / totalSeconds) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="No deep work tracked for this period." />
      )}
    </section>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-[19px] font-bold text-[#252A3B]">{title}</h2>
      <p className="mt-1 text-[12px] font-semibold text-[#8992A4]">
        {description}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="mt-6 border-y border-dashed border-[#DDE1E9] bg-[#FAFBFC] py-9 text-center text-[13px] font-semibold text-[#8A92A3]">
      {text}
    </p>
  );
}

function formatDayLabel(date: string): string {
  const instant = casablancaWallTimeToDate(date, "12:00");
  return instant ? DAY_FORMATTER.format(instant) : date;
}
