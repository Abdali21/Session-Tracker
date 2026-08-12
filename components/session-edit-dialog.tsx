"use client";

import { useState } from "react";
import { CircleCheck, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTimeInput } from "@/lib/session";
import type { Session } from "@/types/session";

interface SessionEditDialogProps {
  session: Session;
  onSave: (startTime: string, finishTime: string) => string | null;
  onReopen: () => void;
}

export function SessionEditDialog({
  session,
  onSave,
  onReopen,
}: SessionEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setStartTime(formatTimeInput(session.startedAt));
      setFinishTime(formatTimeInput(session.finishedAt));
      setError(null);
    }
    setOpen(nextOpen);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = onSave(startTime, finishTime);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setOpen(false);
  }

  function reopen() {
    onReopen();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="default"
            className="h-12 w-full gap-2 rounded-[10px] bg-brand-deep text-[15px] font-semibold shadow-none hover:bg-brand-dark"
          />
        }
      >
        <Pencil className="size-4" />
        Edit Session
      </DialogTrigger>

      <DialogContent>
        <DialogTitle className="text-[20px] font-bold text-[#202536]">
          Edit Session
        </DialogTitle>
        <DialogDescription className="mt-2 text-[14px] leading-6 text-[#687184]">
          Correct this session&apos;s times or reopen it to continue tracking.
        </DialogDescription>

        <form className="mt-6 space-y-5" onSubmit={save}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-session-start">Start time</Label>
              <Input
                id="edit-session-start"
                type="time"
                step="60"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="h-10 rounded-[10px] tabular-nums"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-session-finish">Finish time</Label>
              <Input
                id="edit-session-finish"
                type="time"
                step="60"
                value={finishTime}
                onChange={(event) => setFinishTime(event.target.value)}
                className="h-10 rounded-[10px] tabular-nums"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#E1DFF1] bg-[#F7F6FC] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-[#4D5568]">Status</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[14px] font-bold text-[#16815A]">
                <CircleCheck className="size-4" />
                Completed
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={reopen}
              className="h-9 gap-2 rounded-[9px] px-3 font-semibold"
            >
              <RotateCcw className="size-4" />
              Reopen Session
            </Button>
          </div>

          {error ? (
            <p role="alert" className="text-[13px] font-semibold text-[#C33A30]">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-1">
            <DialogClose
              render={
                <Button type="button" variant="outline" className="h-10 px-4" />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              className="h-10 bg-brand-deep px-4 hover:bg-brand-dark"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
