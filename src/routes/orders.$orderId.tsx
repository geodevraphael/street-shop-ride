import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { Button } from "@/components/ui/button";
import { formatKES, distanceKm } from "@/lib/pricing";
import { Bike, Star, ShieldCheck } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$orderId")({ component: OrderDetail });

function OrderDetail() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [searchingRiders, setSearchingRiders] = useState(false);

  const load = async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    setOrder(o);
    if (o) {
      const [i, s, a] = await Promise.all([
        supabase.from("order_items").select("*, products(name)").eq("order_id", orderId),
        supabase.from("shops").select("*").eq("id", o.shop_id).maybeSingle(),
        o.address_id ? supabase.from("addresses").select("*").eq("id", o.address_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setItems(i.data ?? []);
      setShop(s.data);
      setAddress(a.data);
    }
  };
  useEffect(() => { load(); }, [orderId]);

  const findRiders = async () => {
    setSearchingRiders(true);
    const { data } = await supabase.from("riders").select("*").eq("available", true);
    let list = data ?? [];
    if (shop?.lat) {
      list = [...list].sort((a, b) => {
        const da = a.current_lat != null && a.current_lng != null ? distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: a.current_lat, lng: a.current_lng }) : 9999;
        const db = b.current_lat != null && b.current_lng != null ? distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: b.current_lat, lng: b.current_lng }) : 9999;
        const va = a.license_verified ? -0.5 : 0;
        const vb = b.license_verified ? -0.5 : 0;
        return (da + va) - (db + vb);
      });
    }
    setRiders(list.slice(0, 8));
    setSearchingRiders(false);
  };

  const assignRider = async (riderId: string) => {
    const { error } = await supabase.from("orders").update({ rider_id: riderId, status: "rider_assigned" }).eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Rider assigned");
    setRiders([]);
    load();
  };

  const updateStatus = async (status: "placed"|"accepted"|"rider_assigned"|"picked_up"|"delivered"|"completed"|"cancelled") => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  if (!order) return <AppShell><p>Loading…</p></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order</h1>
          <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Items</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.qty}× {i.products?.name}</span>
                  <span>{formatKES(Number(i.price) * i.qty)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Delivery</h3>
            <p className="text-sm text-muted-foreground">From <b>{shop?.name}</b> to <b>{address?.label ?? "—"}</b></p>
            <p className="mt-1 text-xs text-muted-foreground">{order.distance_km?.toFixed(1)} km · {order.eta_min} min ETA</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={findRiders}><Bike className="mr-1 h-4 w-4" /> Find boda nearby</Button>
              {order.status === "delivered" && <Button size="sm" variant="outline" onClick={() => updateStatus("completed")}>Confirm received</Button>}
              {order.rider_id && <ReportDialog targetType="rider" targetId={order.rider_id} />}
            </div>
            {searchingRiders && <p className="mt-3 text-sm text-muted-foreground">Searching…</p>}
            {riders.length > 0 && (
              <div className="mt-3 space-y-2">
                {riders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <div className="flex items-center gap-2 font-medium">{r.full_name ?? "Rider"} {r.license_verified && <ShieldCheck className="h-4 w-4 text-success" />}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Star className="h-3 w-3 fill-warning text-warning" />{(r.rating ?? 5).toFixed(1)} · plate {r.plate ?? "—"}
                        {shop?.lat && r.current_lat && <span>· {distanceKm({lat: shop.lat, lng: shop.lng},{lat: r.current_lat, lng: r.current_lng}).toFixed(1)} km</span>}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => assignRider(r.id)}>Assign</Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border bg-card p-4 text-sm">
            <Row label="Subtotal" v={formatKES(Number(order.subtotal))} />
            <Row label="Delivery" v={formatKES(Number(order.delivery_fee))} />
            <div className="my-2 border-t" />
            <Row label="Total" v={formatKES(Number(order.subtotal) + Number(order.delivery_fee))} bold />
          </div>
          {shop?.lipa_number && (
            <div className="rounded-2xl border bg-card p-4 text-sm">
              <h4 className="font-semibold">Pay the shop</h4>
              <p className="mt-1 text-xs text-muted-foreground">Lipa Number</p>
              <p className="text-lg font-bold">{shop.lipa_number}</p>
              {shop.qr_code_url && <a href={shop.qr_code_url} target="_blank" className="mt-2 block text-xs text-primary underline">Open QR</a>}
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}><span className="text-muted-foreground">{label}</span><span>{v}</span></div>;
}
