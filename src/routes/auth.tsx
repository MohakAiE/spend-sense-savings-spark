import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/finwise/logo";
import { oauthReturnPath } from "@/lib/oauth-return-path";

const searchSchema = z.object({ redirect: z.string().optional() });

function safeRedirect(target?: string) {
  const path = oauthReturnPath(target);
  return path === "/" ? "/dashboard" : path;
}

/** Absolute /auth URL that carries the validated return path through email links and Google sign-in. */
function authReturnUrl(target?: string) {
  const url = new URL("/auth", window.location.origin);
  const path = oauthReturnPath(target);
  if (path !== "/") url.searchParams.set("redirect", path);
  return url.href;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ href: safeRedirect(search.redirect) });
  },
  head: () => ({
    meta: [
      { title: "Sign in — FinWise 2.0" },
      { name: "description", content: "Sign in or create your FinWise account to track spending, budgets and goals." },
      { property: "og:title", content: "Sign in — FinWise 2.0" },
      { property: "og:description", content: "Sign in or create your FinWise account to track spending, budgets and goals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  name: z.string().trim().max(60).optional(),
});

function GoogleMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password, name: name || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: authReturnUrl(search.redirect),
            data: { display_name: parsed.data.name },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ href: safeRedirect(search.redirect) });
        } else {
          setSentTo(parsed.data.email);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ href: safeRedirect(search.redirect) });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: authReturnUrl(search.redirect) });
    if (result.error) {
      toast.error(result.error instanceof Error ? result.error.message : "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ href: safeRedirect(search.redirect) });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="surface-ink grain relative hidden flex-col justify-between overflow-hidden rounded-none p-12 lg:flex">
        <Logo tone="ink" />
        <div className="max-w-md">
          <p className="eyebrow mb-4 text-accent">Financial wellbeing, explained</p>
          <h2 className="text-5xl font-semibold leading-[1.05] text-ink-foreground">
            Know <em className="font-medium text-accent">why</em> you spend.
            <br />
            Know what to do next.
          </h2>
          <p className="mt-6 text-ink-muted">
            Track every rupee, set budgets that actually stick, and get honest, judgement-free nudges from your AI money
            coach.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-ink-border p-4 text-sm text-ink-muted">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
          FinWise never asks for your UPI PIN, OTP, card details or bank passwords. Anyone who does is a scammer.
        </div>
      </aside>

      <main className="bg-canvas flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {sentTo ? (
            <div className="surface-card p-8 text-center">
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-success-soft text-accent">
                <MailCheck className="size-6" />
              </span>
              <h1 className="text-2xl font-semibold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>. Open it to finish
                creating your account.
              </p>
              <Button variant="outline" className="mt-6 w-full" onClick={() => { setSentTo(null); setMode("signin"); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-semibold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin" ? "Sign in to see your money story." : "Free, private, and built for students."}
              </p>

              <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-6">
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="signin" className="rounded-lg">Sign in</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg">Sign up</TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">First name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav" maxLength={60} autoComplete="given-name" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                  />
                  <p className="text-xs text-muted-foreground">This is your FinWise password — never your bank or UPI PIN.</p>
                </div>
                <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={onGoogle}
                disabled={busy}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <GoogleMark />
                Continue with Google
              </button>

              <p className="mt-8 text-center text-xs text-muted-foreground">
                <Link to="/" className="underline-offset-4 hover:underline">← Back to FinWise</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
