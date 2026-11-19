import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMoneySnapshot from "./tools/get-money-snapshot";
import listTransactions from "./tools/list-transactions";
import listBudgets from "./tools/list-budgets";
import listSavingsGoals from "./tools/list-savings-goals";
import addTransaction from "./tools/add-transaction";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "spend-sense-savings-spark",
  title: "Spend Sense Savings Spark",
  version: "0.1.0",
  instructions:
    "FinWise money tools for the signed-in user (amounts in INR). Read their monthly snapshot, transactions, budgets and savings goals, and record new transactions. Educational guidance only; never ask for PINs, OTPs, passwords or card numbers.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMoneySnapshot, listTransactions, listBudgets, listSavingsGoals, addTransaction],
});
