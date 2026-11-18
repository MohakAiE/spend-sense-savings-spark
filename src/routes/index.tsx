import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  PieChart,
  HeartPulse,
  FlaskConical,
  ShieldCheck,
  Lock,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/finwise/logo";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-finwise.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinWise 2.0 — Know why you spend, and what to do next" },
      {
        name: "description",
        content:
          "A financial-wellbeing app for teens and young adults: smart transactions, AI money coach, budgets, savings goals, a what-if lab and scam awareness.",
      },
      { property: "og:title", content: "FinWise 2.0 — Know why you spend, and what to do next" },
      {
        property: "og:description",
        content: "Smart transactions, an AI money coach, budgets, goals and scam awareness — built for students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ArrowLeftRight, title: "Smart transactions", body: "Log spends in seconds and tag the reason — need, want, impulse or social." },
  { icon: Sparkles, title: "AI money assistant", body: "Ask anything. Get answers grounded in your own numbers, not generic tips." },
  { icon: PieChart, title: "Budget planner", body: "Monthly limits per category with early warnings at 80%." },
  { icon: HeartPulse, title: "Financial health", body: "Five transparent indicators — every formula shown, no black box." },
  { icon: FlaskConical, title: "Goals & What-if Lab", body: "See exactly how skipping two food deliveries moves your laptop goal." },
  { icon: ShieldCheck, title: "Learn & stay safe", body: "Bite-sized lessons and a scam radar for UPI, KYC and job frauds." },
];

function useHasSession() {
  const [has, setHas] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHas(Boolean(data.session)));
  }, []);
  return has;
}

function Landing() {
  const signedIn = useHasSession();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild>
              <Link to="/dashboard">
                Open dashboard <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="bg-canvas relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-12">
          <div className="animate-rise">
            <p className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-accent">
              <span className="size-1.5 rounded-full bg-accent" /> Financial wellbeing for Gen Z
            </p>
            <h1 className="text-[2.75rem] font-semibold leading-[1.02] text-foreground sm:text-6xl lg:text-[4.25rem]">
              Know <em className="font-medium text-accent">why</em> you spend.
              <br />
              Know what to do next.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              FinWise turns your UPI taps, canteen runs and late-night deliveries into a clear money story — then gives
              you one small, doable next step.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="xl">
                <Link to={signedIn ? "/dashboard" : "/auth"}>
                  {signedIn ? "Go to my dashboard" : "Start free"} <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <a href="#features">See what's inside</a>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4 text-accent" /> We never ask for UPI PINs, OTPs, card numbers or bank passwords.
            </p>
          </div>

          <div className="relative animate-rise [animation-delay:150ms]">
            <img
              src={heroImage}
              alt="A phone showing a savings ring, floating with emerald coins and a navy card"
              width={1200}
              height={1040}
              className="mx-auto w-full max-w-xl animate-float"
            />
            <div className="surface-card absolute bottom-6 left-0 max-w-[15rem] p-4 sm:left-4">
              <p className="eyebrow text-muted-foreground">Why you spent</p>
              <p className="mt-1.5 flex items-start gap-2 text-sm font-medium">
                <TrendingDown className="mt-0.5 size-4 shrink-0 text-destructive" />
                Weekend deliveries are 38% of food spend
              </p>
            </div>
            <div className="surface-ink absolute right-0 top-8 w-44 p-4 sm:right-6">
              <p className="eyebrow text-ink-muted">Health score</p>
              <p className="num mt-1 font-display text-4xl font-semibold">72</p>
              <p className="text-xs text-accent">Steady · up 6 this month</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3 text-accent">Everything in one calm place</p>
          <h2 className="text-4xl font-semibold sm:text-5xl">Six tools. One honest picture of your money.</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="surface-card group p-6 transition-transform duration-300 hover:-translate-y-1 animate-rise"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mb-5 grid size-11 place-items-center rounded-xl bg-success-soft text-accent transition-colors group-hover:bg-gradient-emerald group-hover:text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Explain section */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="surface-ink grain grid gap-10 overflow-hidden p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3 text-accent">Our promise</p>
            <h2 className="text-4xl font-semibold text-ink-foreground">Not just what you spent. Why — and what next.</h2>
            <p className="mt-4 text-ink-muted">
              Most apps show a pie chart and stop. FinWise looks for patterns — impulse spends, weekend spikes, tiny
              taps that add up — and turns each one into a single action you can take today.
            </p>
            <Button asChild variant="ink" size="lg" className="mt-8">
              <Link to={signedIn ? "/dashboard" : "/auth"}>
                Try it with demo data <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {[
              { k: "Why", t: "Food & Dining is 41% of your spending", d: "₹4,120 across 14 payments — up 35% from last month." },
              { k: "Why", t: "27% of spending was unplanned", d: "Impulse and social spends are the easiest to trim." },
              { k: "Next", t: "Save ₹1,450 more to hit a 20% savings rate", d: "Skipping 3 deliveries a week gets you there." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-ink-border bg-ink-foreground/5 p-4">
                <p className="eyebrow text-accent">{x.k}</p>
                <p className="mt-1 font-medium text-ink-foreground">{x.t}</p>
                <p className="mt-1 text-sm text-ink-muted">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>Educational guidance only — not investment, tax or legal advice. Scam? Call 1930 (India cyber-crime helpline).</p>
        </div>
      </footer>
    </div>
  );
}
