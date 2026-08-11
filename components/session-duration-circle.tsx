import { formatSessionDuration, getSessionDuration } from "@/lib/session";
import type { Session } from "@/types/session";

interface SessionDurationCircleProps {
  session: Session;
  timestamp?: Date;
}

const RADIUS = 31;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SessionDurationCircle({
  session,
  timestamp,
}: SessionDurationCircleProps) {
  const duration = getSessionDuration(session, timestamp);
  const value =
    duration.minutes === null ? "—" : formatSessionDuration(duration.minutes);
  const label =
    duration.state === "worked"
        ? "deep work"
        : duration.state === "invalid"
          ? "invalid"
          : "duration";
  const dashOffset = CIRCUMFERENCE * (1 - duration.progress);

  return (
    <div
      className="relative size-[88px] shrink-0"
      role="img"
      aria-label={`${value} ${label}`}
    >
      <svg
        viewBox="0 0 72 72"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke="#D9D7E5"
          strokeWidth="4.5"
        />
        {duration.minutes !== null && duration.progress > 0 && (
          <circle
            cx="36"
            cy="36"
            r={RADIUS}
            fill="none"
            stroke="#513FB0"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="max-w-full text-[14px] font-bold leading-4 tabular-nums text-[#2D2D83]">
          {value}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold leading-3 text-text-muted">
          {label}
        </span>
      </div>
    </div>
  );
}
