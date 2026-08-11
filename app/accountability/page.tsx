"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ChevronDown, ClipboardCheck } from "lucide-react";
import { AccountabilityViolationCard } from "@/components/accountability-violation-card";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
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
    <AppShell activePage="accountability">
      <div className="space-y-8">
        <PageHeader
          title="Accountability"
          eyebrow="Execution corrections"
          description="One broken commitment = one handwritten page."
          icon={ClipboardCheck}
        />

          <div className="space-y-9">
            <section aria-labelledby="today-accountability-heading">
              <h2
                id="today-accountability-heading"
                className="mb-4 text-[20px] font-bold text-[#202536]"
              >
                Today&apos;s Accountability
              </h2>
              <dl className="grid grid-cols-4 divide-x divide-[#E3E6ED] overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white shadow-[0_10px_28px_rgba(23,27,44,0.04)]">
                {summary.map((metric) => (
                  <div key={metric.label} className="px-7 py-5">
                    <dt className="text-[13px] font-semibold text-[#7D8698]">
                      {metric.label}
                    </dt>
                    <dd className="mt-2 text-[26px] font-bold leading-8 tabular-nums text-[#202536]">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {accountability.violations.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 items-start gap-5 min-[1180px]:grid-cols-2">
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
                <p className="mt-5 rounded-2xl border border-[#DEE2EA] bg-white px-6 py-10 text-center text-[15px] text-[#8A92A3] shadow-[0_8px_24px_rgba(23,27,44,0.035)]">
                  No accountability violations today.
                </p>
              )}
            </section>

            <section
              className="border-t border-[#DEE2EA] pt-8"
              aria-labelledby="past-accountability-heading"
            >
              <h2
                id="past-accountability-heading"
                className="mb-4 text-[20px] font-bold text-[#202536]"
              >
                Past Accountability
              </h2>

              {pastDays.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white shadow-[0_8px_24px_rgba(23,27,44,0.035)]">
                  {pastDays.map((day) => {
                    const completed = day.violations.filter(
                      ({ pageCompleted }) => pageCompleted
                    ).length;

                    return (
                      <details key={day.date} className="group border-b border-[#E8EAF0] last:border-0">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-[14px] marker:hidden transition-colors duration-150 hover:bg-[#FAFBFC]">
                          <div>
                            <span className="font-bold text-[#343A4C]">
                              {formatHistoryDate(day.date)}
                            </span>
                            <span className="ml-5 text-[13px] font-semibold text-text-muted">
                              Violations: {day.violations.length}
                            </span>
                            <span className="ml-5 text-[13px] font-semibold tabular-nums text-text-muted">
                              Pages completed: {completed} /{" "}
                              {day.violations.length}
                            </span>
                          </div>
                          <ChevronDown className="size-4 text-text-muted transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="grid grid-cols-1 items-start gap-5 border-t border-[#E8EAF0] bg-[#FAFBFC] p-5 min-[1180px]:grid-cols-2">
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
                <p className="rounded-2xl border border-[#DEE2EA] bg-white px-6 py-9 text-center text-[15px] text-text-muted">
                  No previous accountability records yet.
                </p>
              )}
            </section>
        </div>
      </div>
    </AppShell>
  );
}
