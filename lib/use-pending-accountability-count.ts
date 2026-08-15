"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createAccountabilityOverviewStore } from "@/lib/local-accountability";

export function usePendingAccountabilityCount(): number {
  const store = useMemo(() => createAccountabilityOverviewStore(), []);
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}
