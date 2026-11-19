import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { budgetProgress, inMonth, monthKey } from "../../finance";
import { loadFinance } from "../data";

export default defineTool({
  name: "list_budgets",
  title: "List budgets",
  description: "Show the signed-in user's category budgets for a month with amount spent and status (ok, warning, over).",
  inputSchema: {
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().describe("Month as YYYY-MM. Defaults to the current month."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ month }, ctx) => {
    const key = month ?? monthKey(new Date());
    const { txns, budgets } = await loadFinance(ctx);
    const rows = budgetProgress(
      budgets.filter((b) => b.month.startsWith(key)),
      inMonth(txns, key),
    ).map((p) => ({
      category: p.budget.category,
      limit: p.budget.limit_amount,
      spent: p.spent,
      status: p.status,
    }));
    return {
      content: [{ type: "text", text: rows.length ? JSON.stringify(rows) : `No budgets set for ${key}.` }],
      structuredContent: { month: key, budgets: rows },
    };
  },
});
