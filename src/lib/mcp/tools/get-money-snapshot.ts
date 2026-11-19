import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { monthKey } from "../../finance";
import { buildFinancialContext, contextForModel } from "../../insights";
import { loadFinance } from "../data";

export default defineTool({
  name: "get_money_snapshot",
  title: "Get money snapshot",
  description:
    "Summarise the signed-in user's month: income, spending, savings, top categories, why they spent (need/want/impulse/social), budgets, goals and FinWise's rule-based insights. Amounts are in INR.",
  inputSchema: {
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional()
      .describe("Month as YYYY-MM. Defaults to the current month."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ month }, ctx) => {
    const { txns, budgets, goals } = await loadFinance(ctx);
    const raw = contextForModel(buildFinancialContext(txns, budgets, goals, month ?? monthKey(new Date())));
    const snapshot = {
      ...raw,
      thisMonth: { ...raw.thisMonth },
      lastMonth: { ...raw.lastMonth },
      spendingByReason: { ...raw.spendingByReason },
      topMerchant: raw.topMerchant ? { ...raw.topMerchant } : null,
      smallPaymentsUnder250: { ...raw.smallPaymentsUnder250 },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(snapshot) }],
      structuredContent: { snapshot },
    };
  },
});
