import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock3,
  RotateCcw,
} from "lucide-react";
import { EditableSessionTime } from "@/components/editable-session-time";
import { SessionActionButton } from "@/components/session-action-button";
import { SessionDurationCircle } from "@/components/session-duration-circle";
import { SessionEditDialog } from "@/components/session-edit-dialog";
import { SessionStatusBadge } from "@/components/session-status-badge";
import { TaskForm, type TaskDetails } from "@/components/task-form";
import { TaskItem } from "@/components/task-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  calculateLateMinutes,
  evaluateStartTimeRule,
  formatLiveDuration,
  formatTaskDuration,
  getSessionLabel,
  getSessionScheduleLabel,
  getTrackedTaskTime,
} from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/session";

interface SessionCardProps {
  session: Session;
  timestamp?: Date;
  onStart: () => void;
  onFinish: () => void;
  onAddTask: (details: TaskDetails) => void;
  onStartTask: (taskId: string) => void;
  onPauseTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onReopenTask: (taskId: string) => void;
  onEditTask: (taskId: string, details: TaskDetails) => void;
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
  onPauseTask,
  onCompleteTask,
  onReopenTask,
  onEditTask,
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
  const completedTaskCount = session.tasks.filter(
    (task) => task.status === "completed"
  ).length;
  const hasActiveTask = session.tasks.some(
    (task) => task.status === "running"
  );

