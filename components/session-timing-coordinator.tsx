"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  createDailySessionStore,
  createHistoryStore,
} from "@/lib/local-sessions";
import { createAccountabilityStore } from "@/lib/local-accountability";
import { todayDateString } from "@/lib/session";
import { useSessionTiming } from "@/lib/use-session-timing";
import {
  useAccountabilityReconciliation,
  useHistoricalAccountabilityReconciliation,
} from "@/lib/use-accountability-reconciliation";

/** Keeps today's persisted session state synchronized from every app route. */
export function SessionTimingCoordinator() {
  const date = todayDateString();
  const store = useMemo(() => createDailySessionStore(date), [date]);
  const historyStore = useMemo(() => createHistoryStore(date), [date]);
  const accountabilityStore = useMemo(
    () => createAccountabilityStore(date),
    [date]
  );
  const sessions = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
  const historyDays = useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    historyStore.getServerSnapshot
  );

  useSessionTiming(store, sessions);
  useAccountabilityReconciliation(accountabilityStore, sessions);
  useHistoricalAccountabilityReconciliation(historyDays);
  return null;
}
