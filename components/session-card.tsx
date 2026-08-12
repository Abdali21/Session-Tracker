import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  RotateCcw,
} from "lucide-react";
import { SessionEditDialog } from "@/components/session-edit-dialog";
import { SessionActionButton } from "@/components/session-action-button";
import { EditableSessionTime } from "@/components/editable-session-time";
import { SessionDurationCircle } from "@/components/session-duration-circle";
import { SessionStatusBadge } from "@/components/session-status-badge";
import { TaskForm } from "@/components/task-form";
import { TaskItem } from "@/components/task-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  calculateLateMinutes,
  evaluateStartTimeRule,
  formatTaskDuration,
  getSessionLabel,
  getSessionScheduleLabel,
  getTrackedTaskTime,
} from "@/lib/session";
import type { Session } from "@/types/session";

interface SessionCardProps {
  session: Session;
  timestamp?: Date;
  onStart: () => void;
  onFinish: () => void;
  onAddTask: (title: string) => void;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onActualStartChange: (clockTime: string) => string | null;
  onActualFinishChange: (clockTime: string) => string | null;
  onEditSession: (startTime: string, finishTime: string) => string | null;
  onReopen: () => void;
  onUndoStart: () => void;
  onDistractedChange: (distracted: boolean) => void;
  onDistractionReasonChange: (reason: string) => void;
  actionError?: string;
  taskError?: string;
}

