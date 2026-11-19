import { useEffect, useState } from "react";
import { z } from "zod";
import { ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, SPEND_REASONS } from "@/lib/categories";
import { toISODate, type SpendReason, type Txn, type TxnType } from "@/lib/finance";
import { checkSensitive, SENSITIVE_MESSAGE } from "@/lib/safety";
import { useTransactionMutations } from "@/hooks/use-finance";
import { cn } from "@/lib/utils";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number({ error: "Enter an amount" }).positive("Amount must be more than 0").max(99_999_999),
  category: z.string().min(1, "Pick a category"),
  merchant: z.string().trim().max(80).nullable(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  payment_method: z.enum(["upi", "card", "cash", "bank", "wallet", "other"]),
  spend_reason: z.enum(["need", "want", "impulse", "social"]).nullable(),
  note: z.string().trim().max(280).nullable(),
});

export function TransactionDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Txn | null;
}) {
  const { save } = useTransactionMutations();
  const [type, setType] = useState<TxnType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [method, setMethod] = useState("upi");
  const [reason, setReason] = useState<SpendReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(initial?.type ?? "expense");
    setAmount(initial ? String(initial.amount) : "");
    setCategory(initial?.category ?? "");
    setMerchant(initial?.merchant ?? "");
    setDate(initial?.occurred_on ?? toISODate(new Date()));
    setMethod(initial?.payment_method ?? "upi");
    setReason(initial?.spend_reason ?? "");
    setNote(initial?.note ?? "");
    setError(null);
  }, [open, initial]);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (checkSensitive(note).flagged || checkSensitive(merchant).flagged) {
      setError(SENSITIVE_MESSAGE);
      return;
    }
    const parsed = schema.safeParse({
      type,
      amount: amount === "" ? undefined : Number(amount),
      category,
      merchant: merchant.trim() || null,
      occurred_on: date,
      payment_method: method,
      spend_reason: type === "expense" ? reason || null : null,
      note: note.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    save.mutate(
      { id: initial?.id, values: parsed.data },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{initial ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>Log it in seconds. Tagging the reason powers your "why you spend" insights.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1" role="radiogroup" aria-label="Type">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => {
                  setType(t);
                  setCategory("");
                }}
                className={cn(
                  "cursor-pointer rounded-lg py-2 text-sm font-medium capitalize transition-all",
                  type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" inputMode="decimal" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250" className="num" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Category"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Paid via</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger aria-label="Payment method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="merchant">{type === "expense" ? "Where / what" : "From"}</Label>
            <Input id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder={type === "expense" ? "Campus canteen" : "Internship stipend"} maxLength={80} />
          </div>

          {type === "expense" && (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Why did you spend?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SPEND_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(reason === r.value ? "" : r.value)}
                    aria-pressed={reason === r.value}
                    title={r.hint}
                    className={cn(
                      "cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                      reason === r.value ? "border-accent bg-success-soft text-accent" : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={280} placeholder="Late-night study snack" />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="size-3.5" /> Never type PINs, OTPs, passwords or card numbers here.
            </p>
          </div>

          {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={save.isPending}>
              {save.isPending ? "Saving…" : initial ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
