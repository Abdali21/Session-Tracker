import { Circle, CircleCheck, Clock3 } from "lucide-react";
import { SessionTimeline } from "@/components/session-timeline";
import { SessionDurationCircle } from "@/components/session-duration-circle";
import { SessionStatusBadge } from "@/components/session-status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatTime,
  getSessionLabel,
  getSessionScheduleLabel,
} from "@/lib/session";
import { cn } from "@/lib/utils";
import { type Session } from "@/types/session";

interface HistorySessionCardProps {
  session: Session;
}

export function HistorySessionCard({ session }: HistorySessionCardProps) {
  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="border-b border-border/80 bg-muted/15 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 text-[17px] font-semibold leading-5">
            {getSessionLabel(session.sessionType)}
          </CardTitle>
          <SessionStatusBadge status={session.status} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium tabular-nums text-text-secondary">
          <Clock3 className="size-3.5" />
          {getSessionScheduleLabel(session.sessionType)}
        </p>
      </CardHeader>

      <CardContent className="px-5 py-0">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_92px] items-center divide-x divide-border/80 py-4">
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
              Finish
            </span>
            <span className="text-[15px] font-medium tabular-nums">
              {formatTime(session.finishedAt)}
            </span>
          </div>
          <div className="flex justify-end pl-3">
            <SessionDurationCircle session={session} />
          </div>
        </div>

        <SessionTimeline session={session} showIncompleteResult />

        <div className="py-4">
          <span className="mb-2 block text-[12px] font-medium text-text-secondary">
            Tasks
          </span>
          {session.tasks.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {session.tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex min-w-0 items-start gap-2.5 py-2"
                >
                  {task.completed ? (
                    <CircleCheck
                      className="mt-0.5 size-3.5 shrink-0 text-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "min-w-0 flex-1 break-words text-[14px] font-normal leading-5",
                      task.completed &&
                        "text-text-muted line-through decoration-border-strong"
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="sr-only">
                    {task.completed ? "Completed" : "Incomplete"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-[14px] font-normal text-text-muted">
              No tasks recorded
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
