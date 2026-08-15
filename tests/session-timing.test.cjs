/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveProjectAlias(
  request,
  parent,
  isMain,
  options
) {
  const resolvedRequest = request.startsWith("@/")
    ? path.join(projectRoot, request.slice(2))
    : request;
  return originalResolveFilename.call(
    this,
    resolvedRequest,
    parent,
    isMain,
    options
  );
};

Module._extensions[".ts"] = function transpileTypeScript(module, filename) {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  calculateDeepWorkDuration,
  calculateSessionElapsedDuration,
  calculateLateMinutes,
  calculateTaskDuration,
  casablancaWallTimeToDate,
  completeSessionTask,
  correctActualSessionTime,
  editCompletedSession,
  evaluateDistractionRule,
  evaluateStartTimeRule,
  finalizeRunningTaskAtSessionEnd,
  getCurrentScheduledSessionType,
  getNextScheduledSessionStart,
  getSessionExecutionResult,
  getSessionLabel,
  getSessionTimeValidationError,
  getTrackedTaskTime,
  pauseSessionTask,
  resolveExpiredSession,
  reopenCompletedSession,
  reopenSessionTask,
  startSessionTask,
  undoSessionStart,
} = require("../lib/session.ts");
const { createDailySessionStore } = require("../lib/local-sessions.ts");
const { getDailyExecutionMetrics } = require("../lib/report.ts");
const { SESSION_SCHEDULE } = require("../types/session.ts");

const storage = new Map();
global.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    key: (index) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size;
    },
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};

function toIso(date, time) {
  const instant = casablancaWallTimeToDate(date, time);
  assert.ok(instant, `Expected a valid Casablanca instant for ${date} ${time}`);
  return instant.toISOString();
}

function task({
  id,
  date,
  status = "pending",
  start = null,
  finish = null,
  outcome = "Produce the intended test result",
  expectedDurationMinutes = 30,
}) {
  const createdAt = toIso(date, "08:00");
  const startedAt = start === null ? null : toIso(date, start);
  const finishedAt = finish === null ? null : toIso(date, finish);
  return {
    id,
    title: `Task ${id}`,
    outcome,
    firstAction: "Begin the first test action",
    category: "creative_mastery",
    expectedDurationMinutes,
    status,
    startedAt,
    finishedAt,
    workIntervals:
      startedAt === null
        ? []
        : [{ startedAt, endedAt: status === "running" ? null : finishedAt }],
    createdAt,
    updatedAt: finish === null ? createdAt : toIso(date, finish),
  };
}

function session({
  date,
  sessionType = "skill_mastery",
  start = null,
  finish = null,
  status = start === null
    ? "upcoming"
    : finish === null
      ? "running"
      : "completed",
  distracted = null,
  distractionReason = null,
  tasks = [],
}) {
  return {
    id: `${date}:${sessionType}`,
    sessionType,
    startedAt: start === null ? null : toIso(date, start),
    finishedAt: finish === null ? null : toIso(date, finish),
    finishTarget:
      status === "running"
        ? SESSION_SCHEDULE[sessionType].plannedFinish
        : null,
    distracted,
    distractionReason,
    status,
    tasks,
    date,
  };
}

