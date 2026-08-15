import { casablancaWallTimeToDate } from "@/lib/session";
import {
  PROJECT_STAGES,
  type Project,
  type ProjectState,
  type ProjectStage,
  type ProjectStatus,
} from "@/types/project";

const CASABLANCA_TIME_ZONE = "Africa/Casablanca";
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type ProjectDeadlineTone =
  | "subtle"
  | "warning"
  | "strong"
  | "danger";

export interface ProjectDeadlineInfo {
  shortDateLabel: string;
  fullLabel: string;
  relativeLabel: string;
  compactRelativeLabel: string;
  tone: ProjectDeadlineTone;
}

export interface ProjectEdits {
  name: string;
  deadline: string;
  stage: ProjectStage;
  status: ProjectStatus;
}

export function getCurrentProject(state: ProjectState): Project | null {
  return (
    state.projects.find(
      (project) =>
        project.id === state.currentProjectId && project.status === "active"
    ) ?? null
  );
}

export function setCurrentProject(
  state: ProjectState,
  projectId: string
): ProjectState {
  const project = state.projects.find(({ id }) => id === projectId);
  if (!project || project.status !== "active") return state;
  return { ...state, currentProjectId: projectId };
}

export function editProject(
  state: ProjectState,
  projectId: string,
  edits: ProjectEdits,
  timestamp = new Date()
): ProjectState {
  const name = edits.name.trim();
  if (
    !name ||
    !isIsoTimestamp(edits.deadline) ||
    !PROJECT_STAGES.includes(edits.stage) ||
    (edits.status !== "active" && edits.status !== "completed")
  ) {
    return state;
  }

  const updatedAt = timestamp.toISOString();
  let changed = false;
  const projects = state.projects.map((project) => {
    if (project.id !== projectId) return project;
    if (
      project.name === name &&
      project.deadline === edits.deadline &&
      project.stage === edits.stage &&
      project.status === edits.status
    ) {
      return project;
    }

    changed = true;
    return {
      ...project,
      name,
      deadline: new Date(edits.deadline).toISOString(),
      stage: edits.stage,
      status: edits.status,
      updatedAt,
      completedAt:
        edits.status === "completed"
          ? project.status === "completed"
            ? (project.completedAt ?? updatedAt)
            : updatedAt
          : null,
    };
  });

  if (!changed) return state;
  return {
    projects,
    currentProjectId:
      edits.status === "completed" && state.currentProjectId === projectId
        ? null
        : state.currentProjectId,
  };
}

export function deleteProject(
  state: ProjectState,
  projectId: string
): ProjectState {
  if (!state.projects.some((project) => project.id === projectId)) return state;
  return {
    projects: state.projects.filter((project) => project.id !== projectId),
    currentProjectId:
      state.currentProjectId === projectId ? null : state.currentProjectId,
  };
}

export function changeProjectStage(
  state: ProjectState,
  projectId: string,
  stage: ProjectStage,
  timestamp = new Date()
): ProjectState {
  let changed = false;
  const projects = state.projects.map((project) => {
    if (
      project.id !== projectId ||
      project.status !== "active" ||
      project.stage === stage
    ) {
      return project;
    }

    changed = true;
    return { ...project, stage, updatedAt: timestamp.toISOString() };
  });
  return changed ? { ...state, projects } : state;
}

export function changeProjectDeadline(
  state: ProjectState,
  projectId: string,
  deadline: string,
  timestamp = new Date()
): ProjectState {
  if (!isIsoTimestamp(deadline)) return state;
  let changed = false;
  const projects = state.projects.map((project) => {
    if (
      project.id !== projectId ||
      project.status !== "active" ||
      project.deadline === deadline
    ) {
      return project;
    }

    changed = true;
    return { ...project, deadline, updatedAt: timestamp.toISOString() };
  });
  return changed ? { ...state, projects } : state;
}

export function completeProject(
  state: ProjectState,
  projectId: string,
  timestamp = new Date()
): ProjectState {
  let changed = false;
  const completedAt = timestamp.toISOString();
  const projects = state.projects.map((project) => {
    if (project.id !== projectId || project.status === "completed") {
      return project;
    }

    changed = true;
    return {
      ...project,
      status: "completed" as const,
      updatedAt: completedAt,
      completedAt,
    };
  });
  if (!changed) return state;
  return {
    projects,
    currentProjectId:
      state.currentProjectId === projectId ? null : state.currentProjectId,
  };
}

export function getProjectDeadlineInfo(
  deadline: string,
  now = new Date()
): ProjectDeadlineInfo {
  const deadlineDate = new Date(deadline);
  const difference = deadlineDate.getTime() - now.getTime();
  const shortDateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: CASABLANCA_TIME_ZONE,
  }).format(deadlineDate);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: CASABLANCA_TIME_ZONE,
  }).format(deadlineDate);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CASABLANCA_TIME_ZONE,
  }).format(deadlineDate);
  const fullLabel = `${dateLabel} · ${timeLabel}`;

  if (difference < 0) {
    const overdueLabel = formatOverdue(Math.abs(difference));
    return {
      shortDateLabel,
      fullLabel,
      relativeLabel: overdueLabel,
      compactRelativeLabel: overdueLabel,
      tone: "danger",
    };
  }

  if (calendarDate(now) === calendarDate(deadlineDate)) {
    const remaining = formatHoursAndMinutes(difference);
    const dueToday = `Due today · ${remaining} remaining`;
    return {
      shortDateLabel,
      fullLabel,
      relativeLabel: dueToday,
      compactRelativeLabel: dueToday,
      tone: "strong",
    };
  }

  const days = Math.floor(difference / DAY_MS);
  const hours = Math.floor((difference % DAY_MS) / HOUR_MS);
  const relativeLabel =
    days > 0
      ? `${days} ${days === 1 ? "day" : "days"}${hours > 0 ? ` ${hours}h` : ""} remaining`
      : `${formatHoursAndMinutes(difference)} remaining`;
  const compactRelativeLabel =
    days > 0
      ? `${days} ${days === 1 ? "day" : "days"} left`
      : `${Math.max(1, Math.floor(difference / HOUR_MS))}h left`;

  return {
    shortDateLabel,
    fullLabel,
    relativeLabel,
    compactRelativeLabel,
    tone: difference <= 2 * DAY_MS ? "warning" : "subtle",
  };
}

export function projectDeadlineFromInput(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const deadline = casablancaWallTimeToDate(match[1], match[2]);
  return deadline && Number.isFinite(deadline.getTime())
    ? deadline.toISOString()
    : null;
}

export function projectDeadlineToInput(deadline: string): string {
  const date = new Date(deadline);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: CASABLANCA_TIME_ZONE,
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

function calendarDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: CASABLANCA_TIME_ZONE,
  }).formatToParts(value);
  const date = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${date.year}-${date.month}-${date.day}`;
}

function formatHoursAndMinutes(duration: number): string {
  const totalMinutes = Math.max(1, Math.floor(duration / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatOverdue(duration: number): string {
  const days = Math.floor(duration / DAY_MS);
  if (days > 0) return `Overdue by ${days} ${days === 1 ? "day" : "days"}`;
  const hours = Math.floor(duration / HOUR_MS);
  if (hours > 0) return `Overdue by ${hours}h`;
  return `Overdue by ${Math.max(1, Math.floor(duration / MINUTE_MS))}m`;
}

function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
