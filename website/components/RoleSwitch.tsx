"use client";

import { useRouter } from "next/navigation";
import type { Role } from "@/lib/auth";
import { cn } from "@/lib/cn";

// The seeded demo account holds BOTH roles; switching routes through /app/{role}.
interface RoleSwitchProps {
  role: Role;
  onSwitch: (role: Role) => void;
  className?: string;
}

export function RoleSwitch({ role, onSwitch, className }: RoleSwitchProps) {
  const router = useRouter();
  function go(next: Role) {
    onSwitch(next);
    router.push(next === "provider" ? "/app/provider" : "/app/auditor");
  }
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-well p-0.5",
        className,
      )}
      role="tablist"
      aria-label="Switch role"
    >
      {(["provider", "auditor"] as Role[]).map((r) => {
        const active = r === role;
        return (
          <button
            key={r}
            role="tab"
            aria-selected={active}
            onClick={() => go(r)}
            className={cn(
              "h-8 rounded-full px-3 text-[13px] font-semibold capitalize transition-colors",
              active
                ? "bg-surface2 text-ink"
                : "text-muted hover:text-ink2",
            )}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
