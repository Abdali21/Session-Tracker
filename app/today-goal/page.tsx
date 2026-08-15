"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Check, Pencil } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTodayGoalStore } from "@/lib/local-today-goal";
import { useTodayDate } from "@/lib/use-today-date";
import { cn } from "@/lib/utils";
import {
  TODAY_GOAL_PRIORITIES,
  TODAY_GOAL_PRIORITY_LABELS,
  type TodayGoal,
  type TodayGoalPriority,
} from "@/types/today-goal";

export default function TodayGoalPage() {
  const date = useTodayDate();
  const store = useMemo(() => createTodayGoalStore(date), [date]);
  const goal = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  return (
    <AppShell activePage="today-goal" compact>
      <TodayGoalContent
        key={date}
        goal={goal}
        onSave={(outcome, priority) => store.save({ outcome, priority })}
      />
    </AppShell>
  );
}

function TodayGoalContent({
  goal,
  onSave,
}: {
  goal: TodayGoal | null;
  onSave: (outcome: string, priority: TodayGoalPriority) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [priority, setPriority] = useState<TodayGoalPriority>(
    "creative_mastery"
  );
  const [error, setError] = useState<string | null>(null);
  const showForm = goal === null || editing;

  function beginEdit() {
    if (!goal) return;
    setOutcome(goal.outcome);
    setPriority(goal.priority);
    setError(null);
    setEditing(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedOutcome = outcome.trim();
    if (!trimmedOutcome) {
      setError("Enter the main result you want to achieve today.");
      return;
    }
    onSave(trimmedOutcome, priority);
    setEditing(false);
  }

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <header className="border-b border-[#E1E5EC] pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
          Today Goal
        </p>
        <h1 className="mt-2 text-[21px] font-bold leading-7 text-[#202536]">
          What is the main outcome you want to achieve today?
        </h1>
        <p className="mt-1 text-[12px] text-[#7D8698]">
          Set one clear result and the priority it serves.
        </p>
      </header>

      {showForm ? (
        <form
          className="mt-7 rounded-2xl border border-[#DEE2EA] bg-white px-7 py-7 shadow-[0_8px_26px_rgba(23,27,44,0.035)]"
          onSubmit={submit}
        >
          <label
            htmlFor="today-goal-outcome"
            className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#7C8597]"
          >
            Outcome
          </label>
          <Input
            id="today-goal-outcome"
            autoFocus
            required
            value={outcome}
            onChange={(event) => {
              setOutcome(event.target.value);
              setError(null);
            }}
            placeholder="What is the main result you want to achieve today?"
            className="mt-2 h-12 text-[14px] font-semibold"
          />

          <fieldset className="mt-6">
            <legend className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#7C8597]">
              Priority
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {TODAY_GOAL_PRIORITIES.map((value) => {
                const selected = priority === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "flex h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-[12px] font-bold transition-colors",
                      selected
                        ? "border-brand bg-[#F4F2FB] text-brand-deep"
                        : "border-[#DEE2EA] bg-white text-[#626B7D] hover:border-[#CFC9E9]"
                    )}
                  >
                    <input
                      type="radio"
                      name="today-goal-priority"
                      value={value}
                      checked={selected}
                      onChange={() => setPriority(value)}
                      className="size-4 accent-[#513FB0]"
                    />
                    {TODAY_GOAL_PRIORITY_LABELS[value]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <p className="mt-4 text-[12px] font-semibold text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex items-center justify-end gap-3 border-t border-[#E7E9EF] pt-5">
            {goal ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
                className="h-9 px-4 text-[12px] font-bold"
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              className="h-9 gap-2 bg-brand-deep px-4 text-[12px] font-bold hover:bg-brand-dark"
            >
              <Check className="size-4" /> Set Today Goal
            </Button>
          </div>
        </form>
      ) : (
        <section className="mt-7 rounded-2xl border border-[#DAD6EE] bg-white px-8 py-8 shadow-[0_8px_26px_rgba(23,27,44,0.035)]">
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand">
                Today Goal
              </p>
              <h2 className="mt-3 text-[24px] font-bold leading-8 text-[#202536]">
                {goal.outcome}
              </h2>
              <div className="mt-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-[#8992A4]">
                  Priority
                </p>
                <p className="mt-1.5 text-[13px] font-bold text-brand-deep">
                  {TODAY_GOAL_PRIORITY_LABELS[goal.priority]}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={beginEdit}
              className="h-9 shrink-0 gap-2 px-3 text-[12px] font-bold"
            >
              <Pencil className="size-3.5" /> Edit
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
