import {
  type DistractionRule,
  type Session,
  type SessionStatus,
  type SessionTask,
  type SessionType,
  type StartTimeRule,
  SESSION_SCHEDULE,
} from "@/types/session";

export const WORK_SESSION_TIME_ZONE = "Africa/Casablanca";

export type SessionTimeAction = "start" | "finish";

export interface SessionDurationData {
  minutes: number | null;
  progress: number;
  state: "worked" | "empty" | "invalid";
}

export interface SessionExecutionResult {
  status: SessionStatus;
  startTimeRule: StartTimeRule;
  lateByMinutes: number | null;
  distractionRule: DistractionRule;
  deepWorkMinutes: number;
  tasksCompleted: number;
  trackedTaskTimeSeconds: number;
}

export interface SessionTaskMutationResult {
  session: Session;
  error: string | null;
}

export type ActualSessionTimeField = "start" | "finish";

export interface SessionTimeCorrectionResult {
  session: Session;
  error: string | null;
}

export interface CompletedSessionEdit {
  startTime: string;
  finishTime: string;
}

/** Returns the display label for a session type. */
export function getSessionLabel(sessionType: SessionType): string {
  return SESSION_SCHEDULE[sessionType].label;
}

/** Returns a schedule range formatted for display, e.g. "10:00 AM → 12:30 PM". */
export function getSessionScheduleLabel(sessionType: SessionType): string {
  const { plannedStart, plannedFinish } = SESSION_SCHEDULE[sessionType];
  return `${formatClockTime(plannedStart)} → ${formatClockTime(plannedFinish)}`;
}

export function getSessionTimeValidationError(
  session: Session,
  action: SessionTimeAction,
  timestamp = new Date()
): string | null {
  const { plannedFinish } = SESSION_SCHEDULE[session.sessionType];
  const scheduledEnd = getScheduledSessionEnd(session);

  const timestampMinutes = Number.isNaN(timestamp.getTime())
    ? null
    : zonedMinutesFromSessionDate(timestamp.toISOString(), session.date);
  const isStartAllowed =
    action === "start" &&
    timestampMinutes !== null &&
    timestampMinutes >= 0 &&
    scheduledEnd !== null &&
    timestamp <= scheduledEnd;
  const isFinishAllowed =
    action === "finish" &&
    timestampMinutes !== null &&
    timestampMinutes >= 0 &&
    scheduledEnd !== null &&
    timestamp <= scheduledEnd;

  if (
    Number.isNaN(timestamp.getTime()) ||
    (!isStartAllowed && !isFinishAllowed)
  ) {
    return action === "start"
      ? `This session can only be started on its scheduled day before ${formatClockTime(
          plannedFinish
        )}.`
      : `This session can only be finished on its scheduled day before ${formatClockTime(
          plannedFinish
        )}.`;
  }

  if (action === "finish") {
    const startInstant = getValidSessionStart(session);
    if (startInstant === null) {
      return "This session cannot be finished without a valid Actual Start.";
    }

    if (timestamp < startInstant) {
      return "Finish time cannot be earlier than the session start time.";
    }
  }

  return null;
}

export function hasSessionWindowEnded(
  session: Session,
  timestamp = new Date()
): boolean {
  const scheduledEnd = getScheduledSessionEnd(session);
  return (
    !Number.isNaN(timestamp.getTime()) &&
    scheduledEnd !== null &&
    timestamp >= scheduledEnd
  );
}

/** Returns the exact instant for the session's planned start in Casablanca. */
export function getScheduledSessionStart(session: Session): Date | null {
  return casablancaWallTimeToDate(
    session.date,
    SESSION_SCHEDULE[session.sessionType].plannedStart
  );
}

/** Returns the exact instant for the session's planned end in Casablanca. */
export function getScheduledSessionEnd(session: Session): Date | null {
  return casablancaWallTimeToDate(
    session.date,
    SESSION_SCHEDULE[session.sessionType].plannedFinish
  );
}

