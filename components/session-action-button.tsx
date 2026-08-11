"use client";

import { CircleCheck, CircleSlash2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionStatus } from "@/types/session";

interface SessionActionButtonProps {
  status: SessionStatus;
  onStart: () => void;
  onFinish: () => void;
}

export function SessionActionButton({
  status,
  onStart,
  onFinish,
}: SessionActionButtonProps) {
  if (status === "completed") {
    return (
      <Button
        className="h-12 w-full gap-2 rounded-[10px] text-[15px] font-semibold shadow-none"
        variant="secondary"
        disabled
      >
        <CircleCheck className="size-4" />
        Completed
      </Button>
    );
  }

  if (status === "skipped" || status === "missed") {
    return (
      <Button
        className="h-12 w-full gap-2 rounded-[10px] text-[15px] font-semibold shadow-none"
        variant="outline"
        disabled
      >
        <CircleSlash2 className="size-4" />
        {status === "skipped" ? "Skipped" : "Missed"}
      </Button>
    );
  }

  const isStarting = status === "upcoming";

  return (
    <Button
      type="button"
      className="h-12 w-full gap-2 rounded-[10px] bg-brand-deep text-[15px] font-semibold shadow-none hover:bg-brand-dark"
      variant="default"
      onClick={isStarting ? onStart : onFinish}
    >
      {isStarting ? (
        <Play className="size-4" />
      ) : (
        <Square className="size-4" />
      )}
      {isStarting ? "Start Session" : "Finish Session"}
    </Button>
  );
}
