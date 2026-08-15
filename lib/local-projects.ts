import {
  PROJECT_STAGES,
  type Project,
  type ProjectStage,
  type ProjectState,
  type ProjectStatus,
} from "@/types/project";

const STORAGE_KEY = "work-session-tracker:projects";
const STORAGE_VERSION = 1;
const PROJECTS_CHANGED_EVENT = "work-session-tracker:projects-changed";
const PROJECT_STAGE_VALUES = new Set<ProjectStage>(PROJECT_STAGES);
const PROJECT_STATUS_VALUES = new Set<ProjectStatus>(["active", "completed"]);
const EMPTY_PROJECT_STATE: ProjectState = {
  projects: [],
  currentProjectId: null,
};

interface StoredProjects {
  version: typeof STORAGE_VERSION;
  state: ProjectState;
}

export interface ProjectStore {
  getSnapshot: () => ProjectState;
  getServerSnapshot: () => ProjectState;
  subscribe: (listener: () => void) => () => void;
  update: (updater: (state: ProjectState) => ProjectState) => void;
}

export function createProjectStore(): ProjectStore {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedState = EMPTY_PROJECT_STATE;

  function getSnapshot(): ProjectState {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedState;
    cachedRaw = raw;
    cachedState = parseProjectState(raw);
    return cachedState;
  }

  function emitChange() {
    listeners.forEach((listener) => listener());
  }

  function refresh() {
    cachedRaw = undefined;
    emitChange();
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) refresh();
  }

  return {
    getSnapshot,
    getServerSnapshot: () => EMPTY_PROJECT_STATE,
    subscribe(listener) {
      listeners.add(listener);
      window.addEventListener("storage", handleStorage);
      window.addEventListener(PROJECTS_CHANGED_EVENT, refresh);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", handleStorage);
          window.removeEventListener(PROJECTS_CHANGED_EVENT, refresh);
        }
      };
    },
    update(updater) {
      const nextState = normalizeProjectState(updater(getSnapshot()));
      const raw = JSON.stringify({
        version: STORAGE_VERSION,
        state: nextState,
      } satisfies StoredProjects);
      window.localStorage.setItem(STORAGE_KEY, raw);
      cachedRaw = raw;
      cachedState = nextState;
      emitChange();
      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
    },
  };
}

export function parseProjectState(raw: string | null): ProjectState {
  if (!raw) return EMPTY_PROJECT_STATE;
  try {
    const stored: unknown = JSON.parse(raw);
    if (!isRecord(stored) || stored.version !== STORAGE_VERSION) {
      return EMPTY_PROJECT_STATE;
    }
    return normalizeProjectState(stored.state);
  } catch {
    return EMPTY_PROJECT_STATE;
  }
}

export function normalizeProjectState(value: unknown): ProjectState {
  if (!isRecord(value)) return EMPTY_PROJECT_STATE;
  const seenIds = new Set<string>();
  const projects = Array.isArray(value.projects)
    ? value.projects.flatMap((project) => {
        const normalized = normalizeProject(project);
        if (!normalized || seenIds.has(normalized.id)) return [];
        seenIds.add(normalized.id);
        return [normalized];
      })
    : [];
  const currentProjectId =
    typeof value.currentProjectId === "string" &&
    projects.some(
      (project) =>
        project.id === value.currentProjectId && project.status === "active"
    )
      ? value.currentProjectId
      : null;
  if (projects.length === 0 && currentProjectId === null) {
    return EMPTY_PROJECT_STATE;
  }
  return { projects, currentProjectId };
}

function normalizeProject(value: unknown): Project | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    typeof value.deadline !== "string" ||
    !Number.isFinite(Date.parse(value.deadline)) ||
    !PROJECT_STAGE_VALUES.has(value.stage as ProjectStage) ||
    !PROJECT_STATUS_VALUES.has(value.status as ProjectStatus) ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt))
  ) {
    return null;
  }

  const status = value.status as ProjectStatus;
  return {
    id: value.id,
    name: value.name.trim(),
    deadline: new Date(value.deadline).toISOString(),
    stage: value.stage as ProjectStage,
    status,
    createdAt: new Date(value.createdAt).toISOString(),
    updatedAt: new Date(value.updatedAt).toISOString(),
    completedAt:
      status === "completed" &&
      typeof value.completedAt === "string" &&
      Number.isFinite(Date.parse(value.completedAt))
        ? new Date(value.completedAt).toISOString()
        : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
