"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionTask } from "@/types/session";

interface TaskItemProps {
  task: SessionTask;
  onCompletedChange: (completed: boolean) => void;
  onDelete: () => void;
}

export function TaskItem({
  task,
  onCompletedChange,
  onDelete,
}: TaskItemProps) {
  return (
    <li className="group/task py-2">
      <div className="flex min-w-0 items-start gap-2.5">
        <input
          id={`task-${task.id}`}
          type="checkbox"
          checked={task.completed}
          onChange={(event) => onCompletedChange(event.target.checked)}
          className="mt-[3px] size-3.5 shrink-0 accent-[#513FB0]"
        />
        <label
          htmlFor={`task-${task.id}`}
          className={`min-w-0 flex-1 break-words text-[14px] font-normal leading-5 ${
            task.completed
              ? "text-text-muted line-through decoration-border-strong"
              : ""
          }`}
        >
          {task.title}
        </label>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={onDelete}
          aria-label={`Delete task: ${task.title}`}
          title="Delete task"
          className="-mr-1 text-text-muted opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/task:opacity-100"
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
