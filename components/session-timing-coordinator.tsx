"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createDailySessionStore } from "@/lib/local-sessions";
import { todayDateString } from "@/lib/session";
import { useSessionTiming } from "@/lib/use-session-timing";

/** Keeps today's persisted session state synchronized from every app route. */
export function SessionTimingCoordinator() {
  const date = todayDateString();
  const store = useMemo(() => createDailySessionStore(date), [date]);
  const sessions = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  useSessionTiming(store, sessions);
  return null;
}
