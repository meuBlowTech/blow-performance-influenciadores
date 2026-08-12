import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "orange" | "terracotta" | "green" | "coral" | "neutral";

const TONE_CLASSES: Record<KpiTone, string> = {
  orange: "bg-[color:var(--color-blow-orange)]/15 text-[color:var(--color-blow-orange)]",
  terracotta: "bg-[color:var(--color-blow-terracotta)]/15 text-[color:var(--color-blow-terracotta)]",
  green: "bg-[color:var(--color-blow-green)]/15 text-[color:var(--color-blow-green)]",
  coral: "bg-[color:var(--color-blow-coral)]/15 text-[color:var(--color-blow-coral)]",
  neutral: "bg-muted text-muted-foreground",
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "orange",
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description?: string;
  tone?: KpiTone;
  active?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "card-blow p-5 text-left transition-all",
        onClick && "hover:shadow-md cursor-pointer",
        active && "ring-2 ring-[color:var(--color-blow-orange)]",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          TONE_CLASSES[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      {description && (
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      )}
    </Comp>
  );
}
