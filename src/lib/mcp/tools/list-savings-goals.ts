import { defineTool } from "@lovable.dev/mcp-js";
import { goalProgress } from "../../finance";
import { loadFinance } from "../data";

export default defineTool({
  name: "list_savings_goals",
  title: "List savings goals",
  description: "Show the signed-in user's savings goals with target, amount saved, progress and target date.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { goals } = await loadFinance(ctx);
    const rows = goals.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      target: g.target_amount,
      saved: g.saved_amount,
      progressPct: Math.round(goalProgress(g) * 100),
      targetDate: g.target_date,
    }));
    return {
      content: [{ type: "text", text: rows.length ? JSON.stringify(rows) : "No savings goals yet." }],
      structuredContent: { goals: rows },
    };
  },
});
