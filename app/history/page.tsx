"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/app-header";
import { HistorySessionCard } from "@/components/history-session-card";
import { seedPreviousHistory } from "@/lib/history-seed";
import { createHistoryStore } from "@/lib/local-sessions";
import { formatHistoryDate, todayDateString } from "@/lib/session";

const subscribeToNothing = () => () => {};

export default function HistoryPage() {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const today = todayDateString();
  const store = useMemo(() => createHistoryStore(today), [today]);
  const historyDays = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  useEffect(() => {
    seedPreviousHistory(today);
  }, [today]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <AppHeader activePage="history" />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-8 py-7">
        <div className="flex flex-col gap-6">
          <div className="border-b border-border pb-5">
            <h1 className="text-[28px] font-semibold leading-8">History</h1>
          </div>

          {isClient && historyDays.length === 0 ? (
            <p className="py-10 text-[14px] text-text-muted">
              No previous work sessions yet.
            </p>
          ) : (
            <div>
              {historyDays.map((day) => (
                <section
                  key={day.date}
                  className="grid grid-cols-[176px_minmax(0,1fr)] gap-6 border-b border-border py-7 first:pt-0 last:border-b-0"
                  aria-labelledby={`history-${day.date}`}
                >
                  <h2
                    id={`history-${day.date}`}
                    className="pt-1 text-[14px] font-semibold leading-5 text-foreground"
                  >
                    {formatHistoryDate(day.date)}
                  </h2>
                  <div className="grid grid-cols-3 items-start gap-4">
                    {day.sessions.map((session) => (
                      <HistorySessionCard
                        key={session.id}
                        session={session}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
