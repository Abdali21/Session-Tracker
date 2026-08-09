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
        className="h-9 w-full gap-2 rounded-md text-[14px] font-medium shadow-none"
        variant="secondary"
        disabled
      >
        <CircleCheck className="size-4" />
        Completed
      </Button>
    );
  }

  if (status === "skipped") {
    return (
      <Button
        className="h-9 w-full gap-2 rounded-md text-[14px] font-medium shadow-none"
        variant="outline"
        disabled
      >
        <CircleSlash2 className="size-4" />
        Skipped
      </Button>
    );
  }

  const isStarting = status === "not_started";

  return (
    <Button
      type="button"
      className="h-9 w-full gap-2 rounded-md text-[14px] font-medium shadow-none"
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