/** Returns whether a valid running session has reached its automatic cutoff. */
export function shouldAutoCompleteSession(
  session: Session,
  timestamp = new Date()
): boolean {
  if (
    session.status !== "running" ||
    session.finishedAt !== null ||
    Number.isNaN(timestamp.getTime()) ||
    getValidSessionStart(session) === null
  ) {
    return false;
  }

  const scheduledEnd = getScheduledSessionEnd(session);
  return scheduledEnd !== null && timestamp >= scheduledEnd;
}

/** Resolves an expired running session at its scheduled end time. */
export function resolveExpiredSession(
  session: Session,
  timestamp = new Date()
): Session {
  const scheduledEnd = getScheduledSessionEnd(session);
  if (scheduledEnd === null) return session;

  if (session.status === "completed") {
    const effectiveEnd = getEffectiveSessionEnd(session, timestamp);
    return effectiveEnd === null
      ? session
      : finalizeRunningTaskAtSessionEnd(session, effectiveEnd);
  }

  if (session.status === "missed") {
    const tasks = stopTasksForMissedSession(session.tasks, scheduledEnd);
    return tasks === session.tasks ? session : { ...session, tasks };
  }

  if (
    session.status === "upcoming" &&
    session.startedAt === null &&
    timestamp >= scheduledEnd
  ) {
    return {
      ...session,
      finishedAt: null,
      finishTarget: null,
      status: "missed",
      tasks: stopTasksForMissedSession(session.tasks, scheduledEnd),
    };
  }

  if (!shouldAutoCompleteSession(session, timestamp)) return session;

  return finalizeRunningTaskAtSessionEnd({
    ...session,
    finishedAt: scheduledEnd.toISOString(),
    finishTarget: null,
    status: "completed",
  }, scheduledEnd);
}

/** Resolves every expired running session while preserving unchanged references. */
export function resolveExpiredSessions(
  sessions: Session[],
  timestamp = new Date()
): Session[] {
  let changed = false;
  const resolved = sessions.map((session) => {
    const nextSession = resolveExpiredSession(session, timestamp);
    if (nextSession !== session) changed = true;
    return nextSession;
  });

  return changed ? resolved : sessions;
}

/**
 * Returns the confirmed finish, or the live instant capped at the planned end.
 * Invalid and unstarted sessions intentionally have no effective end.
 */
export function getEffectiveSessionEnd(
  session: Session,
  timestamp = new Date()
): Date | null {
  const start = getValidSessionStart(session);
  if (start === null || Number.isNaN(timestamp.getTime())) return null;

  if (session.status === "completed") {
    return getValidSessionFinish(session, start);
  }

  if (session.status !== "running" || session.finishedAt !== null) {
    return null;
  }

  const scheduledEnd = getScheduledSessionEnd(session);
  if (scheduledEnd === null) return null;

  const effectiveEnd = timestamp < scheduledEnd ? timestamp : scheduledEnd;
  return effectiveEnd >= start ? effectiveEnd : null;
}

/** Calculates actual elapsed work in whole displayed clock minutes. */
export function calculateDeepWorkDuration(
  session: Session,
  timestamp = new Date()
): number | null {
  const effectiveEnd = getEffectiveSessionEnd(session, timestamp);
  const startMinutes = zonedMinutesFromSessionDate(
    session.startedAt,
    session.date
  );
  const endMinutes = zonedMinutesFromSessionDate(
    effectiveEnd?.toISOString() ?? null,
    session.date
  );

  if (
    effectiveEnd === null ||
    startMinutes === null ||
    endMinutes === null ||
    endMinutes < startMinutes
  ) {
    return null;
  }

  return endMinutes - startMinutes;
}

export const calculateDeepWork = calculateDeepWorkDuration;

