import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { AppShell } from "@/components/finwise/app-shell";
import { PageHeader } from "@/components/finwise/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant, type AssistantReply } from "@/lib/assistant.functions";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => pageHead("AI money assistant", "Ask why you spend the way you do and what to do next."),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string; mode?: AssistantReply["mode"]; note?: string | undefined };

function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    const history = msgs.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setText("");
    try {
      const r = await askAssistant({ data: { message, history } });
      setMsgs((m) => [...m, { role: "assistant", content: r.answer, mode: r.mode, note: r.note }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="AI money assistant" title="Ask FinWise" description="Educational guidance only. Never share PINs, OTPs, passwords or card numbers." />
      <div className="surface-card space-y-4 p-5">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">Try: "Why did I spend so much this month?"</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-secondary p-3 text-sm" : "max-w-[85%] whitespace-pre-wrap text-sm"}>
            {m.mode && m.mode !== "ai" && <p className="mb-1 text-xs font-medium text-accent">{m.mode === "demo" ? "Demo mode (rule-based)" : "Safety notice"}</p>}
            {m.content}
            {m.note && <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>}
          </div>
        ))}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <form onSubmit={send} className="flex gap-2">
          <Textarea value={text} maxLength={800} onChange={(e) => setText(e.target.value)} placeholder="Ask about your spending…" className="min-h-[44px]" />
          <Button type="submit" variant="accent" disabled={busy || !text.trim()} aria-label="Send">
            {busy ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
