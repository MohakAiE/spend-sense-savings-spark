import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, tone = "default" }: { className?: string; tone?: "default" | "ink" }) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="FinWise home">
      <span className="relative grid size-8 place-items-center rounded-xl bg-gradient-emerald shadow-glow">
        <svg viewBox="0 0 24 24" className="size-4 text-accent-foreground" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 16l5-5 4 4 7-8" />
          <path d="M15 7h5v5" />
        </svg>
      </span>
      <span className={cn("font-display text-xl font-semibold tracking-tight", tone === "ink" ? "text-ink-foreground" : "text-foreground")}>
        FinWise<span className="ml-1 align-super text-[0.6rem] font-sans font-semibold text-accent">2.0</span>
      </span>
    </Link>
  );
}
