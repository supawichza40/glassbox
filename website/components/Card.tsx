import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  /** Optional so a Card can be used as an empty skeleton container. */
  children?: ReactNode;
  className?: string;
  /** Use the darker --well surface (for editable record boxes / insets). */
  well?: boolean;
  /** Apply the staged-reveal rise animation. */
  reveal?: boolean;
  /** Interactive cards lift their hairline to --line-strong on hover. */
  interactive?: boolean;
  as?: "section" | "div" | "article";
}

export function Card({
  children,
  className,
  well = false,
  reveal = false,
  interactive = false,
  as: Tag = "section",
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-[14px] border border-line p-5 sm:p-6 elev-1 transition-colors",
        well ? "bg-well" : "bg-surface",
        interactive && "hover:border-line-strong",
        reveal && "gb-rise",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-[20px] font-bold text-ink m-0", className)}>
      {children}
    </h2>
  );
}
