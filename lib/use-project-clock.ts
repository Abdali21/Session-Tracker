"use client";

import { useEffect, useState } from "react";

/** Keeps deadline countdowns current without creating distracting second ticks. */
export function useProjectClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const update = () => setNow(new Date());
    const interval = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, []);

  return now;
}
