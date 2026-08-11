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

const storage = new Map();
global.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};
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

const {
  createAccountabilityHistoryStore,
  createAccountabilityStore,
  getAccountabilityViolationId,
} = require("../lib/local-accountability.ts");
const { casablancaWallTimeToDate } = require("../lib/session.ts");

const DATE = "2026-08-11";

function iso(time) {
  return casablancaWallTimeToDate(DATE, time).toISOString();
}

function session(overrides = {}) {
  return {
    id: `${DATE}:skill_mastery`,
    sessionType: "skill_mastery",
    startedAt: iso("09:00"),
    finishedAt: null,
    finishTarget: null,
    distracted: false,
    distractionReason: null,
    status: "running",
    tasks: [],
    date: DATE,
    ...overrides,
  };
}

function reconcile(sessions, time = "12:00") {
  const store = createAccountabilityStore(DATE);
  const now = casablancaWallTimeToDate(DATE, time);
  store.activate(now);
  store.reconcile(sessions, now);
  return { store, day: store.getSnapshot() };
}

function reset() {
  storage.clear();
}

// Test 1: on time and not distracted.
reset();
assert.equal(reconcile([session()]).day.violations.length, 0);

// Test 2: ten minutes late.
reset();
let result = reconcile([session({ startedAt: iso("09:10") })]);
assert.equal(result.day.violations.length, 1);
assert.equal(result.day.violations[0].type, "started_late");
assert.match(result.day.violations[0].details, /Late By: 10m/);

// Test 3: on time and distracted.
reset();
result = reconcile([
  session({ distracted: true, distractionReason: "Opened YouTube" }),
]);
assert.equal(result.day.violations.length, 1);
assert.equal(result.day.violations[0].type, "distracted");
assert.match(result.day.violations[0].details, /Opened YouTube/);

// Test 4: late and distracted create separate pages.
reset();
const failingSession = session({
  startedAt: iso("09:15"),
  distracted: true,
});
result = reconcile([failingSession]);
assert.deepEqual(
  result.day.violations.map(({ type }) => type),
  ["started_late", "distracted"]
);

// Test 5: a missed session creates one accountability page.
reset();
result = reconcile(
  [
    session({
      startedAt: null,
      status: "missed",
      distracted: null,
    }),
  ],
  "21:30"
);
assert.equal(result.day.violations.length, 1);
assert.equal(result.day.violations[0].type, "missed_session");
assert.match(
  result.day.violations[0].pageInstruction,
  /I missed my Skill Mastery session today/
);

// Test 6: missed + another late + another distracted creates three pages.
reset();
result = reconcile(
  [
    session({ startedAt: null, status: "missed", distracted: null }),
    session({
      id: `${DATE}:client_acquisition`,
      sessionType: "client_acquisition",
      startedAt: iso("14:10"),
    }),
    session({
      id: `${DATE}:execution`,
      sessionType: "execution",
      startedAt: iso("18:00"),
      distracted: true,
    }),
  ],
  "21:30"
);
assert.deepEqual(
  result.day.violations.map(({ type }) => type).sort(),
  ["distracted", "missed_session", "started_late"]
);

// Test 7: correcting a late start to on time removes the violation.
reset();
result = reconcile([session({ startedAt: iso("09:10") })]);
result.store.reconcile(
  [session({ startedAt: iso("09:00") })],
  casablancaWallTimeToDate(DATE, "12:00")
);
assert.equal(result.store.getSnapshot().violations.length, 0);

// Test 8: changing distraction from Yes to No removes the violation.
reset();
result = reconcile([session({ distracted: true })]);
result.store.reconcile(
  [session({ distracted: false })],
  casablancaWallTimeToDate(DATE, "12:00")
);
assert.equal(result.store.getSnapshot().violations.length, 0);

// Refreshing/recreating the store does not duplicate violations.
reset();
reconcile([failingSession]);
result = reconcile([failingSession]);
assert.equal(result.day.violations.length, 2);
assert.equal(new Set(result.day.violations.map(({ id }) => id)).size, 2);

// Completion changes punishment state without changing violations.
const completedId = getAccountabilityViolationId(
  DATE,
  "skill_mastery",
  "started_late"
);
result.store.setPageCompleted(completedId, true);
result.store.reconcile(
  [failingSession],
  casablancaWallTimeToDate(DATE, "12:00")
);
const completedViolations = result.store.getSnapshot().violations;
assert.equal(completedViolations.length, 2);
assert.equal(
  completedViolations.filter(({ pageCompleted }) => pageCompleted).length,
  1
);

// Legacy late-start and missed-session records remain valid.
reset();
const legacyDate = "2026-08-10";
storage.set(
  `work-session-tracker:accountability:${legacyDate}`,
  JSON.stringify({
    version: 1,
    activatedAt: `${legacyDate}T08:00:00.000Z`,
    violations: [
      {
        id: `${legacyDate}:skill_mastery:late_start`,
        date: legacyDate,
        sessionType: "skill_mastery",
        type: "late_start",
        details: "Started 10m late",
        pageInstruction: "Legacy valid page",
        pageCompleted: true,
        createdAt: `${legacyDate}T08:10:00.000Z`,
      },
      {
        id: `${legacyDate}:skill_mastery:missed_session`,
        date: legacyDate,
        sessionType: "skill_mastery",
        type: "missed_session",
        details: "Session not started",
        pageInstruction: "Legacy missed page",
        pageCompleted: false,
        createdAt: `${legacyDate}T13:00:00.000Z`,
      },
    ],
  })
);
const history = createAccountabilityHistoryStore(DATE).getSnapshot();
assert.equal(history.length, 1);
assert.equal(history[0].violations.length, 2);
assert.equal(history[0].violations[0].type, "started_late");
assert.equal(history[0].violations[0].pageCompleted, true);
assert.equal(history[0].violations[1].type, "missed_session");

console.log("Accountability verification: 8 core rules passed.");
