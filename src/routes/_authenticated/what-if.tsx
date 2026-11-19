import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageSkeleton } from "@/components/finwise/app-shell";
import { PageHeader } from "@/components/finwise/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useFinanceData } from "@/hooks/use-finance";
import { ensureFinanceData } from "@/lib/route-data";
import { monthKey, monthlyAverages, simulateWhatIf } from "@/lib/finance";
import { formatMoney, formatPct } from "@/lib/format";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/what-if")({
  loader: ({ context }) => ensureFinanceData(context.queryClient),
  pendingComponent: () => (
    <AppShell>
      <PageSkeleton />
    </AppShell>
  ),
  head: () => pageHead("What-if Lab", "See how small spending cuts change your savings and goal dates."),
  component: WhatIfPage,
});

function WhatIfPage() {
  const { transactions, goals } = useFinanceData();
  const avg = useMemo(() => monthlyAverages(transactions, monthKey(new Date())), [transactions]);
  const cats = Object.entries(avg.byCategory as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const [cuts, setCuts] = useState<Record<string, number>>({});
  const [extra, setExtra] = useState("");
  const r = simulateWhatIf({
    baseIncome: avg.income,
    baseExpense: avg.expense,
    categorySpend: avg.byCategory as Record<string, number>,
    cuts,
    extraIncome: Number(extra) || 0,
    goals,
  });

  return (
    <AppShell>
      <PageHeader eyebrow="What-if Lab" title="Try a change before you make it" description="Based on your recent monthly averages." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-5 p-5">
          {cats.length === 0 && <p className="text-sm text-muted-foreground">Add some spending to try cuts.</p>}
          {cats.map(([cat, amt]) => (
            <div key={cat} className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>{cat} ({formatMoney(amt)}/mo)</Label>
                <span>cut {Math.round((cuts[cat] ?? 0) * 100)}%</span>
              </div>
              <Slider value={[(cuts[cat] ?? 0) * 100]} max={100} step={5} onValueChange={([v]) => setCuts((c) => ({ ...c, [cat]: (v ?? 0) / 100 }))} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="extra">Extra monthly income (₹)</Label>
            <Input id="extra" type="number" min={0} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="surface-card space-y-3 p-5">
          <p>Monthly savings: <strong>{formatMoney(r.currentSavings)}</strong> → <strong className="text-accent">{formatMoney(r.newSavings)}</strong></p>
          <p>Savings rate: {formatPct(r.currentRate)} → {formatPct(r.newRate)}</p>
          <p>Extra per year: <strong>{formatMoney(r.yearlyExtra)}</strong></p>
          {r.goalTimelines.map((t) => (
            <p key={t.goal.id} className="text-sm text-muted-foreground">
              {t.goal.emoji} {t.goal.name}: {t.before ?? "never"} → {t.after ?? "never"} months
            </p>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
