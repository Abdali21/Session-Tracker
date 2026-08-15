"use client";

import { useState, type KeyboardEvent } from "react";
import {
  Check,
  Circle,
  CircleCheck,
  Ellipsis,
  FileText,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { TaskDetails } from "@/components/task-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAnalyticsDuration } from "@/lib/analytics";
import {
  calculateTaskDuration,
  formatLiveDuration,
  formatTaskDuration,
  getTaskClarityIssues,
} from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TASK_CATEGORY,
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  getTaskCategoryLabel,
  getTaskDisplayName,
  isSelectableTaskCategory,
  type Session,
  type SessionTask,
  type SelectableTaskCategory,
} from "@/types/session";

interface TaskItemProps {
  task: SessionTask;
  session: Session;
  timestamp?: Date;
  onStart: () => void;
  onPause: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onEdit: (details: TaskDetails) => void;
  onDelete: () => void;
}

export function TaskItem({
  task,
  session,
  timestamp,
  onStart,
  onPause,
  onComplete,
  onReopen,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [startReviewOpen, setStartReviewOpen] = useState(false);
  const [outcome, setOutcome] = useState(getTaskDisplayName(task));
  const [firstAction, setFirstAction] = useState(task.firstAction ?? "");
  const [category, setCategory] = useState<SelectableTaskCategory>(
    isSelectableTaskCategory(task.category)
      ? task.category
      : DEFAULT_TASK_CATEGORY
  );
  const [expectedDuration, setExpectedDuration] = useState(
    task.expectedDurationMinutes?.toString() ?? ""
  );
  const [editError, setEditError] = useState<string | null>(null);
  const durationSeconds = calculateTaskDuration(task, session, timestamp);
  const isRunning = task.status === "running";
  const isPaused = task.status === "paused";
  const isCompleted = task.status === "completed";
  const canTime = session.status === "running";
  const clarityIssues = getTaskClarityIssues(task);
  const budgetDifference =
    task.expectedDurationMinutes === null
      ? null
      : durationSeconds - task.expectedDurationMinutes * 60;
  const estimateReached =
    isRunning && budgetDifference !== null && budgetDifference >= 0;
  const displayName = getTaskDisplayName(task);

  function beginEdit() {
    setOutcome(displayName);
    setFirstAction(task.firstAction ?? "");
    setCategory(
      isSelectableTaskCategory(task.category)
        ? task.category
        : DEFAULT_TASK_CATEGORY
    );
    setExpectedDuration(task.expectedDurationMinutes?.toString() ?? "");
    setEditError(null);
    setEditing(true);
    setStartReviewOpen(false);
  }

  function saveEdit() {
    const trimmedOutcome = outcome.trim();
    const expectedDurationMinutes = expectedDuration
      ? Number(expectedDuration)
      : null;
    if (!trimmedOutcome) {
      setEditError("Outcome is required before this task can start.");
      return;
    }
    if (
      expectedDurationMinutes === null ||
      !Number.isInteger(expectedDurationMinutes) ||
      expectedDurationMinutes <= 0
    ) {
      setEditError("Enter an estimated time in positive whole minutes.");
      return;
    }
    onEdit({
      outcome: trimmedOutcome,
      firstAction: firstAction.trim() || null,
      category,
      expectedDurationMinutes,
    });
    setEditError(null);
    setEditing(false);
  }

  function cancelEdit() {
    setEditError(null);
    setEditing(false);
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") cancelEdit();
  }

  function runMenuAction(action: () => void) {
    action();
    setMenuOpen(false);
  }

  function startTask() {
    if (clarityIssues.length > 0) return;
    setStartReviewOpen(false);
    setDetailsOpen(true);
    onStart();
  }

  return (
    <li
      className={cn(
        "group/task relative transition-colors duration-150",
        isRunning ? "bg-[#F6F5FC]" : "bg-white hover:bg-[#FCFCFD]"
      )}
    >
      <div className="grid min-h-[88px] grid-cols-[minmax(0,1fr)_225px_108px_36px] items-center gap-4 px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F4F2FB]">
            {isCompleted ? (
              <CircleCheck className="size-[18px] text-[#16815A]" aria-hidden="true" />
            ) : isRunning ? (
              <span className="relative flex size-3" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand/30" />
                <span className="relative inline-flex size-3 rounded-full bg-brand" />
              </span>
            ) : isPaused ? (
              <Pause className="size-4 text-[#8079AF]" aria-hidden="true" />
            ) : (
              <Circle className="size-[17px] text-[#A6ADBA]" aria-hidden="true" />
            )}
          </span>

          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-[14px] font-bold leading-5",
                isCompleted ? "text-[#747D8F]" : "text-[#272D3E]"
              )}
              title={displayName}
            >
              {displayName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-[#F1F0FA] px-2 py-0.5 text-[10px] font-bold text-brand">
                {getTaskCategoryLabel(task.category)}
              </span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg px-3 py-2 text-right tabular-nums",
            estimateReached && "bg-[#FFF7ED]"
          )}
        >
          <p className="text-[11px] font-semibold text-[#858E9F]">
            Expected {task.expectedDurationMinutes === null ? "—" : formatAnalyticsDuration(task.expectedDurationMinutes * 60)}
            <span className="mx-1.5 text-[#C1C5CE]">·</span>
            Actual <span className="font-bold text-[#4D5568]">{isRunning ? formatLiveDuration(durationSeconds) : formatTaskDuration(durationSeconds)}</span>
          </p>
          <p
            className={cn(
              "mt-1 text-[11px] font-bold",
              budgetDifference === null
                ? "text-[#9AA1AF]"
                : budgetDifference < 0
                  ? "text-[#16815A]"
                  : "text-[#A45A16]"
            )}
          >
            {formatTaskBudgetStatus(budgetDifference, isRunning)}
          </p>
        </div>

        <div className="flex justify-end">
          {isRunning ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onPause}
              className="h-8 gap-1.5 rounded-lg border-[#CFC8F1] bg-white px-3 text-[12px] font-bold text-brand shadow-none hover:bg-[#F2F0FA]"
            >
              <Pause className="size-3.5" /> Pause
            </Button>
          ) : isCompleted ? (
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#16815A]">
              <Check className="size-3.5" /> Done
            </span>
          ) : isPaused ? (
            <Button
              type="button"
              size="sm"
              onClick={onStart}
              disabled={!canTime}
              className="h-8 gap-1.5 rounded-lg bg-brand-deep px-3 text-[12px] font-bold shadow-none hover:bg-brand-dark"
            >
              <Play className="size-3.5" /> Resume
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setStartReviewOpen(true)}
              disabled={!canTime}
              className="h-8 gap-1.5 rounded-lg px-3 text-[12px] font-bold shadow-none"
            >
              <Play className="size-3.5" /> Start
            </Button>
          )}
        </div>

        <div
          className="relative flex justify-end"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setMenuOpen(false);
            }
          }}
        >
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`More actions for ${displayName}`}
            aria-expanded={menuOpen}
            className="text-[#8B93A3] hover:bg-[#F0EEF8] hover:text-brand"
          >
            <Ellipsis className="size-4" />
          </Button>

          {menuOpen ? (
            <div className="absolute right-0 top-9 z-20 min-w-40 rounded-[10px] border border-[#DEE2EA] bg-white p-1.5 shadow-[0_12px_30px_rgba(23,27,44,0.14)]">
              <MenuButton
                icon={FileText}
                label={detailsOpen ? "Hide task brief" : "View task brief"}
                onClick={() => {
                  setDetailsOpen((open) => !open);
                  setMenuOpen(false);
                }}
              />
              <MenuButton icon={Pencil} label="Edit task" onClick={() => {
                beginEdit();
                setMenuOpen(false);
              }} />
              {(isRunning || isPaused) && (
                <MenuButton icon={Square} label="Complete" onClick={() => runMenuAction(onComplete)} />
              )}
              {isCompleted && (
                <MenuButton icon={RotateCcw} label="Reopen task" onClick={() => runMenuAction(onReopen)} />
              )}
              {!isRunning && (
                <MenuButton icon={Trash2} label="Delete" destructive onClick={() => runMenuAction(onDelete)} />
              )}
            </div>
          ) : null}
        </div>
      </div>

      {editing ? (
        <TaskEditor
          outcome={outcome}
          firstAction={firstAction}
          category={category}
          expectedDuration={expectedDuration}
          error={editError}
          onOutcomeChange={(value) => { setOutcome(value); setEditError(null); }}
          onFirstActionChange={setFirstAction}
          onCategoryChange={setCategory}
          onExpectedDurationChange={(value) => { setExpectedDuration(value); setEditError(null); }}
          onKeyDown={handleEditKeyDown}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      ) : null}

      {detailsOpen || startReviewOpen ? (
        <TaskBrief
          task={task}
          isStartReview={startReviewOpen}
          clarityIssues={clarityIssues}
          onEdit={beginEdit}
          onClose={() => {
            setDetailsOpen(false);
            setStartReviewOpen(false);
          }}
          onStart={startTask}
        />
      ) : null}
    </li>
  );
}

