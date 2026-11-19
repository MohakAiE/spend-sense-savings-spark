import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, PieChart, Trash2 } from "lucide-react";
import { AppShell, PageSkeleton } from "@/components/finwise/app-shell";
import { PageHeader } from "@/components/finwise/page-header";
import { EmptyState } from "@/components/finwise/empty-state";
import { Meter, statusTone } from "@/components/finwise/meter";
import { CategoryIcon } from "@/components/finwise/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudgetMutations, useFinanceData } from "@/hooks/use-finance";
import { ensureFinanceData } from "@/lib/route-data";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { budgetProgress, inMonth, monthKey, monthStartDate, shiftMonth } from "@/lib/finance";
import { formatMoney, formatMonthLabel } from "@/lib/format";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/budgets")({
  loader: ({ context }) => ensureFinanceData(context.queryClient),
  pendingComponent: () => (
    <AppShell>
      <PageSkeleton />
    </AppShell>
  ),
  head: () => pageHead("Budgets", "Monthly category budgets with early warnings before you overspend."),
  component: BudgetsPage,
});

function BudgetsPage() {
  const { transactions, budgets } = useFinanceData();
  const { save, copy, remove } = useBudgetMutations();
  const current = monthKey(new Date());
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");

  const progress = useMemo(
    () => budgetProgress(budgets.filter((b) => b.month.startsWith(current)), inMonth(transactions, current)),
    [budgets, transactions, current],
  );
  const used = new Set(progress.map((p) => p.budget.category));
  const lastMonth = shiftMonth(current, -1);
  const toCopy = budgets
    .filter((b) => b.month.startsWith(lastMonth) && !used.has(b.category))
    .map((b) => ({ category: b.category, month: monthStartDate(current), limit_amount: b.limit_amount }));

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(limit);
    if (!category || !(amount > 0)) return;
    save.mutate(
      { values: { category, month: monthStartDate(current), limit_amount: amount } },
      { onSuccess: () => { setCategory(""); setLimit(""); } },
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={formatMonthLabel(current)}
        title="Budget planner"
        description="Amber at 80% of a limit, red once you go over. Small limits you keep beat big ones you break."
        actions={
          toCopy.length > 0 && (
            <Button variant="outline" disabled={copy.isPending} onClick={() => copy.mutate(toCopy)}>
              <Copy /> Copy {toCopy.length} from last month
            </Button>
          )
        }
      />
      <form onSubmit={onAdd} className="surface-card mb-6 grid gap-3 p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.filter((c) => !used.has(c.name)).map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="limit">Monthly limit (₹)</Label>
          <Input id="limit" type="number" min={1} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="2000" />
        </div>
        <Button type="submit" variant="accent" disabled={save.isPending || !category || !(Number(limit) > 0)}>Add budget</Button>
      </form>
      {progress.length === 0 ? (
        <EmptyState icon={PieChart} title="No budgets this month" description="Start with your biggest category — usually Food & Dining." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {progress.map((p) => (
            <div key={p.budget.id} className="surface-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <CategoryIcon category={p.budget.category} />
                <div className="flex-1">
                  <p className="font-medium">{p.budget.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(p.spent)} of {formatMoney(p.budget.limit_amount)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Remove ${p.budget.category} budget`} onClick={() => remove.mutate(p.budget.id)}>
                  <Trash2 />
                </Button>
              </div>
              <Meter value={p.pct} tone={statusTone(p.status)} label={`${p.budget.category} budget used`} />
              <p className="mt-2 text-sm text-muted-foreground">
                {p.remaining >= 0 ? `${formatMoney(p.remaining)} left` : `${formatMoney(-p.remaining)} over`}
              </p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
