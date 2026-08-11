import {
  createDefaultDailySessions,
  importDailySessionsIfMissing,
} from "@/lib/local-sessions";
import { casablancaWallTimeToDate } from "@/lib/session";
import type { SessionType } from "@/types/session";

interface SeedSession {
  sessionType: SessionType;
  startTime?: string;
  skipped?: true;
}

interface SeedDay {
  date: string;
  sessions: SeedSession[];
}

const PREVIOUS_WORK_SESSIONS: SeedDay[] = [
  {
    date: "2026-08-01",
    sessions: [
      { sessionType: "skill_mastery", startTime: "11:32" },
      { sessionType: "client_acquisition", startTime: "14:08" },
      { sessionType: "execution", startTime: "19:08" },
    ],
  },
  {
    date: "2026-08-02",
    sessions: [
      { sessionType: "skill_mastery", startTime: "10:30" },
      { sessionType: "client_acquisition", startTime: "15:30" },
      { sessionType: "execution", startTime: "18:31" },
    ],
  },
  {
    date: "2026-08-03",
    sessions: [
      { sessionType: "skill_mastery", skipped: true },
      { sessionType: "client_acquisition", skipped: true },
      { sessionType: "execution", startTime: "20:00" },
    ],
  },
  {
    date: "2026-08-04",
    sessions: [
      { sessionType: "skill_mastery", startTime: "10:04" },
      { sessionType: "client_acquisition", startTime: "15:08" },
      { sessionType: "execution", startTime: "20:00" },
    ],
  },
  {
    date: "2026-08-05",
    sessions: [
      { sessionType: "skill_mastery", skipped: true },
      { sessionType: "client_acquisition", skipped: true },
      { sessionType: "execution", startTime: "18:30" },
    ],
  },
  {
    date: "2026-08-06",
    sessions: [
      { sessionType: "skill_mastery", skipped: true },
      { sessionType: "client_acquisition", startTime: "16:08" },
      { sessionType: "execution", startTime: "17:55" },
    ],
  },
  {
    date: "2026-08-07",
    sessions: [
      { sessionType: "skill_mastery", startTime: "10:02" },
      { sessionType: "client_acquisition", startTime: "15:00" },
      { sessionType: "execution", startTime: "17:58" },
    ],
  },
  {
    date: "2026-08-08",
    sessions: [
      { sessionType: "skill_mastery", startTime: "10:00" },
      { sessionType: "client_acquisition", startTime: "13:58" },
      { sessionType: "execution", startTime: "18:00" },
    ],
  },
  {
    date: "2026-08-09",
    sessions: [
      { sessionType: "skill_mastery", startTime: "11:35" },
      { sessionType: "client_acquisition", startTime: "15:46" },
      { sessionType: "execution", skipped: true },
    ],
  },
];

export function seedPreviousHistory(today: string): number {
  return PREVIOUS_WORK_SESSIONS.reduce((importedDays, day) => {
    if (day.date >= today) return importedDays;

    const seedBySessionType = new Map(
      day.sessions.map((session) => [session.sessionType, session])
    );
    const sessions = createDefaultDailySessions(day.date).map((session) => {
      const seed = seedBySessionType.get(session.sessionType);

      if (seed?.skipped) {
        return { ...session, status: "skipped" as const };
      }

      if (seed?.startTime) {
        return {
          ...session,
          startedAt:
            casablancaWallTimeToDate(day.date, seed.startTime)?.toISOString() ??
            null,
          status: "running" as const,
        };
      }

      return session;
    });

    return importDailySessionsIfMissing(day.date, sessions)
      ? importedDays + 1
      : importedDays;
  }, 0);
}
