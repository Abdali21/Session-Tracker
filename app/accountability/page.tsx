"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { AccountabilityViolationCard } from "@/components/accountability-violation-card";
import { AppHeader } from "@/components/app-header";
import {
  createAccountabilityHistoryStore,
  createAccountabilityStore,
  setAccountabilityPageCompleted,
} from "@/lib/local-accountability";
import { createDailySessionStore } from "@/lib/local-sessions";
import { formatHistoryDate, todayDateString } from "@/lib/session";
import { useAccountabilityReconciliation } from "@/lib/use-accountability-reconciliation";

export default function AccountabilityPage() {
  const today = todayDateString();
  const sessionStore = useMemo(
    () => createDailySessionStore(today),
    [today]
  );
  const accountabilityStore = useMemo(
    () => createAccountabilityStore(today),
    [today]
  );
  const historyStore = useMemo(
    () => createAccountabilityHistoryStore(today),
    [today]
  );
  const sessions = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot
  );
  const accountability = useSyncExternalStore(
    accountabilityStore.subscribe,
    accountabilityStore.getSnapshot,
    accountabilityStore.getServerSnapshot
  );
  const pastDays = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot
  );
  useAccountabilityReconciliation(accountabilityStore, sessions);

  const completedPages = accountability.violations.filter(
    ({ pageCompleted }) => pageCompleted
  ).length;
  const totalViolations = accountability.violations.length;
  const summary = [
    { label: "Violations", value: totalViolations },
    { label: "Pages Owed", value: totalViolations },
    { label: "Completed", value: completedPages },
    { label: "Remaining", value: totalViolations - completedPages },
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <AppHeader activePage="accountability" />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-8 py-7">
        <div className="flex flex-col gap-6">
          <div className="border-b border-border pb-5">
            <h1 className="text-[28px] font-semibold leading-8">
              Accountability
            </h1>
            <p className="mt-1.5 text-[14px] text-text-secondary">
              One broken commitment = one handwritten page.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[1040px] space-y-7">
            <section aria-labelledby="today-accountability-heading">
              <h2
                id="today-accountability-heading"
                className="mb-3 text-[17px] font-semibold"
              >
                Today&apos;s Accountability
              </h2>
              <dl className="grid grid-cols-4 divide-x divide-border overflow-hidden rounded-lg border border-border bg-card">
                {summary.map((metric) => (
                  <div key={metric.label} className="px-5 py-4">
                    <dt className="text-[12px] font-medium text-text-secondary">
                      {metric.label}
                    </dt>
                    <dd className="mt-1 text-[22px] font-semibold leading-7 tabular-nums">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {accountability.violations.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 items-start gap-4">
                  {accountability.violations.map((violation) => (
                    <AccountabilityViolationCard
                      key={violation.id}
                      violation={violation}
                      onPageCompletedChange={(completed) =>
                        accountabilityStore.setPageCompleted(
                          violation.id,
                          completed
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-border bg-card px-5 py-8 text-[14px] text-text-muted">
                  No accountability violations today.
                </p>
              )}
            </section>

            <section
              className="border-t border-border pt-6"
              aria-labelledby="past-accountability-heading"
            >
              <h2
                id="past-accountability-heading"
                className="mb-3 text-[17px] font-semibold"
              >
                Past Accountability
              </h2>

              {pastDays.length > 0 ? (
                <div className="divide-y divide-border border-y border-border">
                  {pastDays.map((day) => {
                    const completed = day.violations.filter(
                      ({ pageCompleted }) => pageCompleted
                    ).length;

                    return (
                      <details key={day.date} className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[14px] marker:hidden">
                          <div>
                            <span className="font-semibold">
                              {formatHistoryDate(day.date)}
                            </span>
                            <span className="ml-4 text-[12px] font-medium text-text-muted">
                              Violations: {day.violations.length}
                            </span>
                            <span className="ml-4 text-[12px] font-medium tabular-nums text-text-muted">
                              Pages completed: {completed} /{" "}
                              {day.violations.length}
                            </span>
                          </div>
                          <ChevronDown className="size-4 text-text-muted transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="grid grid-cols-2 items-start gap-4 pb-5">
                          {day.violations.map((violation) => (
                            <AccountabilityViolationCard
                              key={violation.id}
                              violation={violation}
                              onPageCompletedChange={(completedState) =>
                                setAccountabilityPageCompleted(
                                  day.date,
                                  violation.id,
                                  completedState
                                )
                              }
                            />
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              ) : (
                <p className="py-5 text-[14px] text-text-muted">
                  No previous accountability records yet.
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
