import {
  type Session,
  type SessionType,
  SESSION_SCHEDULE,
} from "@/types/session";

export const WORK_SESSION_TIME_ZONE = "Africa/Casablanca";

export interface SessionTimelineData {
  plannedStartLabel: string;
  plannedFinishLabel: string;
  actualStartLabel: string | null;
  actualFinishLabel: string | null;
  plannedStartPosition: number;
  plannedFinishPosition: number;
  actualStartPosition: number | null;
  actualFinishPosition: number | null;
  startSummary: string | null;
  finishSummary: string | null;
  startDifferenceMinutes: number | null;
  finishDifferenceMinutes: number | null;
  actualDurationMinutes: number | null;
  invalidTimeMessages: string[];
  result: SessionResult;
}

export interface SessionResult {
  tone: "success" | "failure";
  messages: string[];
}

export type SessionTimeAction = "start" | "finish";

export interface SessionDurationData {
  minutes: number | null;
  progress: number;
  state: "planned" | "worked" | "empty" | "invalid";
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

export function getDefaultFinishTarget(sessionType: SessionType): string {
  return SESSION_SCHEDULE[sessionType].plannedFinish;
}

export function getFinishTargetValidationError(
  session: Session,
  finishTarget: string
): string | null {
  const { plannedStart, plannedFinish } = SESSION_SCHEDULE[session.sessionType];
  const plannedStartMinutes = clockTimeToMinutes(plannedStart);
  const plannedFinishMinutes = clockTimeToMinutes(plannedFinish);
  const finishTargetMinutes = parseClockTime(finishTarget);

  if (
    finishTargetMinutes === null ||
    !isWithinSessionWindow(
      finishTargetMinutes,
      plannedStartMinutes,
      plannedFinishMinutes
    )
  ) {
    return `Finish time must be between ${formatClockTime(
      plannedStart
    )} and ${formatClockTime(plannedFinish)}.`;
  }

  const startMinutes = zonedMinutesFromSessionDate(
    session.startedAt,
    session.date
  );
  if (
    startMinutes === null ||
    !isWithinSessionWindow(
      startMinutes,
      plannedStartMinutes,
      plannedFinishMinutes
    )
  ) {
    return "A valid session start time is required before setting the finish target.";
  }

  if (finishTargetMinutes < startMinutes) {
    return "Finish time cannot be earlier than the session start time.";
  }

  return null;
}

export function getSessionTimeValidationError(
  session: Session,
  action: SessionTimeAction,
  timestamp = new Date()
): string | null {
  const { plannedStart, plannedFinish } = SESSION_SCHEDULE[session.sessionType];
  const plannedStartMinutes = clockTimeToMinutes(plannedStart);
  const plannedFinishMinutes = clockTimeToMinutes(plannedFinish);
  const timestampMinutes = Number.isNaN(timestamp.getTime())
    ? null
    : zonedMinutesFromSessionDate(timestamp.toISOString(), session.date);

  if (
    timestampMinutes === null ||
    !isWithinSessionWindow(
      timestampMinutes,
      plannedStartMinutes,
      plannedFinishMinutes
    )
  ) {
    const actionLabel = action === "start" ? "started" : "finished";
    return `This session can only be ${actionLabel} between ${formatClockTime(
      plannedStart
    )} and ${formatClockTime(plannedFinish)}.`;
  }

  if (action === "finish") {
    const startMinutes = zonedMinutesFromSessionDate(
      session.startedAt,
      session.date
    );
    const startInstant = getInstantMilliseconds(session.startedAt);
    if (
      startMinutes === null ||
      !isWithinSessionWindow(
        startMinutes,
        plannedStartMinutes,
        plannedFinishMinutes
      )
    ) {
      return "This session cannot be finished without a valid start time inside its planned window.";
    }

    if (
      startInstant !== null &&
      timestamp.getTime() < startInstant
    ) {
      return "Finish time cannot be earlier than the session start time.";
    }
  }

  return null;
}

export function hasSessionWindowEnded(
  session: Session,
  timestamp = new Date()
): boolean {
  if (Number.isNaN(timestamp.getTime())) return false;

  const timestampMinutes = zonedMinutesFromSessionDate(
    timestamp.toISOString(),
    session.date
  );
  if (timestampMinutes === null) return false;

  const plannedFinishMinutes = clockTimeToMinutes(
    SESSION_SCHEDULE[session.sessionType].plannedFinish
  );
  return timestampMinutes >= plannedFinishMinutes;
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

export function getSessionTimeline(session: Session): SessionTimelineData {
  const { plannedStart, plannedFinish } = SESSION_SCHEDULE[session.sessionType];
  const plannedStartMinutes = clockTimeToMinutes(plannedStart);
  const plannedFinishMinutes = clockTimeToMinutes(plannedFinish);
  const duration = plannedFinishMinutes - plannedStartMinutes;
  const recordedStartMinutes = zonedMinutesFromSessionDate(
    session.startedAt,
    session.date
  );
  const recordedFinishMinutes = zonedMinutesFromSessionDate(
    session.finishedAt,
    session.date
  );
  const recordedStartInstant = getInstantMilliseconds(session.startedAt);
  const recordedFinishInstant = getInstantMilliseconds(session.finishedAt);
  const startIsValid =
    recordedStartMinutes !== null &&
    isWithinSessionWindow(
      recordedStartMinutes,
      plannedStartMinutes,
      plannedFinishMinutes
    );
  const finishIsInWindow =
    recordedFinishMinutes !== null &&
    isWithinSessionWindow(
      recordedFinishMinutes,
      plannedStartMinutes,
      plannedFinishMinutes
    );
  const finishOrderIsValid =
    startIsValid &&
    recordedStartInstant !== null &&
    recordedFinishInstant !== null &&
    recordedFinishInstant >= recordedStartInstant;
  const finishIsValid = finishIsInWindow && finishOrderIsValid;
  const actualStartMinutes = startIsValid ? recordedStartMinutes : null;
  const actualFinishMinutes = finishIsValid ? recordedFinishMinutes : null;
  const invalidTimeMessages = getInvalidTimeMessages(
    session,
    recordedStartMinutes,
    recordedFinishMinutes,
    startIsValid,
    finishIsInWindow,
    finishOrderIsValid
  );
  const startDifferenceMinutes =
    actualStartMinutes === null
      ? null
      : actualStartMinutes - plannedStartMinutes;
  const finishDifferenceMinutes =
    actualFinishMinutes === null
      ? null
      : actualFinishMinutes - plannedFinishMinutes;
  const actualDurationMinutes =
    actualStartMinutes !== null && actualFinishMinutes !== null
      ? actualFinishMinutes - actualStartMinutes
      : null;

  const toPosition = (minutes: number) =>
    ((minutes - plannedStartMinutes) / duration) * 100;

  return {
    plannedStartLabel: formatClockTime(plannedStart),
    plannedFinishLabel: formatClockTime(plannedFinish),
    actualStartLabel:
      actualStartMinutes === null ? null : formatTime(session.startedAt),
    actualFinishLabel:
      actualFinishMinutes === null ? null : formatTime(session.finishedAt),
    plannedStartPosition: toPosition(plannedStartMinutes),
    plannedFinishPosition: toPosition(plannedFinishMinutes),
    actualStartPosition:
      actualStartMinutes === null ? null : toPosition(actualStartMinutes),
    actualFinishPosition:
      actualFinishMinutes === null ? null : toPosition(actualFinishMinutes),
    startSummary:
      startDifferenceMinutes === null
        ? null
        : formatDeviation(
            "Started",
            startDifferenceMinutes,
            "late",
            "early"
          ),
    finishSummary:
      finishDifferenceMinutes === null
        ? null
        : formatDeviation(
            "Finished",
            finishDifferenceMinutes,
            "late",
            "early"
          ),
    startDifferenceMinutes,
    finishDifferenceMinutes,
    actualDurationMinutes,
    invalidTimeMessages,
    result: buildSessionResult(
      session.status,
      startDifferenceMinutes,
      finishDifferenceMinutes,
      invalidTimeMessages,
      session.startedAt !== null,
      session.finishedAt !== null
    ),
  };
}

export function getSessionDuration(session: Session): SessionDurationData {
  const { plannedStart, plannedFinish } = SESSION_SCHEDULE[session.sessionType];
  const plannedStartMinutes = clockTimeToMinutes(plannedStart);
  const plannedFinishMinutes = clockTimeToMinutes(plannedFinish);
  const plannedDurationMinutes = plannedFinishMinutes - plannedStartMinutes;
  const timeline = getSessionTimeline(session);

  if (session.status === "completed") {
    if (timeline.actualDurationMinutes === null) {
      return { minutes: null, progress: 0, state: "invalid" };
    }

    return {
      minutes: timeline.actualDurationMinutes,
      progress: timeline.actualDurationMinutes / plannedDurationMinutes,
      state: "worked",
    };
  }

  if (session.status === "in_progress") {
    if (timeline.startDifferenceMinutes === null) {
      return { minutes: null, progress: 0, state: "invalid" };
    }

    const finishTargetMinutes = parseClockTime(
      session.finishTarget ?? plannedFinish
    );
    const actualStartMinutes =
      plannedStartMinutes + timeline.startDifferenceMinutes;
    if (
      finishTargetMinutes === null ||
      !isWithinSessionWindow(
        finishTargetMinutes,
        plannedStartMinutes,
        plannedFinishMinutes
      ) ||
      finishTargetMinutes < actualStartMinutes
    ) {
      return { minutes: null, progress: 0, state: "invalid" };
    }

    const projectedMinutes = finishTargetMinutes - actualStartMinutes;
    return {
      minutes: projectedMinutes,
      progress: projectedMinutes / plannedDurationMinutes,
      state: "planned",
    };
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
  return session.startedAt !== null && session.finishedAt === null;
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

function parseClockTime(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;

  const [, hour, minute] = match;
  const hourValue = Number(hour);
  const minuteValue = Number(minute);
  if (hourValue > 23 || minuteValue > 59) return null;

  return hourValue * 60 + minuteValue;
}

function isWithinSessionWindow(
  minutes: number,
  plannedStartMinutes: number,
  plannedFinishMinutes: number
): boolean {
  return minutes >= plannedStartMinutes && minutes <= plannedFinishMinutes;
}

function getInstantMilliseconds(isoString: string | null): number | null {
  if (!isoString) return null;

  const milliseconds = new Date(isoString).getTime();
  return Number.isNaN(milliseconds) ? null : milliseconds;
}

function zonedMinutesFromSessionDate(
  isoString: string | null,
  sessionDate: string
): number | null {
  if (!isoString) return null;

  const instant = new Date(isoString);
  if (Number.isNaN(instant.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WORK_SESSION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, Number(value)])
  );
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

function formatDeviation(
  verb: "Started" | "Finished",
  difference: number,
  positiveLabel: "late",
  negativeLabel: "early"
): string {
  if (difference === 0) return `${verb} on time`;

  const minutes = Math.abs(difference);
  const timing = difference > 0 ? positiveLabel : negativeLabel;

  return `${verb} ${formatMinuteDuration(minutes)} ${timing}`;
}

function buildSessionResult(
  status: Session["status"],
  startDifferenceMinutes: number | null,
  finishDifferenceMinutes: number | null,
  invalidTimeMessages: string[],
  hasRecordedStart: boolean,
  hasRecordedFinish: boolean
): SessionResult {
  if (status === "skipped") {
    return { tone: "failure", messages: ["Session skipped"] };
  }

  if (status !== "completed") {
    return {
      tone: "failure",
      messages: [...invalidTimeMessages, "Not completed"],
    };
  }

  const problems = [...invalidTimeMessages];

  if (!hasRecordedStart) {
    problems.push("Missing start time");
  } else if (
    startDifferenceMinutes !== null &&
    startDifferenceMinutes > 0
  ) {
    problems.push("Started late");
  }

  if (!hasRecordedFinish) {
    problems.push("Missing finish time");
  } else if (
    finishDifferenceMinutes !== null &&
    finishDifferenceMinutes < 0
  ) {
    problems.push("Finished early");
  }

  return problems.length > 0
    ? { tone: "failure", messages: problems }
    : { tone: "success", messages: ["Time respected"] };
}

function getInvalidTimeMessages(
  session: Session,
  recordedStartMinutes: number | null,
  recordedFinishMinutes: number | null,
  startIsValid: boolean,
  finishIsInWindow: boolean,
  finishOrderIsValid: boolean
): string[] {
  const messages: string[] = [];

  if (session.startedAt !== null && !startIsValid) {
    messages.push(
      recordedStartMinutes === null
        ? "Recorded start time is invalid"
        : "Recorded start is outside the planned session window"
    );
  }

  if (session.finishedAt !== null && !finishIsInWindow) {
    messages.push(
      recordedFinishMinutes === null
        ? "Recorded finish time is invalid"
        : "Recorded finish is outside the planned session window"
    );
  } else if (
    session.finishedAt !== null &&
    startIsValid &&
    !finishOrderIsValid
  ) {
    messages.push("Recorded finish is earlier than the start time");
  }

  return messages;
}

function formatMinuteDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0
    ? `${hours}h`
    : `${hours}h ${String(minutes).padStart(2, "0")}m`;
}
