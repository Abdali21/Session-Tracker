"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Equal,
  LoaderCircle,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { seedPreviousHistory } from "@/lib/history-seed";
import {
  createDailySessionStore,
  createHistoryStore,
} from "@/lib/local-sessions";
import {
  formatDeepWork,
  compareExecutionDays,
  getDailyExecutionMetrics,
  getImprovedAreas,
  getNeedsFocusAreas,
  getViolationCount,
  type DailyExecutionMetrics,
  type ExecutionInsight,
  type ExecutionVerdict,
} from "@/lib/report";
import {
  formatHistoryDate,
  formatTaskDuration,
  getPreviousCalendarDate,
  todayDateString,
} from "@/lib/session";
import { useSessionTiming } from "@/lib/use-session-timing";
import { cn } from "@/lib/utils";

const subscribeToNothing = () => () => {};

export default function ReportPage() {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const [date] = useState(todayDateString);
  const yesterday = getPreviousCalendarDate(date);
  const todayStore = useMemo(() => createDailySessionStore(date), [date]);
  const historyStore = useMemo(() => createHistoryStore(date), [date]);
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

  useEffect(() => {
    seedPreviousHistory(date);
  }, [date]);

  const todayMetrics = useMemo(
    () => getDailyExecutionMetrics(todaySessions, timingNow ?? new Date()),
    [todaySessions, timingNow]
  );
  const yesterdaySessions = historyDays.find(
    (day) => day.date === yesterday
  )?.sessions;
  const yesterdayMetrics = useMemo(
    () =>
      yesterdaySessions
        ? getDailyExecutionMetrics(yesterdaySessions, timingNow ?? new Date())
        : null,
    [timingNow, yesterdaySessions]
  );
  const comparison = compareExecutionDays(
    todaySessions,
    todayMetrics,
    yesterdayMetrics
  );
  const improvedAreas =
    comparison.verdict === "day_in_progress" ||
    comparison.verdict === "no_yesterday_data"
      ? []
      : getImprovedAreas(todayMetrics, yesterdayMetrics);
  const needsFocusAreas = getNeedsFocusAreas(
    todayMetrics,
    comparison.verdict === "day_in_progress" ? null : yesterdayMetrics
  );
  const rows = createComparisonRows(yesterdayMetrics, todayMetrics);

  return (
    <AppShell activePage="report">
      <div className="space-y-8">
        <PageHeader
          title="Report"
          eyebrow={
            isClient
              ? `${formatHistoryDate(yesterday)} compared with today`
              : "Today compared with yesterday"
          }
          description="Am I executing better today than yesterday?"
          icon={CalendarDays}
        />

        <VerdictPanel
          verdict={comparison.verdict}
          todayViolations={comparison.todayViolations}
          yesterdayViolations={comparison.yesterdayViolations}
          todayDeepWork={todayMetrics.deepWorkMinutes}
          yesterdayDeepWork={yesterdayMetrics?.deepWorkMinutes ?? null}
        />

        <section
          className="overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white shadow-[0_12px_32px_rgba(23,27,44,0.05)]"
          aria-labelledby="daily-comparison-heading"
        >
            <div className="flex items-center justify-between border-b border-[#E3E6ED] px-7 py-5">
              <h2
                id="daily-comparison-heading"
                className="text-[20px] font-bold leading-6 text-[#202536]"
              >
                Today vs Yesterday
              </h2>
              <span className="text-[13px] font-semibold text-[#8992A4]">
                Daily execution comparison
              </span>
            </div>

            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E3E6ED] bg-[#FAFBFC]">
                  <th className="px-7 py-4 text-[13px] font-semibold text-[#7C8597]">
                    Metric
                  </th>
                  <th className="w-[190px] px-6 py-4 text-[13px] font-semibold text-[#7C8597]">
                    Yesterday
                  </th>
                  <th className="w-[190px] px-6 py-4 text-[13px] font-semibold text-[#7C8597]">
                    Today
                  </th>
                  <th className="w-[170px] px-6 py-4 text-[13px] font-semibold text-[#7C8597]">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-[#E8EAF0] last:border-0">
                    <th className="px-7 py-[18px] text-[15px] font-semibold text-[#343A4C]">
                      {row.label}
                    </th>
                    <td className="px-6 py-[18px] text-[15px] font-semibold tabular-nums text-[#737C8E]">
                      {row.yesterday}
                    </td>
                    <td className="px-6 py-[18px] text-[16px] font-bold tabular-nums text-brand-deep">
                      {row.today}
                    </td>
                    <td className="px-6 py-[18px]">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[14px] font-bold tabular-nums",
                          row.changeTone === "improvement"
                            ? "text-[#16815A]"
                            : row.changeTone === "decline"
                              ? "text-[#C33A30]"
                              : "text-[#8A92A3]"
                        )}
                      >
                        {row.changeTone === "improvement" ? (
                          <ArrowUpRight className="size-4" />
                        ) : row.changeTone === "decline" ? (
                          <ArrowDownRight className="size-4" />
                        ) : (
                          <Minus className="size-4" />
                        )}
                        {row.change}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </section>

        {improvedAreas.length > 0 || needsFocusAreas.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 min-[1180px]:grid-cols-2">
            {improvedAreas.length > 0 ? (
              <InsightSection
                title="What Improved"
                items={improvedAreas}
                tone="positive"
              />
            ) : null}
            {needsFocusAreas.length > 0 ? (
              <InsightSection
                title="Needs Focus"
                items={needsFocusAreas}
                tone="negative"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

interface VerdictPanelProps {
  verdict: ExecutionVerdict;
  todayViolations: number;
  yesterdayViolations: number | null;
  todayDeepWork: number;
  yesterdayDeepWork: number | null;
}

const VERDICT_CONTENT: Record<
  ExecutionVerdict,
  { title: string; description: string; icon: typeof TrendingUp; className: string }
> = {
  better_than_yesterday: {
    title: "Better than yesterday",
    description: "Fewer execution failures, or stronger Deep Work with equal violations.",
    icon: TrendingUp,
    className: "border-[#BFE4D0] bg-[#F2FBF6] text-[#147A55]",
  },
  worse_than_yesterday: {
    title: "Worse than yesterday",
    description: "Execution violations increased, or Deep Work fell with equal violations.",
    icon: TrendingDown,
    className: "border-[#F1C9C4] bg-[#FFF5F3] text-[#B9382E]",
  },
  same_as_yesterday: {
    title: "Same as yesterday",
    description: "Execution violations and Deep Work are unchanged.",
    icon: Equal,
    className: "border-[#DDE1E9] bg-[#F8F9FB] text-[#5F687B]",
  },
  day_in_progress: {
    title: "Day in progress",
    description: "Complete today's sessions to see your final comparison.",
    icon: LoaderCircle,
    className: "border-[#D8D8EE] bg-[#F5F5FC] text-brand-deep",
  },
  no_yesterday_data: {
    title: "No yesterday data",
    description: "No session data recorded yesterday.",
    icon: Minus,
    className: "border-[#DDE1E9] bg-[#F8F9FB] text-[#5F687B]",
  },
};

function VerdictPanel({
  verdict,
  todayViolations,
  yesterdayViolations,
  todayDeepWork,
  yesterdayDeepWork,
}: VerdictPanelProps) {
  const content = VERDICT_CONTENT[verdict];
  const Icon = content.icon;

  return (
    <section
      className={cn(
        "flex items-center justify-between gap-8 rounded-2xl border px-7 py-6",
        content.className
      )}
      aria-labelledby="report-verdict-heading"
    >
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/70">
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <div>
          <h2 id="report-verdict-heading" className="text-[21px] font-bold leading-7">
            {content.title}
          </h2>
          <p className="mt-1 text-[14px] font-medium leading-5 opacity-80">
            {content.description}
          </p>
        </div>
      </div>
      <dl className="grid shrink-0 grid-cols-2 gap-x-9 gap-y-2 text-right">
        <div>
          <dt className="text-[12px] font-semibold opacity-70">Today</dt>
          <dd className="mt-0.5 text-[16px] font-bold tabular-nums">
            {todayViolations} violations
          </dd>
        </div>
        <div>
          <dt className="text-[12px] font-semibold opacity-70">Yesterday</dt>
          <dd className="mt-0.5 text-[16px] font-bold tabular-nums">
            {yesterdayViolations === null ? "—" : `${yesterdayViolations} violations`}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] font-semibold opacity-70">Deep Work today</dt>
          <dd className="mt-0.5 text-[14px] font-bold tabular-nums">
            {formatDeepWork(todayDeepWork)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] font-semibold opacity-70">Yesterday</dt>
          <dd className="mt-0.5 text-[14px] font-bold tabular-nums">
            {yesterdayDeepWork === null ? "—" : formatDeepWork(yesterdayDeepWork)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function InsightSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: ExecutionInsight[];
  tone: "positive" | "negative";
}) {
  const Icon = tone === "positive" ? CheckCircle2 : CircleAlert;

  return (
    <section className="rounded-2xl border border-[#DEE2EA] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(23,27,44,0.035)]">
      <h2 className="text-[17px] font-bold text-[#252A3B]">{title}</h2>
      <ul className="mt-3 divide-y divide-[#E8EAF0]">
        {items.map((item) => (
          <li key={item.area} className="flex gap-3 py-3.5 first:pt-1 last:pb-0">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                tone === "positive" ? "text-[#16815A]" : "text-[#C33A30]"
              )}
            />
            <div>
              <p className="text-[13px] font-bold text-[#4A5265]">{item.area}</p>
              <p className="mt-0.5 text-[14px] leading-5 text-[#727B8D]">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function createComparisonRows(
  yesterday: DailyExecutionMetrics | null,
  today: DailyExecutionMetrics
) {
  const compareValues = (
    todayValue: number,
    yesterdayValue: number | null,
    formatter: (amount: number) => string = String,
    higherIsBetter = true,
    changeFormatter: (amount: number) => string = formatter
  ) => {
    if (yesterdayValue === null) {
      return {
        yesterday: "—",
        today: formatter(todayValue),
        change: "—",
        changeTone: "neutral" as const,
      };
    }

    const difference = todayValue - yesterdayValue;
    const improved = higherIsBetter ? difference > 0 : difference < 0;
    const declined = higherIsBetter ? difference < 0 : difference > 0;

    return {
      yesterday: formatter(yesterdayValue),
      today: formatter(todayValue),
      change:
        difference === 0
          ? "No change"
          : `${difference > 0 ? "+" : "−"}${changeFormatter(
              Math.abs(difference)
            )}`,
      changeTone: improved
        ? ("improvement" as const)
        : declined
          ? ("decline" as const)
          : ("neutral" as const),
    };
  };
  const value = (
    metric: keyof DailyExecutionMetrics,
    formatter: (amount: number) => string = String,
    higherIsBetter = true,
    changeFormatter: (amount: number) => string = formatter
  ) =>
    compareValues(
      today[metric],
      yesterday?.[metric] ?? null,
      formatter,
      higherIsBetter,
      changeFormatter
    );

  return [
    { label: "Deep Work", ...value("deepWorkMinutes", formatDeepWork) },
    {
      label: "Sessions Completed",
      ...value(
        "completedSessions",
        (amount) => `${amount} / 3`,
        true,
        String
      ),
    },
    { label: "Missed Sessions", ...value("missedSessions", String, false) },
    { label: "Started Late", ...value("lateSessions", String, false) },
    {
      label: "Total Late Minutes",
      ...value("totalLateMinutes", formatDeepWork, false),
    },
    { label: "Distracted", ...value("distractedSessions", String, false) },
    {
      label: "Violations",
      ...compareValues(
        getViolationCount(today),
        yesterday === null ? null : getViolationCount(yesterday),
        String,
        false
      ),
    },
    { label: "Tasks Completed", ...value("completedTasks") },
    {
      label: "Tracked Task Time",
      ...value("trackedTaskTimeSeconds", formatTaskDuration),
    },
  ];
}
