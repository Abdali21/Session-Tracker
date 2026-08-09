import { formatSessionDuration, getSessionDuration } from "@/lib/session";
import type { Session } from "@/types/session";

interface SessionDurationCircleProps {
  session: Session;
}

const RADIUS = 31;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SessionDurationCircle({
  session,
}: SessionDurationCircleProps) {
  const duration = getSessionDuration(session);
  const value =
    duration.minutes === null ? "—" : formatSessionDuration(duration.minutes);
  const label =
    duration.state === "planned"
      ? "planned"
      : duration.state === "worked"
        ? "worked"
        : duration.state === "invalid"
          ? "invalid"
          : "duration";
  const dashOffset = CIRCUMFERENCE * (1 - duration.progress);

  return (
    <div
      className="relative size-[78px] shrink-0"
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
          strokeWidth="4"
        />
        {duration.minutes !== null && duration.progress > 0 && (
          <circle
            cx="36"
            cy="36"
            r={RADIUS}
            fill="none"
            stroke="#513FB0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="max-w-full text-[13px] font-semibold leading-4 tabular-nums text-[#2D2D83]">
          {value}
        </span>
        <span className="text-[10px] font-medium leading-3 text-text-muted">
          {label}
        </span>
      </div>
    </div>
  );
}
