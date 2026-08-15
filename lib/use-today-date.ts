"use client";

import { useEffect, useState } from "react";
import { todayDateString } from "@/lib/session";

/** Keeps date-keyed client state aligned when the local work day changes. */
export function useTodayDate(): string {
  const [date, setDate] = useState(() => todayDateString());

  useEffect(() => {
    const update = () => setDate(todayDateString());
    const interval = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, []);

  return date;
}
