import {
  CalendarDays,
  ClipboardCheck,
  FileChartColumn,
  Layers3,
  Target,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type AppPage = "today" | "report" | "accountability" | "goal";

interface AppSidebarProps {
  activePage: AppPage;
}

const navigation = [
  { label: "Today", href: "/", page: "today", icon: CalendarDays },
  { label: "Report", href: "/report", page: "report", icon: FileChartColumn },
  {
    label: "Accountability",
    href: "/accountability",
    page: "accountability",
    icon: ClipboardCheck,
  },
  { label: "Goal", href: "/goal", page: "goal", icon: Target },
] as const;

export function AppSidebar({ activePage }: AppSidebarProps) {
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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
