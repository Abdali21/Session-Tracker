import { Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  activePage: "today" | "history" | "report" | "accountability";
}

const navigation = [
  { label: "Today", href: "/", page: "today" },
  { label: "History", href: "/history", page: "history" },
  { label: "Report", href: "/report", page: "report" },
  {
    label: "Accountability",
    href: "/accountability",
    page: "accountability",
  },
] as const;

export function AppHeader({ activePage }: AppHeaderProps) {
  const linkClassName =
    "flex h-7 items-center rounded-[5px] px-3 font-sans text-[14px] font-medium transition-colors";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card font-sans">
      <div className="mx-auto flex h-[52px] w-full max-w-[1440px] items-center gap-7 px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-[#2D2D83] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]">
            <Layers className="size-4" />
          </span>
          <span className="text-[15px] font-semibold text-foreground">
            Work Session Tracker
          </span>
        </div>
        <nav
          className="flex h-8 items-center gap-0.5 rounded-md border border-border bg-muted/60 p-0.5"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <Link
              key={item.page}
              href={item.href}
              aria-current={activePage === item.page ? "page" : undefined}
              className={cn(
                linkClassName,
                activePage === item.page
                  ? "border border-[#D9D7E5] bg-[#F4F2FB] text-[#413890] shadow-[0_1px_2px_rgba(45,45,131,0.06)]"
                  : "border border-transparent text-text-secondary hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
