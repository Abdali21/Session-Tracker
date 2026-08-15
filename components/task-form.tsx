"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  DEFAULT_TASK_CATEGORY,
  type SelectableTaskCategory,
} from "@/types/session";

export interface TaskDetails {
  outcome: string;
  firstAction: string | null;
  category: SelectableTaskCategory;
  expectedDurationMinutes: number;
}

interface TaskFormProps {
  onAddTask: (details: TaskDetails) => void;
}

export function TaskForm({ onAddTask }: TaskFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [firstAction, setFirstAction] = useState("");
  const [category, setCategory] = useState<SelectableTaskCategory>(
    DEFAULT_TASK_CATEGORY
  );
  const [expectedDuration, setExpectedDuration] = useState("");
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setExpanded(false);
    setOutcome("");
    setFirstAction("");
    setCategory(DEFAULT_TASK_CATEGORY);
    setExpectedDuration("");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedOutcome = outcome.trim();
    if (!trimmedOutcome) {
      setError("Describe the result this task should produce.");
      return;
    }
    const expectedDurationMinutes = expectedDuration
      ? Number(expectedDuration)
      : null;
    if (
      expectedDurationMinutes === null ||
      !Number.isInteger(expectedDurationMinutes) ||
      expectedDurationMinutes <= 0
    ) {
      setError("Enter an estimated time in positive whole minutes.");
      return;
    }

    onAddTask({
      outcome: trimmedOutcome,
      firstAction: firstAction.trim() || null,
      category,
      expectedDurationMinutes,
    });
    setExpanded(false);
    setOutcome("");
    setFirstAction("");
    setCategory(DEFAULT_TASK_CATEGORY);
    setExpectedDuration("");
    setError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") cancel();
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 flex h-10 w-full items-center gap-2 rounded-[10px] border border-dashed border-[#D7DBE5] px-3.5 text-[13px] font-semibold text-[#6E778A] transition-colors hover:border-[#BEB6E5] hover:bg-[#F8F7FC] hover:text-brand"
      >
        <Plus className="size-4" />
        Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <div className="rounded-[12px] border border-brand bg-white p-3 ring-3 ring-brand/10">
        <div className="grid gap-2.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#7C8597]">
            Outcome
            <Input
              autoFocus
              required
              name="outcome"
              type="text"
              placeholder="What result do you want to produce?"
              value={outcome}
              onChange={(event) => {
                setOutcome(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              className="mt-1.5 h-9 text-[12px] normal-case tracking-normal"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#7C8597]">
            First Action <span className="font-semibold normal-case tracking-normal text-[#A0A7B4]">(optional)</span>
            <Input
              name="firstAction"
              type="text"
              placeholder="What will you do first?"
              value={firstAction}
              onChange={(event) => setFirstAction(event.target.value)}
              onKeyDown={handleKeyDown}
              className="mt-1.5 h-9 text-[12px] normal-case tracking-normal"
            />
          </label>
        </div>
        <div className="mt-3 flex items-end gap-2.5 border-t border-[#E8E6F2] pt-3">
          <label className="w-[190px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#7C8597]">
            Category
            <select
              required
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as SelectableTaskCategory)
              }
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-white px-2.5 text-[11px] font-semibold normal-case tracking-normal text-[#4F586C] outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
            >
              {TASK_CATEGORIES.map((value) => (
                <option key={value} value={value}>{TASK_CATEGORY_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <label className="w-[135px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#7C8597]">
            Estimated Time
            <div className="relative mt-1.5">
              <Input
                required
                name="expectedDuration"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="90"
                value={expectedDuration}
                onChange={(event) => {
                  setExpectedDuration(event.target.value);
                  if (error) setError(null);
                }}
                className="h-9 pr-9 text-[12px] normal-case tracking-normal"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold normal-case tracking-normal text-[#969EAE]">min</span>
            </div>
          </label>
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={cancel} className="h-8 gap-1.5 text-[12px] font-bold text-[#737B8D]">
            <X className="size-3.5" /> Cancel
          </Button>
          <Button type="submit" className="h-8 px-4 text-[12px] font-bold">Add Task</Button>
        </div>
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