export function resolveSessionStatus(
  session: Session,
  timestamp = new Date()
): SessionStatus {
  if (
    session.status === "completed" ||
    session.status === "missed" ||
    session.status === "skipped"
  ) {
    return session.status;
  }

  const scheduledEnd = getScheduledSessionEnd(session);
  if (scheduledEnd === null || Number.isNaN(timestamp.getTime())) {
    return session.status;
  }

  const validStart = getValidSessionStart(session);
  if (validStart === null) {
    return timestamp >= scheduledEnd ? "missed" : "upcoming";
  }

  return timestamp >= scheduledEnd ? "completed" : "running";
}

export function calculateLateMinutes(session: Session): number | null {
  const actualStartMinutes = zonedMinutesFromSessionDate(
    session.startedAt,
    session.date
  );
  if (actualStartMinutes === null || getValidSessionStart(session) === null) {
    return null;
  }

  const plannedStartMinutes = clockTimeToMinutes(
    SESSION_SCHEDULE[session.sessionType].plannedStart
  );
  return Math.max(0, actualStartMinutes - plannedStartMinutes);
}

export function calculateFinishDifferenceMinutes(
  session: Session
): number | null {
  const start = getValidSessionStart(session);
  const finish = start === null ? null : getValidSessionFinish(session, start);
  const actualFinishMinutes = zonedMinutesFromSessionDate(
    finish?.toISOString() ?? null,
    session.date
  );
  if (actualFinishMinutes === null) return null;

  const plannedFinishMinutes = clockTimeToMinutes(
    SESSION_SCHEDULE[session.sessionType].plannedFinish
  );
  return actualFinishMinutes - plannedFinishMinutes;
}

export function isSessionTimeRespected(session: Session): boolean {
  const finishDifferenceMinutes = calculateFinishDifferenceMinutes(session);
  return (
    session.status === "completed" &&
    evaluateStartTimeRule(session) === "respected" &&
    finishDifferenceMinutes !== null &&
    finishDifferenceMinutes >= 0
  );
}

export function evaluateStartTimeRule(session: Session): StartTimeRule {
  const lateByMinutes = calculateLateMinutes(session);
  if (lateByMinutes === null) return "pending";
  return lateByMinutes === 0 ? "respected" : "broken";
}

export function evaluateDistractionRule(session: Session): DistractionRule {
  if (session.startedAt === null || session.distracted === null) {
    return "pending";
  }

  return session.distracted ? "broken" : "respected";
}

export function calculateTaskDuration(
  task: SessionTask,
  session: Session,
  timestamp = new Date()
): number | null {
  const taskStart = dateFromIso(task.startedAt);
  const sessionStart = getValidSessionStart(session);
  const sessionEnd = getEffectiveSessionEnd(session, timestamp);
  if (
    taskStart === null ||
    sessionStart === null ||
    sessionEnd === null ||
    taskStart < sessionStart ||
    taskStart > sessionEnd
  ) {
    return null;
  }

  const taskEnd =
    task.status === "completed"
      ? dateFromIso(task.finishedAt)
      : task.status === "running"
        ? sessionEnd
        : null;
  if (taskEnd === null || taskEnd < taskStart || taskEnd > sessionEnd) {
    return null;
  }

  return Math.floor((taskEnd.getTime() - taskStart.getTime()) / 1_000);
}

export function getTrackedTaskTime(
  session: Session,
  timestamp = new Date()
): number {
  return session.tasks.reduce((total, task) => {
    if (task.status !== "completed") return total;
    return total + (calculateTaskDuration(task, session, timestamp) ?? 0);
  }, 0);
}

