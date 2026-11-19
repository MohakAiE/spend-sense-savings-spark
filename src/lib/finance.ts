/**
 * Pure financial calculations shared by the UI and the AI assistant server function.
 * Every number shown in FinWise is derived here so formulas stay transparent and testable.
 */

export type TxnType = "income" | "expense";
export type SpendReason = "need" | "want" | "impulse" | "social";

export interface Txn {
  id: string;
  type: TxnType;
  amount: number;
  category: string;
  merchant: string | null;
  occurred_on: string; // YYYY-MM-DD
  payment_method: string;
  spend_reason: SpendReason | null;
  note: string | null;
  is_demo: boolean;
}

export interface Budget {
  id: string;
  category: string;
  month: string; // YYYY-MM-01
  limit_amount: number;
  is_demo: boolean;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  is_demo: boolean;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------- dates ---------- */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM" for a date or ISO string. */
export function monthKey(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 7);
  return toISODate(d).slice(0, 7);
}

export function shiftMonth(key: string, delta: number): string {
  const [y = 1970, m = 1] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function monthStartDate(key: string): string {
  return `${key}-01`;
}

export function inMonth<T extends { occurred_on: string }>(txns: T[], key: string): T[] {
  return txns.filter((t) => t.occurred_on.startsWith(key));
}

/* ---------- summaries ---------- */

export interface Summary {
  income: number;
  expense: number;
  net: number;
  /** (income - expense) / income; 0 when there is no income */
  savingsRate: number;
}

export function summarize(txns: Txn[]): Summary {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  const net = income - expense;
  return {
    income: round2(income),
    expense: round2(expense),
    net: round2(net),
    savingsRate: income > 0 ? net / income : 0,
  };
}

export interface CategorySlice {
  category: string;
  amount: number;
  share: number;
  count: number;
}

export function categoryBreakdown(txns: Txn[]): CategorySlice[] {
  const map = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const t of txns) {
    if (t.type !== "expense") continue;
    const cur = map.get(t.category) ?? { amount: 0, count: 0 };
    cur.amount += t.amount;
    cur.count += 1;
    map.set(t.category, cur);
    total += t.amount;
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      amount: round2(v.amount),
      count: v.count,
      share: total > 0 ? v.amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function reasonBreakdown(txns: Txn[]): Record<SpendReason | "untagged", number> {
  const out = { need: 0, want: 0, impulse: 0, social: 0, untagged: 0 };
  for (const t of txns) {
    if (t.type !== "expense") continue;
    out[t.spend_reason ?? "untagged"] += t.amount;
  }
  return out;
}

/** Average monthly income / expense over the `months` months before (and excluding) `currentKey`.
 * Falls back to the current month when there is no earlier history. */
export function monthlyAverages(txns: Txn[], currentKey: string, months = 3) {
  const keys = Array.from({ length: months }, (_, i) => shiftMonth(currentKey, -(i + 1)));
  const withData = keys.filter((k) => txns.some((t) => t.occurred_on.startsWith(k)));
  const used = withData.length > 0 ? withData : [currentKey];
  let income = 0;
  let expense = 0;
  const byCategory: Record<string, number> = {};
  for (const k of used) {
    for (const t of inMonth(txns, k)) {
      if (t.type === "income") income += t.amount;
      else {
        expense += t.amount;
        byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
      }
    }
  }
  const n = used.length;
  for (const c of Object.keys(byCategory)) byCategory[c] = round2((byCategory[c] ?? 0) / n);
  return {
    income: round2(income / n),
    expense: round2(expense / n),
    savings: round2((income - expense) / n),
    byCategory,
    monthsUsed: n,
  };
}

/* ---------- budgets ---------- */

export type BudgetStatus = "ok" | "warning" | "over";

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  remaining: number;
  pct: number;
  status: BudgetStatus;
}

/** Warning from 80% of the limit; over once spending exceeds the limit. */
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return "ok";
  const pct = spent / limit;
  if (pct > 1) return "over";
  if (pct >= 0.8) return "warning";
  return "ok";
}

