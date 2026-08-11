/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
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

const { getWeeklyGoalSummary } = require("../lib/goal.ts");
const {
  compareExecutionDays,
  getDailyExecutionMetrics,
  getImprovedAreas,
  getNeedsFocusAreas,
  getViolationCount,
  isDailyExecutionFinal,
} = require("../lib/report.ts");
const {
  casablancaWallTimeToDate,
  getCurrentWeekDates,
  getPreviousCalendarDate,
} = require("../lib/session.ts");

function iso(date, time) {
  return casablancaWallTimeToDate(date, time).toISOString();
}

function session(overrides) {
  return {
    id: overrides.sessionType,
    sessionType: overrides.sessionType,
    startedAt: null,
    finishedAt: null,
    finishTarget: null,
    distracted: null,
    distractionReason: null,
    status: "upcoming",
    tasks: [],
    date: "2026-08-11",
    ...overrides,
  };
}

const sessions = [
  session({
    sessionType: "skill_mastery",
    startedAt: iso("2026-08-11", "09:15"),
    finishedAt: iso("2026-08-11", "13:00"),
    distracted: true,
    status: "completed",
    tasks: [
      {
        id: "task-1",
        title: "Practice",
        status: "completed",
        startedAt: iso("2026-08-11", "09:30"),
        finishedAt: iso("2026-08-11", "10:00"),
        createdAt: iso("2026-08-11", "09:20"),
        updatedAt: iso("2026-08-11", "10:00"),
      },
    ],
  }),
  session({ sessionType: "client_acquisition", status: "missed" }),
  session({
    sessionType: "execution",
    startedAt: iso("2026-08-11", "18:00"),
    finishedAt: iso("2026-08-11", "21:00"),
    distracted: false,
    status: "completed",
  }),
];

assert.equal(getPreviousCalendarDate("2026-08-11"), "2026-08-10");
assert.equal(getPreviousCalendarDate("2026-08-10"), "2026-08-09");
assert.deepEqual(getCurrentWeekDates("2026-08-11"), [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
]);

const metrics = getDailyExecutionMetrics(
  sessions,
  casablancaWallTimeToDate("2026-08-11", "21:00")
);
assert.deepEqual(metrics, {
  deepWorkMinutes: 405,
  completedSessions: 2,
  missedSessions: 1,
  lateSessions: 1,
  totalLateMinutes: 15,
  distractedSessions: 1,
  completedTasks: 1,
  trackedTaskTimeSeconds: 1800,
});

const goal = getWeeklyGoalSummary(
  [
    { date: "2026-08-10", sessions: null },
    { date: "2026-08-11", sessions },
  ],
  casablancaWallTimeToDate("2026-08-11", "21:00")
);
assert.equal(goal.currentMinutes, 405);
assert.equal(goal.remainingMinutes, 2595);
assert.equal(goal.progressPercent, 14);
assert.deepEqual(goal.dailyMinutes, [
  { date: "2026-08-10", minutes: null },
  { date: "2026-08-11", minutes: 405 },
]);

function executionMetrics(overrides = {}) {
  return {
    deepWorkMinutes: 360,
    completedSessions: 3,
    missedSessions: 0,
    lateSessions: 0,
    totalLateMinutes: 0,
    distractedSessions: 0,
    completedTasks: 0,
    trackedTaskTimeSeconds: 0,
    ...overrides,
  };
}

assert.equal(isDailyExecutionFinal(sessions), true);
assert.equal(getViolationCount(metrics), 3);

// Test 9: two violations today versus four yesterday is better.
assert.equal(
  compareExecutionDays(
    sessions,
    executionMetrics({ missedSessions: 1, lateSessions: 1 }),
    executionMetrics({ missedSessions: 1, lateSessions: 2, distractedSessions: 1 })
  ).verdict,
  "better_than_yesterday"
);

// Test 10: four violations today versus two yesterday is worse.
assert.equal(
  compareExecutionDays(
    sessions,
    executionMetrics({ missedSessions: 1, lateSessions: 2, distractedSessions: 1 }),
    executionMetrics({ missedSessions: 1, lateSessions: 1 })
  ).verdict,
  "worse_than_yesterday"
);

// Test 11: equal violations and higher Deep Work is better.
assert.equal(
  compareExecutionDays(
    sessions,
    executionMetrics({ deepWorkMinutes: 420, lateSessions: 1 }),
    executionMetrics({ deepWorkMinutes: 360, lateSessions: 1 })
  ).verdict,
  "better_than_yesterday"
);

// Test 12: equal violations and lower Deep Work is worse.
assert.equal(
  compareExecutionDays(
    sessions,
    executionMetrics({ deepWorkMinutes: 300, lateSessions: 1 }),
    executionMetrics({ deepWorkMinutes: 360, lateSessions: 1 })
  ).verdict,
  "worse_than_yesterday"
);

// Test 13: equal violations and Deep Work is the same.
assert.equal(
  compareExecutionDays(
    sessions,
    executionMetrics({ lateSessions: 1 }),
    executionMetrics({ lateSessions: 1 })
  ).verdict,
  "same_as_yesterday"
);

// Test 14: unresolved sessions keep the day in progress.
const incompleteSessions = sessions.map((current, index) =>
  index === 2
    ? { ...current, startedAt: null, finishedAt: null, distracted: null, status: "upcoming" }
    : current
);
assert.equal(
  compareExecutionDays(
    incompleteSessions,
    executionMetrics(),
    executionMetrics()
  ).verdict,
  "day_in_progress"
);

// Test 15: exact yesterday data is required for a final verdict.
assert.equal(
  compareExecutionDays(sessions, executionMetrics(), null).verdict,
  "no_yesterday_data"
);

// Test 16: Needs Focus includes only real weak areas in priority order.
const needsFocus = getNeedsFocusAreas(
  executionMetrics({
    deepWorkMinutes: 300,
    lateSessions: 2,
    distractedSessions: 1,
  }),
  executionMetrics({ deepWorkMinutes: 345 })
);
assert.deepEqual(
  needsFocus.map(({ area }) => area),
  ["Focus", "Punctuality", "Deep Work"]
);

const improvements = getImprovedAreas(
  executionMetrics({ deepWorkMinutes: 405, lateSessions: 1 }),
  executionMetrics({
    deepWorkMinutes: 360,
    missedSessions: 1,
    lateSessions: 2,
    distractedSessions: 1,
  })
);
assert.deepEqual(
  improvements.map(({ area }) => area),
  ["Attendance", "Focus", "Punctuality", "Deep Work"]
);

console.log("Report verdict and goal verification passed.");
