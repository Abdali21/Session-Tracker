"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskFormProps {
  onAddTask: (title: string) => void;
}

export function TaskForm({ onAddTask }: TaskFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setExpanded(false);
    setTitle("");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Enter a task before adding it.");
      return;
    }

    onAddTask(trimmedTitle);
    setTitle("");
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
      <div className="flex overflow-hidden rounded-[10px] border border-brand bg-white ring-3 ring-brand/10">
        <Input
          autoFocus
          name="title"
          type="text"
          placeholder="What are you working on?"
          aria-label="Task title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          className="h-10 rounded-none border-0 px-3.5 text-[14px] shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="h-10 rounded-none border-l border-[#DED9F2] px-4 text-[13px] font-bold text-brand hover:bg-[#F4F2FB]"
        >
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={cancel}
          aria-label="Cancel adding task"
          className="h-10 w-9 rounded-none text-[#8A92A3] hover:bg-[#F4F2FB]"
        >
          <X className="size-4" />
        </Button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
