import type { QueryClient } from "@tanstack/react-query";
import { budgetsQuery, goalsQuery, profileQuery, transactionsQuery } from "./queries";

/** Preload everything the signed-in pages read so components can use suspense queries. */
export function ensureFinanceData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.ensureQueryData(transactionsQuery),
    queryClient.ensureQueryData(budgetsQuery),
    queryClient.ensureQueryData(goalsQuery),
    queryClient.ensureQueryData(profileQuery),
  ]);
}
