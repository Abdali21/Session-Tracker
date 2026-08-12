"use client";

import { useState, type KeyboardEvent } from "react";
import {
  Check,
  Circle,
  CircleCheck,
  Ellipsis,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  calculateTaskDuration,
  formatLiveDuration,
  formatTaskDuration,
} from "@/lib/session";
import type { Session, SessionTask } from "@/types/session";

interface TaskItemProps {
  task: SessionTask;
  session: Session;
  timestamp?: Date;
  onStart: () => void;
  onPause: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onEdit: (title: string) => void;
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
  const [title, setTitle] = useState(task.title);
  const durationSeconds = calculateTaskDuration(task, session, timestamp);
  const isRunning = task.status === "running";
  const isPaused = task.status === "paused";
  const isCompleted = task.status === "completed";
  const canTime = session.status === "running";

  function saveEdit() {
    const trimmedTitle = title.trim();
    if (trimmedTitle) onEdit(trimmedTitle);
    else setTitle(task.title);
    setEditing(false);
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") saveEdit();
    if (event.key === "Escape") {
      setTitle(task.title);
      setEditing(false);
    }
  }

  function runMenuAction(action: () => void) {
    action();
    setMenuOpen(false);
  }

  return (
    <li
      className={cn(
        "group/task relative grid min-h-[72px] grid-cols-[minmax(0,1fr)_118px_108px_36px] items-center gap-4 rounded-xl border px-4 py-3 transition-[background-color,border-color,box-shadow] duration-150",
        isRunning
          ? "border-[#CFC8F1] bg-[#F8F7FD] shadow-[0_7px_20px_rgba(45,45,131,0.08)]"
          : "border-transparent bg-white hover:border-[#E1E4EB] hover:bg-[#FCFCFD]"
      )}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F4F2FB]">
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
          {editing ? (
            <Input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleEditKeyDown}
              aria-label={`Edit task: ${task.title}`}
              className="h-8 rounded-lg px-2.5 text-[14px] font-semibold"
            />
          ) : (
            <p
              className={cn(
                "truncate text-[14px] font-semibold leading-5",
                isCompleted ? "text-[#747D8F]" : "text-[#272D3E]"
              )}
              title={task.title}
            >
              {task.title}
            </p>
          )}
          <p
            className={cn(
              "mt-0.5 text-[12px] font-medium",
              isRunning
                ? "text-brand"
                : isCompleted
                  ? "text-[#16815A]"
                  : "text-[#8A92A3]"
            )}
          >
            {isRunning
              ? "In progress · Deep Work active"
              : isPaused
                ? "Paused"
                : isCompleted
                  ? "Completed"
                  : "Not started"}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "font-bold tabular-nums",
            isRunning ? "text-[14px] text-brand-deep" : "text-[13px] text-[#596276]"
          )}
          aria-label={`${formatTaskDuration(durationSeconds)} Deep Work`}
        >
          {isRunning
            ? formatLiveDuration(durationSeconds)
            : formatTaskDuration(durationSeconds)}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9AA1AF]">
          Deep Work
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
            <Pause className="size-3.5" />
            Pause
          </Button>
        ) : isCompleted ? (
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#16815A]">
            <Check className="size-3.5" /> Done
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={isPaused ? "default" : "outline"}
            onClick={onStart}
            disabled={!canTime}
            className={cn(
              "h-8 gap-1.5 rounded-lg px-3 text-[12px] font-bold shadow-none",
              isPaused && "bg-brand-deep hover:bg-brand-dark"
            )}
          >
            <Play className="size-3.5" />
            {isPaused ? "Resume" : "Start"}
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
          aria-label={`More actions for ${task.title}`}
          aria-expanded={menuOpen}
          className="text-[#8B93A3] hover:bg-[#F0EEF8] hover:text-brand"
        >
          <Ellipsis className="size-4" />
        </Button>

        {menuOpen ? (
          <div className="absolute right-0 top-9 z-20 min-w-40 rounded-[10px] border border-[#DEE2EA] bg-white p-1.5 shadow-[0_12px_30px_rgba(23,27,44,0.14)]">
            <MenuButton
              icon={Pencil}
              label="Edit task"
              onClick={() => {
                setEditing(true);
                setMenuOpen(false);
              }}
            />
            {(isRunning || isPaused) && (
              <MenuButton
                icon={Square}
                label="Complete"
                onClick={() => runMenuAction(onComplete)}
              />
            )}
            {isCompleted && (
              <MenuButton
                icon={RotateCcw}
                label="Reopen task"
                onClick={() => runMenuAction(onReopen)}
              />
            )}
            {!isRunning && (
              <MenuButton
                icon={Trash2}
                label="Delete"
                destructive
                onClick={() => runMenuAction(onDelete)}
              />
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function MenuButton({
  icon: Icon,
  label,
  destructive = false,
  onClick,
}: {
  icon: typeof Pencil;
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
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
