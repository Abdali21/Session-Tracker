import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { getSessionTimeline } from "@/lib/session";
import type { Session } from "@/types/session";

interface SessionTimelineProps {
  session: Session;
  showIncompleteResult?: boolean;
}

export function SessionTimeline({
  session,
  showIncompleteResult = false,
}: SessionTimelineProps) {
  const timeline = getSessionTimeline(session);
  const completedTasks = session.tasks.filter((task) => task.completed).length;
  const showActualStart =
    (session.status === "in_progress" || session.status === "completed") &&
    timeline.actualStartPosition !== null;
  const showActualFinish =
    session.status === "completed" &&
    timeline.actualFinishPosition !== null;
  const summaries = [
    showActualStart ? timeline.startSummary : null,
    showActualFinish ? timeline.finishSummary : null,
    session.status !== "not_started" && session.tasks.length > 0
      ? `Tasks: ${completedTasks} / ${session.tasks.length} completed`
      : null,
  ].filter((summary): summary is string => summary !== null);
  const hasActualRange = showActualStart && showActualFinish;
  const actualRangeStart = hasActualRange
    ? timeline.actualStartPosition!
    : 0;
  const actualRangeWidth = hasActualRange
    ? timeline.actualFinishPosition! - timeline.actualStartPosition!
    : 0;
  const actualLabel =
    showActualStart && showActualFinish
      ? `${timeline.actualStartLabel} → ${timeline.actualFinishLabel}`
      : showActualStart && session.status === "in_progress"
        ? `${timeline.actualStartLabel} → In progress`
        : showActualStart
          ? `Start: ${timeline.actualStartLabel}`
          : null;
  const showResult =
    session.status === "completed" ||
    session.status === "skipped" ||
    showIncompleteResult;
  const resultColor =
    timeline.result.tone === "success" ? "text-[#22A06B]" : "text-[#D92D20]";

  return (
    <div
      className="-mx-5 space-y-2.5 border-y border-border bg-secondary px-5 py-4"
      aria-label={`Planned from ${timeline.plannedStartLabel} to ${timeline.plannedFinishLabel}${
        actualLabel ? `. Actual ${actualLabel}` : ". Not started"
      }`}
    >
      <div className="flex items-start justify-between text-[12px] font-medium tabular-nums text-[#696978]">
        <span>{timeline.plannedStartLabel}</span>
        <span>{timeline.plannedFinishLabel}</span>
      </div>

      <div className="relative mx-1 h-7" aria-hidden="true">
        <div className="absolute inset-x-[7px] inset-y-0">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#D9D7E5]" />
          <div className="absolute left-0 top-1/2 h-3.5 w-px -translate-y-1/2 bg-[#696978]" />
          <div className="absolute right-0 top-1/2 h-3.5 w-px -translate-y-1/2 bg-[#696978]" />

          {hasActualRange && actualRangeWidth > 0 && (
            <div
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm bg-[#513FB0]"
              style={{
                left: `${actualRangeStart}%`,
                width: `${actualRangeWidth}%`,
              }}
            />
          )}
          {showActualStart && (
            <div
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-[#2D2D83] shadow-[0_0_0_1px_rgba(45,45,131,0.16)]"
              style={{ left: `${timeline.actualStartPosition}%` }}
            />
          )}
          {showActualFinish && (
            <div
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#2D2D83] bg-card shadow-[0_0_0_1px_rgba(45,45,131,0.16)]"
              style={{ left: `${timeline.actualFinishPosition}%` }}
            />
          )}
        </div>
      </div>

      {actualLabel && (
        <p className="text-center text-[12px] font-medium tabular-nums text-[#696978]">
          {actualLabel}
        </p>
      )}

      {timeline.invalidTimeMessages.length > 0 && !showResult && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {timeline.invalidTimeMessages.map((message) => (
            <p
              key={message}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#D92D20]"
            >
              <CircleAlert className="size-3.5" aria-hidden="true" />
              {message}
            </p>
          ))}
        </div>
      )}

      {summaries.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3 text-[12px] font-medium leading-4 text-text-secondary">
          {summaries.map((summary) => (
            <p key={summary}>{summary}</p>
          ))}
        </div>
      )}

      {showResult && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {timeline.result.messages.map((message) => (
            <p
              key={message}
              className={`flex items-center gap-1.5 text-[12px] font-semibold ${resultColor}`}
            >
              {timeline.result.tone === "success" ? (
                <CircleCheck className="size-3.5" aria-hidden="true" />
              ) : (
                <CircleX className="size-3.5" aria-hidden="true" />
              )}
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
