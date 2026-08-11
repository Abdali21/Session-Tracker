"use client";

import { useEffect, useState } from "react";
import type {
  DailySessionStore,
  HistoryStore,
} from "@/lib/local-sessions";
import { getScheduledSessionEnd } from "@/lib/session";
import type { Session } from "@/types/session";

type SessionTimingStore = Pick<
  DailySessionStore | HistoryStore,
  "reconcileExpiredSessions"
>;

/** Keeps live duration displays current and persists sessions at their cutoff. */
export function useSessionTiming(
  store: SessionTimingStore,
  sessions: Session[]
): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    function synchronize() {
      const timestamp = new Date();
      store.reconcileExpiredSessions(timestamp);
      setNow(timestamp);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") synchronize();
    }

    synchronize();
    const intervalId = window.setInterval(synchronize, 30_000);
    window.addEventListener("focus", synchronize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const currentTime = Date.now();
    const nextCutoff = sessions.reduce<number | null>((nearest, session) => {
      if (
        (session.status !== "running" && session.status !== "upcoming") ||
        session.finishedAt !== null
      ) {
        return nearest;
      }

      const scheduledEnd = getScheduledSessionEnd(session)?.getTime();
      if (scheduledEnd === undefined || scheduledEnd <= currentTime) {
        return nearest;
      }

      return nearest === null || scheduledEnd < nearest
        ? scheduledEnd
        : nearest;
    }, null);
    const cutoffTimeoutId =
      nextCutoff === null
        ? null
        : window.setTimeout(
            synchronize,
            Math.min(nextCutoff - currentTime + 50, 2_147_483_647)
          );

    return () => {
      window.clearInterval(intervalId);
      if (cutoffTimeoutId !== null) window.clearTimeout(cutoffTimeoutId);
      window.removeEventListener("focus", synchronize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessions, store]);

  return now;
}
