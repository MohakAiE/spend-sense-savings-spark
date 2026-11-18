import { AlertTriangle, Lightbulb, Search, Trophy } from "lucide-react";
import type { Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

const META = {
  why: { icon: Search, label: "Why", className: "text-teal" },
  alert: { icon: AlertTriangle, label: "Heads up", className: "text-warning" },
  next: { icon: Lightbulb, label: "Do next", className: "text-accent" },
  win: { icon: Trophy, label: "Win", className: "text-accent" },
} as const;

export function InsightList({ insights, tone = "ink" }: { insights: Insight[]; tone?: "ink" | "light" }) {
  return (
    <ul className="space-y-2.5">
      {insights.map((i, idx) => {
        const m = META[i.kind];
        return (
          <li
            key={i.id}
            className={cn(
              "flex gap-3 rounded-2xl p-3.5 animate-rise",
              tone === "ink" ? "border border-ink-border bg-ink-foreground/5" : "border bg-card",
            )}
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            <m.icon className={cn("mt-0.5 size-4 shrink-0", m.className)} />
            <div>
              <p className={cn("eyebrow", m.className)}>{m.label}</p>
              <p className={cn("mt-0.5 text-sm font-medium", tone === "ink" ? "text-ink-foreground" : "text-foreground")}>{i.title}</p>
              <p className={cn("mt-0.5 text-[0.8rem] leading-relaxed", tone === "ink" ? "text-ink-muted" : "text-muted-foreground")}>{i.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
