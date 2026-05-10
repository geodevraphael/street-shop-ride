import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Store, Bike, ShoppingBag, Flag } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const [stats, setStats] = useState({ shops: 0, riders: 0, orders: 0, reports: 0 });
  useEffect(() => {
    Promise.all([
      supabase.from("shops").select("id", { count: "exact", head: true }),
      supabase.from("riders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]).then(([s, r, o, rep]) => setStats({ shops: s.count ?? 0, riders: r.count ?? 0, orders: o.count ?? 0, reports: rep.count ?? 0 }));
  }, []);
  const cards = [
    { icon: Store, label: "Shops", value: stats.shops },
    { icon: Bike, label: "Riders", value: stats.riders },
    { icon: ShoppingBag, label: "Orders", value: stats.orders },
    { icon: Flag, label: "Open reports", value: stats.reports },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><c.icon className="h-4 w-4" /> {c.label}</div>
          <div className="mt-1 text-2xl font-bold">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