  return (
    <div className="space-y-3">
      <CompactSessionHeader
        session={session}
        title={title}
        plannedTime={plannedTime}
        onStart={onStart}
        onFinish={onFinish}
        onEditSession={onEditSession}
        onReopen={onReopen}
      />

      {actionError ? (
        <p
          role="alert"
          className="flex items-start gap-2 border-y border-[#F2C8C3] bg-[#FFF7F6] px-5 py-3 text-[12px] font-semibold leading-5 text-[#C33A30]"
        >
          <CircleAlert
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          {actionError}
        </p>
      ) : null}

      <section
        className="grid grid-cols-2 border-y border-[#DDE1E9] bg-[#FCFCFD]"
        aria-label="Session timing"
      >
        <div className="min-w-0 px-5 py-4">
          <EditableSessionTime
            label="Auto Start"
            value={session.startedAt}
            editable={session.status === "running"}
            onSave={onActualStartChange}
            onUndo={session.status === "running" ? onUndoStart : undefined}
          />
        </div>
        <div className="flex min-w-0 items-center justify-between gap-5 border-l border-[#E0E4EB] px-5 py-3">
          <EditableSessionTime
            label="Auto Finish"
            value={session.finishedAt}
            editable={false}
            onSave={onActualFinishChange}
          />
          <SessionDurationCircle session={session} timestamp={timestamp} />
        </div>
      </section>

      <div className="grid items-start gap-3 min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(270px,1fr)]">
        <section
          className="min-w-0 border-y border-[#DDE1E9] bg-white px-5 py-5"
          aria-labelledby="tasks-heading"
        >
          <div className="mb-4 flex items-center justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-brand">
                Execution Workspace
              </p>
              <h3
                id="tasks-heading"
                className="mt-1 text-[18px] font-bold text-[#262B3B]"
              >
                Tasks
              </h3>
              <p className="mt-1 text-[11px] text-[#8A92A3]">
                Deep Work only counts while a task is active.
              </p>
            </div>
            <TaskSummary
              completed={completedTaskCount}
              total={session.tasks.length}
              trackedTaskTime={trackedTaskTime}
              hasActiveTask={hasActiveTask}
            />
          </div>

          {session.tasks.length > 0 ? (
            <ul className="divide-y divide-[#E5E8EE] border-y border-[#E1E4EB]">
              {session.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  session={session}
                  timestamp={timestamp}
                  onStart={() => onStartTask(task.id)}
                  onPause={() => onPauseTask(task.id)}
                  onComplete={() => onCompleteTask(task.id)}
                  onReopen={() => onReopenTask(task.id)}
                  onEdit={(details) => onEditTask(task.id, details)}
                  onDelete={() => onDeleteTask(task.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="border-y border-dashed border-[#DDE1E9] bg-[#FAFBFC] py-8 text-center text-[13px] text-[#8C95A6]">
              Add a task to begin tracking Deep Work.
            </p>
          )}
          {taskError ? (
            <p
              role="alert"
              className="mt-3 text-[13px] font-semibold text-[#C33A30]"
            >
              {taskError}
            </p>
          ) : null}
          <TaskForm onAddTask={onAddTask} />
        </section>

        <aside className="space-y-3" aria-label="Session rules">
          <StartTimeRule
            rule={startTimeRule}
            lateByMinutes={lateByMinutes}
          />
          <FocusRule
            session={session}
            disabled={distractionDisabled}
            onDistractedChange={onDistractedChange}
            onReasonChange={onDistractionReasonChange}
          />
        </aside>
      </div>
    </div>
  );
}

function CompactSessionHeader({
  session,
  title,
  plannedTime,
  onStart,
  onFinish,
  onEditSession,
  onReopen,
}: {
  session: Session;
  title: string;
  plannedTime: string;
  onStart: () => void;
  onFinish: () => void;
  onEditSession: (startTime: string, finishTime: string) => string | null;
  onReopen: () => void;
}) {
  return (
    <section className="flex min-h-[68px] items-center justify-between gap-5 border-y border-[#DDE1E9] bg-white px-5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#7C8597]">
            Current Session
          </p>
          <SessionStatusBadge status={session.status} />
        </div>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="text-[18px] font-bold leading-6 text-[#161A2B]">
            {title}
          </h2>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums text-[#697286]">
            <Clock3 className="size-3.5 text-brand" strokeWidth={1.9} />
            {plannedTime}
          </p>
        </div>
      </div>

      {session.status === "completed" ? (
        <div className="grid w-[360px] shrink-0 grid-cols-2 gap-2">
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
            <RotateCcw className="size-4" /> Reopen Session
          </Button>
        </div>
      ) : (
        <div className="w-[220px] shrink-0">
          <SessionActionButton
            status={session.status}
            onStart={onStart}
            onFinish={onFinish}
          />
        </div>
      )}
    </section>
  );
}

function TaskSummary({
  completed,
  total,
  trackedTaskTime,
  hasActiveTask,
}: {
  completed: number;
  total: number;
  trackedTaskTime: number;
  hasActiveTask: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center divide-x divide-[#E0E4EB] bg-[#FAFBFC] px-1 py-2">
      <div className="px-3 text-right">
        <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#969EAE]">
          Completed
        </p>
        <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[#4D5568]">
          {completed} / {total}
        </p>
      </div>
      <div className="min-w-[100px] px-3 text-right">
        <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#969EAE]">
          Deep Work
        </p>
        <p className="mt-0.5 text-[13px] font-bold tabular-nums text-brand-deep">
          {hasActiveTask
            ? formatLiveDuration(trackedTaskTime)
            : formatTaskDuration(trackedTaskTime)}
        </p>
      </div>
    </div>
  );
}

function StartTimeRule({
  rule,
  lateByMinutes,
}: {
  rule: ReturnType<typeof evaluateStartTimeRule>;
  lateByMinutes: number | null;
}) {
  return (
    <section className="border-y border-[#DDE1E9] bg-white px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A92A3]">
        Start Time
      </p>
      <p className="mt-1 text-[12px] font-semibold text-[#4D5568]">
        Accountability Rule
      </p>
      <div className="mt-4 border-t border-[#E7E9EF] pt-3">
        {rule === "respected" ? (
          <span className="flex items-center gap-2 text-[13px] font-bold text-[#16815A]">
            <CircleCheck className="size-4" /> Respected
          </span>
        ) : rule === "broken" && lateByMinutes !== null ? (
          <span className="flex items-center gap-2 text-[13px] font-bold text-[#C33A30]">
            <CircleX className="size-4" /> {lateByMinutes}m late
          </span>
        ) : (
          <span className="text-[13px] font-bold text-[#817CA7]">
            Not Started
          </span>
        )}
      </div>
    </section>
  );
}

function FocusRule({
  session,
  disabled,
  onDistractedChange,
  onReasonChange,
}: {
  session: Session;
  disabled: boolean;
  onDistractedChange: (distracted: boolean) => void;
  onReasonChange: (reason: string) => void;
}) {
  return (
    <section className="border-y border-[#DDE1E9] bg-white px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A92A3]">
        Focus Rule
      </p>
      <p className="mt-1 text-[12px] font-semibold text-[#343A4C]">
        Did you get distracted?
      </p>
      <div
        className="mt-4 flex w-fit rounded-[9px] border border-[#DCE0E8] bg-[#F8F9FB] p-1"
        role="group"
        aria-label="Distraction"
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          aria-pressed={session.distracted === true}
          onClick={() => onDistractedChange(true)}
          className={cn(
            "h-7 rounded-md px-3 text-[12px] font-semibold shadow-none",
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
          disabled={disabled}
          aria-pressed={session.distracted === false}
          onClick={() => onDistractedChange(false)}
          className={cn(
            "h-7 rounded-md px-3 text-[12px] font-semibold shadow-none",
            session.distracted === false
              ? "bg-[#EAF8F0] text-[#087A4C] hover:bg-[#DFF4E8] hover:text-[#087A4C]"
              : "text-[#737B8D]"
          )}
        >
          No
        </Button>
      </div>
      {session.distracted === true ? (
        <Input
          type="text"
          value={session.distractionReason ?? ""}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Optional reason..."
          aria-label="Distraction reason"
          className="mt-3 h-8 rounded-lg text-[12px]"
        />
      ) : null}
    </section>
  );
}
