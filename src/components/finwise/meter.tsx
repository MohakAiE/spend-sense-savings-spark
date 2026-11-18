import { cn } from "@/lib/utils";

const tones = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  teal: "bg-teal",
  ink: "bg-primary",
} as const;

export type MeterTone = keyof typeof tones;

export function Meter({
  value,
  tone = "success",
  className,
  label,
}: {
  value: number; // 0..1 (values above 1 are clamped visually)
  tone?: MeterTone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function statusTone(status: "ok" | "warning" | "over"): MeterTone {
  return status === "over" ? "danger" : status === "warning" ? "warning" : "success";
}
