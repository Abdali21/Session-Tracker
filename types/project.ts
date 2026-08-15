export const PROJECT_STAGES = [
  "research",
  "strategy",
  "production",
  "delivery",
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const PROJECT_STAGE_LABELS = {
  research: "Research",
  strategy: "Strategy",
  production: "Production",
  delivery: "Delivery",
} satisfies Record<ProjectStage, string>;

export type ProjectStatus = "active" | "completed";

export interface Project {
  id: string;
  name: string;
  /** ISO 8601 timestamp for the manually assigned project deadline. */
  deadline: string;
  stage: ProjectStage;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ProjectState {
  projects: Project[];
  /** At most one active project is manually selected as current. */
  currentProjectId: string | null;
}
