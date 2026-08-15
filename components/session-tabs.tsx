import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSessionLabel } from "@/lib/session";
import type { Session, SessionType } from "@/types/session";

interface SessionTabsProps {
  sessions: Session[];
  selectedSessionType: SessionType | null;
  onSelect: (sessionType: SessionType) => void;
}

export function SessionTabs({
  sessions,
  selectedSessionType,
  onSelect,
}: SessionTabsProps) {
  return (
    <div
      className="grid grid-cols-3 gap-3"
      role="tablist"
      aria-label="Daily sessions"
    >
      {sessions.map((session) => {
        const isSelected = session.sessionType === selectedSessionType;

        return (
          <button
            key={session.id}
            id={`session-tab-${session.sessionType}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls="selected-session-panel"
            onClick={() => onSelect(session.sessionType)}
            className={cn(
              "flex h-12 items-center justify-center gap-2.5 rounded-xl border px-4 text-[14px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/20",
              isSelected
                ? "border-brand-deep bg-brand-deep text-white shadow-[0_6px_16px_rgba(45,45,131,0.16)]"
                : "border-[#DDE1E9] bg-white text-[#343A4C] hover:border-[#AAA7CE] hover:bg-[#FBFBFD]"
            )}
          >
            <Clock3
              className={cn(
                "size-[17px]",
                isSelected ? "text-white" : "text-[#777E91]"
              )}
              strokeWidth={1.9}
            />
            {getSessionLabel(session.sessionType)}
          </button>
        );
      })}
    </div>
  );
}
