import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { formatTSh } from "@/lib/pricing";

export const Route = createFileRoute("/rider/history")({ component: RiderHistory });

function RiderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("riders").select("id").eq("user_id", user.id).maybeSingle().then(async ({ data }) => {
      if (!data) return;
      const { data: o } = await supabase.from("orders").select("*, shops(name)").eq("rider_id", data.id).order("created_at", { ascending: false });
      setOrders(o ?? []);
    });
  }, [user]);

  const earnings = orders.filter((o) => ["delivered", "completed"].includes(o.status)).reduce((s, o) => s + Number(o.delivery_fee), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Total earnings</p>
        <p className="text-2xl font-bold">{formatKES(earnings)}</p>
      </div>
      {orders.map((o) => (
        <Link to="/orders/$orderId" params={{ orderId: o.id }} key={o.id} className="flex items-center justify-between rounded-2xl border bg-card p-3 hover:border-primary">
          <div>
            <div className="font-medium">{o.shops?.name}</div>
            <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <OrderStatusPill status={o.status} />
            <div className="mt-1 text-sm font-semibold">{formatKES(Number(o.delivery_fee))}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
