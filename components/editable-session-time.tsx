"use client";

import { useState } from "react";
import { Check, Pencil, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime, formatTimeInput } from "@/lib/session";

interface EditableSessionTimeProps {
  label: string;
  value: string | null;
  editable: boolean;
  onSave: (clockTime: string) => string | null;
  onUndo?: () => void;
}

export function EditableSessionTime({
  label,
  value,
  editable,
  onSave,
  onUndo,
}: EditableSessionTimeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [clockTime, setClockTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  function beginEditing() {
    setClockTime(formatTimeInput(value));
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setError(null);
    setIsEditing(false);
  }

  function save() {
    const validationError = onSave(clockTime);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsEditing(false);
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-text-muted">
        {label}
      </span>
      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="time"
            step="60"
            value={clockTime}
            onChange={(event) => setClockTime(event.target.value)}
            aria-label={`Correct ${label}`}
            className="h-9 w-[126px] rounded-lg tabular-nums"
          />
          <Button
            type="button"
            size="icon-xs"
            variant="default"
            onClick={save}
            aria-label={`Save ${label}`}
            title="Save"
          >
            <Check />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={cancelEditing}
            aria-label={`Cancel editing ${label}`}
            title="Cancel"
          >
            <X />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-[18px] font-bold tabular-nums text-[#262B3B]">
            {formatTime(value)}
          </span>
          {editable && value !== null && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={beginEditing}
              aria-label={`Edit ${label}`}
              title={`Edit ${label}`}
              className="text-[#7F8798] hover:text-brand"
            >
              <Pencil />
            </Button>
          )}
          {onUndo && value !== null && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onUndo}
              className="h-7 gap-1 px-1.5 text-[12px] font-semibold text-text-muted"
            >
              <Undo2 className="size-3" />
              Undo Start
            </Button>
          )}
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-1.5 max-w-[240px] text-[11px] font-medium leading-4 text-[#D92D20]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
