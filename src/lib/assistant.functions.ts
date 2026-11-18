import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { demoAnswer } from "./assistant-demo";
import { monthKey, type Budget, type Goal, type SpendReason, type Txn, type TxnType } from "./finance";
import { buildFinancialContext, contextForModel } from "./insights";
import { checkSensitive, SENSITIVE_MESSAGE } from "./safety";

const MODEL = "google/gemini-3.8-flash" as const;

const askSchema = z.object({
  message: z.string().trim().min(1).max(800),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(10)
    .default([]),
});

export type AssistantMode = "ai" | "demo" | "safety";

export interface AssistantReply {
  mode: AssistantMode;
  answer: string;
  note?: string;
}

const SYSTEM_PROMPT = `You are FinWise, a warm, practical money coach for teens and young adults in India.
Your core promise: explain WHY the user spends the way they do, then give 1-3 specific, doable next steps.
Rules:
- Use ONLY the JSON snapshot of the user's own aggregated data below for numbers. Never invent transactions.
- Amounts are in Indian Rupees; format like ₹1,250.
- Be concise: under 170 words, short paragraphs or bullet points, light markdown (bold, bullets).
- Educational guidance only — not investment, tax, legal or credit advice. Do not recommend specific stocks, crypto, loans or financial products.
- Never ask for or accept UPI PINs, OTPs, CVVs, passwords, card numbers or bank login details. If scams come up, remind them no genuine bank or app asks for these, and that India's cyber-crime helpline is 1930.
- If the snapshot is empty, suggest adding transactions or loading the demo data.`;

/** Whether a live AI model is configured on the server (the key itself never leaves the server). */
export const getAssistantStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { aiConfigured: Boolean(process.env["LOVABLE_API_KEY"]), model: MODEL };
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data, context }): Promise<AssistantReply> => {
    if (checkSensitive(data.message).flagged) {
      return { mode: "safety", answer: SENSITIVE_MESSAGE };
    }

    const { supabase } = context;
    const [txRes, bRes, gRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,type,amount,category,merchant,occurred_on,payment_method,spend_reason,note,is_demo")
        .order("occurred_on", { ascending: false })
        .limit(1000),
      supabase.from("budgets").select("id,category,month,limit_amount,is_demo"),
      supabase.from("savings_goals").select("id,name,emoji,target_amount,saved_amount,target_date,is_demo"),
    ]);
    if (txRes.error || bRes.error || gRes.error) {
      throw new Error("Could not load your financial data. Please try again.");
    }
    const txns: Txn[] = (txRes.data ?? []).map((t) => ({
      ...t,
      type: t.type as TxnType,
      amount: Number(t.amount),
      spend_reason: (t.spend_reason as SpendReason | null) ?? null,
    }));
    const budgets: Budget[] = (bRes.data ?? []).map((b) => ({ ...b, limit_amount: Number(b.limit_amount) }));
    const goals: Goal[] = (gRes.data ?? []).map((g) => ({
      ...g,
      target_amount: Number(g.target_amount),
      saved_amount: Number(g.saved_amount),
    }));

    const ctx = buildFinancialContext(txns, budgets, goals, monthKey(new Date()));

    if (!process.env["LOVABLE_API_KEY"]) {
      return { mode: "demo", answer: demoAnswer(data.message, ctx), note: "AI model not configured" };
    }

    try {
      const { generateChatCompletion } = await import("@lovable.dev/ai-gateway");
      const res = await generateChatCompletion({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nUser data snapshot (JSON):\n${JSON.stringify(contextForModel(ctx))}`,
          },
          ...data.history
            .filter((m) => !checkSensitive(m.content).flagged)
            .map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: data.message },
        ],
      });
      const content = res.choices?.[0]?.message?.content;
      const text = typeof content === "string" ? content.trim() : "";
      if (!text) throw new Error("Empty response");
      return { mode: "ai", answer: text };
    } catch (error) {
      console.error("[assistant] AI call failed, falling back to demo mode", error);
      return {
        mode: "demo",
        answer: demoAnswer(data.message, ctx),
        note: "Live AI was unavailable, so this answer uses FinWise's rule-based engine.",
      };
    }
  });
