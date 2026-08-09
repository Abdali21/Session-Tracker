import { CircleAlert, Clock3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SessionActionButton } from "@/components/session-action-button";
import { SessionDurationCircle } from "@/components/session-duration-circle";
import { SessionStatusBadge } from "@/components/session-status-badge";
import { SessionTimeline } from "@/components/session-timeline";
import { TaskForm } from "@/components/task-form";
import { TaskItem } from "@/components/task-item";
import { Input } from "@/components/ui/input";
import {
  formatTime,
  getSessionLabel,
  getSessionScheduleLabel,
} from "@/lib/session";
import { type Session } from "@/types/session";
import { SESSION_SCHEDULE } from "@/types/session";

interface SessionCardProps {
  session: Session;
  onStart: () => void;
  onFinish: () => void;
  onAddTask: (title: string) => void;
  onTaskCompletedChange: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onFinishTargetChange: (finishTarget: string) => void;
  onDistractedChange: (distracted: boolean) => void;
  actionError?: string;
}

export function SessionCard({
  session,
  onStart,
  onFinish,
  onAddTask,
  onTaskCompletedChange,
  onDeleteTask,
  onFinishTargetChange,
  onDistractedChange,
  actionError,
}: SessionCardProps) {
  const title = getSessionLabel(session.sessionType);
  const plannedTime = getSessionScheduleLabel(session.sessionType);
  const schedule = SESSION_SCHEDULE[session.sessionType];
  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="border-b border-border/80 bg-muted/15 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 text-[17px] font-semibold leading-5">
            {title}
          </CardTitle>
          <SessionStatusBadge status={session.status} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium tabular-nums text-text-secondary">
          <Clock3 className="size-3.5" />
          {plannedTime}
        </p>
      </CardHeader>

      <CardContent className="px-5 py-0">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_102px] items-center divide-x divide-border/80 py-4">
          <div className="pr-4">
            <span className="mb-1 block text-[12px] font-medium text-text-muted">
              Start
            </span>
            <span className="text-[15px] font-medium tabular-nums">
              {formatTime(session.startedAt)}
            </span>
          </div>
          <div className="pl-4">
            <span className="mb-1 block text-[12px] font-medium text-text-muted">
              {session.status === "in_progress" ? "Finish target" : "Finish"}
            </span>
            {session.status === "in_progress" ? (
              <Input
                type="time"
                min={schedule.plannedStart}
                max={schedule.plannedFinish}
                step="60"
                value={session.finishTarget ?? schedule.plannedFinish}
                onChange={(event) => onFinishTargetChange(event.target.value)}
                aria-label={`${title} finish target`}
                className="h-7 w-[116px] tabular-nums"
              />
            ) : (
              <span className="text-[15px] font-medium tabular-nums">
                {formatTime(session.finishedAt)}
              </span>
            )}
          </div>
          <div className="flex justify-end pl-4">
            <SessionDurationCircle session={session} />
          </div>
        </div>

        <SessionTimeline session={session} />

        <label className="-mx-5 flex items-center gap-2.5 border-b border-border/80 px-5 py-3 text-[13px] font-medium text-text-secondary">
          <input
            type="checkbox"
            checked={session.distracted}
            disabled={
              session.status === "not_started" || session.status === "skipped"
            }
            onChange={(event) => onDistractedChange(event.target.checked)}
            className="size-3.5 shrink-0 accent-[#513FB0] disabled:cursor-not-allowed disabled:opacity-45"
          />
          <span>I got distracted during this session</span>
        </label>

        <div className="py-4">
          <span className="mb-2 block text-[12px] font-medium text-text-secondary">
            Tasks
          </span>
          {session.tasks.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {session.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onCompletedChange={(completed) =>
                    onTaskCompletedChange(task.id, completed)
                  }
                  onDelete={() => onDeleteTask(task.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-[14px] font-normal text-text-muted">
              No tasks yet
            </p>
          )}
          <TaskForm onAddTask={onAddTask} />
        </div>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 rounded-none border-t border-border/80 bg-muted/15 px-5 py-4">
        {actionError && (
          <p
            role="alert"
            className="flex items-start gap-2 text-[12px] font-medium leading-4 text-[#D92D20]"
          >
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {actionError}
          </p>
        )}
        <SessionActionButton
          status={session.status}
          onStart={onStart}
          onFinish={onFinish}
        />
      </CardFooter>
    </Card>
  );
}
