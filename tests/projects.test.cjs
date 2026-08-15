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

const { PROJECT_STAGES } = require("../types/project.ts");
const {
  changeProjectDeadline,
  changeProjectStage,
  completeProject,
  deleteProject,
  editProject,
  getCurrentProject,
  getProjectDeadlineInfo,
  projectDeadlineFromInput,
  projectDeadlineToInput,
  setCurrentProject,
} = require("../lib/projects.ts");
const {
  createProjectStore,
  normalizeProjectState,
  parseProjectState,
} = require("../lib/local-projects.ts");
const { casablancaWallTimeToDate } = require("../lib/session.ts");

function iso(date, time) {
  return casablancaWallTimeToDate(date, time).toISOString();
}

{
  const current = project("editable");
  const untouched = project("untouched");
  let state = {
    projects: [current, untouched],
    currentProjectId: current.id,
  };

  state = editProject(
    state,
    current.id,
    {
      name: "  MyBeauty Creative  ",
      deadline: iso("2026-08-21", "17:30"),
      stage: "delivery",
      status: "completed",
    },
    new Date(iso("2026-08-15", "11:00"))
  );
  assert.equal(state.projects[0].name, "MyBeauty Creative");
  assert.equal(state.projects[0].stage, "delivery");
  assert.equal(state.projects[0].status, "completed");
  assert.equal(state.projects[0].completedAt, iso("2026-08-15", "11:00"));
  assert.equal(state.currentProjectId, null, "completing current clears it");
  assert.strictEqual(state.projects[1], untouched, "other projects are untouched");

  state = editProject(
    state,
    current.id,
    {
      name: "MyBeauty Creative Active",
      deadline: iso("2026-08-22", "18:00"),
      stage: "strategy",
      status: "active",
    }
  );
  assert.equal(state.projects[0].status, "active");
  assert.equal(state.projects[0].completedAt, null);
  assert.equal(state.currentProjectId, null, "reactivating does not make it current");

  const beforeInvalidEdit = state;
  assert.strictEqual(
    editProject(state, current.id, {
      name: "",
      deadline: "invalid",
      stage: "strategy",
      status: "active",
    }),
    beforeInvalidEdit,
    "invalid edits are ignored"
  );

  state = setCurrentProject(state, current.id);
  state = deleteProject(state, current.id);
  assert.equal(state.projects.length, 1);
  assert.equal(state.projects[0].id, untouched.id);
  assert.equal(state.currentProjectId, null, "deleting current clears it");
  assert.strictEqual(deleteProject(state, "missing"), state);
}

function project(id, overrides = {}) {
  const createdAt = iso("2026-08-10", "09:00");
  return {
    id,
    name: overrides.name ?? `Project ${id}`,
    deadline: overrides.deadline ?? iso("2026-08-18", "18:00"),
    stage: overrides.stage ?? "research",
    status: overrides.status ?? "active",
    createdAt,
    updatedAt: createdAt,
    completedAt: overrides.completedAt ?? null,
  };
}

assert.deepEqual(PROJECT_STAGES, [
  "research",
  "strategy",
  "production",
  "delivery",
]);

{
  const first = project("first");
  const second = project("second", { stage: "production" });
  let state = { projects: [first, second], currentProjectId: "first" };

  state = setCurrentProject(state, "second");
  assert.equal(getCurrentProject(state).id, "second");

  state = changeProjectStage(
    state,
    "second",
    "delivery",
    new Date(iso("2026-08-14", "10:00"))
  );
  assert.equal(getCurrentProject(state).stage, "delivery");

  const originalDeadline = getCurrentProject(state).deadline;
  const updatedDeadline = iso("2026-08-20", "18:00");
  state = changeProjectDeadline(state, "second", updatedDeadline);
  assert.equal(getCurrentProject(state).deadline, updatedDeadline);

  state = completeProject(
    state,
    "second",
    new Date(iso("2026-08-16", "12:00"))
  );
  assert.equal(state.currentProjectId, null);
  assert.equal(state.projects[1].status, "completed");
  assert.equal(state.projects[1].stage, "delivery");
  assert.notEqual(state.projects[1].deadline, originalDeadline);
  assert.equal(state.projects[1].deadline, updatedDeadline);
  assert.equal(setCurrentProject(state, "second"), state);
}

{
  const now = casablancaWallTimeToDate("2026-08-14", "10:00");
  assert.deepEqual(
    getProjectDeadlineInfo(iso("2026-08-18", "06:00"), now),
    {
      shortDateLabel: "Aug 18",
      fullLabel: "Aug 18, 2026 · 6:00 AM",
      relativeLabel: "3 days 20h remaining",
      compactRelativeLabel: "3 days left",
      tone: "subtle",
    }
  );
  assert.equal(
    getProjectDeadlineInfo(iso("2026-08-15", "10:00"), now).tone,
    "warning"
  );
  assert.deepEqual(
    getProjectDeadlineInfo(iso("2026-08-14", "15:00"), now),
    {
      shortDateLabel: "Aug 14",
      fullLabel: "Aug 14, 2026 · 3:00 PM",
      relativeLabel: "Due today · 5h remaining",
      compactRelativeLabel: "Due today · 5h remaining",
      tone: "strong",
    }
  );
  assert.equal(
    getProjectDeadlineInfo(iso("2026-08-13", "10:00"), now).relativeLabel,
    "Overdue by 1 day"
  );
}

{
  const input = "2026-08-18T18:00";
  const deadline = projectDeadlineFromInput(input);
  assert.equal(projectDeadlineToInput(deadline), input);
}

{
  const active = project("active");
  const completed = project("completed", {
    status: "completed",
    completedAt: iso("2026-08-14", "12:00"),
  });
  const normalized = normalizeProjectState({
    projects: [active, completed, { ...active }],
    currentProjectId: "completed",
  });
  assert.equal(normalized.projects.length, 2, "duplicate IDs are removed");
  assert.equal(normalized.currentProjectId, null, "completed project cannot be current");

  const stored = JSON.stringify({
    version: 1,
    state: { projects: [active], currentProjectId: active.id },
  });
  assert.equal(parseProjectState(stored).currentProjectId, active.id);
  assert.deepEqual(parseProjectState('{"version":999}').projects, []);
}

{
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

  const pageStore = createProjectStore();
  const sidebarStore = createProjectStore();
  let sidebarNotifications = 0;
  const unsubscribe = sidebarStore.subscribe(() => {
    sidebarNotifications += 1;
  });
  const persisted = project("persisted", { stage: "strategy" });

  pageStore.update(() => ({
    projects: [persisted],
    currentProjectId: persisted.id,
  }));

  assert.equal(sidebarStore.getSnapshot().currentProjectId, persisted.id);
  assert.equal(sidebarStore.getSnapshot().projects[0].stage, "strategy");
  assert.ok(sidebarNotifications > 0, "same-tab project updates notify the sidebar");

  const refreshedStore = createProjectStore();
  assert.equal(refreshedStore.getSnapshot().projects[0].stage, "strategy");
  unsubscribe();
  delete global.window;
}

console.log("standalone project verification passed");
