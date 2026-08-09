"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Calendar } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SessionCard } from "@/components/session-card";
import {
  createAccountabilityStore,
  getAccountabilityViolationId,
} from "@/lib/local-accountability";
import { createDailySessionStore } from "@/lib/local-sessions";
import {
  formatTodayDate,
  getDefaultFinishTarget,
  getFinishTargetValidationError,
  getSessionLabel,
  getSessionTimeValidationError,
  todayDateString,
} from "@/lib/session";
import type { Session, SessionTask, SessionType } from "@/types/session";
import { useAccountabilityReconciliation } from "@/lib/use-accountability-reconciliation";

const subscribeToNothing = () => () => {};

export default function Home() {
  const [selectedSessionType, setSelectedSessionType] =
    useState<SessionType>("skill_mastery");
  const [sessionErrors, setSessionErrors] = useState<
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
    if (!session || session.status !== "not_started") return;

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
      session.status === "not_started"
        ? {
            ...session,
            startedAt: now.toISOString(),
            finishTarget: getDefaultFinishTarget(session.sessionType),
            status: "in_progress",
          }
        : session
    );
  }

  function finishSession(sessionType: SessionType) {
    const session = sessions.find(
      (currentSession) => currentSession.sessionType === sessionType
    );
    if (!session || session.status !== "in_progress") return;

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
      session.status === "in_progress"
        ? {
            ...session,
            finishedAt: now.toISOString(),
            status: "completed",
          }
        : session
    );
  }

  function setFinishTarget(sessionType: SessionType, finishTarget: string) {
    const session = sessions.find(
      (currentSession) => currentSession.sessionType === sessionType
    );
    if (!session || session.status !== "in_progress") return;

    const validationError = getFinishTargetValidationError(
      session,
      finishTarget
    );
    if (validationError) {
      setSessionErrors((current) => ({
        ...current,
        [sessionType]: validationError,
      }));
      return;
    }

    setSessionErrors((current) => ({ ...current, [sessionType]: undefined }));
    updateSession(sessionType, (currentSession) => ({
      ...currentSession,
      finishTarget,
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
      session.status === "not_started" ||
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
    }));

    if (distracted) {
      accountabilityStore.recordDistraction({ ...session, distracted: true });
    } else {
      accountabilityStore.removeDistraction(sessionType);
    }
  }

  function addTask(sessionType: SessionType, title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const task: SessionTask = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    updateSession(sessionType, (session) => ({
      ...session,
      tasks: [...session.tasks, task],
    }));
  }

  function setTaskCompleted(
    sessionType: SessionType,
    taskId: string,
    completed: boolean
  ) {
    updateSession(sessionType, (session) => ({
      ...session,
      tasks: session.tasks.map((task) =>
        task.id === taskId ? { ...task, completed } : task
      ),
    }));
  }

  function deleteTask(sessionType: SessionType, taskId: string) {
    updateSession(sessionType, (session) => ({
      ...session,
      tasks: session.tasks.filter((task) => task.id !== taskId),
    }));
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <AppHeader activePage="today" />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-8 py-7">
        <div className="flex flex-col gap-6">
          <div className="border-b border-border pb-5">
            <div className="mb-1.5 flex items-center gap-1.5 text-text-muted">
              <Calendar className="size-3.5" />
              <span className="text-[12px] font-medium">{currentDate}</span>
            </div>
            <h1 className="text-[28px] font-semibold leading-8">
              Today&apos;s Sessions
            </h1>
          </div>

          <div className="mx-auto w-full max-w-[760px] space-y-4">
            <div
              className="grid grid-cols-3 gap-3"
              role="group"
              aria-label="Daily sessions"
            >
              {sessions.map((session) => {
                const isSelected =
                  session.sessionType === selectedSessionType;

                return (
                  <button
                    key={session.id}
                    id={`session-tab-${session.sessionType}`}
                    type="button"
                    aria-pressed={isSelected}
                    aria-expanded={isSelected}
                    aria-controls="selected-session-panel"
                    onClick={() =>
                      setSelectedSessionType(session.sessionType)
                    }
                    className={`h-11 rounded-lg border px-4 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/20 ${
                      isSelected
                        ? "border-[#2D2D83] bg-[#2D2D83] text-white shadow-[0_4px_12px_rgba(45,45,131,0.16)]"
                        : "border-border bg-card text-foreground hover:border-[#8079AF] hover:bg-card"
                    }`}
                  >
                    {getSessionLabel(session.sessionType)}
                  </button>
                );
              })}
            </div>

            {selectedSession && (
              <div
                id="selected-session-panel"
                role="region"
                aria-labelledby={`session-tab-${selectedSession.sessionType}`}
              >
                <SessionCard
                  key={selectedSession.id}
                  session={selectedSession}
                  onStart={() => startSession(selectedSession.sessionType)}
                  onFinish={() => finishSession(selectedSession.sessionType)}
                  onAddTask={(title) =>
                    addTask(selectedSession.sessionType, title)
                  }
                  onTaskCompletedChange={(taskId, completed) =>
                    setTaskCompleted(
                      selectedSession.sessionType,
                      taskId,
                      completed
                    )
                  }
                  onDeleteTask={(taskId) =>
                    deleteTask(selectedSession.sessionType, taskId)
                  }
                  onFinishTargetChange={(finishTarget) =>
                    setFinishTarget(
                      selectedSession.sessionType,
                      finishTarget
                    )
                  }
                  onDistractedChange={(distracted) =>
                    setSessionDistracted(
                      selectedSession.sessionType,
                      distracted
                    )
                  }
                  actionError={sessionErrors[selectedSession.sessionType]}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