export function finalizeRunningTaskAtSessionEnd(
  session: Session,
  effectiveEnd: Date
): Session {
  const sessionStart = getValidSessionStart(session);
  let changed = false;
  const tasks = session.tasks.map((task) => {
    if (task.status !== "running") return task;

    changed = true;
    const taskStart = dateFromIso(task.startedAt);
    if (
      sessionStart === null ||
      taskStart === null ||
      taskStart < sessionStart ||
      taskStart > effectiveEnd
    ) {
      return {
        ...task,
        status: "pending" as const,
        finishedAt: null,
        updatedAt: effectiveEnd.toISOString(),
      };
    }

    return {
      ...task,
      status: "completed" as const,
      finishedAt: effectiveEnd.toISOString(),
      updatedAt: effectiveEnd.toISOString(),
    };
  });

  return changed ? { ...session, tasks } : session;
}

export function startSessionTask(
  session: Session,
  taskId: string,
  timestamp = new Date()
): SessionTaskMutationResult {
  if (
    session.status !== "running" ||
    resolveSessionStatus(session, timestamp) !== "running"
  ) {
    return {
      session: resolveExpiredSession(session, timestamp),
      error: "Tasks can only be started while the session is running.",
    };
  }

  const task = session.tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status !== "pending") {
    return { session, error: null };
  }

  if (session.tasks.some((candidate) => candidate.status === "running")) {
    return {
      session,
      error: "Complete the current task before starting another.",
    };
  }

  const sessionStart = getValidSessionStart(session);
  const scheduledEnd = getScheduledSessionEnd(session);
  if (
    sessionStart === null ||
    scheduledEnd === null ||
    timestamp < sessionStart ||
    timestamp > scheduledEnd
  ) {
    return {
      session: resolveExpiredSession(session, timestamp),
      error: "Tasks can only be started during the active session window.",
    };
  }

  const timestampIso = timestamp.toISOString();
  return {
    session: {
      ...session,
      tasks: session.tasks.map((candidate) =>
        candidate.id === taskId
          ? {
              ...candidate,
              status: "running",
              startedAt: timestampIso,
              finishedAt: null,
              updatedAt: timestampIso,
            }
          : candidate
      ),
    },
    error: null,
  };
}

export function completeSessionTask(
  session: Session,
  taskId: string,
  timestamp = new Date()
): SessionTaskMutationResult {
  const resolvedSession = resolveExpiredSession(session, timestamp);
  if (resolvedSession !== session) {
    return { session: resolvedSession, error: null };
  }

  if (session.status !== "running") {
    return {
      session,
      error: "Tasks can only be completed while the session is running.",
    };
  }

  const task = session.tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status !== "running") {
    return { session, error: null };
  }

  const taskStart = dateFromIso(task.startedAt);
  if (taskStart === null || timestamp < taskStart) {
    return { session, error: "Task finish time cannot be before its start." };
  }

  const timestampIso = timestamp.toISOString();
  return {
    session: {
      ...session,
      tasks: session.tasks.map((candidate) =>
        candidate.id === taskId
          ? {
              ...candidate,
              status: "completed",
              finishedAt: timestampIso,
              updatedAt: timestampIso,
            }
          : candidate
      ),
    },
    error: null,
  };
}

