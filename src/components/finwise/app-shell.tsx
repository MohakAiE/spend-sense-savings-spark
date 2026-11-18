import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  FlaskConical,
  HeartPulse,
  Sparkles,
  ShieldCheck,
  LogOut,
  Menu,
  FlaskRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { budgetsQuery, goalsQuery, profileQuery, transactionsQuery } from "@/lib/queries";
import { useDemoData } from "@/hooks/use-finance";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: PieChart },
  { to: "/goals", label: "Savings goals", icon: Target },
  { to: "/what-if", label: "What-if Lab", icon: FlaskConical },
  { to: "/health", label: "Financial health", icon: HeartPulse },
  { to: "/assistant", label: "AI assistant", icon: Sparkles },
  { to: "/learn", label: "Learn & stay safe", icon: ShieldCheck },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-sidebar-accent hover:text-ink-foreground"
          activeProps={{ className: "bg-sidebar-accent text-ink-foreground" }}
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn("size-[18px] transition-colors", isActive ? "text-accent" : "")} />
              {item.label}
              {isActive && <span className="ml-auto size-1.5 rounded-full bg-accent" />}
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}

function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

function SidebarFooter({ onSignOut }: { onSignOut: () => void }) {
  const { data: profile } = useQuery(profileQuery);
  return (
    <div className="mt-auto space-y-3">
      <div className="rounded-2xl border border-ink-border p-3">
        <p className="text-xs text-ink-muted">Signed in as</p>
        <p className="truncate text-sm font-medium text-ink-foreground">{profile?.email ?? "…"}</p>
      </div>
      <Button variant="ink-outline" className="w-full justify-start" onClick={onSignOut}>
        <LogOut /> Sign out
      </Button>
    </div>
  );
}

function DemoBanner() {
  const { data: txns } = useQuery(transactionsQuery);
  const { data: budgets } = useQuery(budgetsQuery);
  const { data: goals } = useQuery(goalsQuery);
  const { clear } = useDemoData();
  const hasDemo = [txns, budgets, goals].some((rows) => rows?.some((r) => r.is_demo));
  if (!hasDemo) return null;
  return (
    <div className="flex flex-col gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <p className="flex items-center gap-2">
        <FlaskRound className="size-4 shrink-0 text-warning" />
        <span>
          <strong className="font-semibold">Synthetic demo data</strong> — fictional persona "Aarav, 19". Not real
          transactions.
        </span>
      </p>
      <Button size="sm" variant="outline" disabled={clear.isPending} onClick={() => clear.mutate()}>
        {clear.isPending ? "Removing…" : "Remove demo data"}
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-8 bg-sidebar p-5 lg:flex">
        <Logo tone="ink" className="px-2 pt-1" />
        <NavList />
        <SidebarFooter onSignOut={signOut} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col gap-8 border-sidebar-border bg-sidebar p-5 [&>button]:text-ink-foreground">
            <SheetHeader className="text-left">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Logo tone="ink" />
            </SheetHeader>
            <NavList onNavigate={() => setOpen(false)} />
            <SidebarFooter onSignOut={signOut} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="lg:pl-64">
        <DemoBanner />
        <main className="bg-canvas mx-auto min-h-[calc(100vh-3.5rem)] max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-secondary" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-secondary" />
    </div>
  );
}
