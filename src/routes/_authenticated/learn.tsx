import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/finwise/app-shell";
import { PageHeader } from "@/components/finwise/page-header";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => pageHead("Learn & stay safe", "Bite-sized money lessons and scam awareness for students."),
  component: LearnPage,
});

const LESSONS = [
  { title: "The 50/30/20 starter", body: "Aim for about half on needs, 30% on wants and 20% saved. Adjust — it's a guide, not a rule." },
  { title: "Pay yourself first", body: "Move savings to a goal the day money arrives, not at month end." },
  { title: "Small spends add up", body: "Ten ₹150 snacks a month is ₹1,500. Tag them to see the pattern." },
  { title: "Wait 24 hours", body: "For any unplanned want over ₹1,000, sleep on it. Most impulses fade." },
];
const SCAMS = [
  "No bank, UPI app or company will ever ask for your UPI PIN, OTP, CVV or password.",
  "You never need to enter your UPI PIN to receive money.",
  "'You won a prize, pay a fee' and 'part-time job, pay to join' offers are scams.",
  "Don't install screen-sharing apps at a stranger's request.",
  "If you're scammed, call India's cyber-crime helpline 1930 or report at cybercrime.gov.in right away.",
];

function LearnPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Learn & stay safe" title="Money basics in two minutes" />
      <div className="grid gap-4 md:grid-cols-2">
        {LESSONS.map((l) => (
          <div key={l.title} className="surface-card p-5">
            <p className="font-medium">{l.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{l.body}</p>
          </div>
        ))}
      </div>
      <div className="surface-card mt-6 p-5">
        <p className="font-medium">Scam awareness</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {SCAMS.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </AppShell>
  );
}
