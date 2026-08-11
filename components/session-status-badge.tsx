import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SESSION_STATUS_LABELS, type SessionStatus } from "@/types/session";

const STATUS_STYLES: Record<SessionStatus, string> = {
  upcoming:
    "border-[#DEDEE6] bg-[#F4F4F6] text-[#696978] [&_[data-status-dot]]:bg-[#8079AF]",
  running:
    "border-[#D9D2F2] bg-[#EEEAFB] text-[#513FB0] [&_[data-status-dot]]:bg-[#513FB0]",
  completed:
    "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647] [&_[data-status-dot]]:bg-[#067647]",
  missed:
    "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318] [&_[data-status-dot]]:bg-[#B42318]",
  skipped:
    "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318] [&_[data-status-dot]]:bg-[#B42318]",
};

interface SessionStatusBadgeProps {
  status: SessionStatus;
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-7 gap-2 rounded-full px-3 font-sans text-[13px] font-semibold shadow-none",
        STATUS_STYLES[status]
      )}
    >
      <span
        data-status-dot
        className="size-1.5 rounded-full"
        aria-hidden="true"
      />
      {SESSION_STATUS_LABELS[status]}
    </Badge>
  );
}
