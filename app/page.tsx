"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SessionCard } from "@/components/session-card";
import { SessionTabs } from "@/components/session-tabs";
import {
  createAccountabilityStore,
  getAccountabilityViolationId,
} from "@/lib/local-accountability";
import { createDailySessionStore } from "@/lib/local-sessions";
import {
  completeSessionTask,
  correctActualSessionTime,
  editCompletedSession,
  finalizeRunningTaskAtSessionEnd,
  getCurrentScheduledSessionType,
  getNextScheduledSessionStart,
  getUndoStartConfirmation,
  getSessionTimeValidationError,
  pauseSessionTask,
  reopenSessionTask,
  startSessionTask,
  todayDateString,
  undoSessionStart,
  reopenCompletedSession,
} from "@/lib/session";
import type {
  Session,
  SessionTask,
  SessionType,
} from "@/types/session";
import type { TaskDetails } from "@/components/task-form";
import { useSessionTiming } from "@/lib/use-session-timing";
import { usePendingAccountabilityCount } from "@/lib/use-pending-accountability-count";

export default function Home() {
  const [manualSelection, setManualSelection] = useState<{
    date: string;
    sessionType: SessionType;
    autoSwitchAt: number | null;
  } | null>(null);
  const [sessionErrors, setSessionErrors] = useState<
    Partial<Record<SessionType, string>>
  >({});
  const [taskErrors, setTaskErrors] = useState<
    Partial<Record<SessionType, string>>
  >({});
  const date = todayDateString();
  const store = useMemo(() => createDailySessionStore(date), [date]);
  const accountabilityStore = useMemo(
    () => createAccountabilityStore(date),
    [date]
  );
  const sessions = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
  const pendingAccountabilityCount = usePendingAccountabilityCount();
  const timingNow = useSessionTiming(store, sessions);
  const currentScheduledSessionType = timingNow
    ? getCurrentScheduledSessionType(sessions, timingNow)
    : null;
  const manualSelectionIsActive =
    timingNow !== null &&
    manualSelection?.date === date &&
    (manualSelection.autoSwitchAt === null ||
      timingNow.getTime() < manualSelection.autoSwitchAt);
  const selectedSessionType = manualSelectionIsActive
    ? manualSelection.sessionType
    : currentScheduledSessionType;
  const selectedSession =
    sessions.find(
      (session) => session.sessionType === selectedSessionType
    ) ?? null;

  function selectSession(sessionType: SessionType) {
    const timestamp = timingNow ?? new Date();
    setManualSelection({
      date,
      sessionType,
      autoSwitchAt:
        getNextScheduledSessionStart(sessions, timestamp)?.getTime() ?? null,
    });
  }
  function updateSession(
    sessionType: SessionType,
    updater: (session: Session) => Session
  ) {
    store.update((currentSessions) =>
      currentSessions.map((session) =>
        session.sessionType === sessionType ? updater(session) : session
      )
    );
  }

  function startSession(sessionType: SessionType) {
    const session = sessions.find(
      (currentSession) => currentSession.sessionType === sessionType
    );
    if (!session || session.status !== "upcoming") return;

    const now = new Date();
    const validationError = getSessionTimeValidationError(
      session,
      "start",
      now
    );
    if (validationError) {
      setSessionErrors((current) => ({
        ...current,
        [sessionType]: validationError,
      }));
      return;
    }

    setSessionErrors((current) => ({ ...current, [sessionType]: undefined }));
    updateSession(sessionType, (session) =>
      session.status === "upcoming"
        ? {
            ...session,
            startedAt: now.toISOString(),
            finishTarget: null,
            status: "running",
          }
        : session
    );
  }

  function finishSession(sessionType: SessionType) {
    const session = sessions.find(
      (currentSession) => currentSession.sessionType === sessionType
    );
    if (!session || session.status !== "running") return;

    const now = new Date();
    const validationError = getSessionTimeValidationError(
      session,
      "finish",
      now
    );
    if (validationError) {
      setSessionErrors((current) => ({
        ...current,
        [sessionType]: validationError,
      }));
      return;
    }

    setSessionErrors((current) => ({ ...current, [sessionType]: undefined }));
    updateSession(sessionType, (session) =>
      session.status === "running"
        ? finalizeRunningTaskAtSessionEnd({
            ...session,
            finishedAt: now.toISOString(),
            status: "completed",
          }, now)
        : session
    );
    setTaskErrors((current) => ({ ...current, [sessionType]: undefined }));
  }

  function correctSessionTime(
    sessionType: SessionType,
    field: "start" | "finish",
    clockTime: string
  ): string | null {
    let error: string | null = null;
    updateSession(sessionType, (session) => {
      const result = correctActualSessionTime(session, field, clockTime);
      error = result.error;
      return result.session;
    });
    return error;
  }

  function editSession(
    sessionType: SessionType,
    startTime: string,
    finishTime: string
  ): string | null {
    let error: string | null = null;
    updateSession(sessionType, (session) => {
      const result = editCompletedSession(session, { startTime, finishTime });
      error = result.error;
      return result.session;
    });
    return error;
  }

  function reopenSession(sessionType: SessionType) {
    updateSession(sessionType, reopenCompletedSession);
    setSessionErrors((current) => ({ ...current, [sessionType]: undefined }));
    setTaskErrors((current) => ({ ...current, [sessionType]: undefined }));
  }

  function undoStart(sessionType: SessionType) {
    const session = sessions.find(
      (currentSession) => currentSession.sessionType === sessionType
    );
    if (
      !session ||
      session.status !== "running" ||
      !window.confirm(getUndoStartConfirmation(session))
    ) {
      return;
    }

    updateSession(sessionType, (currentSession) =>
      undoSessionStart(currentSession)
    );
    accountabilityStore.removeDistraction(sessionType);
    setSessionErrors((current) => ({
      ...current,
      [sessionType]: undefined,
    }));
    setTaskErrors((current) => ({
      ...current,
      [sessionType]: undefined,
    }));
  }

  function setSessionDistracted(
    sessionType: SessionType,
    distracted: boolean
  ) {
    const session = sessions.find(
      (currentSession) => currentSession.sessionType === sessionType
    );
    if (
      !session ||
      session.status === "upcoming" ||
      session.status === "missed" ||
      session.status === "skipped"
    ) {
      return;
    }

    if (!distracted) {
      const violationId = getAccountabilityViolationId(
        date,
        sessionType,
        "distracted"
      );
      const violation = accountabilityStore
        .getSnapshot()
        .violations.find(({ id }) => id === violationId);
      if (
        violation?.status === "completed" &&
        !window.confirm(
          "The handwritten page is already completed. Remove this completed accountability record?"
        )
      ) {
        return;
      }
    }

    updateSession(sessionType, (currentSession) => ({
      ...currentSession,
      distracted,
      distractionReason: distracted
        ? currentSession.distractionReason
        : null,
    }));

    if (distracted) {
      accountabilityStore.recordDistraction({ ...session, distracted: true });
    } else {
      accountabilityStore.removeDistraction(sessionType);
    }
  }

  function setDistractionReason(
    sessionType: SessionType,
    distractionReason: string
  ) {
    updateSession(sessionType, (session) => ({
      ...session,
      distractionReason:
        session.distracted === true ? distractionReason : null,
    }));
  }

  function addTask(sessionType: SessionType, details: TaskDetails) {
    const trimmedOutcome = details.outcome.trim();
    if (!trimmedOutcome) return;

    const timestamp = new Date().toISOString();
    const task: SessionTask = {
      id: crypto.randomUUID(),
      title: trimmedOutcome,
      outcome: trimmedOutcome,
      firstAction: details.firstAction,
      category: details.category,
      expectedDurationMinutes: details.expectedDurationMinutes,
      status: "pending",
      startedAt: null,
      finishedAt: null,
      workIntervals: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    updateSession(sessionType, (session) => ({
      ...session,
      tasks: [...session.tasks, task],
    }));
  }

  function startTask(sessionType: SessionType, taskId: string) {
    const now = new Date();
    let error: string | null = null;
    updateSession(sessionType, (session) => {
      const result = startSessionTask(session, taskId, now);
      error = result.error;
      return result.session;
    });
    setTaskErrors((current) => ({
      ...current,
      [sessionType]: error ?? undefined,
    }));
  }

  function completeTask(sessionType: SessionType, taskId: string) {
    const now = new Date();
    let error: string | null = null;
    updateSession(sessionType, (session) => {
      const result = completeSessionTask(session, taskId, now);
      error = result.error;
      return result.session;
    });
    setTaskErrors((current) => ({
      ...current,
      [sessionType]: error ?? undefined,
    }));
  }

  function pauseTask(sessionType: SessionType, taskId: string) {
    const now = new Date();
    let error: string | null = null;
    updateSession(sessionType, (session) => {
      const result = pauseSessionTask(session, taskId, now);
      error = result.error;
      return result.session;
    });
    setTaskErrors((current) => ({
      ...current,
      [sessionType]: error ?? undefined,
    }));
  }

  function reopenTask(sessionType: SessionType, taskId: string) {
    updateSession(sessionType, (session) =>
      reopenSessionTask(session, taskId)
    );
    setTaskErrors((current) => ({ ...current, [sessionType]: undefined }));
  }

  function editTask(
    sessionType: SessionType,
    taskId: string,
    details: TaskDetails
  ) {
    const trimmedOutcome = details.outcome.trim();
    if (!trimmedOutcome) return;
    const updatedAt = new Date().toISOString();
    updateSession(sessionType, (session) => ({
      ...session,
      tasks: session.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              outcome: trimmedOutcome,
              firstAction: details.firstAction,
              category: details.category,
              expectedDurationMinutes: details.expectedDurationMinutes,
              updatedAt,
            }
          : task
      ),
    }));
  }

  function deleteTask(sessionType: SessionType, taskId: string) {
    updateSession(sessionType, (session) => ({
      ...session,
      tasks: session.tasks.filter(
        (task) => task.id !== taskId || task.status === "running"
      ),
    }));
  }

  return (
    <AppShell activePage="today" compact fullWidth>
      <div className="space-y-5">
        {pendingAccountabilityCount > 0 ? (
          <Link
            href="/accountability"
            className="flex w-fit items-center gap-2 rounded-lg border border-[#FECDCA] bg-[#FFF6F5] px-3 py-2 text-[12px] font-bold text-[#B42318] transition-colors hover:bg-[#FEECE9] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#D92D20]/15"
          >
            <CircleAlert className="size-4" aria-hidden="true" />
            Accountability required · {pendingAccountabilityCount} pending
          </Link>
        ) : null}

        <div className="w-full space-y-5">
          <SessionTabs
            sessions={sessions}
            selectedSessionType={selectedSessionType}
            onSelect={selectSession}
          />

          {selectedSession ? (
            <div
              id="selected-session-panel"
              role="tabpanel"
              aria-labelledby={`session-tab-${selectedSession.sessionType}`}
              className="min-w-0"
            >
              <SessionCard
                key={selectedSession.id}
                session={selectedSession}
                timestamp={timingNow ?? undefined}
                onStart={() => startSession(selectedSession.sessionType)}
                onFinish={() => finishSession(selectedSession.sessionType)}
                onAddTask={(details) =>
                  addTask(selectedSession.sessionType, details)
                }
                onStartTask={(taskId) =>
                  startTask(selectedSession.sessionType, taskId)
                }
                onCompleteTask={(taskId) =>
                  completeTask(selectedSession.sessionType, taskId)
                }
                onPauseTask={(taskId) =>
                  pauseTask(selectedSession.sessionType, taskId)
                }
                onReopenTask={(taskId) =>
                  reopenTask(selectedSession.sessionType, taskId)
                }
                onEditTask={(taskId, details) =>
                  editTask(selectedSession.sessionType, taskId, details)
                }
                onDeleteTask={(taskId) =>
                  deleteTask(selectedSession.sessionType, taskId)
                }
                onActualStartChange={(clockTime) =>
                  correctSessionTime(
                    selectedSession.sessionType,
                    "start",
                    clockTime
                  )
                }
                onActualFinishChange={(clockTime) =>
                  correctSessionTime(
                    selectedSession.sessionType,
                    "finish",
                    clockTime
                  )
                }
                onEditSession={(startTime, finishTime) =>
                  editSession(
                    selectedSession.sessionType,
                    startTime,
                    finishTime
                  )
                }
                onReopen={() => reopenSession(selectedSession.sessionType)}
                onUndoStart={() => undoStart(selectedSession.sessionType)}
                onDistractedChange={(distracted) =>
                  setSessionDistracted(
                    selectedSession.sessionType,
                    distracted
                  )
                }
                onDistractionReasonChange={(reason) =>
                  setDistractionReason(
                    selectedSession.sessionType,
                    reason
                  )
                }
                actionError={sessionErrors[selectedSession.sessionType]}
                taskError={taskErrors[selectedSession.sessionType]}
              />
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
