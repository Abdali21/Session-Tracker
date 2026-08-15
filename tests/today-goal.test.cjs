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
  TODAY_GOAL_PRIORITIES,
  TODAY_GOAL_PRIORITY_LABELS,
} = require("../types/today-goal.ts");
const {
  createTodayGoalStore,
  parseTodayGoal,
} = require("../lib/local-today-goal.ts");

assert.deepEqual(TODAY_GOAL_PRIORITIES, [
  "creative_mastery",
  "client_execution",
  "client_acquisition",
]);
assert.deepEqual(
  TODAY_GOAL_PRIORITIES.map(
    (priority) => TODAY_GOAL_PRIORITY_LABELS[priority]
  ),
  ["Creative Mastery", "Client Execution", "Client Acquisition"]
);
assert.equal(
  Object.keys(TODAY_GOAL_PRIORITY_LABELS).length,
  3,
  "Today Goal exposes exactly three priorities"
);

assert.equal(parseTodayGoal(null), null);
assert.equal(parseTodayGoal("not-json"), null);
assert.equal(
  parseTodayGoal(
    JSON.stringify({
      version: 1,
      outcome: "A result",
      priority: "unsupported_priority",
      updatedAt: "2026-08-15T09:00:00.000Z",
    })
  ),
  null
);

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  get length() {
    return this.values.size;
  }
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  key(index) {
    return [...this.values.keys()][index] ?? null;
  }
}

const mockWindow = new EventTarget();
Object.defineProperty(mockWindow, "localStorage", {
  value: new MemoryStorage(),
});
global.window = mockWindow;

const date = "2026-08-15";
const pageStore = createTodayGoalStore(date);
const secondViewStore = createTodayGoalStore(date);
const tomorrowStore = createTodayGoalStore("2026-08-16");
let sameDayNotifications = 0;
const unsubscribe = secondViewStore.subscribe(() => {
  sameDayNotifications += 1;
});

pageStore.save(
  {
    outcome: "  Finish MyBeauty creative research  ",
    priority: "client_execution",
  },
  new Date("2026-08-15T09:00:00.000Z")
);
assert.deepEqual(pageStore.getSnapshot(), {
  outcome: "Finish MyBeauty creative research",
  priority: "client_execution",
  updatedAt: "2026-08-15T09:00:00.000Z",
});
assert.equal(
  secondViewStore.getSnapshot().outcome,
  "Finish MyBeauty creative research"
);
assert.equal(tomorrowStore.getSnapshot(), null, "new days start empty");
assert.ok(sameDayNotifications > 0, "same-day views receive updates");

pageStore.save(
  {
    outcome: "Create five acquisition conversations",
    priority: "client_acquisition",
  },
  new Date("2026-08-15T11:00:00.000Z")
);
assert.deepEqual(secondViewStore.getSnapshot(), {
  outcome: "Create five acquisition conversations",
  priority: "client_acquisition",
  updatedAt: "2026-08-15T11:00:00.000Z",
});
assert.equal(
  tomorrowStore.getSnapshot(),
  null,
  "editing today's goal never populates tomorrow"
);

unsubscribe();
delete global.window;

console.log("daily Today Goal verification passed");
