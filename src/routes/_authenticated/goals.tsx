import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { AppShell, PageSkeleton } from "@/components/finwise/app-shell";
import { PageHeader } from "@/components/finwise/page-header";
import { EmptyState } from "@/components/finwise/empty-state";
import { Meter } from "@/components/finwise/meter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinanceData, useGoalMutations } from "@/hooks/use-finance";
import { ensureFinanceData } from "@/lib/route-data";
import { goalProgress } from "@/lib/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/goals")({
  loader: ({ context }) => ensureFinanceData(context.queryClient),
  pendingComponent: () => (
    <AppShell>
      <PageSkeleton />
    </AppShell>
  ),
  head: () => pageHead("Savings goals", "Set savings goals and watch every contribution move you closer."),
  component: GoalsPage,
});

function GoalsPage() {
  const { goals } = useFinanceData();
  const { save, contribute, remove } = useGoalMutations();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [adds, setAdds] = useState<Record<string, string>>({});

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(target);
    if (!name.trim() || !(amount > 0)) return;
    save.mutate(
      { values: { name: name.trim(), emoji: emoji || "🎯", target_amount: amount, saved_amount: 0, target_date: date || null } },
      { onSuccess: () => { setName(""); setTarget(""); setDate(""); } },
    );
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Savings goals" title="What are you saving for?" description="Name it, price it, and add to it whenever you can." />
      <form onSubmit={onCreate} className="surface-card mb-6 grid gap-3 p-5 sm:grid-cols-[72px_1fr_160px_170px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="emoji">Icon</Label>
          <Input id="emoji" value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gname">Goal</Label>
          <Input id="gname" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="New laptop" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gtarget">Target (₹)</Label>
          <Input id="gtarget" type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="45000" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gdate">By (optional)</Label>
          <Input id="gdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button type="submit" variant="accent" disabled={save.isPending || !name.trim() || !(Number(target) > 0)}>
          <Plus /> Create
        </Button>
      </form>
      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="A goal with a name and a date is far easier to save for." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const pct = goalProgress(g);
            const add = adds[g.id] ?? "";
            return (
              <div key={g.id} className="surface-card p-5">
                <div className="mb-3 flex items-start gap-3">
                  <span className="text-3xl" aria-hidden>{g.emoji}</span>
                  <div className="flex-1">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(g.saved_amount)} of {formatMoney(g.target_amount)}
                      {g.target_date ? ` · by ${formatDate(g.target_date)}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${g.name}`} onClick={() => { if (window.confirm(`Delete "${g.name}"?`)) remove.mutate(g.id); }}>
                    <Trash2 />
                  </Button>
                </div>
                <Meter value={pct} tone={pct >= 1 ? "success" : "teal"} label={`${g.name} progress`} />
                <p className="mt-2 text-sm text-muted-foreground">{Math.round(pct * 100)}% there</p>
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = Number(add);
                    if (!(v > 0)) return;
                    contribute.mutate(
                      { id: g.id, saved_amount: g.saved_amount + v },
                      { onSuccess: () => setAdds((a) => ({ ...a, [g.id]: "" })) },
                    );
                  }}
                >
                  <Input type="number" min={1} value={add} onChange={(e) => setAdds((a) => ({ ...a, [g.id]: e.target.value }))} placeholder="Add ₹" aria-label={`Add to ${g.name}`} />
                  <Button type="submit" variant="soft" disabled={contribute.isPending || !(Number(add) > 0)}>Add</Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