function TaskEditor({
  outcome,
  firstAction,
  category,
  expectedDuration,
  error,
  onOutcomeChange,
  onFirstActionChange,
  onCategoryChange,
  onExpectedDurationChange,
  onKeyDown,
  onSave,
  onCancel,
}: {
  outcome: string;
  firstAction: string;
  category: SelectableTaskCategory;
  expectedDuration: string;
  error: string | null;
  onOutcomeChange: (value: string) => void;
  onFirstActionChange: (value: string) => void;
  onCategoryChange: (value: SelectableTaskCategory) => void;
  onExpectedDurationChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border-t border-[#E3E6ED] bg-[#FAFBFC] px-4 py-4">
      <div className="grid gap-2.5">
        <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#7C8597]">
          Outcome
          <Input autoFocus required value={outcome} onChange={(event) => onOutcomeChange(event.target.value)} onKeyDown={onKeyDown} aria-label="Task outcome" placeholder="What result do you want to produce?" className="mt-1.5 h-9 normal-case tracking-normal" />
        </label>
        <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#7C8597]">
          First Action <span className="font-semibold normal-case tracking-normal text-[#A0A7B4]">(optional)</span>
          <Input value={firstAction} onChange={(event) => onFirstActionChange(event.target.value)} onKeyDown={onKeyDown} aria-label="First action" placeholder="What will you do first?" className="mt-1.5 h-9 normal-case tracking-normal" />
        </label>
      </div>
      <div className="mt-3 flex items-end gap-2.5 border-t border-[#E8E6F2] pt-3">
        <label className="w-[190px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#7C8597]">
          Category
          <select required value={category} onChange={(event) => onCategoryChange(event.target.value as SelectableTaskCategory)} aria-label="Task category" className="mt-1.5 h-9 w-full rounded-md border border-input bg-white px-2.5 text-[11px] font-semibold normal-case tracking-normal text-[#4F586C] outline-none focus:border-brand focus:ring-3 focus:ring-brand/15">
            {TASK_CATEGORIES.map((value) => <option key={value} value={value}>{TASK_CATEGORY_LABELS[value]}</option>)}
          </select>
        </label>
        <label className="w-[135px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#7C8597]">
          Estimated Time
          <div className="relative mt-1.5">
            <Input required type="number" min={1} step={1} value={expectedDuration} onChange={(event) => onExpectedDurationChange(event.target.value)} onKeyDown={onKeyDown} aria-label="Estimated duration in minutes" placeholder="90" className="h-9 pr-9 normal-case tracking-normal" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold normal-case tracking-normal text-[#969EAE]">min</span>
          </div>
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold text-destructive" role={error ? "alert" : undefined}>{error}</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="h-8 gap-1.5 text-[12px] font-bold"><X className="size-3.5" /> Cancel</Button>
          <Button type="button" onClick={onSave} className="h-8 gap-1.5 px-3 text-[12px] font-bold"><Check className="size-3.5" /> Save</Button>
        </div>
      </div>
    </div>
  );
}

function TaskBrief({
  task,
  isStartReview,
  clarityIssues,
  onEdit,
  onClose,
  onStart,
}: {
  task: SessionTask;
  isStartReview: boolean;
  clarityIssues: ReturnType<typeof getTaskClarityIssues>;
  onEdit: () => void;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <div className="border-t border-[#DCD9EC] bg-[#F8F7FC] px-5 py-4">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand">{isStartReview ? "Clarify · Estimate · Execute" : "Task Brief"}</p>
          <p className="mt-1 text-[15px] font-bold text-[#292F40]">{getTaskDisplayName(task)}</p>
          <p className="mt-1 text-[10px] font-semibold text-[#858E9F]">
            {getTaskCategoryLabel(task.category)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close task brief"><X className="size-3.5" /></Button>
      </div>
      <dl className="mt-4 grid grid-cols-[130px_minmax(0,1fr)] gap-5">
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8992A4]">Estimated</dt>
          <dd className="mt-1 text-[12px] font-bold text-[#4F586C]">{task.expectedDurationMinutes === null ? "Not estimated" : formatAnalyticsDuration(task.expectedDurationMinutes * 60)}</dd>
        </div>
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8992A4]">First Action</dt>
          <dd className="mt-1 text-[12px] font-semibold leading-5 text-[#4F586C]">{task.firstAction || "Not specified"}</dd>
        </div>
      </dl>
      {isStartReview ? (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#E0DDEC] pt-4">
          <p className={cn("text-[11px] font-semibold", clarityIssues.length > 0 ? "text-[#A45A16]" : "text-[#16815A]") }>
            {clarityIssues.length > 0
              ? "Add the missing clarity fields before starting."
              : "Your outcome and time boundary are clear."}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onEdit} className="h-8 gap-1.5 text-[12px] font-bold"><Pencil className="size-3.5" /> Edit brief</Button>
            <Button type="button" onClick={onStart} disabled={clarityIssues.length > 0} className="h-8 gap-1.5 bg-brand-deep px-4 text-[12px] font-bold hover:bg-brand-dark"><Play className="size-3.5" /> Start Task</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  destructive = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[12px] font-semibold transition-colors",
        destructive
          ? "text-[#B42318] hover:bg-[#FFF1EF]"
          : "text-[#4F586C] hover:bg-[#F5F4FA]"
      )}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}

function formatTaskBudgetStatus(
  differenceSeconds: number | null,
  isRunning: boolean
): string {
  if (differenceSeconds === null) return "No estimate";
  if (differenceSeconds < 0) {
    return `${formatAnalyticsDuration(Math.abs(differenceSeconds))} remaining`;
  }
  if (differenceSeconds === 0) {
    return isRunning ? "Estimated time reached" : "On estimate";
  }
  return `+${formatAnalyticsDuration(differenceSeconds)} over estimate`;
}
