import { categoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const meta = categoryMeta(category);
  const Icon = meta.icon;
  return (
    <span
      className={cn("relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl", className)}
      aria-hidden="true"
    >
      <span className="absolute inset-0 opacity-15" style={{ backgroundColor: meta.color }} />
      <Icon className="relative size-[18px]" style={{ color: meta.color }} />
    </span>
  );
}
