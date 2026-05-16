import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Store, Package, Receipt, ClipboardList, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/seller")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth/login" });
  },
  component: SellerLayout,
});

const tabs = [
  { to: "/seller", label: "Dashboard", icon: Store, exact: true },
  { to: "/seller/products", label: "Products", icon: Package },
  { to: "/seller/orders", label: "Orders", icon: ClipboardList },
  { to: "/seller/payments", label: "Malipo", icon: CreditCard },
  { to: "/seller/billing", label: "Billing", icon: Receipt },
];

function SellerLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Seller</h1>
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
