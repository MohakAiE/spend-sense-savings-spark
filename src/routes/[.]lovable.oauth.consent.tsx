import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/finwise/logo";

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm who you are",
  email: "Share your email address",
  profile: "Share your basic profile",
};

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // SSR has no browser session and would bounce signed-in users to sign-in.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This connection link is missing its authorization ID.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { redirect: location.pathname + location.searchStr } });
    }
    return { email: data.session.user.email ?? "your account" };
  },
  loaderDeps: ({ search }) => ({ id: search.authorization_id }),
  loader: async ({ deps }) => {
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(deps.id);
    if (error) throw error;
    const immediate = (data as { redirect_url?: string; redirect_to?: string } | null)?.redirect_url ??
      (data as { redirect_to?: string } | null)?.redirect_to;
    if (immediate && !(data as { client?: unknown } | null)?.client) throw redirect({ href: immediate });
    return data;
  },
  head: () => ({
    meta: [
      { title: "Connect an app — FinWise 2.0" },
      { name: "description", content: "Approve or cancel an app's request to use FinWise on your behalf." },
      { property: "og:title", content: "Connect an app — FinWise 2.0" },
      { property: "og:description", content: "Approve or cancel an app's request to use FinWise on your behalf." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  pendingComponent: () => (
    <Shell>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading connection request…
      </div>
    </Shell>
  ),
  errorComponent: ({ error }) => (
    <Shell>
      <h1 className="text-2xl font-semibold">This connection request can't be used</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have expired or already been answered. Start the connection again from the app you were using.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    </Shell>
  ),
  component: Consent,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-canvas flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-8">
          <Logo />
        </div>
        <div className="surface-card p-8">{children}</div>
      </div>
    </main>
  );
}

type Details = {
  client?: { name?: string; client_name?: string; uri?: string; redirect_uri?: string } | null;
  redirect_uri?: string;
  scope?: string;
  scopes?: string[];
};

function Consent() {
  const details = (Route.useLoaderData() ?? {}) as Details;
  const { email } = Route.useRouteContext();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = details.client?.name ?? details.client?.client_name ?? "An app";
  const redirectUri = details.redirect_uri ?? details.client?.redirect_uri ?? details.client?.uri;
  const scopes = details.scopes ?? (details.scope ? details.scope.split(" ").filter(Boolean) : []);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const result = data as { redirect_url?: string; redirect_to?: string } | null;
    const target = result?.redirect_url ?? result?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("The sign-in service didn't say where to go next. Please try again.");
      return;
    }
    window.location.href = target;
  }

  return (
    <Shell>
      <p className="eyebrow mb-3 text-accent">Connection request</p>
      <h1 className="text-2xl font-semibold">Connect {clientName} to FinWise</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {clientName} will be able to read your FinWise transactions, budgets and goals, and add transactions, as{" "}
        <strong className="text-foreground">{email}</strong>.
      </p>
      {redirectUri && <p className="mt-3 break-all text-xs text-muted-foreground">Returns to {redirectUri}</p>}

      {scopes.length > 0 && (
        <ul className="mt-5 space-y-1.5 text-sm">
          {scopes.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent" />
              {SCOPE_LABELS[s] ?? `Additional permission requested: ${s}`}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border p-4 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
        This doesn't bypass FinWise's privacy rules — the app only sees your own data. FinWise never shares PINs, OTPs or
        bank passwords.
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <Button variant="accent" className="flex-1" disabled={busy !== null} onClick={() => decide(true)}>
          {busy === "approve" && <Loader2 className="animate-spin" />} Approve
        </Button>
        <Button variant="outline" className="flex-1" disabled={busy !== null} onClick={() => decide(false)}>
          {busy === "deny" && <Loader2 className="animate-spin" />} Cancel connection
        </Button>
      </div>
    </Shell>
  );
}
