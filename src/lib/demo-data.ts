import { monthKey, shiftMonth, toISODate, type SpendReason, type TxnType } from "./finance";

/**
 * SYNTHETIC DEMO DATA — fictional persona "Aarav, 19, college student with a part-time internship".
 * Every row is inserted with is_demo = true so it can be labelled and removed in one click.
 */

interface DemoTxn {
  type: TxnType;
  amount: number;
  category: string;
  merchant: string;
  day: number;
  payment_method: string;
  spend_reason: SpendReason | null;
}

const TEMPLATE: DemoTxn[] = [
  { type: "income", amount: 12000, category: "Stipend / Salary", merchant: "Internship stipend", day: 1, payment_method: "bank", spend_reason: null },
  { type: "income", amount: 3000, category: "Pocket money", merchant: "Family", day: 2, payment_method: "upi", spend_reason: null },
  { type: "income", amount: 2500, category: "Freelance", merchant: "Poster design gig", day: 17, payment_method: "upi", spend_reason: null },
  { type: "expense", amount: 399, category: "Bills & Recharge", merchant: "Mobile recharge", day: 2, payment_method: "upi", spend_reason: "need" },
  { type: "expense", amount: 119, category: "Subscriptions", merchant: "Music streaming", day: 3, payment_method: "card", spend_reason: "want" },
  { type: "expense", amount: 199, category: "Subscriptions", merchant: "Video streaming", day: 5, payment_method: "card", spend_reason: "want" },
  { type: "expense", amount: 600, category: "Transport", merchant: "Metro card top-up", day: 3, payment_method: "upi", spend_reason: "need" },
  { type: "expense", amount: 500, category: "Transport", merchant: "Metro card top-up", day: 16, payment_method: "upi", spend_reason: "need" },
  { type: "expense", amount: 240, category: "Transport", merchant: "Auto ride", day: 13, payment_method: "cash", spend_reason: "need" },
  { type: "expense", amount: 80, category: "Food & Dining", merchant: "Campus canteen", day: 4, payment_method: "upi", spend_reason: "need" },
  { type: "expense", amount: 60, category: "Food & Dining", merchant: "Chai stall", day: 6, payment_method: "upi", spend_reason: "want" },
  { type: "expense", amount: 420, category: "Food & Dining", merchant: "Food delivery app", day: 7, payment_method: "upi", spend_reason: "impulse" },
  { type: "expense", amount: 95, category: "Food & Dining", merchant: "Campus canteen", day: 9, payment_method: "upi", spend_reason: "need" },
  { type: "expense", amount: 650, category: "Food & Dining", merchant: "Café with friends", day: 8, payment_method: "upi", spend_reason: "social" },
  { type: "expense", amount: 380, category: "Food & Dining", merchant: "Food delivery app", day: 14, payment_method: "upi", spend_reason: "impulse" },
  { type: "expense", amount: 70, category: "Food & Dining", merchant: "Chai stall", day: 12, payment_method: "upi", spend_reason: "want" },
  { type: "expense", amount: 110, category: "Food & Dining", merchant: "Campus canteen", day: 15, payment_method: "upi", spend_reason: "need" },
  { type: "expense", amount: 520, category: "Food & Dining", merchant: "Food delivery app", day: 21, payment_method: "upi", spend_reason: "impulse" },
  { type: "expense", amount: 85, category: "Food & Dining", merchant: "Chai stall", day: 18, payment_method: "upi", spend_reason: "want" },
  { type: "expense", amount: 1299, category: "Shopping", merchant: "Online fashion store", day: 10, payment_method: "upi", spend_reason: "impulse" },
  { type: "expense", amount: 349, category: "Shopping", merchant: "Phone accessories", day: 19, payment_method: "upi", spend_reason: "want" },
  { type: "expense", amount: 450, category: "Entertainment", merchant: "Movie night", day: 15, payment_method: "upi", spend_reason: "social" },
  { type: "expense", amount: 299, category: "Entertainment", merchant: "Game top-up", day: 11, payment_method: "wallet", spend_reason: "impulse" },
  { type: "expense", amount: 850, category: "Education", merchant: "Course books", day: 6, payment_method: "upi", spend_reason: "need" },
  { type: "expense", amount: 300, category: "Gifts & Social", merchant: "Friend's birthday gift", day: 20, payment_method: "upi", spend_reason: "social" },
  { type: "expense", amount: 180, category: "Health", merchant: "Pharmacy", day: 12, payment_method: "cash", spend_reason: "need" },
];

/** Month multipliers make the current month noticeably heavier on food/impulse so insights have a story. */
const MONTH_FLAVOUR: Record<number, { food: number; shop: number }> = {
  0: { food: 1.35, shop: 1.2 },
  [-1]: { food: 1.0, shop: 0.8 },
  [-2]: { food: 0.9, shop: 1.0 },
};

export function buildDemoData(today = new Date()) {
  const current = monthKey(today);
  const todayISO = toISODate(today);
  const transactions: Array<Omit<DemoTxn, "day"> & { occurred_on: string; is_demo: true }> = [];

  for (const offset of [-2, -1, 0]) {
    const key = shiftMonth(current, offset);
    const [y = 1970, m = 1] = key.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const flavour = MONTH_FLAVOUR[offset] ?? { food: 1, shop: 1 };
    TEMPLATE.forEach((t, i) => {
      // Skip a few rows in older months for variety
      if (offset !== 0 && (i + offset * 3) % 7 === 0 && t.type === "expense") return;
      if (t.category === "Freelance" && offset === -2) return;
      const day = Math.min(daysInMonth, t.day + (offset === 0 ? 0 : (i % 3) - 1));
      const occurred_on = `${key}-${String(Math.max(1, day)).padStart(2, "0")}`;
      if (occurred_on > todayISO) return;
      let amount = t.amount;
      if (t.category === "Food & Dining") amount = Math.round(amount * flavour.food);
      if (t.category === "Shopping") amount = Math.round(amount * flavour.shop);
      const { day: _day, ...rest } = t;
      transactions.push({ ...rest, amount, occurred_on, is_demo: true });
    });
  }

  const monthStart = `${current}-01`;
  const budgets = [
    { category: "Food & Dining", limit_amount: 3000 },
    { category: "Transport", limit_amount: 1500 },
    { category: "Shopping", limit_amount: 1500 },
    { category: "Entertainment", limit_amount: 1000 },
    { category: "Subscriptions", limit_amount: 400 },
    { category: "Education", limit_amount: 1200 },
  ].map((b) => ({ ...b, month: monthStart, is_demo: true as const }));

  const inMonths = (n: number) => toISODate(new Date(today.getFullYear(), today.getMonth() + n, 1));
  const goals = [
    { name: "New laptop", emoji: "💻", target_amount: 55000, saved_amount: 18500, target_date: inMonths(8), is_demo: true as const },
    { name: "Emergency fund", emoji: "🛟", target_amount: 25000, saved_amount: 9000, target_date: null, is_demo: true as const },
    { name: "Goa trip with friends", emoji: "🏖️", target_amount: 15000, saved_amount: 6200, target_date: inMonths(4), is_demo: true as const },
  ];

  return { transactions, budgets, goals };
}
