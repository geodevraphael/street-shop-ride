import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { formatTSh } from "@/lib/pricing";

export const Route = createFileRoute("/orders")({ component: Orders });

function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*, shops(name)").eq("client_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders(data ?? []));
  }, [user]);

  if (!user) return <AppShell><p>Sign in to see your orders.</p></AppShell>;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">My orders</h1>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {orders.map((o) => (
            <Link to="/orders/$orderId" params={{ orderId: o.id }} key={o.id} className="flex items-center justify-between rounded-2xl border bg-card p-4 hover:border-primary">
              <div>
                <div className="font-semibold">{o.shops?.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <OrderStatusPill status={o.status} />
                <div className="mt-1 text-sm font-semibold">{formatKES(Number(o.subtotal) + Number(o.delivery_fee))}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
