import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/pricing";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/orders")({ component: SellerOrders });

function SellerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).maybeSingle();
    if (!shop) return;
    const { data } = await supabase.from("orders").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setOrders(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const update = async (id: string, status: any) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    if (status === "completed") {
      const o = orders.find((x) => x.id === id);
      if (o) {
        // increment shop sales_count
        const { data: shop } = await supabase.from("shops").select("sales_count").eq("id", o.shop_id).maybeSingle();
        if (shop) await supabase.from("shops").update({ sales_count: (shop.sales_count ?? 0) + 1 }).eq("id", o.shop_id);
      }
    }
    toast.success("Updated"); load();
  };

  if (orders.length === 0) return <p className="text-muted-foreground">No orders yet.</p>;

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
          <div>
            <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-semibold hover:underline">#{o.id.slice(0, 8)}</Link>
            <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
            <div className="mt-1 text-sm">{formatKES(Number(o.subtotal))}</div>
          </div>
          <OrderStatusPill status={o.status} />
          <div className="flex flex-wrap gap-1">
            {o.status === "placed" && <Button size="sm" onClick={() => update(o.id, "accepted")}>Accept</Button>}
            {o.status === "accepted" && <Button size="sm" variant="outline" onClick={() => update(o.id, "picked_up")}>Mark picked up</Button>}
            {o.status === "picked_up" && <Button size="sm" variant="outline" onClick={() => update(o.id, "delivered")}>Mark delivered</Button>}
            {o.status === "delivered" && <Button size="sm" onClick={() => update(o.id, "completed")}>Complete sale</Button>}
            <Link to="/orders/$orderId" params={{ orderId: o.id }}><Button size="sm" variant="ghost">View</Button></Link>
          </div>
        </div>
      ))}
    </div>
  );
}
