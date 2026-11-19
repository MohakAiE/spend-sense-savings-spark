import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, FlaskRound, PiggyBank, Plus, Sparkles, Wallet } from "lucide-react";
import { AppShell, PageSkeleton } from "@/components/finwise/app-shell";
import { PageHeader } from "@/components/finwise/page-header";
import { TransactionDialog } from "@/components/finwise/transaction-dialog";
import { TransactionRow } from "@/components/finwise/transaction-row";
import { InsightList } from "@/components/finwise/insight-list";
import { Meter, statusTone } from "@/components/finwise/meter";
import { ScoreRing } from "@/components/finwise/score-ring";
import { EmptyState } from "@/components/finwise/empty-state";
import { Button } from "@/components/ui/button";
import { useDemoData, useFinanceData, useProfile } from "@/hooks/use-finance";
import { ensureFinanceData } from "@/lib/route-data";
import { categoryMeta } from "@/lib/categories";
import {
  goalProgress,
  healthBand,
  healthIndicators,
  inMonth,
  monthKey,
  shiftMonth,
  summarize,
} from "@/lib/finance";
import { buildFinancialContext } from "@/lib/insights";
import { formatCompactMoney, formatMoney, formatMonthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => ensureFinanceData(context.queryClient),
  pendingComponent: () => (
    <AppShell>
      <PageSkeleton />
    </AppShell>
  ),
  head: () => ({
    meta: [
      { title: "Dashboard — FinWise 2.0" },
      { name: "description", content: "Your income, spending, savings, budgets and goals at a glance." },
      { property: "og:title", content: "Dashboard — FinWise 2.0" },
      { property: "og:description", content: "Your income, spending, savings, budgets and goals at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { transactions, budgets, goals } = useFinanceData();
  const profile = useProfile();
  const { load } = useDemoData();
  const [addOpen, setAddOpen] = useState(false);
  const current = monthKey(new Date());

  const ctx = useMemo(() => buildFinancialContext(transactions, budgets, goals, current), [transactions, budgets, goals, current]);
  const health = useMemo(
    () =>
      healthIndicators({
        monthTxns: inMonth(transactions, current),
        budgets: budgets.filter((b) => b.month.startsWith(current)),
        goals,
        avgMonthlyExpense: ctx.averages.expense || ctx.summary.expense,
      }),
    [transactions, budgets, goals, current, ctx],
  );
  const band = healthBand(health.overall);

  const cashflow = useMemo(
    () =>
      [-3, -2, -1, 0].map((o) => {
        const key = shiftMonth(current, o);
        const s = summarize(inMonth(transactions, key));
        return { month: formatMonthLabel(key).slice(0, 3), income: s.income, expense: s.expense };
      }),
    [transactions, current],
  );

  const isEmpty = transactions.length === 0 && budgets.length === 0 && goals.length === 0;
  const s = ctx.summary;
  const expenseDelta = ctx.previous.expense > 0 ? s.expense / ctx.previous.expense - 1 : null;

  useWebMCP({
    name: "get_dashboard_summary",
    description:
      "Read the FinWise dashboard currently shown: this month's income, spending, savings, health score, top categories, budgets, goals and insights (INR).",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () =>
      runWebMCPTool("get_dashboard_summary", () => {
        if (isEmpty) return "The dashboard is empty: no transactions, budgets or goals yet.";
        const lines = [
          `${formatMonthLabel(current)}: income ${formatMoney(s.income)}, spent ${formatMoney(s.expense)}, saved ${formatMoney(s.income - s.expense)}.`,
          `Health score ${health.overall}/100 (${band.label}).`,
          `Top categories: ${ctx.categories.slice(0, 5).map((c) => `${c.category} ${formatMoney(c.amount)}`).join(", ") || "none"}.`,
          `Budgets: ${ctx.budgets.map((b) => `${b.budget.category} ${formatMoney(b.spent)}/${formatMoney(b.budget.limit_amount)} (${b.status})`).join(", ") || "none this month"}.`,
          `Goals: ${goals.map((g) => `${g.name} ${Math.round(goalProgress(g) * 100)}%`).join(", ") || "none"}.`,
          ...ctx.insights.slice(0, 4).map((i) => `Insight: ${i.title} — ${i.detail}`),
        ];
        return lines.join("\n");
      }),
  });

  useWebMCP({
    name: "open_add_transaction",
    description: "Open the Add transaction form on the dashboard so the user can review and save a new income or expense.",
    execute: () =>
      runWebMCPTool("open_add_transaction", () => {
        setAddOpen(true);
        return "Opened the Add transaction form for the user to fill in and save.";
      }),
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow={formatMonthLabel(current)}
        title={
          <>
            {greeting()}, <span className="text-accent">{profile?.displayName}</span>
          </>
        }
        description="Here's where your money went this month — and what to do about it."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/assistant">
                <Sparkles /> Ask FinWise
              </Link>
            </Button>
            <Button variant="accent" onClick={() => setAddOpen(true)}>
              <Plus /> Add transaction
            </Button>
          </>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={Wallet}
          title="Your money story starts here"
          description="Add your first transaction, or load clearly-labelled synthetic demo data (a fictional student, 'Aarav') to explore every feature."
        >
          <Button variant="accent" onClick={() => setAddOpen(true)}>
            <Plus /> Add a transaction
          </Button>
          <Button variant="outline" disabled={load.isPending} onClick={() => load.mutate()}>
            <FlaskRound /> {load.isPending ? "Loading demo…" : "Load synthetic demo data"}
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Income" value={formatMoney(s.income)} icon={ArrowDownRight} tone="success" sub={`${formatMoney(ctx.averages.income)} avg / month`} delay={0} />
            <Kpi
              label="Spent"
              value={formatMoney(s.expense)}
              icon={ArrowUpRight}
              tone="danger"
              sub={expenseDelta === null ? "First month tracked" : `${expenseDelta >= 0 ? "+" : ""}${Math.round(expenseDelta * 100)}% vs last month`}
              delay={60}
            />
            <Kpi
              label="Saved"
              value={formatMoney(s.net)}
              icon={PiggyBank}
              tone={s.net >= 0 ? "success" : "danger"}
              sub={`${Math.round(s.savingsRate * 100)}% savings rate`}
              delay={120}
            />
            <Link to="/health" className="surface-card group flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5 animate-rise [animation-delay:180ms]">
              <ScoreRing score={health.overall} tone={band.tone} size={76} stroke={8}>
                <span className="num font-display text-2xl font-semibold">{health.overall}</span>
              </ScoreRing>
              <div>
                <p className="eyebrow text-muted-foreground">Health score</p>
                <p className="mt-1 font-semibold">{band.label}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-accent">
                  See the formula <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </div>
            </Link>
          </section>

          {/* Insights + categories */}
          <section className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="surface-ink grain overflow-hidden p-6 animate-rise">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="eyebrow text-accent">Your money story</p>
                  <h2 className="mt-1 text-2xl font-semibold text-ink-foreground">Why you spent — and what's next</h2>
                </div>
              </div>
              {ctx.insights.length ? (
                <InsightList insights={ctx.insights.slice(0, 4)} />
              ) : (
                <p className="text-sm text-ink-muted">Add a few more transactions this month and FinWise will start spotting patterns.</p>
              )}
              <Button asChild variant="ink" className="mt-5">
                <Link to="/assistant">
                  <Sparkles /> Dig deeper with the assistant
                </Link>
              </Button>
            </div>

            <div className="surface-card p-6 animate-rise [animation-delay:80ms]">
              <h2 className="text-xl font-semibold">Where it went</h2>
              <p className="text-sm text-muted-foreground">Spending by category this month</p>
              {ctx.categories.length ? (
                <div className="mt-4 grid items-center gap-4 sm:grid-cols-[160px_1fr]">
                  <div className="relative mx-auto size-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={ctx.categories} dataKey="amount" nameKey="category" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                          {ctx.categories.map((c) => (
                            <Cell key={c.category} fill={categoryMeta(c.category).color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="num font-display text-xl font-semibold">{formatCompactMoney(s.expense)}</p>
                        <p className="text-[0.7rem] text-muted-foreground">spent</p>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {ctx.categories.slice(0, 6).map((c) => (
                      <li key={c.category} className="flex items-center gap-2.5 text-sm">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryMeta(c.category).color }} />
                        <span className="flex-1 truncate">{c.category}</span>
                        <span className="num text-muted-foreground">{Math.round(c.share * 100)}%</span>
                        <span className="num w-20 text-right font-medium">{formatMoney(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">No expenses yet this month.</p>
              )}
            </div>
          </section>

          {/* Recent + cashflow */}
          <section className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="surface-card p-6 animate-rise">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent transactions</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/transactions">
                    View all <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="mt-2 divide-y">
                {transactions.slice(0, 6).map((t) => (
                  <TransactionRow key={t.id} txn={t} />
                ))}
                {!transactions.length && <p className="py-6 text-sm text-muted-foreground">No transactions yet.</p>}
              </div>
            </div>

            <div className="surface-card p-6 animate-rise [animation-delay:80ms]">
              <h2 className="text-xl font-semibold">Cash flow</h2>
              <p className="text-sm text-muted-foreground">Income vs spending, last 4 months</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflow} barGap={4}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "var(--secondary)" }}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => formatMoney(v)}
                    />
                    <Bar dataKey="income" name="Income" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Spent" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-chart-1" /> Income</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-chart-2" /> Spent</span>
              </div>
            </div>
          </section>

          {/* Budgets + goals */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="surface-card p-6 animate-rise">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Budgets</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/budgets">Manage <ArrowRight /></Link>
                </Button>
              </div>
              <div className="mt-4 space-y-4">
                {ctx.budgets.slice(0, 5).map((b) => (
                  <div key={b.budget.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{b.budget.category}</span>
                      <span className={cn("num", b.status === "over" ? "text-destructive" : "text-muted-foreground")}>
                        {formatMoney(b.spent)} / {formatMoney(b.budget.limit_amount)}
                      </span>
                    </div>
                    <Meter value={b.pct} tone={statusTone(b.status)} label={`${b.budget.category} budget used`} />
                  </div>
                ))}
                {!ctx.budgets.length && (
                  <p className="text-sm text-muted-foreground">
                    No budgets this month. <Link to="/budgets" className="text-accent underline-offset-4 hover:underline">Set one</Link>.
                  </p>
                )}
              </div>
            </div>

            <div className="surface-card p-6 animate-rise [animation-delay:80ms]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Savings goals</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/goals">All goals <ArrowRight /></Link>
                </Button>
              </div>
              <div className="mt-4 space-y-4">
                {goals.slice(0, 4).map((g) => (
                  <div key={g.id} className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-lg">{g.emoji}</span>
                    <div className="flex-1">
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium">{g.name}</span>
                        <span className="num text-muted-foreground">{Math.round(goalProgress(g) * 100)}%</span>
                      </div>
                      <Meter value={goalProgress(g)} tone="teal" label={`${g.name} progress`} />
                      <p className="num mt-1 text-xs text-muted-foreground">
                        {formatMoney(g.saved_amount)} of {formatMoney(g.target_amount)}
                      </p>
                    </div>
                  </div>
                ))}
                {!goals.length && (
                  <p className="text-sm text-muted-foreground">
                    No goals yet. <Link to="/goals" className="text-accent underline-offset-4 hover:underline">Create one</Link>.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      <TransactionDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "danger";
  delay: number;
}) {
  return (
    <div className="surface-card p-5 animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <p className="eyebrow text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", tone === "success" ? "bg-success-soft text-accent" : "bg-danger-soft text-destructive")}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="num mt-3 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