export function SessionCard({
  session,
  timestamp,
  onStart,
  onFinish,
  onAddTask,
  onStartTask,
  onCompleteTask,
  onDeleteTask,
  onActualStartChange,
  onActualFinishChange,
  onEditSession,
  onReopen,
  onUndoStart,
  onDistractedChange,
  onDistractionReasonChange,
  actionError,
  taskError,
}: SessionCardProps) {
  const title = getSessionLabel(session.sessionType);
  const plannedTime = getSessionScheduleLabel(session.sessionType);
  const startTimeRule = evaluateStartTimeRule(session);
  const lateByMinutes = calculateLateMinutes(session);
  const distractionDisabled =
    session.status === "upcoming" ||
    session.status === "missed" ||
    session.status === "skipped";
  const trackedTaskTime = getTrackedTaskTime(session, timestamp);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white shadow-[0_12px_32px_rgba(23,27,44,0.055)]">
      <div className="flex items-start justify-between gap-6 px-8 py-7">
        <div>
          <h2 className="text-[23px] font-bold leading-7 text-[#161A2B]">
            {title}
          </h2>
          <div className="mt-3">
            <span className="text-[13px] font-semibold text-[#8A92A3]">
              Official Time
            </span>
            <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold tabular-nums text-[#4B5366]">
              <Clock3 className="size-4 text-brand" strokeWidth={1.9} />
              {plannedTime}
            </p>
          </div>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      <div className="grid grid-cols-[1fr_1fr_152px] items-center border-y border-[#E5E8EE] bg-[#FCFCFD] px-8 py-6">
        <div className="min-w-0 pr-7">
          <EditableSessionTime
            label="Actual Start"
            value={session.startedAt}
            editable={session.status === "running"}
            onSave={onActualStartChange}
            onUndo={session.status === "running" ? onUndoStart : undefined}
          />
        </div>
        <div className="min-w-0 border-l border-[#E0E4EB] px-7">
          <EditableSessionTime
            label="Actual Finish"
            value={session.finishedAt}
            editable={false}
            onSave={onActualFinishChange}
          />
        </div>
        <div className="flex justify-end border-l border-[#E0E4EB] pl-7">
          <SessionDurationCircle session={session} timestamp={timestamp} />
        </div>
      </div>

      <div className="px-8">
        <div
          className={cn(
            "my-6 flex min-h-12 items-center justify-between rounded-xl border px-4",
            startTimeRule === "respected"
              ? "border-[#C8E9D7] bg-[#F2FBF6]"
              : startTimeRule === "broken"
                ? "border-[#F3D1CD] bg-[#FFF6F5]"
                : "border-[#E1DFF1] bg-[#F7F6FC]"
          )}
        >
          <span className="text-[14px] font-semibold text-[#4D5568]">
            Start Time
          </span>
          {startTimeRule === "respected" ? (
            <span className="flex items-center gap-2 text-[14px] font-semibold text-[#16815A]">
              <CircleCheck className="size-4" />
              Respected
            </span>
          ) : startTimeRule === "broken" && lateByMinutes !== null ? (
            <span className="flex items-center gap-2 text-[14px] font-semibold text-[#C33A30]">
              <CircleX className="size-4" />
              {lateByMinutes}m late
            </span>
          ) : (
            <span className="text-[14px] font-semibold text-[#817CA7]">
              Not started
            </span>
          )}
        </div>

        <div className="border-t border-[#E7E9EF] py-6">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h3 className="text-[14px] font-semibold text-[#343A4C]">
                Did you get distracted during this session?
              </h3>
            </div>
            <div
              className="flex rounded-[10px] border border-[#DCE0E8] bg-[#F8F9FB] p-1"
              role="group"
              aria-label="Distraction"
            >
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={distractionDisabled}
                aria-pressed={session.distracted === true}
                onClick={() => onDistractedChange(true)}
                className={cn(
                  "h-8 rounded-lg px-4 text-[13px] font-semibold shadow-none",
                  session.distracted === true
                    ? "bg-[#FFF0EE] text-[#B42318] hover:bg-[#FFE8E5] hover:text-[#B42318]"
                    : "text-[#737B8D]"
                )}
              >
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={distractionDisabled}
                aria-pressed={session.distracted === false}
                onClick={() => onDistractedChange(false)}
                className={cn(
                  "h-8 rounded-lg px-4 text-[13px] font-semibold shadow-none",
                  session.distracted === false
                    ? "bg-[#EAF8F0] text-[#087A4C] hover:bg-[#DFF4E8] hover:text-[#087A4C]"
                    : "text-[#737B8D]"
                )}
              >
                No
              </Button>
            </div>
          </div>
          {session.distracted === true ? (
            <Input
              type="text"
              value={session.distractionReason ?? ""}
              onChange={(event) => onDistractionReasonChange(event.target.value)}
              placeholder="Optional reason..."
              aria-label="Distraction reason"
              className="mt-4 h-10 rounded-[10px] text-[14px]"
            />
          ) : null}
        </div>

        <div className="border-t border-[#E7E9EF] py-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-[15px] font-bold text-[#262B3B]">Tasks</h3>
            <span className="text-[13px] font-semibold tabular-nums text-[#7E8799]">
              Tracked: {formatTaskDuration(trackedTaskTime)}
            </span>
          </div>
          {session.tasks.length > 0 ? (
            <ul className="divide-y divide-[#E8EAF0] border-y border-[#E8EAF0]">
              {session.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  session={session}
                  timestamp={timestamp}
                  onStart={() => onStartTask(task.id)}
                  onComplete={() => onCompleteTask(task.id)}
                  onDelete={() => onDeleteTask(task.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="border-y border-[#E8EAF0] py-5 text-[14px] text-[#9199A8]">
              No tasks yet
            </p>
          )}
          {taskError ? (
            <p role="alert" className="mt-3 text-[13px] font-semibold text-[#C33A30]">
              {taskError}
            </p>
          ) : null}
          <TaskForm onAddTask={onAddTask} />
        </div>
      </div>

      <div className="border-t border-[#E3E6ED] bg-[#FAFBFC] px-8 py-5">
        {actionError ? (
          <p role="alert" className="mb-3 flex items-start gap-2 text-[13px] font-semibold leading-5 text-[#C33A30]">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {actionError}
          </p>
        ) : null}
        {session.status === "completed" ? (
          <div className="grid grid-cols-2 gap-3">
            <SessionEditDialog
              session={session}
              onSave={onEditSession}
              onReopen={onReopen}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onReopen}
              className="h-12 w-full gap-2 rounded-[10px] text-[15px] font-semibold shadow-none"
            >
              <RotateCcw className="size-4" />
              Reopen Session
            </Button>
          </div>
        ) : (
          <SessionActionButton
            status={session.status}
            onStart={onStart}
            onFinish={onFinish}
          />
        )}
      </div>
    </section>
  );
}
