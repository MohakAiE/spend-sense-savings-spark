import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { monthKey, shiftMonth, type Budget, type Goal, type SpendReason, type Txn, type TxnType } from "./finance";

export const qk = {
  transactions: ["transactions"] as const,
  budgets: ["budgets"] as const,
  goals: ["goals"] as const,
  profile: ["profile"] as const,
};

export const transactionsQuery = queryOptions({
  queryKey: qk.transactions,
  queryFn: async (): Promise<Txn[]> => {
    const since = `${shiftMonth(monthKey(new Date()), -11)}-01`;
    const { data, error } = await supabase
      .from("transactions")
      .select("id,type,amount,category,merchant,occurred_on,payment_method,spend_reason,note,is_demo")
      .gte("occurred_on", since)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []).map((t) => ({
      ...t,
      type: t.type as TxnType,
      amount: Number(t.amount),
      spend_reason: (t.spend_reason as SpendReason | null) ?? null,
    }));
  },
});

export const budgetsQuery = queryOptions({
  queryKey: qk.budgets,
  queryFn: async (): Promise<Budget[]> => {
    const { data, error } = await supabase
      .from("budgets")
      .select("id,category,month,limit_amount,is_demo")
      .order("month", { ascending: false })
      .order("category");
    if (error) throw error;
    return (data ?? []).map((b) => ({ ...b, limit_amount: Number(b.limit_amount) }));
  },
});

export const goalsQuery = queryOptions({
  queryKey: qk.goals,
  queryFn: async (): Promise<Goal[]> => {
    const { data, error } = await supabase
      .from("savings_goals")
      .select("id,name,emoji,target_amount,saved_amount,target_date,is_demo")
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map((g) => ({
      ...g,
      target_amount: Number(g.target_amount),
      saved_amount: Number(g.saved_amount),
    }));
  },
});

export const profileQuery = queryOptions({
  queryKey: qk.profile,
  queryFn: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,currency,monthly_income")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    return { email: user.email ?? "", displayName: data?.display_name ?? user.email?.split("@")[0] ?? "there" };
  },
});
