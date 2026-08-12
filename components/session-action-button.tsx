"use client";

import { CircleCheck, CircleSlash2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

  if (isStarting) {
    return (
      <Button
        type="button"
        className="h-12 w-full gap-2 rounded-[10px] bg-brand-deep text-[15px] font-semibold shadow-none hover:bg-brand-dark"
        variant="default"
        onClick={onStart}
      >
        <Play className="size-4" />
        Start Session
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            className="h-12 w-full gap-2 rounded-[10px] bg-brand-deep text-[15px] font-semibold shadow-none hover:bg-brand-dark"
            variant="default"
          />
        }
      >
        <Square className="size-4" />
        Complete Session
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle className="text-[20px] font-bold text-[#202536]">
          Complete this session?
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-[14px] leading-6 text-[#687184]">
          This will save the current time as the session finish time.
        </AlertDialogDescription>
        <div className="mt-6 flex justify-end gap-3">
          <AlertDialogCancel
            render={
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4"
              />
            }
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogCancel
            render={
              <Button
                type="button"
                onClick={onFinish}
                className="h-10 bg-brand-deep px-4 hover:bg-brand-dark"
              />
            }
          >
            Complete Session
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
