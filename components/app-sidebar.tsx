"use client";

import {
  CalendarDays,
  ClipboardCheck,
  Crosshair,
  FileChartColumn,
  Flag,
  Layers3,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  getCurrentProject,
  getProjectDeadlineInfo,
} from "@/lib/projects";
import { createProjectStore } from "@/lib/local-projects";
import { useProjectClock } from "@/lib/use-project-clock";
import { usePendingAccountabilityCount } from "@/lib/use-pending-accountability-count";
import { cn } from "@/lib/utils";
import { PROJECT_STAGE_LABELS } from "@/types/project";

export type AppPage =
  | "today"
  | "today-goal"
  | "projects"
  | "report"
  | "accountability"
  | "goal";

interface AppSidebarProps {
  activePage: AppPage;
}

const navigation = [
  {
    label: "Today Goal",
    href: "/today-goal",
    page: "today-goal",
    icon: Crosshair,
  },
  { label: "Today", href: "/", page: "today", icon: CalendarDays },
  { label: "Analytics", href: "/report", page: "report", icon: FileChartColumn },
  {
    label: "Accountability",
    href: "/accountability",
    page: "accountability",
    icon: ClipboardCheck,
  },
  { label: "Goal", href: "/goal", page: "goal", icon: Target },
] as const;

export function AppSidebar({ activePage }: AppSidebarProps) {
  const pendingAccountabilityCount = usePendingAccountabilityCount();
  const projectStore = useMemo(() => createProjectStore(), []);
  const projectState = useSyncExternalStore(
    projectStore.subscribe,
    projectStore.getSnapshot,
    projectStore.getServerSnapshot
  );
  const now = useProjectClock();
  const currentProject = getCurrentProject(projectState);
  const deadline = currentProject
    ? getProjectDeadlineInfo(currentProject.deadline, now)
    : null;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#E3E6ED] bg-white px-5 py-7 xl:w-[288px] xl:px-7">
      <Link
        href="/"
        className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/20"
        aria-label="Work Session Tracker home"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-deep text-white shadow-[0_5px_14px_rgba(45,45,131,0.18)]">
          <Layers3 className="size-5" strokeWidth={2} />
        </span>
        <span className="text-[16px] font-bold leading-5 text-[#181B2B]">
          Work Session
          <span className="block">Tracker</span>
        </span>
      </Link>

      <nav className="mt-10 space-y-1.5" aria-label="Primary navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.page;

          return (
            <Link
              key={item.page}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-12 items-center gap-3 rounded-xl px-3.5 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/20",
                isActive
                  ? "bg-[#F0F0FB] text-brand-deep"
                  : "text-[#4E5668] hover:bg-[#F7F8FA] hover:text-[#181B2B]"
              )}
            >
              <Icon
                className={cn(
                  "size-[19px] shrink-0",
                  isActive ? "text-brand" : "text-[#8A92A3]"
                )}
                strokeWidth={1.9}
              />
              <span>{item.label}</span>
              {item.page === "accountability" &&
              pendingAccountabilityCount > 0 ? (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#D92D20] px-1.5 py-0.5 text-[10px] font-bold leading-4 tabular-nums text-white">
                  {pendingAccountabilityCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <section
        className="mt-7 border-t border-[#E7E9EF] pt-5"
        aria-labelledby="current-project-heading"
      >
        <div className="flex items-center gap-2 text-[#8A92A3]">
          <Flag className="size-3.5 shrink-0" strokeWidth={1.9} />
          <h2
            id="current-project-heading"
            className="text-[10px] font-bold uppercase tracking-[0.1em]"
          >
            Current Project
          </h2>
        </div>

        <Link
          href="/projects"
          className="mt-2 block rounded-lg py-1 pl-[22px] pr-1 transition-colors hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/15"
        >
          {currentProject && deadline ? (
            <div className="min-w-0">
              <p
                className="truncate text-[13px] font-bold leading-5 text-[#252A3B]"
                title={currentProject.name}
              >
                {currentProject.name}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#687185]">
                {PROJECT_STAGE_LABELS[currentProject.stage]}
              </p>
              <p
                className={cn(
                  "mt-2 text-[10px] font-semibold leading-4",
                  deadline.tone === "subtle" && "text-[#747D8F]",
                  deadline.tone === "warning" && "text-[#B54708]",
                  deadline.tone === "strong" && "font-bold text-[#B42318]",
                  deadline.tone === "danger" && "font-bold text-[#D92D20]"
                )}
              >
                {deadline.shortDateLabel} · {deadline.compactRelativeLabel}
              </p>
            </div>
          ) : (
            <p className="text-[11px] font-semibold text-[#969EAE]">
              No current project
            </p>
          )}
        </Link>
      </section>
    </aside>
  );
}
