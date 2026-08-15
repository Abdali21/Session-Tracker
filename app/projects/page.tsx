"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  CalendarClock,
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  Ellipsis,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectStore } from "@/lib/local-projects";
import {
  changeProjectStage,
  completeProject,
  deleteProject,
  editProject,
  getCurrentProject,
  getProjectDeadlineInfo,
  projectDeadlineFromInput,
  projectDeadlineToInput,
  setCurrentProject,
  type ProjectEdits,
} from "@/lib/projects";
import { useProjectClock } from "@/lib/use-project-clock";
import { cn } from "@/lib/utils";
import {
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  type Project,
  type ProjectStage,
  type ProjectState,
  type ProjectStatus,
} from "@/types/project";

export default function ProjectsPage() {
  const store = useMemo(() => createProjectStore(), []);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
  const now = useProjectClock();
  const currentProject = getCurrentProject(state);
  const activeProjects = state.projects
    .filter(
      (project) =>
        project.status === "active" && project.id !== currentProject?.id
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const completedProjects = state.projects
    .filter((project) => project.status === "completed")
    .sort((left, right) =>
      (right.completedAt ?? right.updatedAt).localeCompare(
        left.completedAt ?? left.updatedAt
      )
    );

  function update(updater: (projectState: ProjectState) => ProjectState) {
    store.update(updater);
  }

  return (
    <AppShell activePage="projects" compact>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand">
              Project Direction
            </p>
            <h1 className="mt-1 text-[24px] font-bold leading-8 text-[#202536]">
              Projects
            </h1>
            <p className="mt-1 text-[12px] text-[#7D8698]">
              One current project, one manual stage, and one clear deadline.
            </p>
          </div>
          <CreateProjectDialog
            hasCurrentProject={currentProject !== null}
            onCreate={(project, makeCurrent) =>
              update((current) => ({
                projects: [...current.projects, project],
                currentProjectId: makeCurrent
                  ? project.id
                  : current.currentProjectId,
              }))
            }
          />
        </div>

        {currentProject ? (
          <CurrentProjectCard
            project={currentProject}
            now={now}
            onStageChange={(stage) =>
              update((current) =>
                changeProjectStage(current, currentProject.id, stage)
              )
            }
            onEdit={(edits) =>
              update((current) =>
                editProject(current, currentProject.id, edits)
              )
            }
            onDelete={() =>
              update((current) => deleteProject(current, currentProject.id))
            }
            onComplete={() => {
              if (
                window.confirm(
                  `Mark “${currentProject.name}” as completed? Its history will be preserved.`
                )
              ) {
                update((current) =>
                  completeProject(current, currentProject.id)
                );
              }
            }}
          />
        ) : (
          <section className="rounded-2xl border border-dashed border-[#D8DCE5] bg-white px-7 py-10 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[#F1F0FA] text-brand-deep">
              <FolderKanban className="size-5" />
            </span>
            <h2 className="mt-4 text-[17px] font-bold text-[#2B3041]">
              No current project
            </h2>
            <p className="mx-auto mt-1 max-w-md text-[12px] leading-5 text-[#858E9F]">
              Add a project or choose an active project below, then mark it as
              your current focus.
            </p>
          </section>
        )}

        {activeProjects.length > 0 ? (
          <ProjectList
            title="Other Active Projects"
            projects={activeProjects}
            now={now}
            onSetCurrent={(projectId) =>
              update((current) => setCurrentProject(current, projectId))
            }
            onEdit={(projectId, edits) =>
              update((current) => editProject(current, projectId, edits))
            }
            onDelete={(projectId) =>
              update((current) => deleteProject(current, projectId))
            }
          />
        ) : null}

        {completedProjects.length > 0 ? (
          <CompletedProjectList
            projects={completedProjects}
            now={now}
            onEdit={(projectId, edits) =>
              update((current) => editProject(current, projectId, edits))
            }
            onDelete={(projectId) =>
              update((current) => deleteProject(current, projectId))
            }
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function CurrentProjectCard({
  project,
  now,
  onStageChange,
  onEdit,
  onDelete,
  onComplete,
}: {
  project: Project;
  now: Date;
  onStageChange: (stage: ProjectStage) => void;
  onEdit: (edits: ProjectEdits) => void;
  onDelete: () => void;
  onComplete: () => void;
}) {
  const deadline = getProjectDeadlineInfo(project.deadline, now);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#DDE1E9] bg-white shadow-[0_10px_30px_rgba(23,27,44,0.04)]">
      <div className="flex items-start justify-between gap-8 px-7 py-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7D8698]">
              Current Project
            </p>
            <span className="rounded-full bg-[#EAF8F0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#16815A]">
              Active
            </span>
          </div>
          <h2 className="mt-2 truncate text-[24px] font-bold leading-8 text-[#202536]">
            {project.name}
          </h2>
          <p className="mt-1 text-[12px] font-semibold text-[#70798B]">
            Current stage · {PROJECT_STAGE_LABELS[project.stage]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onComplete}
            className="h-9 gap-2 rounded-lg px-3 text-[12px] font-bold text-[#4F586C]"
          >
            <CircleCheck className="size-4" />
            Mark Completed
          </Button>
          <ProjectActions
            project={project}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 border-y border-[#E3E6ED] bg-[#FCFCFD]">
        <div className="px-7 py-5">
          <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8992A4]">
            <CalendarClock className="size-3.5 text-brand" /> Deadline
          </dt>
          <dd className="mt-2 text-[15px] font-bold tabular-nums text-[#343A4C]">
            {deadline.fullLabel}
          </dd>
        </div>
        <div className="border-l border-[#E3E6ED] px-7 py-5">
          <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#8992A4]">
            <Clock3 className="size-3.5 text-brand" /> Time Remaining
          </dt>
          <dd
            className={cn(
              "mt-2 text-[15px] font-bold tabular-nums",
              deadline.tone === "subtle" && "text-[#4F586C]",
              deadline.tone === "warning" && "text-[#B54708]",
              deadline.tone === "strong" && "text-[#B42318]",
              deadline.tone === "danger" && "text-[#D92D20]"
            )}
          >
            {deadline.relativeLabel}
          </dd>
        </div>
      </dl>

      <div className="px-7 py-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8992A4]">
            Change Stage
          </p>
          <p className="mt-1 text-[11px] text-[#8992A4]">
            Select a stage to update it immediately.
          </p>
        </div>
        <ProjectStageFlow
          className="mt-5"
          stage={project.stage}
          onChange={onStageChange}
        />
      </div>
    </section>
  );
}

function ProjectStageFlow({
  stage,
  onChange,
  className,
}: {
  stage: ProjectStage;
  onChange: (stage: ProjectStage) => void;
  className?: string;
}) {
  const currentIndex = PROJECT_STAGES.indexOf(stage);

  return (
    <div className={cn("flex items-center", className)} aria-label="Project stages">
      {PROJECT_STAGES.map((value, index) => {
        const completed = index < currentIndex;
        const current = index === currentIndex;
        return (
          <div key={value} className="flex min-w-0 flex-1 items-center">
            <button
              type="button"
              aria-pressed={current}
              onClick={() => onChange(value)}
              className={cn(
                "flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/15",
                completed && "border-[#CFEBDD] bg-[#F0FAF5] text-[#16815A]",
                current && "border-brand-deep bg-brand-deep text-white",
                !completed && !current &&
                  "border-[#E1E4EB] bg-[#F8F9FB] text-[#8992A4] hover:border-[#CFC8F1] hover:text-brand"
              )}
            >
              {completed ? (
                <Check className="size-3.5" />
              ) : current ? (
                <span className="size-2 rounded-full bg-white" />
              ) : (
                <Circle className="size-3.5" />
              )}
              <span className="truncate">{PROJECT_STAGE_LABELS[value]}</span>
            </button>
            {index < PROJECT_STAGES.length - 1 ? (
              <ChevronRight className="mx-1 size-4 shrink-0 text-[#B5BAC5]" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ProjectList({
  title,
  projects,
  now,
  onSetCurrent,
  onEdit,
  onDelete,
}: {
  title: string;
  projects: Project[];
  now: Date;
  onSetCurrent: (projectId: string) => void;
  onEdit: (projectId: string, edits: ProjectEdits) => void;
  onDelete: (projectId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white">
      <div className="border-b border-[#E3E6ED] px-6 py-4">
        <h2 className="text-[15px] font-bold text-[#2B3041]">{title}</h2>
      </div>
      <ul className="divide-y divide-[#E7E9EF]">
        {projects.map((project) => {
          const deadline = getProjectDeadlineInfo(project.deadline, now);
          return (
            <li
              key={project.id}
              className="flex items-center justify-between gap-6 px-6 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-[#343A4C]">
                  {project.name}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-[#7D8698]">
                  {PROJECT_STAGE_LABELS[project.stage]} · {deadline.fullLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onSetCurrent(project.id)}
                  className="h-8 px-3 text-[11px] font-bold"
                >
                  Set Current
                </Button>
                <ProjectActions
                  project={project}
                  onEdit={(edits) => onEdit(project.id, edits)}
                  onDelete={() => onDelete(project.id)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CompletedProjectList({
  projects,
  now,
  onEdit,
  onDelete,
}: {
  projects: Project[];
  now: Date;
  onEdit: (projectId: string, edits: ProjectEdits) => void;
  onDelete: (projectId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white">
      <div className="border-b border-[#E3E6ED] px-6 py-4">
        <h2 className="text-[15px] font-bold text-[#2B3041]">Completed Projects</h2>
      </div>
      <ul className="divide-y divide-[#E7E9EF]">
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between gap-6 px-6 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-[#5F687A]">
                {project.name}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[#8992A4]">
                Final stage · {PROJECT_STAGE_LABELS[project.stage]} · Deadline {getProjectDeadlineInfo(project.deadline, now).fullLabel}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#16815A]">
                <CircleCheck className="size-3.5" /> Completed
              </span>
              <ProjectActions
                project={project}
                onEdit={(edits) => onEdit(project.id, edits)}
                onDelete={() => onDelete(project.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectActions({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: (edits: ProjectEdits) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <MenuPrimitive.Root
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <MenuPrimitive.Trigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Project actions for ${project.name}`}
              className="text-[#8B93A3] hover:bg-[#F0EEF8] hover:text-brand"
            />
          }
        >
          <Ellipsis className="size-4" />
        </MenuPrimitive.Trigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Positioner
            side="bottom"
            align="end"
            sideOffset={6}
            collisionPadding={8}
            className="z-50 outline-none"
          >
            <MenuPrimitive.Popup className="min-w-40 rounded-[10px] border border-[#DEE2EA] bg-white p-1.5 shadow-[0_12px_30px_rgba(23,27,44,0.14)] outline-none">
              <ProjectMenuButton
                icon="edit"
                label="Edit Project"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
              />
              <ProjectMenuButton
                icon="delete"
                label="Delete Project"
                destructive
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
              />
            </MenuPrimitive.Popup>
          </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
      </MenuPrimitive.Root>

      {editOpen ? (
        <EditProjectDialog
          project={project}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={onEdit}
        />
      ) : null}
      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={onDelete}
      />
    </>
  );
}

function ProjectMenuButton({
  icon,
  label,
  destructive = false,
  onClick,
}: {
  icon: "edit" | "delete";
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  const Icon = icon === "edit" ? Pencil : Trash2;
  return (
    <MenuPrimitive.Item
      onClick={onClick}
      className={cn(
        "flex h-8 w-full cursor-default items-center gap-2 rounded-lg px-2.5 text-left text-[12px] font-semibold outline-none transition-colors",
        destructive
          ? "text-[#B42318] hover:bg-[#FFF1EF] data-[highlighted]:bg-[#FFF1EF]"
          : "text-[#4F586C] hover:bg-[#F5F4FA] data-[highlighted]:bg-[#F5F4FA]"
      )}
    >
      <Icon className="size-3.5" /> {label}
    </MenuPrimitive.Item>
  );
}

function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onSave,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (edits: ProjectEdits) => void;
}) {
  const [name, setName] = useState(project.name);
  const [deadlineInput, setDeadlineInput] = useState(
    projectDeadlineToInput(project.deadline)
  );
  const [stage, setStage] = useState<ProjectStage>(project.stage);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [error, setError] = useState<string | null>(null);
  const idSuffix = project.id.replace(/[^a-zA-Z0-9_-]/g, "-");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const deadline = projectDeadlineFromInput(deadlineInput);
    if (!trimmedName) {
      setError("Enter a project name.");
      return;
    }
    if (!deadline) {
      setError("Choose a valid deadline date and time.");
      return;
    }
    onSave({ name: trimmedName, deadline, stage, status });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-[20px] font-bold text-[#202536]">
          Edit Project
        </DialogTitle>
        <DialogDescription className="mt-2 text-[13px] leading-5 text-[#687184]">
          Update the project&apos;s essential details.
        </DialogDescription>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor={`edit-project-name-${idSuffix}`}>Project name</Label>
            <Input
              id={`edit-project-name-${idSuffix}`}
              autoFocus
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-project-deadline-${idSuffix}`}>
              Deadline
            </Label>
            <Input
              id={`edit-project-deadline-${idSuffix}`}
              type="datetime-local"
              required
              value={deadlineInput}
              onChange={(event) => {
                setDeadlineInput(event.target.value);
                setError(null);
              }}
              className="h-10 tabular-nums"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-project-stage-${idSuffix}`}>
                Current stage
              </Label>
              <select
                id={`edit-project-stage-${idSuffix}`}
                value={stage}
                onChange={(event) =>
                  setStage(event.target.value as ProjectStage)
                }
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-[13px] font-semibold text-[#4F586C] outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
              >
                {PROJECT_STAGES.map((value) => (
                  <option key={value} value={value}>
                    {PROJECT_STAGE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-project-status-${idSuffix}`}>Status</Label>
              <select
                id={`edit-project-status-${idSuffix}`}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProjectStatus)
                }
                className="h-10 w-full rounded-md border border-input bg-white px-3 text-[13px] font-semibold text-[#4F586C] outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-[12px] font-semibold text-[#C33A30]">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-1">
            <DialogClose
              render={
                <Button type="button" variant="outline" className="h-9 px-4" />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              className="h-9 bg-brand-deep px-4 hover:bg-brand-dark"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDelete,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle className="text-[20px] font-bold text-[#202536]">
          Delete Project?
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-[13px] leading-5 text-[#687184]">
          Are you sure you want to delete this project? &quot;{project.name}&quot;
          will be removed permanently.
        </AlertDialogDescription>
        <div className="mt-6 flex justify-end gap-3">
          <AlertDialogCancel
            render={
              <Button type="button" variant="outline" className="h-9 px-4" />
            }
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogCancel
            render={
              <Button
                type="button"
                onClick={onDelete}
                className="h-9 bg-[#D92D20] px-4 text-white hover:bg-[#B42318]"
              />
            }
          >
            Delete Project
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateProjectDialog({
  hasCurrentProject,
  onCreate,
}: {
  hasCurrentProject: boolean;
  onCreate: (project: Project, makeCurrent: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [stage, setStage] = useState<ProjectStage>("research");
  const [makeCurrent, setMakeCurrent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setName("");
      setDeadlineInput("");
      setStage("research");
      setMakeCurrent(!hasCurrentProject);
      setError(null);
    }
    setOpen(nextOpen);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const deadline = projectDeadlineFromInput(deadlineInput);
    if (!trimmedName) {
      setError("Enter a project name.");
      return;
    }
    if (!deadline) {
      setError("Choose a valid deadline date and time.");
      return;
    }
    const timestamp = new Date().toISOString();
    onCreate(
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        deadline,
        stage,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
      },
      makeCurrent
    );
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            className="h-9 gap-2 bg-brand-deep px-4 text-[12px] font-bold hover:bg-brand-dark"
          />
        }
      >
        <Plus className="size-4" /> Add Project
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-[20px] font-bold text-[#202536]">
          Add Project
        </DialogTitle>
        <DialogDescription className="mt-2 text-[13px] leading-5 text-[#687184]">
          Keep it lightweight: name, deadline, and your current stage.
        </DialogDescription>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              autoFocus
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="MyBeauty Creative Sample"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-deadline">Deadline</Label>
            <Input
              id="project-deadline"
              type="datetime-local"
              required
              value={deadlineInput}
              onChange={(event) => {
                setDeadlineInput(event.target.value);
                setError(null);
              }}
              className="h-10 tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-stage">Current stage</Label>
            <select
              id="project-stage"
              value={stage}
              onChange={(event) =>
                setStage(event.target.value as ProjectStage)
              }
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-[13px] font-semibold text-[#4F586C] outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
            >
              {PROJECT_STAGES.map((value) => (
                <option key={value} value={value}>
                  {PROJECT_STAGE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2.5 text-[12px] font-semibold text-[#596276]">
            <input
              type="checkbox"
              checked={makeCurrent}
              onChange={(event) => setMakeCurrent(event.target.checked)}
              className="size-4 accent-[#2D2D83]"
            />
            Set as Current Project
          </label>
          {error ? (
            <p role="alert" className="text-[12px] font-semibold text-[#C33A30]">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-1">
            <DialogClose
              render={
                <Button type="button" variant="outline" className="h-9 px-4" />
              }
            >
              Cancel
            </DialogClose>
            <Button type="submit" className="h-9 bg-brand-deep px-4 hover:bg-brand-dark">
              Add Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
