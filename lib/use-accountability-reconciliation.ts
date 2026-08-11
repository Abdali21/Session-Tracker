"use client";

import { useEffect } from "react";
import type { AccountabilityStore } from "@/lib/local-accountability";
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
