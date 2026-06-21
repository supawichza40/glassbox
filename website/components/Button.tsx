import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Button variants (design-system locked):
//   primary = --action blue (the ONLY blue-CTA), secondary = surface+line,
//   ghost = transparent, danger = --bear. Buttons are NEVER a verdict color
//   except `danger`, which is the bear-red destructive affordance.
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold " +
  "min-h-[44px] select-none transition-[background,border-color,opacity,transform] " +
  "duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed " +
  "active:translate-y-px focus-visible:outline-2 focus-visible:outline-accent";

const sizes: Record<ButtonSize, string> = {
  md: "px-4 text-[15px] h-11",
  lg: "px-6 text-[17px] h-[52px]",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-action text-white border border-transparent hover:brightness-110 shadow-[0_4px_16px_rgba(37,99,235,.35)]",
  secondary:
    "bg-surface2 text-ink border border-line hover:border-[#3a4757] hover:bg-[#1f2939]",
  ghost: "bg-transparent text-ink2 border border-transparent hover:text-ink hover:bg-surface2",
  danger:
    "bg-transparent text-bear border border-bear/60 hover:bg-bear/10",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
}

type AsButton = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type AsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children" | "href"> & {
    href: string;
  };

export function Button(props: AsButton | AsLink) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(base, sizes[size], variants[variant], className);

  if ("href" in props && props.href !== undefined) {
    const { href, variant: _v, size: _s, className: _c, children: _ch, ...rest } =
      props as AsLink;
    void _v; void _s; void _c; void _ch;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  const { variant: _v, size: _s, className: _c, children: _ch, href: _h, ...rest } =
    props as AsButton;
  void _v; void _s; void _c; void _ch; void _h;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
