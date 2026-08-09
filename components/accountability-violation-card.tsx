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
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border/80 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold leading-5">
            {getSessionLabel(violation.sessionType)}
          </h3>
          <p className="mt-1 text-[12px] font-medium text-text-muted">
            {violation.details}
          </p>
        </div>
        <span
          className={`inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[12px] font-semibold ${
            violation.pageCompleted
              ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
              : "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]"
          }`}
        >
          {ACCOUNTABILITY_VIOLATION_LABELS[violation.type]}
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="flex gap-3">
          <FileText className="mt-0.5 size-4 shrink-0 text-[#513FB0]" />
          <div>
            <p className="text-[12px] font-medium text-text-muted">
              Handwritten page
            </p>
            <p className="mt-1 text-[14px] leading-5 text-foreground">
              &ldquo;{violation.pageInstruction}&rdquo;
            </p>
            <p className="mt-2 text-[12px] font-medium text-text-secondary">
              1 page owed
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/80 bg-muted/15 px-5 py-3">
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
              className="h-7 gap-1.5 px-2 text-[12px] text-text-secondary"
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
            className="h-8 bg-[#2D2D83] px-3 text-[12px] text-white hover:bg-[#282572]"
          >
            <CheckCircle2 className="size-3.5" />
            Mark page completed
          </Button>
        )}
      </div>
    </article>
  );
}
