import {
  budgetProgress,
  categoryBreakdown,
  goalProgress,
  inMonth,
  monthlyAverages,
  monthsToGoal,
  reasonBreakdown,
  shiftMonth,
  summarize,
  type Budget,
  type Goal,
  type Txn,
} from "./finance";
import { formatMoney } from "./format";

export type InsightKind = "why" | "next" | "alert" | "win";

export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
}

export interface FinancialContext {
  monthKey: string;
  summary: ReturnType<typeof summarize>;
  previous: ReturnType<typeof summarize>;
  categories: ReturnType<typeof categoryBreakdown>;
  reasons: ReturnType<typeof reasonBreakdown>;
  budgets: ReturnType<typeof budgetProgress>;
  goals: Goal[];
  averages: ReturnType<typeof monthlyAverages>;
  weekendShare: number;
  smallSpends: { count: number; total: number };
  topMerchant: { name: string; count: number; total: number } | null;
  insights: Insight[];
}

export function buildFinancialContext(
  txns: Txn[],
  budgets: Budget[],
  goals: Goal[],
  monthKey: string,
): FinancialContext {
  const month = inMonth(txns, monthKey);
  const prev = inMonth(txns, shiftMonth(monthKey, -1));
  const expenses = month.filter((t) => t.type === "expense");
  const summary = summarize(month);
  const previous = summarize(prev);
  const categories = categoryBreakdown(month);
  const prevCategories = categoryBreakdown(prev);
  const reasons = reasonBreakdown(month);
  const monthBudgets = budgets.filter((b) => b.month.startsWith(monthKey));
  const progress = budgetProgress(monthBudgets, month);
  const averages = monthlyAverages(txns, monthKey);

  const weekendTotal = expenses
    .filter((t) => {
      const day = new Date(`${t.occurred_on}T00:00:00`).getDay();
      return day === 0 || day === 6;
    })
    .reduce((s, t) => s + t.amount, 0);
  const weekendShare = summary.expense > 0 ? weekendTotal / summary.expense : 0;

  const small = expenses.filter((t) => t.amount <= 250);
  const smallSpends = { count: small.length, total: small.reduce((s, t) => s + t.amount, 0) };

  const merchants = new Map<string, { count: number; total: number }>();
  for (const t of expenses) {
    if (!t.merchant) continue;
    const m = merchants.get(t.merchant) ?? { count: 0, total: 0 };
    m.count += 1;
    m.total += t.amount;
    merchants.set(t.merchant, m);
  }
  const topMerchantEntry = [...merchants.entries()].sort((a, b) => b[1].total - a[1].total)[0];
  const topMerchant = topMerchantEntry ? { name: topMerchantEntry[0], ...topMerchantEntry[1] } : null;

  const insights: Insight[] = [];

  // WHY: biggest category
  const top = categories[0];
  if (top && top.share >= 0.2) {
    insights.push({
      id: "top-category",
      kind: "why",
      title: `${top.category} is ${Math.round(top.share * 100)}% of your spending`,
      detail: `${formatMoney(top.amount)} across ${top.count} payments this month — your single biggest money leak.`,
    });
  }

  // WHY: category growth vs last month
  for (const c of categories.slice(0, 4)) {
    const before = prevCategories.find((p) => p.category === c.category)?.amount ?? 0;
    if (before > 0 && c.amount - before >= 500 && c.amount / before >= 1.25) {
      insights.push({
        id: `growth-${c.category}`,
        kind: "why",
        title: `${c.category} is up ${Math.round((c.amount / before - 1) * 100)}% vs last month`,
        detail: `${formatMoney(c.amount)} so far vs ${formatMoney(before)} last month.`,
      });
      break;
    }
  }

  // WHY: impulse + social
  const unplanned = reasons.impulse + reasons.social;
  if (summary.expense > 0 && unplanned / summary.expense >= 0.2) {
    insights.push({
      id: "impulse",
      kind: "why",
      title: `${Math.round((unplanned / summary.expense) * 100)}% of spending was unplanned`,
      detail: `${formatMoney(unplanned)} went on impulse or social spends. These are the easiest to trim without feeling deprived.`,
    });
  }

  // WHY: weekends
  if (weekendShare >= 0.45 && expenses.length >= 6) {
    insights.push({
      id: "weekend",
      kind: "why",
      title: `Weekends drive ${Math.round(weekendShare * 100)}% of your spending`,
      detail: "Saturdays and Sundays are when your money moves fastest. Plan one free weekend activity.",
    });
  }

  // WHY: small taps
  if (smallSpends.count >= 8) {
    insights.push({
      id: "small-taps",
      kind: "why",
      title: `${smallSpends.count} small taps added up to ${formatMoney(smallSpends.total)}`,
      detail: "Payments under ₹250 feel invisible on UPI, but together they're a real expense.",
    });
  }

  // ALERTS: budgets
  const over = progress.filter((p) => p.status === "over");
  const near = progress.filter((p) => p.status === "warning");
  if (over.length) {
    insights.push({
      id: "budget-over",
      kind: "alert",
      title: `Over budget on ${over.map((o) => o.budget.category).join(", ")}`,
      detail: `${formatMoney(-over.reduce((s, o) => s + o.remaining, 0))} beyond your limits this month.`,
    });
  } else if (near[0]) {
    const n0 = near[0];
    insights.push({
      id: "budget-near",
      kind: "alert",
      title: `${n0.budget.category} budget is ${Math.round(n0.pct * 100)}% used`,
      detail: `Only ${formatMoney(n0.remaining)} left for the rest of the month.`,
    });
  }

  // NEXT / WIN: savings rate
  if (summary.income > 0) {
    if (summary.savingsRate >= 0.2) {
      insights.push({
        id: "savings-win",
        kind: "win",
        title: `You're saving ${Math.round(summary.savingsRate * 100)}% this month`,
        detail: "That beats the 20% benchmark. Lock it in by moving the surplus to a goal now.",
      });
    } else {
      const gap = summary.income * 0.2 - summary.net;
      insights.push({
        id: "savings-next",
        kind: "next",
        title: `Save ${formatMoney(Math.max(0, gap))} more to hit a 20% savings rate`,
        detail: top
          ? `Trimming ${top.category} by ${Math.min(100, Math.round((Math.max(0, gap) / top.amount) * 100))}% would get you there.`
          : "Start by tracking every expense for one week.",
      });
    }
  }

  // NEXT: closest goal
  const monthly = averages.savings > 0 ? averages.savings : summary.net;
  const openGoals = goals.filter((g) => goalProgress(g) < 1);
  const g = [...openGoals].sort((a, b) => goalProgress(b) - goalProgress(a))[0];
  if (g) {
    const months = monthsToGoal(g.target_amount - g.saved_amount, monthly);
    insights.push({
      id: "goal-next",
      kind: "next",
      title: `${g.emoji} ${g.name}: ${months === null ? "needs a positive monthly surplus" : `about ${months} month${months === 1 ? "" : "s"} away`}`,
      detail:
        months === null
          ? "You're spending more than you earn on average. Open the What-if Lab to find a path."
          : `At your recent pace of ${formatMoney(monthly)}/month. Try the What-if Lab to speed it up.`,
    });
  }

  return {
    monthKey,
    summary,
    previous,
    categories,
    reasons,
    budgets: progress,
    goals,
    averages,
    weekendShare,
    smallSpends,
    topMerchant,
    insights,
  };
}

