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
  calculateLateMinutes,
  calculateTaskDuration,
  casablancaWallTimeToDate,
  completeSessionTask,
  correctActualSessionTime,
  evaluateDistractionRule,
  evaluateStartTimeRule,
  finalizeRunningTaskAtSessionEnd,
  getSessionExecutionResult,
  getSessionTimeValidationError,
  getTrackedTaskTime,
  resolveExpiredSession,
  startSessionTask,
  undoSessionStart,
} = require("../lib/session.ts");
const { createDailySessionStore } = require("../lib/local-sessions.ts");
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
}) {
  const createdAt = toIso(date, "08:00");
  return {
    id,
    title: `Task ${id}`,
    status,
    startedAt: start === null ? null : toIso(date, start),
    finishedAt: finish === null ? null : toIso(date, finish),
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
    SESSION_SCHEDULE.skill_mastery.plannedFinish = "11:00";
    SESSION_SCHEDULE.client_acquisition.plannedFinish = "16:00";

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
    assert.equal(
      secondAttempt.error,
      "Complete the current task before starting another."
    );
    assert.equal(secondAttempt.session.tasks[1].status, "pending");

    const autoEndBase = session({
      date,
      start: "09:00",
      tasks: [
        task({ id: "auto", date, status: "running", start: "10:30" }),
      ],
    });
    const autoEnded = resolveExpiredSession(autoEndBase, afterSkillCutoff);
    assert.equal(autoEnded.status, "completed");
    assert.equal(autoEnded.tasks[0].status, "completed");
    assert.equal(autoEnded.tasks[0].finishedAt, toIso(date, "11:00"));
    assert.equal(calculateTaskDuration(autoEnded.tasks[0], autoEnded), 30 * 60);

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
    assert.equal(manuallyEnded.tasks[0].finishedAt, toIso(date, "10:42"));
    assert.equal(
      calculateTaskDuration(manuallyEnded.tasks[0], manuallyEnded),
      37 * 60
    );

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
    assert.equal(calculateDeepWorkDuration(reopened), 103);

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
    assert.equal(legacy.tasks[0].startedAt, null);
    assert.equal(calculateTaskDuration(legacy.tasks[0], legacy), null);

    const afternoon = session({
      date,
      sessionType: "client_acquisition",
      start: "14:36",
    });
    assert.equal(calculateDeepWorkDuration(afternoon, afterClientCutoff), 84);

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
    assert.equal(calculateDeepWorkDuration(correctedStart.session), 87);

    const correctedFinish = correctActualSessionTime(
      correctedStart.session,
      "finish",
      "10:40"
    );
    assert.equal(correctedFinish.error, null);
    assert.equal(calculateDeepWorkDuration(correctedFinish.session), 85);

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
    assert.equal(calculateDeepWorkDuration(earlyCompleted), 30);

    const forgottenEarly = resolveExpiredSession(
      earlyRunning,
      afterOfficialEnd
    );
    assert.equal(forgottenEarly.status, "completed");
    assert.equal(forgottenEarly.finishedAt, toIso(earlyDate, "17:00"));
    assert.equal(calculateDeepWorkDuration(forgottenEarly), 220);

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
      15
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
    assert.equal(calculateDeepWorkDuration(correctedEarlyFinish.session), 195);

    assert.equal(
      fs.existsSync(path.join(projectRoot, "components", "session-timeline.tsx")),
      false
    );
  } finally {
    SESSION_SCHEDULE.skill_mastery.plannedFinish = originalSkillFinish;
    SESSION_SCHEDULE.client_acquisition.plannedFinish = originalClientFinish;
  }

  console.log("Session execution verification: 27 scenarios passed.");
}

run();
