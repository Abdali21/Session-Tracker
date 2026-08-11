import { Calendar } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function Loading() {
  return (
    <AppShell activePage="today">
      <div className="space-y-8" aria-busy="true" aria-live="polite">
        <header className="border-b border-[#DEE2EA] pb-7">
          <div className="mb-2.5 flex items-center gap-2 text-text-muted">
            <Calendar className="size-4" />
            <div className="h-4 w-40 animate-pulse rounded bg-[#E7E9EF]" />
          </div>
          <div className="h-[42px] w-64 animate-pulse rounded-md bg-[#E7E9EF]" />
        </header>

        <div className="mx-auto w-full max-w-[940px] space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-xl border border-[#E1E5EC] bg-white"
              />
            ))}
          </div>
          <div className="h-[640px] animate-pulse rounded-2xl border border-[#DEE2EA] bg-white shadow-[0_12px_32px_rgba(23,27,44,0.04)]" />
        </div>
        <span className="sr-only">Loading today&apos;s sessions</span>
      </div>
    </AppShell>
  );
}
