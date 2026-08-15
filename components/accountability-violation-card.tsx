import { CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatHistoryDate,
  formatTime,
  getSessionLabel,
} from "@/lib/session";
import {
  type AccountabilityViolation,
  ACCOUNTABILITY_VIOLATION_LABELS,
} from "@/types/accountability";

interface AccountabilityViolationCardProps {
  violation: AccountabilityViolation;
  onComplete?: () => void;
  compact?: boolean;
}

export function AccountabilityViolationCard({
  violation,
  onComplete,
  compact = false,
}: AccountabilityViolationCardProps) {
  const title = `${getSessionLabel(violation.sessionType)} — ${
    ACCOUNTABILITY_VIOLATION_LABELS[violation.type]
  }`;

  if (compact) {
    return (
      <article className="flex items-center justify-between gap-6 border-b border-[#E8EAF0] px-5 py-4 last:border-0">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-bold text-[#4F586C]">
            {title}
          </h3>
          <p className="mt-1 text-[11px] font-semibold text-[#9299A8]">
            {formatHistoryDate(violation.date)}
            {violation.completedAt
              ? ` · Completed ${formatTime(violation.completedAt)}`
              : ""}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-[#16815A]">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Completed
        </span>
      </article>
    );
  }

  return (
    <article className="border-y border-[#FECDCA] bg-white px-6 py-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h3 className="text-[17px] font-bold text-[#252A3B]">{title}</h3>
          <p className="mt-1 text-[12px] font-semibold text-[#858E9F]">
            {formatHistoryDate(violation.date)}
          </p>
          {violation.details ? (
            <p className="mt-4 whitespace-pre-line text-[13px] font-medium leading-6 text-[#626B7E]">
              {violation.details}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full border border-[#FECDCA] bg-[#FEF3F2] px-3 py-1 text-[11px] font-bold text-[#B42318]">
          Pending
        </span>
      </div>

      <div className="mt-5 flex items-start gap-3 border-l-2 border-[#D92D20] bg-[#FFF7F6] px-4 py-3.5">
        <FileText className="mt-0.5 size-4 shrink-0 text-[#B42318]" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#B42318]">
            Required Accountability
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-[#4F586C]">
            {violation.pageInstruction}
          </p>
        </div>
      </div>

      {onComplete ? (
        <div className="mt-5">
          <Button
            type="button"
            size="sm"
            onClick={onComplete}
            className="h-9 gap-2 rounded-lg bg-brand-deep px-4 text-[12px] font-bold text-white hover:bg-brand-dark"
          >
            <CheckCircle2 className="size-4" />
            Mark Completed
          </Button>
        </div>
      ) : null}
    </article>
  );
}
