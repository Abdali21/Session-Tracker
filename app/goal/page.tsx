"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import {
  getWeeklyGoalSummary,
  WEEKLY_DEEP_WORK_TARGET_MINUTES,
} from "@/lib/goal";
import {
  createDailySessionStore,
  createHistoryStore,
} from "@/lib/local-sessions";
import { formatDeepWork } from "@/lib/report";
import { getCurrentWeekDates, todayDateString } from "@/lib/session";
import { useSessionTiming } from "@/lib/use-session-timing";

const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function GoalPage() {
  const today = todayDateString();
  const weekDates = useMemo(() => getCurrentWeekDates(today), [today]);
  const todayStore = useMemo(() => createDailySessionStore(today), [today]);
  const historyStore = useMemo(() => createHistoryStore(today), [today]);
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

  const summary = useMemo(() => {
    const historicalByDate = new Map(
      historyDays.map((day) => [day.date, day.sessions])
    );
    const days = weekDates.map((date) => ({
      date,
      sessions:
        date === today
          ? todaySessions
          : date < today
            ? historicalByDate.get(date) ?? null
            : null,
    }));

    return getWeeklyGoalSummary(days, timingNow ?? new Date());
  }, [historyDays, timingNow, today, todaySessions, weekDates]);

  const overview = [
    {
      label: "Weekly Goal",
      value: formatDeepWork(WEEKLY_DEEP_WORK_TARGET_MINUTES),
    },
    { label: "Current Deep Work", value: formatDeepWork(summary.currentMinutes) },
    { label: "Progress", value: `${summary.progressPercent}%` },
    { label: "Remaining", value: formatDeepWork(summary.remainingMinutes) },
  ];

  return (
    <AppShell activePage="goal">
      <div className="space-y-8">
        <PageHeader
          title="50 Hours Deep Work / Week"
          eyebrow="Monday to Sunday"
          icon={Target}
        />

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white shadow-[0_12px_32px_rgba(23,27,44,0.05)]">
            <dl className="grid grid-cols-4 divide-x divide-[#E3E6ED]">
              {overview.map((metric) => (
                <div key={metric.label} className="px-7 py-6">
                  <dt className="text-[13px] font-semibold text-[#7D8698]">
                    {metric.label}
                  </dt>
                  <dd className="mt-2 text-[26px] font-bold leading-8 tabular-nums text-[#202536]">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-[#E3E6ED] px-7 py-6">
              <div className="mb-3 flex items-center justify-between text-[13px] font-semibold">
                <span className="text-[#687184]">Weekly progress</span>
                <span className="tabular-nums text-brand-deep">{summary.progressPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#E8E8F1]">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-200"
                  style={{ width: `${summary.progressPercent}%` }}
                  role="progressbar"
                  aria-label="Weekly deep work progress"
                  aria-valuenow={summary.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </section>

            <section className="overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white shadow-[0_10px_28px_rgba(23,27,44,0.04)]">
              <div className="border-b border-[#E3E6ED] px-7 py-5">
                <h2 className="text-[20px] font-bold leading-6 text-[#202536]">
                  Daily breakdown
                </h2>
              </div>
              <dl>
                {summary.dailyMinutes.map((day, index) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between border-b border-[#E8EAF0] px-7 py-[18px] last:border-0"
                  >
                    <dt className="text-[15px] font-semibold text-[#343A4C]">
                      {WEEKDAY_LABELS[index]}
                    </dt>
                    <dd className="text-[16px] font-bold tabular-nums text-[#697286]">
                      {day.minutes === null ? "—" : formatDeepWork(day.minutes)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
        </div>
      </div>
    </AppShell>
  );
}
