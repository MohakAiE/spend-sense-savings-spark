import { goalProgress, monthsToGoal } from "./finance";
import { formatMoney } from "./format";
import type { FinancialContext } from "./insights";

/**
 * Deterministic "demo mode" assistant. Used when no AI model is configured or reachable.
 * Answers come only from rule-based analysis of the user's own data.
 */
export function demoAnswer(question: string, ctx: FinancialContext): string {
  const q = question.toLowerCase();
  const s = ctx.summary;
  const hasData = s.income > 0 || s.expense > 0;

  if (/scam|fraud|otp|pin|kyc|lottery|fake|phish|collect request|qr/.test(q)) {
    return [
      "**Quick scam check:**",
      "- No real bank, UPI app or company will ever ask for your **UPI PIN, OTP, CVV or password**.",
      "- You **never** enter your UPI PIN to *receive* money — only to send it. A 'collect request' or QR code asking for your PIN is a trap.",
      "- 'KYC expiring', 'you won a prize', or 'pay a small fee to get a job/loan' messages are classic scams.",
      "- If you've been targeted in India, call the cyber-crime helpline **1930** or report at cybercrime.gov.in, and tell your bank immediately.",
    ].join("\n");
  }

  if (!hasData) {
    return "I don't see any transactions for this month yet. Add a few (or load the synthetic demo data from the dashboard) and I'll explain where your money is going and what to do next.";
  }

  if (/goal|laptop|trip|save for|how long|when can/.test(q)) {
    if (!ctx.goals.length) return "You don't have any savings goals yet. Create one on the Goals page and I'll estimate how long it'll take.";
    const monthly = ctx.averages.savings > 0 ? ctx.averages.savings : s.net;
    const lines = ctx.goals.map((g) => {
      const m = monthsToGoal(g.target_amount - g.saved_amount, monthly);
      return `- ${g.emoji} **${g.name}** — ${Math.round(goalProgress(g) * 100)}% saved; ${
        m === null ? "not reachable at your current pace" : m === 0 ? "done! 🎉" : `about **${m} month${m === 1 ? "" : "s"}** at ${formatMoney(monthly)}/month`
      }`;
    });
    return ["**Your goals at your recent saving pace:**", ...lines, "", "Want it sooner? The What-if Lab shows how small cuts change these timelines."].join("\n");
  }

  if (/budget|limit|overspend|over budget/.test(q)) {
    if (!ctx.budgets.length) return "You haven't set budgets for this month. Start with your top category — I'd suggest " + (ctx.categories[0] ? `**${ctx.categories[0].category}** at around ${formatMoney(Math.round(ctx.categories[0].amount * 0.85))}.` : "your biggest spending category.");
    const lines = ctx.budgets.map(
      (b) => `- **${b.budget.category}**: ${formatMoney(b.spent)} of ${formatMoney(b.budget.limit_amount)} (${Math.round(b.pct * 100)}%)${b.status === "over" ? " — over ⚠️" : b.status === "warning" ? " — close" : ""}`,
    );
    return ["**Budget check for this month:**", ...lines].join("\n");
  }

  const why = ctx.insights.filter((i) => i.kind === "why" || i.kind === "alert");
  const next = ctx.insights.filter((i) => i.kind === "next" || i.kind === "win");
  const parts = [
    `This month you've earned **${formatMoney(s.income)}** and spent **${formatMoney(s.expense)}**, leaving **${formatMoney(s.net)}** (${Math.round(s.savingsRate * 100)}% savings rate).`,
  ];
  if (why.length) parts.push("", "**Why your money moved:**", ...why.slice(0, 3).map((i) => `- ${i.title}. ${i.detail}`));
  if (next.length) parts.push("", "**What you can do next:**", ...next.slice(0, 3).map((i) => `- ${i.title}. ${i.detail}`));
  return parts.join("\n");
}
