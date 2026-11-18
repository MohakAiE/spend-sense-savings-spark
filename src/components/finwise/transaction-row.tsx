import { CategoryIcon } from "./category-icon";
import { formatDate, formatMoney } from "@/lib/format";
import { SPEND_REASONS } from "@/lib/categories";
import type { Txn } from "@/lib/finance";
import { cn } from "@/lib/utils";

export function ReasonBadge({ reason }: { reason: Txn["spend_reason"] }) {
  if (!reason) return null;
  const label = SPEND_REASONS.find((r) => r.value === reason)?.label ?? reason;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
        reason === "need" && "bg-teal-soft text-teal",
        reason === "want" && "bg-secondary text-muted-foreground",
        reason === "impulse" && "bg-danger-soft text-destructive",
        reason === "social" && "bg-warning-soft text-warning",
      )}
    >
      {label}
    </span>
  );
}

export function TransactionRow({ txn, actions }: { txn: Txn; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <CategoryIcon category={txn.category} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          <span className="truncate">{txn.merchant || txn.category}</span>
          {txn.is_demo && <span className="rounded bg-warning-soft px-1.5 py-px text-[0.65rem] font-semibold uppercase tracking-wide text-warning">Demo</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {formatDate(txn.occurred_on)} · {txn.category}
          <ReasonBadge reason={txn.spend_reason} />
        </p>
      </div>
      <p className={cn("num text-sm font-semibold", txn.type === "income" ? "text-accent" : "text-foreground")}>
        {txn.type === "income" ? "+" : "−"}
        {formatMoney(txn.amount, true)}
      </p>
      {actions}
    </div>
  );
}