/** Compact, aggregate-only snapshot sent to the AI model (no raw notes or IDs). */
export function contextForModel(ctx: FinancialContext) {
  return {
    month: ctx.monthKey,
    currency: "INR",
    thisMonth: ctx.summary,
    lastMonth: ctx.previous,
    recentMonthlyAverage: {
      income: ctx.averages.income,
      expense: ctx.averages.expense,
      savings: ctx.averages.savings,
    },
    topCategories: ctx.categories.slice(0, 6).map((c) => ({
      category: c.category,
      amount: c.amount,
      sharePct: Math.round(c.share * 100),
      payments: c.count,
    })),
    spendingByReason: ctx.reasons,
    weekendSharePct: Math.round(ctx.weekendShare * 100),
    smallPaymentsUnder250: ctx.smallSpends,
    topMerchant: ctx.topMerchant,
    budgets: ctx.budgets.map((b) => ({
      category: b.budget.category,
      limit: b.budget.limit_amount,
      spent: b.spent,
      status: b.status,
    })),
    goals: ctx.goals.map((g) => ({
      name: g.name,
      target: g.target_amount,
      saved: g.saved_amount,
      targetDate: g.target_date,
    })),
    ruleBasedInsights: ctx.insights.map((i) => `${i.title} — ${i.detail}`),
  };
}
