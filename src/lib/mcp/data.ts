import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import type { Budget, Goal, SpendReason, Txn, TxnType } from "../finance";
import { supabaseForUser } from "./supabase";

export function requireUser(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) throw new ToolError("Not signed in to FinWise.");
  return supabaseForUser(ctx);
}

export async function loadFinance(ctx: ToolContext): Promise<{ txns: Txn[]; budgets: Budget[]; goals: Goal[] }> {
  const supabase = requireUser(ctx);
  const [txRes, bRes, gRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,type,amount,category,merchant,occurred_on,payment_method,spend_reason,note,is_demo")
      .order("occurred_on", { ascending: false })
      .limit(1000),
    supabase.from("budgets").select("id,category,month,limit_amount,is_demo"),
    supabase.from("savings_goals").select("id,name,emoji,target_amount,saved_amount,target_date,is_demo").order("created_at"),
  ]);
  if (txRes.error || bRes.error || gRes.error) throw new ToolError("Could not load FinWise data. Please try again.");
  return {
    txns: (txRes.data ?? []).map((t) => ({
      ...t,
      type: t.type as TxnType,
      amount: Number(t.amount),
      spend_reason: (t.spend_reason as SpendReason | null) ?? null,
    })),
    budgets: (bRes.data ?? []).map((b) => ({ ...b, limit_amount: Number(b.limit_amount) })),
    goals: (gRes.data ?? []).map((g) => ({
      ...g,
      target_amount: Number(g.target_amount),
      saved_amount: Number(g.saved_amount),
    })),
  };
}
