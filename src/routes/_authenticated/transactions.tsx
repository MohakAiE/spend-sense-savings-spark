import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AppShell, PageSkeleton } from "@/components/finwise/app-shell";
import { PageHeader } from "@/components/finwise/page-header";
import { TransactionDialog } from "@/components/finwise/transaction-dialog";
import { TransactionRow } from "@/components/finwise/transaction-row";
import { EmptyState } from "@/components/finwise/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinanceData, useTransactionMutations } from "@/hooks/use-finance";
import { ensureFinanceData } from "@/lib/route-data";
import { summarize, type Txn } from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/transactions")({
  loader: ({ context }) => ensureFinanceData(context.queryClient),
  pendingComponent: () => (
    <AppShell>
      <PageSkeleton />
    </AppShell>
  ),
  head: () => pageHead("Transactions", "Every rupee in and out, with the reason you spent it."),
  component: TransactionsPage,
});

type TypeFilter = "all" | "income" | "expense";

function TransactionsPage() {
  const { transactions } = useFinanceData();
  const { remove } = useTransactionMutations();
  const [type, setType] = useState<TypeFilter>("all");
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Txn | null>(null);
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        (type === "all" || t.type === type) &&
        (!month || t.occurred_on.startsWith(month)) &&
        (!q || `${t.category} ${t.merchant ?? ""} ${t.note ?? ""}`.toLowerCase().includes(q)),
    );
  }, [transactions, type, month, query]);
  const totals = summarize(visible);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Smart transactions"
        title="Transactions"
        description="Tag why you spent — need, want, impulse or social — and FinWise explains your patterns."
        actions={
          <Button variant="accent" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus /> Add transaction
          </Button>
        }
      />
      <div className="surface-card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Tabs value={type} onValueChange={(v) => setType(v as TypeFilter)}>
          <TabsList className="rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
            <TabsTrigger value="expense" className="rounded-lg">Spent</TabsTrigger>
            <TabsTrigger value="income" className="rounded-lg">Income</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="sm:w-44" aria-label="Month" />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search category, merchant or note" className="pl-9" />
        </div>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        {visible.length} shown · In {formatMoney(totals.income)} · Out {formatMoney(totals.expense)}
      </p>
      {visible.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No transactions here" description="Try another filter, or add your first transaction." />
      ) : (
        <div className="surface-card divide-y divide-border px-2">
          {visible.map((t) => (
            <TransactionRow
              key={t.id}
              txn={t}
              actions={
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(t); setOpen(true); }}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    disabled={remove.isPending}
                    onClick={() => { if (window.confirm("Delete this transaction?")) remove.mutate(t.id); }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
      <TransactionDialog open={open} onOpenChange={setOpen} initial={editing} />
    </AppShell>
  );
}
