"use client";

import { CircleCheck, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculateTaskDuration, formatTaskDuration } from "@/lib/session";
import type { Session, SessionTask } from "@/types/session";

interface TaskItemProps {
  task: SessionTask;
  session: Session;
  timestamp?: Date;
  onStart: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

export function TaskItem({
  task,
  session,
  timestamp,
  onStart,
  onComplete,
  onDelete,
}: TaskItemProps) {
  const durationSeconds = calculateTaskDuration(task, session, timestamp);
  const isRunning = task.status === "running";
  const isCompleted = task.status === "completed";
  const canStart = session.status === "running";
  const statusLabel = isCompleted ? "Completed" : isRunning ? "Running" : "Pending";

  return (
    <li className="group/task grid min-h-[58px] grid-cols-[minmax(0,1fr)_92px_88px_116px_28px] items-center gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        {isCompleted ? (
          <CircleCheck className="size-4 shrink-0 text-[#16815A]" aria-hidden="true" />
        ) : (
          <span
            className={cn(
              "size-3 shrink-0 rounded-full",
              isRunning ? "bg-brand" : "border-2 border-[#B1B7C4]"
            )}
            aria-hidden="true"
          />
        )}
        <p
          className={cn(
            "min-w-0 break-words text-[14px] leading-5",
            isCompleted
              ? "text-[#8A92A3] line-through decoration-[#C8CDD7]"
              : "font-medium text-[#343A4C]"
          )}
        >
          {task.title}
        </p>
      </div>

      <span
        className={cn(
          "text-[12px] font-semibold",
          isCompleted
            ? "text-[#16815A]"
            : isRunning
              ? "text-brand"
              : "text-[#8A92A3]"
        )}
      >
        {statusLabel}
      </span>

      <span className="text-[13px] font-semibold tabular-nums text-[#697286]">
        {durationSeconds === null ? "—" : formatTaskDuration(durationSeconds)}
      </span>

      <div className="flex justify-end">
        {!isCompleted ? (
          <Button
            type="button"
            size="sm"
            variant={isRunning ? "default" : "outline"}
            onClick={isRunning ? onComplete : onStart}
            disabled={!canStart}
            className={cn(
              "h-8 gap-1.5 rounded-lg px-3 text-[12px] font-semibold shadow-none",
              isRunning && "bg-brand-deep hover:bg-brand-dark"
            )}
          >
            {isRunning ? <Square className="size-3" /> : <Play className="size-3" />}
            {isRunning ? "Complete" : "Start Task"}
          </Button>
        ) : null}
      </div>

      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        onClick={onDelete}
        aria-label={`Delete task: ${task.title}`}
        title="Delete task"
        className="text-[#9AA1AF] opacity-0 transition-opacity duration-150 hover:bg-[#FFF1EF] hover:text-destructive focus-visible:opacity-100 group-hover/task:opacity-100"
      >
        <Trash2 />
      </Button>
    </li>
  );
}
