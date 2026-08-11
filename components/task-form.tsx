"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskFormProps {
  onAddTask: (title: string) => void;
}

export function TaskForm({ onAddTask }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <div className="flex overflow-hidden rounded-[10px] border border-input bg-white transition-shadow focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15">
        <Input
          name="title"
          type="text"
          placeholder="Add a task..."
          aria-label="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="h-11 rounded-none border-0 px-3.5 text-[14px] font-normal shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="h-11 rounded-none border-l border-[#D3D0EA] bg-white px-5 text-[14px] font-semibold text-brand hover:bg-[#F4F2FB] hover:text-brand-mid"
        >
          Add
        </Button>
      </div>
      {error && (
        <p
          className="text-xs font-medium text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </form>
  );
}