function run() {
  const originalSkillFinish = SESSION_SCHEDULE.skill_mastery.plannedFinish;
  const originalClientFinish =
    SESSION_SCHEDULE.client_acquisition.plannedFinish;

  try {
    assert.equal(getSessionLabel("skill_mastery"), "Session 1");
    assert.equal(getSessionLabel("client_acquisition"), "Session 2");
    assert.equal(getSessionLabel("execution"), "Session 3");

    const scheduleDate = "2026-08-10";
    const scheduledSessions = [
      session({ date: scheduleDate, sessionType: "skill_mastery" }),
      session({ date: scheduleDate, sessionType: "client_acquisition" }),
      session({ date: scheduleDate, sessionType: "execution" }),
    ];

    SESSION_SCHEDULE.skill_mastery.plannedFinish = "11:00";
    SESSION_SCHEDULE.client_acquisition.plannedFinish = "16:00";

    assert.equal(
      getCurrentScheduledSessionType(
        scheduledSessions,
        casablancaWallTimeToDate(scheduleDate, "09:00")
      ),
      "skill_mastery"
    );
    assert.equal(
      getCurrentScheduledSessionType(
        scheduledSessions,
        casablancaWallTimeToDate(scheduleDate, "11:00")
      ),
      null,
      "The official end is outside the session window"
    );
    assert.equal(
      getCurrentScheduledSessionType(
        scheduledSessions,
        casablancaWallTimeToDate(scheduleDate, "14:00")
      ),
      "client_acquisition"
    );
    assert.equal(
      getCurrentScheduledSessionType(
        scheduledSessions,
        casablancaWallTimeToDate(scheduleDate, "16:30")
      ),
      null,
      "No session is forced between scheduled windows"
    );
    assert.equal(
      getCurrentScheduledSessionType(
        scheduledSessions,
        casablancaWallTimeToDate(scheduleDate, "18:00")
      ),
      "execution"
    );
    assert.equal(
      getCurrentScheduledSessionType(
        scheduledSessions,
        casablancaWallTimeToDate("2026-08-11", "09:30")
      ),
      null,
      "Session selection is date-aware"
    );
    assert.equal(
      getNextScheduledSessionStart(
        scheduledSessions,
        casablancaWallTimeToDate(scheduleDate, "13:30")
      )?.toISOString(),
      toIso(scheduleDate, "14:00"),
      "Manual inspection expires when the next session begins"
    );
    assert.equal(
      getNextScheduledSessionStart(
        scheduledSessions,
        casablancaWallTimeToDate(scheduleDate, "18:00")
      ),
      null,
      "The final session has no same-day automatic successor"
    );

    const date = "2026-08-10";
    const afterSkillCutoff = casablancaWallTimeToDate(date, "11:30");
    const afterClientCutoff = casablancaWallTimeToDate(date, "16:30");
    assert.ok(afterSkillCutoff && afterClientCutoff);

    const onTime = session({ date, start: "09:00" });
    assert.equal(evaluateStartTimeRule(onTime), "respected");
    assert.equal(calculateLateMinutes(onTime), 0);

    const late = session({ date, start: "09:17" });
    assert.equal(evaluateStartTimeRule(late), "broken");
    assert.equal(calculateLateMinutes(late), 17);

    const missed = resolveExpiredSession(
      session({ date }),
      afterSkillCutoff
    );
    assert.equal(missed.status, "missed");
    assert.equal(missed.startedAt, null);
    assert.equal(getSessionExecutionResult(missed).deepWorkMinutes, 0);
    const missedStore = createDailySessionStore("2026-08-14");
    missedStore.update(() => [session({ date: "2026-08-14" })]);
    assert.equal(
      missedStore.reconcileExpiredSessions(
        casablancaWallTimeToDate("2026-08-14", "11:30")
      ),
      true
    );
    assert.equal(
      createDailySessionStore("2026-08-14").getSnapshot()[0].status,
      "missed"
    );

    const distractionRespected = session({
      date,
      start: "09:00",
      distracted: false,
    });
    assert.equal(
      evaluateDistractionRule(distractionRespected),
      "respected"
    );

    const distracted = session({
      date,
      start: "09:00",
      distracted: true,
      distractionReason: "Opened social media",
    });
    assert.equal(evaluateDistractionRule(distracted), "broken");
    const distractionStore = createDailySessionStore("2026-08-11");
    distractionStore.update(() => [
      { ...distracted, date: "2026-08-11", id: "2026-08-11:skill_mastery" },
    ]);
    const persistedDistraction = createDailySessionStore(
      "2026-08-11"
    ).getSnapshot()[0];
    assert.equal(persistedDistraction.distracted, true);
    assert.equal(
      persistedDistraction.distractionReason,
      "Opened social media"
    );

    const oneTaskSession = session({
      date,
      start: "09:00",
      finish: "11:00",
      tasks: [
        task({
          id: "one",
          date,
          status: "completed",
          start: "09:10",
          finish: "09:45",
        }),
      ],
    });
    assert.equal(
      calculateTaskDuration(oneTaskSession.tasks[0], oneTaskSession),
      35 * 60
    );

    const twoTaskSession = session({
      date,
      start: "09:00",
      finish: "11:00",
      tasks: [
        task({
          id: "a",
          date,
          status: "completed",
          start: "09:10",
          finish: "09:40",
        }),
        task({
          id: "b",
          date,
          status: "completed",
          start: "09:45",
          finish: "10:30",
        }),
      ],
    });
    assert.equal(getTrackedTaskTime(twoTaskSession), 75 * 60);

    const overlappingSession = session({
      date,
      start: "09:00",
      finish: "11:00",
      tasks: [
        task({ id: "overlap-a", date, status: "completed", start: "09:10", finish: "10:00" }),
        task({ id: "overlap-b", date, status: "completed", start: "09:30", finish: "10:30" }),
      ],
    });
    assert.equal(
      calculateDeepWorkDuration(overlappingSession),
      80,
      "Overlapping corrupt intervals are merged instead of double-counted"
    );

    const intervalSession = session({
      date,
      start: "09:00",
      tasks: [task({ id: "focus", date })],
    });
    assert.equal(
      calculateDeepWorkDuration(
        intervalSession,
        casablancaWallTimeToDate(date, "09:20")
      ),
      0,
      "A running session without an active task records no Deep Work"
    );
    const unclearSession = session({
      date,
      start: "09:00",
      tasks: [
        task({
          id: "unclear",
          date,
          outcome: null,
          expectedDurationMinutes: null,
        }),
      ],
    });
    const unclearStart = startSessionTask(
      unclearSession,
      "unclear",
      casablancaWallTimeToDate(date, "09:15")
    );
    assert.equal(
      unclearStart.error,
      "Add an outcome and estimated time before starting this task."
    );
    assert.equal(unclearStart.session.tasks[0].status, "pending");
    const intervalStarted = startSessionTask(
      intervalSession,
      "focus",
      casablancaWallTimeToDate(date, "09:20")
    ).session;
    const intervalPaused = pauseSessionTask(
      intervalStarted,
      "focus",
      casablancaWallTimeToDate(date, "09:50")
    ).session;
    assert.equal(calculateDeepWorkDuration(intervalPaused), 30);
    const intervalResumed = startSessionTask(
      intervalPaused,
      "focus",
      casablancaWallTimeToDate(date, "10:10")
    ).session;
    const intervalCompleted = completeSessionTask(
      intervalResumed,
      "focus",
      casablancaWallTimeToDate(date, "10:40")
    ).session;
    assert.equal(intervalCompleted.tasks[0].workIntervals.length, 2);
    assert.equal(calculateDeepWorkDuration(intervalCompleted), 60);
    assert.equal(
      calculateSessionElapsedDuration(
        { ...intervalCompleted, status: "completed", finishedAt: toIso(date, "11:00") }
      ),
      120,
      "Session Duration remains independent from task-based Deep Work"
    );

    const persistenceDate = "2026-08-15";
    const persistenceBase = session({
      date: persistenceDate,
      start: "09:00",
      tasks: [task({ id: "persisted", date: persistenceDate })],
    });
    const persistedRunning = startSessionTask(
      persistenceBase,
      "persisted",
      casablancaWallTimeToDate(persistenceDate, "09:10")
    ).session;
    createDailySessionStore(persistenceDate).update(() => [persistedRunning]);
    const refreshedRunning = createDailySessionStore(persistenceDate).getSnapshot()[0];
    assert.equal(refreshedRunning.tasks[0].status, "running");
    assert.equal(
      calculateDeepWorkDuration(
        refreshedRunning,
        casablancaWallTimeToDate(persistenceDate, "09:25")
      ),
      15
    );
    const persistedPaused = pauseSessionTask(
      refreshedRunning,
      "persisted",
      casablancaWallTimeToDate(persistenceDate, "09:25")
    ).session;
    createDailySessionStore(persistenceDate).update(() => [persistedPaused]);
    const refreshedPaused = createDailySessionStore(persistenceDate).getSnapshot()[0];
    assert.equal(
      calculateDeepWorkDuration(
        refreshedPaused,
        casablancaWallTimeToDate(persistenceDate, "10:25")
      ),
      15,
      "Paused tasks do not accumulate time after refresh"
    );

    const parallelBase = session({
      date,
      start: "09:00",
      tasks: [task({ id: "a", date }), task({ id: "b", date })],
    });
    const firstStarted = startSessionTask(
      parallelBase,
      "a",
      casablancaWallTimeToDate(date, "09:10")
    );
    assert.equal(firstStarted.error, null);
    const secondAttempt = startSessionTask(
      firstStarted.session,
      "b",
      casablancaWallTimeToDate(date, "09:15")
    );
    assert.equal(secondAttempt.error, null);
    assert.equal(secondAttempt.session.tasks[0].status, "paused");
    assert.equal(secondAttempt.session.tasks[1].status, "running");

    const autoEndBase = session({
      date,
      start: "09:00",
      tasks: [
        task({ id: "auto", date, status: "running", start: "10:30" }),
        task({
          id: "paused",
          date,
          status: "paused",
          start: "09:30",
          finish: "10:00",
        }),
        task({ id: "pending", date }),
      ],
    });
    const autoEnded = resolveExpiredSession(autoEndBase, afterSkillCutoff);
    assert.equal(autoEnded.status, "completed");
    assert.equal(autoEnded.tasks[0].status, "completed");
    assert.equal(autoEnded.tasks[0].finishedAt, toIso(date, "11:00"));
    assert.equal(autoEnded.tasks[0].workIntervals[0].endedAt, toIso(date, "11:00"));
    assert.equal(calculateTaskDuration(autoEnded.tasks[0], autoEnded), 30 * 60);
    assert.equal(autoEnded.tasks[1].status, "paused");
    assert.equal(autoEnded.tasks[2].status, "pending");
    assert.strictEqual(
      resolveExpiredSession(autoEnded, afterSkillCutoff),
      autoEnded,
      "Repeated cutoff reconciliation is idempotent"
    );
    const defensivelyCapped = finalizeRunningTaskAtSessionEnd(
      autoEndBase,
      afterSkillCutoff
    );
    assert.equal(
      defensivelyCapped.tasks[0].finishedAt,
      toIso(date, "11:00"),
      "Task completion cannot exceed the official session end"
    );

    const manualEndTime = casablancaWallTimeToDate(date, "10:42");
    assert.ok(manualEndTime);
    const manualEndBase = session({
      date,
      start: "09:00",
      tasks: [
        task({ id: "manual", date, status: "running", start: "10:05" }),
      ],
    });
    const manuallyEnded = finalizeRunningTaskAtSessionEnd(
      {
        ...manualEndBase,
        status: "completed",
        finishedAt: manualEndTime.toISOString(),
      },
      manualEndTime
    );
    assert.equal(manuallyEnded.tasks[0].status, "completed");
    assert.equal(manuallyEnded.tasks[0].finishedAt, toIso(date, "10:42"));
    assert.equal(manuallyEnded.tasks[0].workIntervals[0].endedAt, toIso(date, "10:42"));
    assert.equal(
      calculateTaskDuration(manuallyEnded.tasks[0], manuallyEnded),
      37 * 60
    );
    const reopenedManual = reopenCompletedSession(manuallyEnded);
    const reopenedManualTask = reopenSessionTask(
      reopenedManual,
      "manual"
    );
    const resumedManual = startSessionTask(
      reopenedManualTask,
      "manual",
      casablancaWallTimeToDate(date, "10:50")
    ).session;
    const completedManual = completeSessionTask(
      resumedManual,
      "manual",
      casablancaWallTimeToDate(date, "10:55")
    ).session;
    assert.equal(completedManual.tasks[0].workIntervals.length, 2);
    assert.equal(calculateDeepWorkDuration(completedManual), 42);

    const neverStarted = completeSessionTask(
      session({ date, start: "09:00", tasks: [task({ id: "zero", date })] }),
      "zero",
      casablancaWallTimeToDate(date, "09:30")
    ).session;
    assert.equal(neverStarted.tasks[0].status, "completed");
    assert.equal(calculateDeepWorkDuration(neverStarted), 0);

    const closedDate = "2026-08-12";
    const closedSession = session({
      date: closedDate,
      start: "09:17",
      tasks: [
        task({
          id: "closed",
          date: closedDate,
          status: "running",
          start: "10:30",
        }),
      ],
    });
    const closedStore = createDailySessionStore(closedDate);
    closedStore.update(() => [closedSession]);
    const reopenedStore = createDailySessionStore(closedDate);
    assert.equal(
      reopenedStore.reconcileExpiredSessions(
        casablancaWallTimeToDate(closedDate, "11:30")
      ),
      true
    );
    const reopened = createDailySessionStore(closedDate).getSnapshot()[0];
    assert.equal(reopened.status, "completed");
    assert.equal(reopened.finishedAt, toIso(closedDate, "11:00"));
    assert.equal(reopened.tasks[0].status, "completed");
    assert.equal(reopened.tasks[0].finishedAt, toIso(closedDate, "11:00"));
    assert.equal(reopened.tasks[0].workIntervals[0].endedAt, toIso(closedDate, "11:00"));
    assert.equal(calculateDeepWorkDuration(reopened), 30);
    assert.equal(
      reopenedStore.reconcileExpiredSessions(
        casablancaWallTimeToDate(closedDate, "12:00")
      ),
      false,
      "Persisted automatic completion is not applied twice"
    );

    const legacyDate = "2026-08-13";
    storage.set(
      `work-session-tracker:daily-sessions:${legacyDate}`,
      JSON.stringify({
        version: 1,
        sessions: [
          {
            id: `${legacyDate}:skill_mastery`,
            sessionType: "skill_mastery",
            startedAt: toIso(legacyDate, "09:00"),
            finishedAt: null,
            finishTarget: "11:00",
            distracted: false,
            status: "in_progress",
            date: legacyDate,
            tasks: [
              {
                id: "legacy",
                title: "Legacy task",
                completed: true,
                createdAt: toIso(legacyDate, "09:05"),
              },
            ],
          },
        ],
      })
    );
    const legacy = createDailySessionStore(legacyDate).getSnapshot()[0];
    assert.equal(legacy.status, "running");
    assert.equal(legacy.distracted, null);
    assert.equal(legacy.distractionReason, null);
    assert.equal(legacy.tasks[0].status, "completed");
    assert.equal(legacy.tasks[0].outcome, null);
    assert.equal(legacy.tasks[0].firstAction, null);
    assert.equal(legacy.tasks[0].expectedDurationMinutes, null);
    assert.equal(legacy.tasks[0].startedAt, null);
    assert.equal(calculateTaskDuration(legacy.tasks[0], legacy), 0);

    const projectMigrationDate = "2026-08-12";
    storage.set(
      `work-session-tracker:daily-sessions:${projectMigrationDate}`,
      JSON.stringify({
        version: 6,
        sessions: [
          {
            id: `${projectMigrationDate}:skill_mastery`,
            sessionType: "skill_mastery",
            status: "upcoming",
            projectName: "MyBeauty Creative",
            projectStage: "script",
            projectDeadline: "2026-08-17",
            date: projectMigrationDate,
            tasks: [
              {
                id: "session-context-task",
                title: "Write hooks",
                outcome: "Produce five hooks",
                firstAction: null,
                category: "business_operations",
                expectedDurationMinutes: 45,
                status: "pending",
                createdAt: toIso(projectMigrationDate, "08:00"),
              },
              {
                id: "task-context-task",
                title: "Deliver assets",
                outcome: "Send final assets",
                firstAction: null,
                projectName: "Second Project",
                projectStage: "delivered",
                category: "client_execution",
                expectedDurationMinutes: 30,
                status: "pending",
                createdAt: toIso(projectMigrationDate, "08:05"),
              },
            ],
          },
        ],
      })
    );
    const migratedProject = createDailySessionStore(
      projectMigrationDate
    ).getSnapshot()[0];
    assert.equal(
      Object.hasOwn(migratedProject, "projectName"),
      false,
      "legacy session project data is not carried into the task system"
    );
    assert.equal(migratedProject.tasks[0].category, "business_operations");
    for (const task of migratedProject.tasks) {
      assert.equal(Object.hasOwn(task, "projectName"), false);
      assert.equal(Object.hasOwn(task, "projectStage"), false);
      assert.equal(Object.hasOwn(task, "originalProjectStage"), false);
      assert.equal(Object.hasOwn(task, "projectDeadline"), false);
    }

    const afternoon = session({
      date,
      sessionType: "client_acquisition",
      start: "14:36",
    });
    assert.equal(calculateDeepWorkDuration(afternoon, afterClientCutoff), 0);

    const completedTask = completeSessionTask(
      firstStarted.session,
      "a",
      casablancaWallTimeToDate(date, "09:40")
    );
    assert.equal(completedTask.session.tasks[0].status, "completed");

    const correctionBase = session({
      date,
      start: "09:07",
      finish: "10:42",
    });
    const correctedStart = correctActualSessionTime(
      correctionBase,
      "start",
      "09:15"
    );
    assert.equal(correctedStart.error, null);
    assert.equal(calculateLateMinutes(correctedStart.session), 15);
    assert.equal(calculateDeepWorkDuration(correctedStart.session), 0);

    const correctedFinish = correctActualSessionTime(
      correctedStart.session,
      "finish",
      "10:40"
    );
    assert.equal(correctedFinish.error, null);
    assert.equal(calculateDeepWorkDuration(correctedFinish.session), 0);

    const editedCompleted = editCompletedSession(
      correctionBase,
      { startTime: "09:00", finishTime: "10:55" },
      afterSkillCutoff
    );
    assert.equal(editedCompleted.error, null);
    assert.equal(editedCompleted.session.id, correctionBase.id);
    assert.equal(calculateDeepWorkDuration(editedCompleted.session), 0);

    const preservedTasks = [
      task({
        id: "preserved",
        date,
        status: "completed",
        start: "09:15",
        finish: "09:45",
      }),
    ];
    const recoverable = session({
      date,
      start: "09:00",
      finish: "10:05",
      distracted: true,
      distractionReason: "Notification",
      tasks: preservedTasks,
    });
    const recovered = reopenCompletedSession(recoverable);
    assert.equal(recovered.id, recoverable.id);
    assert.equal(recovered.status, "running");
    assert.equal(recovered.startedAt, recoverable.startedAt);
    assert.equal(recovered.finishedAt, null);
    assert.strictEqual(recovered.tasks, preservedTasks);
    assert.equal(recovered.distracted, true);
    assert.equal(recovered.distractionReason, "Notification");

    const recoveryStore = createDailySessionStore(date);
    recoveryStore.update(() => [recovered]);
    const persistedRecovery = createDailySessionStore(date).getSnapshot()[0];
    assert.equal(persistedRecovery.id, recoverable.id);
    assert.equal(persistedRecovery.status, "running");
    assert.equal(persistedRecovery.finishedAt, null);
    assert.equal(persistedRecovery.tasks[0].status, "completed");
    assert.equal(persistedRecovery.distracted, true);

    const correctedEnd = casablancaWallTimeToDate(date, "10:45");
    assert.ok(correctedEnd);
    const completedAgain = finalizeRunningTaskAtSessionEnd(
      {
        ...recovered,
        status: "completed",
        finishedAt: correctedEnd.toISOString(),
      },
      correctedEnd
    );
    assert.equal(completedAgain.id, recoverable.id);
    assert.equal(completedAgain.status, "completed");
    assert.equal(calculateDeepWorkDuration(completedAgain), 30);
    assert.equal(completedAgain.tasks[0].status, "completed");

    recoveryStore.update(() => [editedCompleted.session]);
    const persistedEdit = createDailySessionStore(date).getSnapshot()[0];
    assert.equal(persistedEdit.id, correctionBase.id);
    assert.equal(calculateDeepWorkDuration(persistedEdit), 0);
    assert.equal(
      getDailyExecutionMetrics([persistedEdit], afterSkillCutoff)
        .deepWorkMinutes,
      0
    );

    const negativeDuration = correctActualSessionTime(
      correctedFinish.session,
      "finish",
      "09:14"
    );
    assert.equal(
      negativeDuration.error,
      "Actual Finish cannot be earlier than Actual Start."
    );
    assert.strictEqual(negativeDuration.session, correctedFinish.session);

    const pastCutoff = correctActualSessionTime(
      correctedFinish.session,
      "finish",
      "11:01"
    );
    assert.equal(
      pastCutoff.error,
      "Actual Finish cannot be later than the official end time of 11:00 AM."
    );

    const taskBoundarySession = session({
      date,
      start: "09:00",
      finish: "11:00",
      tasks: [
        task({
          id: "boundary",
          date,
          status: "completed",
          start: "09:20",
          finish: "09:40",
        }),
      ],
    });
    const taskStartConflict = correctActualSessionTime(
      taskBoundarySession,
      "start",
      "09:25"
    );
    assert.equal(
      taskStartConflict.error,
      "Actual Start cannot be later than an existing task time."
    );
    const taskFinishConflict = correctActualSessionTime(
      taskBoundarySession,
      "finish",
      "09:35"
    );
    assert.equal(
      taskFinishConflict.error,
      "Actual Finish cannot be earlier than an existing task time."
    );
    assert.equal(
      taskBoundarySession.tasks[0].finishedAt,
      toIso(date, "09:40")
    );
    assert.equal(SESSION_SCHEDULE.skill_mastery.plannedStart, "09:00");
    assert.equal(SESSION_SCHEDULE.skill_mastery.plannedFinish, "11:00");

    SESSION_SCHEDULE.client_acquisition.plannedFinish = "17:00";
    const earlyDate = "2026-08-10";
    const earlyStartTime = casablancaWallTimeToDate(earlyDate, "13:20");
    const earlyFinishTime = casablancaWallTimeToDate(earlyDate, "13:50");
    const correctionNow = casablancaWallTimeToDate(earlyDate, "13:30");
    const afterOfficialEnd = casablancaWallTimeToDate(earlyDate, "17:30");
    assert.ok(
      earlyStartTime &&
        earlyFinishTime &&
        correctionNow &&
        afterOfficialEnd
    );

    const upcomingClient = session({
      date: earlyDate,
      sessionType: "client_acquisition",
    });
    assert.equal(
      getSessionTimeValidationError(upcomingClient, "start", earlyStartTime),
      null
    );
    const earlyRunning = session({
      date: earlyDate,
      sessionType: "client_acquisition",
      start: "13:20",
    });
    assert.equal(earlyRunning.status, "running");
    assert.equal(evaluateStartTimeRule(earlyRunning), "respected");
    assert.equal(calculateLateMinutes(earlyRunning), 0);

    const lateClient = session({
      date: earlyDate,
      sessionType: "client_acquisition",
      start: "14:07",
    });
    assert.equal(evaluateStartTimeRule(lateClient), "broken");
    assert.equal(calculateLateMinutes(lateClient), 7);

    assert.equal(
      getSessionTimeValidationError(
        earlyRunning,
        "finish",
        earlyFinishTime
      ),
      null
    );
    const earlyCompleted = {
      ...earlyRunning,
      status: "completed",
      finishedAt: earlyFinishTime.toISOString(),
    };
    assert.equal(calculateDeepWorkDuration(earlyCompleted), 0);

    const forgottenEarly = resolveExpiredSession(
      earlyRunning,
      afterOfficialEnd
    );
    assert.equal(forgottenEarly.status, "completed");
    assert.equal(forgottenEarly.finishedAt, toIso(earlyDate, "17:00"));
    assert.equal(calculateDeepWorkDuration(forgottenEarly), 0);

    const undoBase = {
      ...earlyRunning,
      distracted: true,
      distractionReason: "Accidental start",
      tasks: [
        task({
          id: "undo",
          date: earlyDate,
          status: "running",
          start: "13:25",
        }),
      ],
    };
    const undone = undoSessionStart(undoBase, correctionNow);
    assert.equal(undone.status, "upcoming");
    assert.equal(undone.startedAt, null);
    assert.equal(undone.finishedAt, null);
    assert.equal(undone.distracted, null);
    assert.equal(undone.tasks[0].status, "pending");
    assert.equal(undone.tasks[0].startedAt, null);
    assert.deepEqual(undone.tasks[0].workIntervals, []);

    const correctedEarlyStart = correctActualSessionTime(
      earlyRunning,
      "start",
      "13:15",
      correctionNow
    );
    assert.equal(correctedEarlyStart.error, null);
    assert.equal(evaluateStartTimeRule(correctedEarlyStart.session), "respected");
    assert.equal(
      calculateDeepWorkDuration(correctedEarlyStart.session, correctionNow),
      0
    );

    const futureStart = correctActualSessionTime(
      earlyRunning,
      "start",
      "14:07",
      correctionNow
    );
    assert.equal(futureStart.error, "Actual Start cannot be in the future.");

    const correctedEarlyFinish = correctActualSessionTime(
      forgottenEarly,
      "finish",
      "16:35",
      afterOfficialEnd
    );
    assert.equal(correctedEarlyFinish.error, null);
    assert.equal(calculateDeepWorkDuration(correctedEarlyFinish.session), 0);

    assert.equal(
      fs.existsSync(path.join(projectRoot, "components", "session-timeline.tsx")),
      false
    );
  } finally {
    SESSION_SCHEDULE.skill_mastery.plannedFinish = originalSkillFinish;
    SESSION_SCHEDULE.client_acquisition.plannedFinish = originalClientFinish;
  }

  console.log("Session execution verification passed.");
}

run();
