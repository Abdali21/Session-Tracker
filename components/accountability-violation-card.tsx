import { CheckCircle2, FileText, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionLabel } from "@/lib/session";
import {
  type AccountabilityViolation,
  ACCOUNTABILITY_VIOLATION_LABELS,
} from "@/types/accountability";

interface AccountabilityViolationCardProps {
  violation: AccountabilityViolation;
  onPageCompletedChange: (completed: boolean) => void;
}

export function AccountabilityViolationCard({
  violation,
  onPageCompletedChange,
}: AccountabilityViolationCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#DEE2EA] bg-white shadow-[0_8px_24px_rgba(23,27,44,0.04)]">
      <div className="flex items-start justify-between gap-5 px-6 pb-4 pt-5">
        <div>
          <p className="text-[12px] font-bold text-[#8A92A3]">Session</p>
          <h3 className="mt-1 text-[17px] font-bold leading-5 text-[#252A3B]">
            {getSessionLabel(violation.sessionType)}
          </h3>
          {violation.details ? (
            <p className="mt-3 whitespace-pre-line text-[13px] font-medium leading-5 text-[#727B8D]">
              {violation.details}
            </p>
          ) : null}
        </div>
        <span
          className={`inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[12px] font-bold ${
            violation.pageCompleted
              ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
              : "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]"
          }`}
        >
          {ACCOUNTABILITY_VIOLATION_LABELS[violation.type]}
        </span>
      </div>

      <div className="mx-6 border-l-2 border-[#B9B4DF] bg-[#F8F7FC] px-4 py-3.5">
        <div className="flex gap-3.5">
          <FileText className="mt-0.5 size-[18px] shrink-0 text-brand" />
          <div>
            <p className="text-[12px] font-bold text-[#817CA7]">
              Handwritten page
            </p>
            <p className="mt-1.5 text-[14px] font-medium leading-5 text-[#343A4C]">
              &ldquo;{violation.pageInstruction}&rdquo;
            </p>
            <p className="mt-2.5 text-[12px] font-bold text-[#697286]">
              1 page owed
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-[#E7E9EF] bg-[#FAFBFC] px-6 py-4">
        {violation.pageCompleted ? (
          <div className="flex items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[#22A06B]">
              <CheckCircle2 className="size-4" />
              Handwritten page completed
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onPageCompletedChange(false)}
              className="h-8 gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-text-secondary"
            >
              <Undo2 className="size-3.5" />
              Undo
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => onPageCompletedChange(true)}
            className="h-9 rounded-lg bg-brand-deep px-4 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            <CheckCircle2 className="size-3.5" />
            Mark page completed
          </Button>
        )}
      </div>
    </article>
  );
}
