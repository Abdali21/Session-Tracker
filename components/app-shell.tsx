import type { ReactNode } from "react";
import { AppSidebar, type AppPage } from "@/components/app-sidebar";

interface AppShellProps {
  activePage: AppPage;
  children: ReactNode;
}

export function AppShell({ activePage, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar activePage={activePage} />
      <main className="ml-[240px] min-h-screen xl:ml-[288px]">
        <div className="mx-auto w-full max-w-[1280px] px-9 py-10 xl:px-12 xl:py-11">
          {children}
        </div>
      </main>
    </div>
  );
}
