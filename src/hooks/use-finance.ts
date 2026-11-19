import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoData } from "@/lib/demo-data";
import { budgetsQuery, goalsQuery, profileQuery, qk, transactionsQuery } from "@/lib/queries";
import type { SpendReason, TxnType } from "@/lib/finance";

export function useFinanceData() {
  const { data: transactions } = useSuspenseQuery(transactionsQuery);
  const { data: budgets } = useSuspenseQuery(budgetsQuery);
  const { data: goals } = useSuspenseQuery(goalsQuery);
  return { transactions, budgets, goals };
}

export function useProfile() {
  return useSuspenseQuery(profileQuery).data;
}

function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong";
}

export interface TxnInput {
  type: TxnType;
  amount: number;
  category: string;
  merchant: string | null;
  occurred_on: string;
  payment_method: string;
  spend_reason: SpendReason | null;
  note: string | null;
}

export function useTransactionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.transactions });
  const save = useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: TxnInput }) => {
      if (id) {
        const { error } = await supabase.from("transactions").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Transaction updated" : "Transaction added");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transaction deleted");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return { save, remove };
}

export function useBudgetMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.budgets });
  const save = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: { category: string; month: string; limit_amount: number } }) => {
      if (id) {
        const { error } = await supabase.from("budgets").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("budgets").insert(values);
        if (error) {
          if (error.code === "23505") throw new Error(`You already have a ${values.category} budget for this month.`);
          throw error;
        }
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Budget updated" : "Budget created");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const copy = useMutation({
    mutationFn: async (rows: { category: string; month: string; limit_amount: number }[]) => {
      if (!rows.length) return 0;
      const { error } = await supabase.from("budgets").upsert(rows, { onConflict: "user_id,category,month", ignoreDuplicates: true });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(n ? `Copied ${n} budgets` : "Nothing to copy");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget removed");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return { save, copy, remove };
}

export interface GoalInput {
  name: string;
  emoji: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
}

export function useGoalMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: qk.goals });
  const save = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: GoalInput }) => {
      if (id) {
        const { error } = await supabase.from("savings_goals").update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("savings_goals").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Goal updated" : "Goal created");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const contribute = useMutation({
    mutationFn: async ({ id, saved_amount }: { id: string; saved_amount: number }) => {
      const { error } = await supabase.from("savings_goals").update({ saved_amount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nice! Goal updated");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Goal deleted");
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return { save, contribute, remove };
}

export function useDemoData() {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.transactions }),
      qc.invalidateQueries({ queryKey: qk.budgets }),
      qc.invalidateQueries({ queryKey: qk.goals }),
    ]);
  const load = useMutation({
    mutationFn: async () => {
      const demo = buildDemoData();
      // Clear any previous demo rows first so loading twice doesn't duplicate.
      await Promise.all([
        supabase.from("transactions").delete().eq("is_demo", true),
        supabase.from("budgets").delete().eq("is_demo", true),
        supabase.from("savings_goals").delete().eq("is_demo", true),
      ]);
      const r1 = await supabase.from("transactions").insert(demo.transactions);
      if (r1.error) throw r1.error;
      const r2 = await supabase
        .from("budgets")
        .upsert(demo.budgets, { onConflict: "user_id,category,month", ignoreDuplicates: true });
      if (r2.error) throw r2.error;
      const r3 = await supabase.from("savings_goals").insert(demo.goals);
      if (r3.error) throw r3.error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Synthetic demo data loaded", { description: "Every demo row is labelled and can be removed in one click." });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const clear = useMutation({
    mutationFn: async () => {
      const results = await Promise.all([
        supabase.from("transactions").delete().eq("is_demo", true),
        supabase.from("budgets").delete().eq("is_demo", true),
        supabase.from("savings_goals").delete().eq("is_demo", true),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Demo data removed");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return { load, clear };
}