export function budgetProgress(budgets: Budget[], monthTxns: Txn[]): BudgetProgress[] {
  const spentBy = new Map<string, number>();
  for (const t of monthTxns) {
    if (t.type === "expense") spentBy.set(t.category, (spentBy.get(t.category) ?? 0) + t.amount);
  }
  return budgets
    .map((b) => {
      const spent = round2(spentBy.get(b.category) ?? 0);
      return {
        budget: b,
        spent,
        remaining: round2(b.limit_amount - spent),
        pct: b.limit_amount > 0 ? spent / b.limit_amount : 0,
        status: budgetStatus(spent, b.limit_amount),
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

/* ---------- goals ---------- */

export function goalProgress(g: Pick<Goal, "saved_amount" | "target_amount">): number {
  return g.target_amount > 0 ? clamp01(g.saved_amount / g.target_amount) : 0;
}

/** Months needed to close `remaining` at `monthly` per month; null when it never closes. */
export function monthsToGoal(remaining: number, monthly: number): number | null {
  if (remaining <= 0) return 0;
  if (monthly <= 0) return null;
  return Math.ceil(remaining / monthly);
}

/* ---------- health indicators ---------- */

/** 20%+ savings rate earns full marks; scales linearly from 0%. */
export function scoreSavingsRate(rate: number): number {
  return Math.round(clamp01(rate / 0.2) * 100);
}

/** Share of budgets kept within limit. Null when no budgets exist (indicator skipped). */
export function scoreBudgetAdherence(within: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((within / total) * 100);
}

/** Impulse + social share of spending: ≤10% scores 100, ≥40% scores 0. */
export function scoreImpulseShare(share: number): number {
  return Math.round(clamp01((0.4 - share) / 0.3) * 100);
}

/** Months of expenses covered by money saved in goals: 3+ months scores 100. */
export function scoreBuffer(months: number): number {
  return Math.round(clamp01(months / 3) * 100);
}

/** Average progress across goals. Null when there are no goals. */
export function scoreGoalMomentum(goals: Goal[]): number | null {
  if (goals.length === 0) return null;
  const avg = goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length;
  return Math.round(avg * 100);
}

export const HEALTH_WEIGHTS = {
  savings: 30,
  budgets: 25,
  impulse: 20,
  buffer: 15,
  goals: 10,
} as const;

export interface HealthIndicator {
  key: keyof typeof HEALTH_WEIGHTS;
  label: string;
  display: string;
  score: number | null;
  weight: number;
  formula: string;
  explanation: string;
  tip: string;
}

export function healthBand(score: number): { label: string; tone: "success" | "teal" | "warning" | "danger" } {
  if (score >= 75) return { label: "Thriving", tone: "success" };
  if (score >= 50) return { label: "Steady", tone: "teal" };
  if (score >= 30) return { label: "Building", tone: "warning" };
  return { label: "Needs attention", tone: "danger" };
}

/** Weighted average over indicators that have a score; weights renormalise when some are skipped. */
export function overallScore(indicators: Pick<HealthIndicator, "score" | "weight">[]): number {
  let total = 0;
  let weights = 0;
  for (const i of indicators) {
    if (i.score === null) continue;
    total += i.score * i.weight;
    weights += i.weight;
  }
  return weights > 0 ? Math.round(total / weights) : 0;
}

export function healthIndicators(input: {
  monthTxns: Txn[];
  budgets: Budget[];
  goals: Goal[];
  avgMonthlyExpense: number;
}) {
  const { monthTxns, budgets, goals, avgMonthlyExpense } = input;
  const s = summarize(monthTxns);
  const progress = budgetProgress(budgets, monthTxns);
  const within = progress.filter((p) => p.status !== "over").length;
  const reasons = reasonBreakdown(monthTxns);
  const impulseShare = s.expense > 0 ? (reasons.impulse + reasons.social) / s.expense : 0;
  const saved = goals.reduce((sum, g) => sum + g.saved_amount, 0);
  const bufferMonths = avgMonthlyExpense > 0 ? saved / avgMonthlyExpense : 0;
  const goalScore = scoreGoalMomentum(goals);

  const indicators: HealthIndicator[] = [
    {
      key: "savings",
      label: "Savings rate",
      display: `${Math.round(s.savingsRate * 100)}%`,
      score: s.income > 0 ? scoreSavingsRate(s.savingsRate) : null,
      weight: HEALTH_WEIGHTS.savings,
      formula: "(income − expenses) ÷ income. 20% or more = full marks.",
      explanation:
        s.income > 0
          ? `You kept ${Math.round(s.savingsRate * 100)}% of what came in this month.`
          : "Add this month's income to calculate your savings rate.",
      tip: "Move a fixed amount to savings the day money arrives — pay yourself first.",
    },
    {
      key: "budgets",
      label: "Budget discipline",
      display: progress.length ? `${within}/${progress.length} on track` : "No budgets",
      score: scoreBudgetAdherence(within, progress.length),
      weight: HEALTH_WEIGHTS.budgets,
      formula: "Budgets within limit ÷ total budgets this month.",
      explanation: progress.length
        ? `${progress.length - within} budget${progress.length - within === 1 ? "" : "s"} over limit this month.`
        : "Set at least one monthly budget to score this.",
      tip: "Start with your top 3 spending categories — fewer budgets are easier to keep.",
    },
    {
      key: "impulse",
      label: "Intentional spending",
      display: `${Math.round(impulseShare * 100)}% impulse/social`,
      score: s.expense > 0 ? scoreImpulseShare(impulseShare) : null,
      weight: HEALTH_WEIGHTS.impulse,
      formula: "Impulse + social spends ÷ total spending. ≤10% = full marks, ≥40% = zero.",
      explanation:
        s.expense > 0
          ? `${Math.round(impulseShare * 100)}% of spending was unplanned or peer-driven.`
          : "Tag expenses as need / want / impulse / social to score this.",
      tip: "Try a 24-hour rule: wait a day before any unplanned buy over ₹500.",
    },
    {
      key: "buffer",
      label: "Safety buffer",
      display: `${bufferMonths.toFixed(1)} months`,
      score: avgMonthlyExpense > 0 ? scoreBuffer(bufferMonths) : null,
      weight: HEALTH_WEIGHTS.buffer,
      formula: "Money saved in goals ÷ average monthly expenses. 3 months = full marks.",
      explanation: `Your savings could cover about ${bufferMonths.toFixed(1)} months of spending.`,
      tip: "An emergency fund of 3 months of expenses protects you from surprise costs.",
    },
    {
      key: "goals",
      label: "Goal momentum",
      display: goalScore === null ? "No goals" : `${goalScore}% average progress`,
      score: goalScore,
      weight: HEALTH_WEIGHTS.goals,
      formula: "Average of saved ÷ target across your goals.",
      explanation:
        goalScore === null ? "Create a savings goal to track momentum." : `You're ${goalScore}% of the way there on average.`,
      tip: "Name goals specifically — 'Laptop by June' beats 'save more'.",
    },
  ];

  return { indicators, overall: overallScore(indicators), summary: s };
}

/* ---------- what-if simulator ---------- */

export interface WhatIfInput {
  baseIncome: number;
  baseExpense: number;
  categorySpend: Record<string, number>;
  /** category -> cut fraction 0..1 */
  cuts: Record<string, number>;
  extraIncome: number;
  goals: Goal[];
}

export function simulateWhatIf(input: WhatIfInput) {
  const freedFromCuts = Object.entries(input.cuts).reduce(
    (sum, [cat, cut]) => sum + (input.categorySpend[cat] ?? 0) * clamp01(cut),
    0,
  );
  const currentSavings = input.baseIncome - input.baseExpense;
  const monthlyFreed = round2(freedFromCuts + Math.max(0, input.extraIncome));
  const newSavings = round2(currentSavings + monthlyFreed);
  const newIncome = input.baseIncome + Math.max(0, input.extraIncome);
  const goalTimelines = input.goals.map((g) => {
    const remaining = Math.max(0, g.target_amount - g.saved_amount);
    return {
      goal: g,
      remaining,
      before: monthsToGoal(remaining, currentSavings),
      after: monthsToGoal(remaining, newSavings),
    };
  });
  return {
    currentSavings: round2(currentSavings),
    monthlyFreed,
    newSavings,
    yearlyExtra: round2(monthlyFreed * 12),
    currentRate: input.baseIncome > 0 ? currentSavings / input.baseIncome : 0,
    newRate: newIncome > 0 ? newSavings / newIncome : 0,
    goalTimelines,
  };
}