export function correctActualSessionTime(
  session: Session,
  field: ActualSessionTimeField,
  clockTime: string,
  timestamp = new Date()
): SessionTimeCorrectionResult {
  const correctedTime = casablancaWallTimeToDate(session.date, clockTime);
  const scheduledEnd = getScheduledSessionEnd(session);
  const scheduledFinishLabel = formatClockTime(
    SESSION_SCHEDULE[session.sessionType].plannedFinish
  );
  const fieldLabel = field === "start" ? "Start" : "Finish";

  if (correctedTime === null || scheduledEnd === null) {
    return { session, error: "Enter a valid actual time." };
  }

  if (correctedTime > scheduledEnd) {
    return {
      session,
      error: `Actual ${fieldLabel} cannot be later than the official end time of ${scheduledFinishLabel}.`,
    };
  }

  if (correctedTime > timestamp) {
    return {
      session,
      error: `Actual ${fieldLabel} cannot be in the future.`,
    };
  }

  if (field === "start") {
    if (
      session.startedAt === null ||
      (session.status !== "running" && session.status !== "completed")
    ) {
      return {
        session,
        error: "Actual Start can only be edited after the session starts.",
      };
    }

    const finish = dateFromIso(session.finishedAt);
    if (finish !== null && correctedTime > finish) {
      return {
        session,
        error: "Actual Start cannot be later than Actual Finish.",
      };
    }

    if (hasTaskBefore(session.tasks, correctedTime)) {
      return {
        session,
        error: "Actual Start cannot be later than an existing task time.",
      };
    }

    return {
      session: { ...session, startedAt: correctedTime.toISOString() },
      error: null,
    };
  }

  if (session.status !== "completed" || session.finishedAt === null) {
    return {
      session,
      error: "Actual Finish can only be edited after the session is completed.",
    };
  }

  const start = dateFromIso(session.startedAt);
  if (start === null) {
    return { session, error: "A valid Actual Start is required first." };
  }

  if (correctedTime < start) {
    return {
      session,
      error: "Actual Finish cannot be earlier than Actual Start.",
    };
  }

  if (hasTaskAfter(session.tasks, correctedTime)) {
    return {
      session,
      error: "Actual Finish cannot be earlier than an existing task time.",
    };
  }

  return {
    session: { ...session, finishedAt: correctedTime.toISOString() },
    error: null,
  };
}

/** Updates both boundaries of one completed record as a single correction. */
export function editCompletedSession(
  session: Session,
  correction: CompletedSessionEdit,
  timestamp = new Date()
): SessionTimeCorrectionResult {
  if (session.status !== "completed") {
    return {
      session,
      error: "Only completed sessions can be edited here.",
    };
  }

  const start = casablancaWallTimeToDate(session.date, correction.startTime);
  const finish = casablancaWallTimeToDate(session.date, correction.finishTime);
  const scheduledEnd = getScheduledSessionEnd(session);
  const scheduledFinishLabel = formatClockTime(
    SESSION_SCHEDULE[session.sessionType].plannedFinish
  );

  if (start === null || finish === null || scheduledEnd === null) {
    return { session, error: "Enter valid start and finish times." };
  }

  if (start > scheduledEnd || finish > scheduledEnd) {
    return {
      session,
      error: `Session times cannot be later than the official end time of ${scheduledFinishLabel}.`,
    };
  }

  if (start > timestamp || finish > timestamp) {
    return { session, error: "Session times cannot be in the future." };
  }

  if (finish < start) {
    return {
      session,
      error: "Actual Finish cannot be earlier than Actual Start.",
    };
  }

  if (hasTaskBefore(session.tasks, start)) {
    return {
      session,
      error: "Actual Start cannot be later than an existing task time.",
    };
  }

  if (hasTaskAfter(session.tasks, finish)) {
    return {
      session,
      error: "Actual Finish cannot be earlier than an existing task time.",
    };
  }

  return {
    session: {
      ...session,
      startedAt: start.toISOString(),
      finishedAt: finish.toISOString(),
    },
    error: null,
  };
}

/** Reopens one completed record without discarding any execution data. */
export function reopenCompletedSession(session: Session): Session {
  if (session.status !== "completed" || getValidSessionStart(session) === null) {
    return session;
  }

  return {
    ...session,
    finishedAt: null,
    finishTarget: null,
    status: "running",
  };
}

export function getUndoStartConfirmation(session: Session): string {
  const hasExecutionData =
    session.distracted !== null ||
    session.distractionReason !== null ||
    session.tasks.some(
      (task) =>
        task.status !== "pending" ||
        task.startedAt !== null ||
        task.finishedAt !== null
    );

  return hasExecutionData
    ? "Undoing this start will clear the session start, distraction answer, and recorded task timing. Task titles will be kept. Continue?"
    : "Undo this session start and return it to Upcoming?";
}

