import type { ReactNode } from "react";
import { AppSidebar, type AppPage } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  activePage: AppPage;
  children: ReactNode;
  compact?: boolean;
  fullWidth?: boolean;
}

export function AppShell({
  activePage,
  children,
  compact = false,
  fullWidth = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar activePage={activePage} />
      <main className="ml-[240px] min-h-screen xl:ml-[288px]">
        <div
          className={cn(
            "w-full px-9 xl:px-12",
            fullWidth ? "max-w-none" : "mx-auto max-w-[1280px]",
            compact ? "py-6 xl:py-7" : "py-10 xl:py-11"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
