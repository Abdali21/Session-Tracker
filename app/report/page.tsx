"use client";

import {
  type FormEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Calendar, Check, Clock3 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { DailyShapeChart } from "@/components/daily-shape-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDailyReportStore,
  createDailySessionStore,
} from "@/lib/local-sessions";
import {
  formatDeepWork,
  getDailyInterpretation,
  getDailyReportMetrics,
} from "@/lib/report";
import { formatTodayDate, todayDateString } from "@/lib/session";

const subscribeToNothing = () => () => {};

export default function ReportPage() {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const date = todayDateString();
  const sessionStore = useMemo(() => createDailySessionStore(date), [date]);
  const reportStore = useMemo(() => createDailyReportStore(date), [date]);
  const sessions = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot
  );
  const deepWorkMinutes = useSyncExternalStore(
    reportStore.subscribe,
    reportStore.getSnapshot,
    reportStore.getServerSnapshot
  );
  const metrics = useMemo(
    () => getDailyReportMetrics(sessions, deepWorkMinutes),
    [deepWorkMinutes, sessions]
  );

  const summaryMetrics = [
    {
      label: "Deep Work",
      value: formatDeepWork(metrics.deepWorkMinutes),
      detail: "6h target",
    },
    {
      label: "Tasks Completed",
      value: `${metrics.completedTasks} / ${metrics.totalTasks}`,
      detail: `${metrics.normalized.tasks}% complete`,
    },
    {
      label: "Sessions Completed",
      value: `${metrics.completedSessions} / 3`,
      detail: `${metrics.normalized.sessions}% complete`,
    },
    {
      label: "Time Discipline",
      value: `${metrics.respectedSessions} / 3`,
      detail: `${metrics.normalized.timeDiscipline}% respected`,
    },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <AppHeader activePage="report" />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-8 py-7">
        <div className="flex flex-col gap-6">
          <div className="flex items-end justify-between gap-8 border-b border-border pb-5">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-text-muted">
                <Calendar className="size-3.5" />
                <span className="text-[12px] font-medium">
                  {isClient ? formatTodayDate() : ""}
                </span>
              </div>
              <h1 className="text-[28px] font-semibold leading-8">
                Daily Report
              </h1>
            </div>

            <DeepWorkForm
              key={deepWorkMinutes}
              initialMinutes={deepWorkMinutes}
              onSave={reportStore.setDeepWorkMinutes}
            />
          </div>

          <div className="mx-auto w-full max-w-[1040px] space-y-5">
            <dl className="grid grid-cols-4 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card">
              {summaryMetrics.map((metric) => (
                <div key={metric.label} className="px-5 py-4">
                  <dt className="text-[12px] font-medium text-text-secondary">
                    {metric.label}
                  </dt>
                  <dd className="mt-1.5 text-[20px] font-semibold leading-6 tabular-nums text-foreground">
                    {metric.value}
                  </dd>
                  <p className="mt-1 text-[12px] font-medium tabular-nums text-text-muted">
                    {metric.detail}
                  </p>
                </div>
              ))}
            </dl>

            <section
              className="overflow-hidden rounded-lg border border-border bg-card"
              aria-labelledby="today-shape-heading"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2
                    id="today-shape-heading"
                    className="text-[17px] font-semibold leading-5"
                  >
                    Today&apos;s Shape
                  </h2>
                  <p className="mt-1 text-[12px] font-medium text-text-muted">
                    Daily work signals
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-muted">
                  <Clock3 className="size-3.5" />
                  6h deep-work target
                </span>
              </div>

              <div className="px-8 py-5">
                <DailyShapeChart values={metrics.normalized} />
              </div>

              <div className="border-t border-border bg-[#F4F2FB] px-6 py-4">
                <p className="text-[12px] font-semibold text-[#413890]">
                  Daily readout
                </p>
                <p className="mt-1 max-w-[760px] text-[14px] leading-5 text-foreground">
                  {getDailyInterpretation(metrics)}
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

interface DeepWorkFormProps {
  initialMinutes: number;
  onSave: (minutes: number) => void;
}

function DeepWorkForm({ initialMinutes, onSave }: DeepWorkFormProps) {
  const [hours, setHours] = useState(
    String(Math.floor(initialMinutes / 60))
  );
  const [minutes, setMinutes] = useState(String(initialMinutes % 60));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedHours = Number.parseInt(hours, 10);
    const parsedMinutes = Number.parseInt(minutes, 10);
    const totalMinutes =
      (Number.isFinite(parsedHours) ? Math.max(0, parsedHours) : 0) * 60 +
      (Number.isFinite(parsedMinutes) ? Math.max(0, parsedMinutes) : 0);

    onSave(totalMinutes);
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={handleSubmit}
      aria-label="Record Focus To-Do deep work"
    >
      <div className="mr-1">
        <span className="block text-[12px] font-medium text-text-secondary">
          Focus To-Do
        </span>
        <span className="block text-[12px] text-text-muted">Deep work</span>
      </div>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-text-muted">
          Hours
        </span>
        <Input
          type="number"
          min="0"
          max="24"
          step="1"
          inputMode="numeric"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          className="w-16 tabular-nums"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-text-muted">
          Minutes
        </span>
        <Input
          type="number"
          min="0"
          max="59"
          step="1"
          inputMode="numeric"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          className="w-16 tabular-nums"
        />
      </label>
      <Button type="submit" size="sm" className="h-8 px-3">
        <Check className="size-3.5" />
        Save
      </Button>
    </form>
  );
}
