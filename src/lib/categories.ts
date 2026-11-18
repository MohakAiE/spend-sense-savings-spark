import type { LucideIcon } from "lucide-react";
import {
  Utensils,
  Bus,
  ShoppingBag,
  Clapperboard,
  Repeat,
  GraduationCap,
  Smartphone,
  HeartPulse,
  Users,
  Package,
  Wallet,
  Briefcase,
  Laptop,
  Gift,
  PiggyBank,
} from "lucide-react";

export interface CategoryMeta {
  name: string;
  icon: LucideIcon;
  /** CSS color token, e.g. var(--chart-1) */
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { name: "Food & Dining", icon: Utensils, color: "var(--chart-1)" },
  { name: "Transport", icon: Bus, color: "var(--chart-3)" },
  { name: "Shopping", icon: ShoppingBag, color: "var(--chart-5)" },
  { name: "Entertainment", icon: Clapperboard, color: "var(--chart-6)" },
  { name: "Subscriptions", icon: Repeat, color: "var(--chart-4)" },
  { name: "Education", icon: GraduationCap, color: "var(--chart-2)" },
  { name: "Bills & Recharge", icon: Smartphone, color: "var(--chart-7)" },
  { name: "Health", icon: HeartPulse, color: "var(--chart-3)" },
  { name: "Gifts & Social", icon: Users, color: "var(--chart-5)" },
  { name: "Other", icon: Package, color: "var(--chart-8)" },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { name: "Pocket money", icon: Wallet, color: "var(--chart-1)" },
  { name: "Stipend / Salary", icon: Briefcase, color: "var(--chart-2)" },
  { name: "Freelance", icon: Laptop, color: "var(--chart-3)" },
  { name: "Gifts received", icon: Gift, color: "var(--chart-4)" },
  { name: "Other income", icon: PiggyBank, color: "var(--chart-8)" },
];

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function categoryMeta(name: string): CategoryMeta {
  return ALL.find((c) => c.name === name) ?? { name, icon: Package, color: "var(--chart-8)" };
}

export const PAYMENT_METHODS = [
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "wallet", label: "Wallet" },
  { value: "other", label: "Other" },
] as const;

export const SPEND_REASONS = [
  { value: "need", label: "Need", hint: "Essentials you'd buy anyway" },
  { value: "want", label: "Want", hint: "Planned treats" },
  { value: "impulse", label: "Impulse", hint: "Unplanned, in-the-moment" },
  { value: "social", label: "Social", hint: "Because friends were in" },
] as const;