export function undoSessionStart(
  session: Session,
  timestamp = new Date()
): Session {
  if (session.status !== "running") return session;

  const timestampIso = timestamp.toISOString();
  return {
    ...session,
    startedAt: null,
    finishedAt: null,
    finishTarget: null,
    distracted: null,
    distractionReason: null,
    status: "upcoming",
    tasks: session.tasks.map((task) =>
      task.status === "pending" &&
      task.startedAt === null &&
      task.finishedAt === null
        ? task
        : {
            ...task,
            status: "pending",
            startedAt: null,
            finishedAt: null,
            updatedAt: timestampIso,
          }
    ),
  };
}

export function getSessionExecutionResult(
  session: Session,
  timestamp = new Date()
): SessionExecutionResult {
  return {
    status: resolveSessionStatus(session, timestamp),
    startTimeRule: evaluateStartTimeRule(session),
    lateByMinutes: calculateLateMinutes(session),
    distractionRule: evaluateDistractionRule(session),
    deepWorkMinutes: calculateDeepWorkDuration(session, timestamp) ?? 0,
    tasksCompleted: session.tasks.filter(
      (task) => task.status === "completed"
    ).length,
    trackedTaskTimeSeconds: getTrackedTaskTime(session, timestamp),
  };
}

export function formatTaskDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;

  if (safeSeconds === 0) return "0m";
  if (hours > 0) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }

  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Returns the Casablanca calendar date in YYYY-MM-DD format. */
export function todayDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WORK_SESSION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const dateParts = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function addCalendarDays(date: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;

  const [, year, month, day] = match.map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));

  return [
    result.getUTCFullYear(),
    String(result.getUTCMonth() + 1).padStart(2, "0"),
    String(result.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getPreviousCalendarDate(date: string): string {
  return addCalendarDays(date, -1);
}

export function getCurrentWeekDates(date: string): string[] {
  const [year, month, day] = date.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (calendarDate.getUTCDay() + 6) % 7;
  const monday = addCalendarDays(date, -daysSinceMonday);

  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(monday, index)
  );
}

/** Returns the Casablanca calendar date formatted for the Today heading. */
export function formatTodayDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: WORK_SESSION_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}

