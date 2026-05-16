import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Truck, Package, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/courier")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth/login" });
  },
  component: CourierLayout,
});

const tabs = [
  { to: "/courier", label: "Bodi ya Vifurushi", icon: Package, exact: true },
  { to: "/courier/offices", label: "Ofisi Zangu", icon: Users },
];

function CourierLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Wakala wa Courier</h1>
          <p className="text-xs text-muted-foreground">Simamia vifurushi vinavyopita kwa kampuni yako</p>
        </div>
      </div>
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
