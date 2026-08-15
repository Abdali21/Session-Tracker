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
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const {
  aggregateDeepWorkTasks,
  calculateDailyDeepWork,
  calculateDeepWorkSummary,
  formatAnalyticsDuration,
  selectAnalyticsDays,
} = require("../lib/analytics.ts");
const { casablancaWallTimeToDate } = require("../lib/session.ts");
const { TASK_CATEGORIES } = require("../types/session.ts");

function iso(date, time) {
  return casablancaWallTimeToDate(date, time).toISOString();
}

function task(date, overrides) {
  const startedAt = iso(date, overrides.start);
  const finishedAt = iso(date, overrides.end);
  return {
    id: overrides.id,
    title: overrides.title,
    outcome: overrides.outcome ?? null,
    category: overrides.category,
    expectedDurationMinutes: overrides.expected,
    status: "completed",
    startedAt,
    finishedAt,
    workIntervals: [{ startedAt, endedAt: finishedAt }],
    createdAt: startedAt,
    updatedAt: finishedAt,
  };
}

function session(date, tasks) {
  return {
    id: `${date}:skill_mastery`,
    sessionType: "skill_mastery",
    startedAt: iso(date, "09:00"),
    finishedAt: iso(date, "13:00"),
    finishTarget: null,
    distracted: false,
    distractionReason: null,
    status: "completed",
    tasks,
    date,
  };
}

const firstDate = "2026-08-13";
const secondDate = "2026-08-14";
const firstDay = {
  date: firstDate,
  sessions: [
    session(firstDate, [
      task(firstDate, {
        id: "creative-one",
        title: "Viral Creative Breakdown",
        category: "creative_mastery",
        expected: 30,
        start: "09:00",
        end: "10:00",
      }),
      task(firstDate, {
        id: "legacy",
        title: "Legacy operations",
        category: "business_operations",
        expected: 15,
        start: "10:00",
        end: "10:30",
      }),
    ]),
  ],
};
const secondDay = {
  date: secondDate,
  sessions: [
    session(secondDate, [
      task(secondDate, {
        id: "creative-two",
        title: "Viral Creative Breakdown",
        category: "creative_mastery",
        expected: 20,
        start: "09:00",
        end: "10:30",
      }),
      task(secondDate, {
        id: "execution",
        title: "MyBeauty delivery",
        outcome: "Finish the MyBeauty delivery",
        category: "client_execution",
        expected: 90,
        start: "10:30",
        end: "11:00",
      }),
      task(secondDate, {
        id: "acquisition",
        title: "Saudi brand outreach",
        category: "client_acquisition",
        expected: 15,
        start: "11:00",
        end: "11:45",
      }),
    ]),
  ],
};
const days = [firstDay, secondDay];
const timestamp = casablancaWallTimeToDate(secondDate, "21:00");
const today = calculateDeepWorkSummary([secondDay], timestamp);
const week = calculateDeepWorkSummary(days, timestamp);

assert.deepEqual(TASK_CATEGORIES, [
  "creative_mastery",
  "client_execution",
  "client_acquisition",
]);
assert.equal(today.totalSeconds, 165 * 60);
assert.deepEqual(
  today.tasks.map(({ title, category, seconds }) => ({
    title,
    category,
    seconds,
  })),
  [
    {
      title: "Viral Creative Breakdown",
      category: "creative_mastery",
      seconds: 90 * 60,
    },
    {
      title: "Saudi brand outreach",
      category: "client_acquisition",
      seconds: 45 * 60,
    },
    {
      title: "Finish the MyBeauty delivery",
      category: "client_execution",
      seconds: 30 * 60,
    },
  ],
  "Tasks are ranked by actual timer duration, not expected duration"
);
assert.deepEqual(
  today.priorities.map(({ label, seconds }) => ({ label, seconds })),
  [
    { label: "Creative Mastery", seconds: 90 * 60 },
    { label: "Client Execution", seconds: 30 * 60 },
    { label: "Client Acquisition", seconds: 45 * 60 },
  ]
);

assert.equal(week.totalSeconds, 255 * 60);
assert.equal(
  week.tasks.some(({ title }) => title === "Legacy operations"),
  false,
  "Legacy category names are never exposed in current Analytics"
);
assert.deepEqual(
  aggregateDeepWorkTasks(week.tasks).map(({ title, seconds }) => ({
    title,
    seconds,
  })),
  [
    { title: "Viral Creative Breakdown", seconds: 150 * 60 },
    { title: "Saudi brand outreach", seconds: 45 * 60 },
    { title: "Finish the MyBeauty delivery", seconds: 30 * 60 },
  ]
);
assert.deepEqual(
  calculateDailyDeepWork(
    days,
    ["2026-08-12", firstDate, secondDate],
    timestamp
  ),
  [
    { date: "2026-08-12", seconds: 0 },
    { date: firstDate, seconds: 90 * 60 },
    { date: secondDate, seconds: 165 * 60 },
  ]
);
assert.deepEqual(selectAnalyticsDays(days, [secondDate]), [secondDay]);
assert.equal(formatAnalyticsDuration(0), "0m");
assert.equal(formatAnalyticsDuration(45 * 60), "45m");
assert.equal(formatAnalyticsDuration(90 * 60), "1h 30m");

console.log("Focused Deep Work analytics verification passed.");
