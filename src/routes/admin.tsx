import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Shield, Users, Receipt, Flag, Map, Gift, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth/login" });
  },
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Overview", icon: Shield, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Receipt },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/regions", label: "Regions", icon: Map },
  { to: "/admin/referrals", label: "Referrals", icon: Gift },
  { to: "/admin/pricing", label: "Pricing", icon: DollarSign },
];

function AdminLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Admin & Support</h1>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link key={t.to} to={t.to} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6"><Outlet /></div>
    </AppShell>
  );
}
