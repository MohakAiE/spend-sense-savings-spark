import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { loadFinance } from "../data";

export default defineTool({
  name: "list_transactions",
  title: "List transactions",
  description: "List the signed-in user's recent transactions, newest first, optionally filtered by month, type or category.",
  inputSchema: {
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().describe("Only this month, as YYYY-MM."),
    type: z.enum(["income", "expense"]).optional().describe("Only income or only expenses."),
    category: z.string().max(60).optional().describe("Exact category name, e.g. 'Food & Dining'."),
    limit: z.number().int().min(1).max(200).optional().describe("Maximum rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ month, type, category, limit }, ctx) => {
    const { txns } = await loadFinance(ctx);
    const rows = txns
      .filter((t) => (!month || t.occurred_on.startsWith(month)) && (!type || t.type === type) && (!category || t.category === category))
      .slice(0, limit ?? 50)
      .map((t) => ({
        id: t.id,
        date: t.occurred_on,
        type: t.type,
        amount: t.amount,
        category: t.category,
        merchant: t.merchant,
        paymentMethod: t.payment_method,
        spendReason: t.spend_reason,
        note: t.note,
        isDemo: t.is_demo,
      }));
    return {
      content: [{ type: "text", text: rows.length ? JSON.stringify(rows) : "No matching transactions." }],
      structuredContent: { transactions: rows },
    };
  },
});