/** Formats a YYYY-MM-DD calendar date without shifting it across time zones. */
export function formatHistoryDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("en-US", {
    timeZone: WORK_SESSION_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(calendarDate);
}

/** Formats an ISO timestamp as a Casablanca time, e.g. "10:07 AM". */
export function formatTime(isoString: string | null): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: WORK_SESSION_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Formats an ISO timestamp for a time input without crossing time zones. */
export function formatTimeInput(isoString: string | null): string {
  const instant = dateFromIso(isoString);
  if (instant === null) return "";

  const { hour, minute } = getZonedDateTimeParts(instant);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getSessionDuration(
  session: Session,
  timestamp = new Date()
): SessionDurationData {
  const { plannedStart, plannedFinish } = SESSION_SCHEDULE[session.sessionType];
  const plannedStartMinutes = clockTimeToMinutes(plannedStart);
  const plannedFinishMinutes = clockTimeToMinutes(plannedFinish);
  const plannedDurationMinutes = plannedFinishMinutes - plannedStartMinutes;

  if (session.status === "completed" || session.status === "running") {
    const actualMinutes = calculateDeepWorkDuration(session, timestamp);
    if (actualMinutes === null) {
      return { minutes: null, progress: 0, state: "invalid" };
    }

    return {
      minutes: actualMinutes,
      progress: Math.min(1, actualMinutes / plannedDurationMinutes),
      state: "worked",
    };
  }

  if (session.status === "missed") {
    return { minutes: 0, progress: 0, state: "worked" };
  }

  return { minutes: null, progress: 0, state: "empty" };
}

export function formatSessionDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
}

/** Returns true if the session has been started but not yet finished. */
export function isSessionInProgress(session: Session): boolean {
  return session.status === "running";
}

function stopTasksForMissedSession(
  tasks: SessionTask[],
  timestamp: Date
): SessionTask[] {
  let changed = false;
  const nextTasks = tasks.map((task) => {
    if (task.status !== "running") return task;
    changed = true;
    return {
      ...task,
      status: "pending" as const,
      finishedAt: null,
      updatedAt: timestamp.toISOString(),
    };
  });

  return changed ? nextTasks : tasks;
}

function hasTaskBefore(tasks: SessionTask[], boundary: Date): boolean {
  return tasks.some((task) => {
    const start = dateFromIso(task.startedAt);
    const finish = dateFromIso(task.finishedAt);
    return (
      (start !== null && start < boundary) ||
      (finish !== null && finish < boundary)
    );
  });
}

function hasTaskAfter(tasks: SessionTask[], boundary: Date): boolean {
  return tasks.some((task) => {
    const start = dateFromIso(task.startedAt);
    const finish = dateFromIso(task.finishedAt);
    return (
      (start !== null && start > boundary) ||
      (finish !== null && finish > boundary)
    );
  });
}

function formatClockTime(time: string): string {
  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function clockTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getValidSessionStart(session: Session): Date | null {
  const instant = dateFromIso(session.startedAt);
  const scheduledEnd = getScheduledSessionEnd(session);
  const startMinutes = zonedMinutesFromSessionDate(
    session.startedAt,
    session.date
  );

  if (
    instant === null ||
    scheduledEnd === null ||
    instant > scheduledEnd ||
    startMinutes === null ||
    startMinutes < 0
  ) {
    return null;
  }

  return instant;
}

function getValidSessionFinish(session: Session, start: Date): Date | null {
  const instant = dateFromIso(session.finishedAt);
  const scheduledEnd = getScheduledSessionEnd(session);
  const finishMinutes = zonedMinutesFromSessionDate(
    session.finishedAt,
    session.date
  );

  if (
    instant === null ||
    scheduledEnd === null ||
    finishMinutes === null ||
    finishMinutes < 0 ||
    instant > scheduledEnd ||
    instant < start
  ) {
    return null;
  }

  return instant;
}

function dateFromIso(isoString: string | null): Date | null {
  if (!isoString) return null;

  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function casablancaWallTimeToDate(
  date: string,
  time: string
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));

  if (
    hour > 23 ||
    minute > 59 ||
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  const targetWallTime = Date.UTC(year, month - 1, day, hour, minute);
  let instant = targetWallTime;

  for (let pass = 0; pass < 3; pass += 1) {
    const values = getZonedDateTimeParts(new Date(instant));
    const representedWallTime = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute
    );
    instant += targetWallTime - representedWallTime;
  }

  const result = new Date(instant);
  const represented = getZonedDateTimeParts(result);
  return represented.year === year &&
    represented.month === month &&
    represented.day === day &&
    represented.hour === hour &&
    represented.minute === minute
    ? result
    : null;
}

function zonedMinutesFromSessionDate(
  isoString: string | null,
  sessionDate: string
): number | null {
  if (!isoString) return null;

  const instant = new Date(isoString);
  if (Number.isNaN(instant.getTime())) return null;

  const values = getZonedDateTimeParts(instant);
  const [sessionYear, sessionMonth, sessionDay] = sessionDate
    .split("-")
    .map(Number);
  const sessionDayIndex =
    Date.UTC(sessionYear, sessionMonth - 1, sessionDay) / 86_400_000;
  const actualDayIndex =
    Date.UTC(values.year, values.month - 1, values.day) / 86_400_000;

  return (
    (actualDayIndex - sessionDayIndex) * 24 * 60 +
    values.hour * 60 +
    values.minute
  );
}

function getZonedDateTimeParts(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WORK_SESSION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  return Object.fromEntries(
    parts.map(({ type, value }) => [type, Number(value)])
  ) as Record<"year" | "month" | "day" | "hour" | "minute", number>;
}
