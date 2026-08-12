"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Calendar } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
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
  formatTodayDate,
  getUndoStartConfirmation,
  getSessionTimeValidationError,
  pauseSessionTask,
  reopenSessionTask,
  startSessionTask,
  todayDateString,
  undoSessionStart,
  reopenCompletedSession,
} from "@/lib/session";
import type { Session, SessionTask, SessionType } from "@/types/session";
import { useAccountabilityReconciliation } from "@/lib/use-accountability-reconciliation";
import { useSessionTiming } from "@/lib/use-session-timing";

const subscribeToNothing = () => () => {};

export default function Home() {
  const [selectedSessionType, setSelectedSessionType] =
    useState<SessionType>("skill_mastery");
  const [sessionErrors, setSessionErrors] = useState<
    Partial<Record<SessionType, string>>
  >({});
  const [taskErrors, setTaskErrors] = useState<
    Partial<Record<SessionType, string>>
  >({});
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
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
  const timingNow = useSessionTiming(store, sessions);
  useAccountabilityReconciliation(accountabilityStore, sessions);
  const currentDate = isClient ? formatTodayDate() : "";
  const selectedSession =
    sessions.find(
      (session) => session.sessionType === selectedSessionType
    ) ?? sessions[0];

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
        violation?.pageCompleted &&
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

  function addTask(sessionType: SessionType, title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const timestamp = new Date().toISOString();
    const task: SessionTask = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
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

  function editTask(sessionType: SessionType, taskId: string, title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const updatedAt = new Date().toISOString();
    updateSession(sessionType, (session) => ({
      ...session,
      tasks: session.tasks.map((task) =>
        task.id === taskId ? { ...task, title: trimmedTitle, updatedAt } : task
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
    <AppShell activePage="today">
      <div className="space-y-8">
        <PageHeader
          title="Today's Sessions"
          eyebrow={currentDate}
          icon={Calendar}
        />

        <div className="mx-auto w-full max-w-[940px] space-y-5">
          <SessionTabs
            sessions={sessions}
            selectedSessionType={selectedSessionType}
            onSelect={setSelectedSessionType}
          />

          {selectedSession ? (
            <div
              id="selected-session-panel"
              role="tabpanel"
              aria-labelledby={`session-tab-${selectedSession.sessionType}`}
            >
                <SessionCard
                  key={selectedSession.id}
                  session={selectedSession}
                  timestamp={timingNow ?? undefined}
                  onStart={() => startSession(selectedSession.sessionType)}
                  onFinish={() => finishSession(selectedSession.sessionType)}
                  onAddTask={(title) =>
                    addTask(selectedSession.sessionType, title)
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
                  onEditTask={(taskId, title) =>
                    editTask(selectedSession.sessionType, taskId, title)
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
                  onReopen={() =>
                    reopenSession(selectedSession.sessionType)
                  }
                  onUndoStart={() =>
                    undoStart(selectedSession.sessionType)
                  }
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
