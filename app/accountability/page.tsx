"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AccountabilityViolationCard } from "@/components/accountability-violation-card";
import { AppShell } from "@/components/app-shell";
import {
  createAccountabilityHistoryStore,
  createAccountabilityStore,
  markAccountabilityCompleted,
} from "@/lib/local-accountability";
import { todayDateString } from "@/lib/session";
import type { AccountabilityViolation } from "@/types/accountability";

export default function AccountabilityPage() {
  const today = todayDateString();
  const accountabilityStore = useMemo(
    () => createAccountabilityStore(today),
    [today]
  );
  const historyStore = useMemo(
    () => createAccountabilityHistoryStore(today),
    [today]
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
  const violations = [
    ...accountability.violations,
    ...pastDays.flatMap((day) => day.violations),
  ];
  const pending = sortNewest(
    violations.filter(({ status }) => status === "pending")
  );
  const completed = [...violations]
    .filter(({ status }) => status === "completed")
    .sort((left, right) =>
      (right.completedAt ?? right.createdAt).localeCompare(
        left.completedAt ?? left.createdAt
      )
    );

  return (
    <AppShell activePage="accountability" compact>
      <div className="space-y-8">
        <section aria-labelledby="pending-accountability-heading">
          <div className="flex items-end justify-between gap-6 border-b border-[#DEE2EA] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#B42318]">
                Required action
              </p>
              <h1
                id="pending-accountability-heading"
                className="mt-1 text-[22px] font-bold text-[#202536]"
              >
                Pending Accountability
              </h1>
            </div>
            <p className="text-[15px] font-bold tabular-nums text-[#B42318]">
              {pending.length} Pending
            </p>
          </div>

          {pending.length > 0 ? (
            <div className="mt-5 space-y-4">
              {pending.map((violation) => (
                <AccountabilityViolationCard
                  key={violation.id}
                  violation={violation}
                  onComplete={() =>
                    markAccountabilityCompleted(
                      violation.date,
                      violation.id
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 border-y border-dashed border-[#DDE1E9] bg-white py-10 text-center text-[14px] font-semibold text-[#8A92A3]">
              No pending accountability items.
            </p>
          )}
        </section>

        <section
          className="border-t border-[#DEE2EA] pt-7"
          aria-labelledby="completed-accountability-heading"
        >
          <div className="flex items-center justify-between gap-6">
            <h2
              id="completed-accountability-heading"
              className="text-[18px] font-bold text-[#4F586C]"
            >
              Completed
            </h2>
            <p className="text-[12px] font-semibold tabular-nums text-[#9299A8]">
              {completed.length} total
            </p>
          </div>

          {completed.length > 0 ? (
            <div className="mt-4 border-y border-[#E2E5EB] bg-white">
              {completed.map((violation) => (
                <AccountabilityViolationCard
                  key={violation.id}
                  violation={violation}
                  compact
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[13px] font-medium text-[#9299A8]">
              Completed accountability items will appear here.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function sortNewest(
  violations: AccountabilityViolation[]
): AccountabilityViolation[] {
  return [...violations].sort((left, right) => {
    const dateOrder = right.date.localeCompare(left.date);
    return dateOrder !== 0
      ? dateOrder
      : right.createdAt.localeCompare(left.createdAt);
  });
}
