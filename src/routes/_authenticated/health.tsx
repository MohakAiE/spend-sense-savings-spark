import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, PageSkeleton } from "@/components/finwise/app-shell";
import { PageHeader } from "@/components/finwise/page-header";
import { ScoreRing } from "@/components/finwise/score-ring";
import { Meter } from "@/components/finwise/meter";
import { useFinanceData } from "@/hooks/use-finance";
import { ensureFinanceData } from "@/lib/route-data";
import { healthBand, healthIndicators, inMonth, monthKey, monthlyAverages, summarize } from "@/lib/finance";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/health")({
  loader: ({ context }) => ensureFinanceData(context.queryClient),
  pendingComponent: () => (
    <AppShell>
      <PageSkeleton />
    </AppShell>
  ),
  head: () => pageHead("Financial health", "Your financial health score, with every formula shown."),
  component: HealthPage,
});

function HealthPage() {
  const { transactions, budgets, goals } = useFinanceData();
  const current = monthKey(new Date());
  const health = useMemo(() => {
    const monthTxns = inMonth(transactions, current);
    const avg = monthlyAverages(transactions, current).expense || summarize(monthTxns).expense;
    return healthIndicators({ monthTxns, budgets: budgets.filter((b) => b.month.startsWith(current)), goals, avgMonthlyExpense: avg });
  }, [transactions, budgets, goals, current]);
  const band = healthBand(health.overall);

  return (
    <AppShell>
      <PageHeader eyebrow="Financial health" title="How healthy is your money?" description="Five simple signals, weighted into one score. Every formula is shown." />
      <div className="surface-card mb-6 flex flex-col items-center gap-6 p-6 sm:flex-row">
        <ScoreRing score={health.overall} tone={band.tone}>
          <span className="text-3xl font-semibold">{health.overall}</span>
        </ScoreRing>
        <div>
          <p className="text-2xl font-semibold">{band.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">Signals without enough data are skipped and the weights rebalance.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {health.indicators.map((i) => (
          <div key={i.key} className="surface-card p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-medium">{i.label}</p>
              <p className="text-sm text-muted-foreground">{i.display} · weight {i.weight}%</p>
            </div>
            <Meter value={(i.score ?? 0) / 100} tone="teal" label={i.label} />
            <p className="mt-3 text-sm">{i.explanation}</p>
            <p className="mt-2 text-sm text-accent">{i.tip}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{i.formula}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
