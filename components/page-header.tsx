import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  icon?: LucideIcon;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  icon: Icon,
}: PageHeaderProps) {
  return (
    <header className="border-b border-[#DEE2EA] pb-7">
      {eyebrow ? (
        <div className="mb-2.5 flex items-center gap-2 text-[#69738B]">
          {Icon ? <Icon className="size-4 text-brand" strokeWidth={1.9} /> : null}
          <span className="text-[14px] font-semibold">{eyebrow}</span>
        </div>
      ) : null}
      <h1 className="text-[36px] font-bold leading-[42px] text-[#161A2B]">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-[720px] text-[15px] leading-6 text-[#687184]">
          {description}
        </p>
      ) : null}
    </header>
  );
}
