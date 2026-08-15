import { AppShell } from "@/components/app-shell";

export default function Loading() {
  return (
    <AppShell activePage="today" compact>
      <div className="space-y-5" aria-busy="true" aria-live="polite">
        <div className="w-full space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse rounded-xl border border-[#E1E5EC] bg-white"
              />
            ))}
          </div>
          <div className="h-[68px] animate-pulse border-y border-[#DEE2EA] bg-white" />
          <div className="grid h-[112px] grid-cols-2 divide-x divide-[#DEE2EA] border-y border-[#DEE2EA] bg-white">
            <div className="animate-pulse" />
            <div className="animate-pulse" />
          </div>
          <div className="grid items-start gap-3 min-[1200px]:grid-cols-[minmax(0,3fr)_minmax(270px,1fr)]">
            <div className="h-[520px] animate-pulse border-y border-[#DEE2EA] bg-white" />
            <div className="space-y-3">
              <div className="h-[126px] animate-pulse border-y border-[#DEE2EA] bg-white" />
              <div className="h-[150px] animate-pulse border-y border-[#DEE2EA] bg-white" />
            </div>
          </div>
        </div>
        <span className="sr-only">Loading today&apos;s sessions</span>
      </div>
    </AppShell>
  );
}
