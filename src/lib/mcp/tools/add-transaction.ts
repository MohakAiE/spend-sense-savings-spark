import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "../../categories";
import { toISODate } from "../../finance";
import { checkSensitive, SENSITIVE_MESSAGE } from "../../safety";
import { requireUser } from "../data";

const EXPENSE_NAMES = EXPENSE_CATEGORIES.map((c) => c.name);
const INCOME_NAMES = INCOME_CATEGORIES.map((c) => c.name);

export default defineTool({
  name: "add_transaction",
  title: "Add transaction",
  description:
    "Record an income or expense for the signed-in user. Never include PINs, OTPs, passwords or card numbers in the merchant or note.",
  inputSchema: {
    type: z.enum(["income", "expense"]).describe("income or expense."),
    amount: z.number().positive().max(10_000_000).describe("Amount in INR."),
    category: z
      .string()
      .describe(`Expense categories: ${EXPENSE_NAMES.join(", ")}. Income categories: ${INCOME_NAMES.join(", ")}.`),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date as YYYY-MM-DD. Defaults to today."),
    merchant: z.string().trim().max(80).optional().describe("Where the money went or came from."),
    payment_method: z
      .enum(PAYMENT_METHODS.map((p) => p.value) as [string, ...string[]])
      .optional()
      .describe("How it was paid (default upi)."),
    spend_reason: z.enum(["need", "want", "impulse", "social"]).optional().describe("Why the user spent it (expenses only)."),
    note: z.string().trim().max(240).optional().describe("Optional short note."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (args, ctx) => {
    const supabase = requireUser(ctx);
    const allowed = args.type === "expense" ? EXPENSE_NAMES : INCOME_NAMES;
    if (!allowed.includes(args.category)) {
      throw new ToolError(`Unknown ${args.type} category. Use one of: ${allowed.join(", ")}.`);
    }
    if (checkSensitive(`${args.merchant ?? ""} ${args.note ?? ""}`).flagged) throw new ToolError(SENSITIVE_MESSAGE);
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not signed in to FinWise.");
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: args.type,
        amount: args.amount,
        category: args.category,
        occurred_on: args.occurred_on ?? toISODate(new Date()),
        merchant: args.merchant || null,
        payment_method: args.payment_method ?? "upi",
        spend_reason: args.type === "expense" ? (args.spend_reason ?? null) : null,
        note: args.note || null,
      })
      .select("id,occurred_on")
      .single();
    if (error) throw new ToolError(`Could not save the transaction: ${error.message}`);
    return {
      content: [{ type: "text", text: `Added ${args.type} of ₹${args.amount} in ${args.category} on ${data.occurred_on}.` }],
      structuredContent: { id: data.id },
    };
  },
});
