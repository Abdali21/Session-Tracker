"use client";

import { useEffect } from "react";
import type { AccountabilityStore } from "@/lib/local-accountability";
import { createAccountabilityStore } from "@/lib/local-accountability";
import type { HistoryDay } from "@/lib/local-sessions";
import { resolveExpiredSessions } from "@/lib/session";
import type { Session } from "@/types/session";

export function useAccountabilityReconciliation(
  store: AccountabilityStore,
  sessions: Session[]
) {
  useEffect(() => {
    function reconcile() {
      const now = new Date();
      store.activate(now);
      store.reconcile(resolveExpiredSessions(sessions, now), now);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") reconcile();
    }

    reconcile();
    const intervalId = window.setInterval(reconcile, 60_000);
    window.addEventListener("focus", reconcile);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", reconcile);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessions, store]);
}

export function useHistoricalAccountabilityReconciliation(days: HistoryDay[]) {
  useEffect(() => {
    function reconcile() {
      const now = new Date();
      days.forEach((day) => {
        const store = createAccountabilityStore(day.date);
        store.activate(now);
        store.reconcile(resolveExpiredSessions(day.sessions, now), now);
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") reconcile();
    }

    reconcile();
    const intervalId = window.setInterval(reconcile, 60_000);
    window.addEventListener("focus", reconcile);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", reconcile);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [days]);
}
