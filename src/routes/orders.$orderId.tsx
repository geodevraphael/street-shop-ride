import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { Button } from "@/components/ui/button";
import { formatKES, distanceKm } from "@/lib/pricing";
import { Bike, Star, ShieldCheck, MapPin } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import { PaymentProofDialog } from "@/components/PaymentProofDialog";
import { TrackingMap } from "@/components/TrackingMap";
import { useTrackOrder } from "@/lib/tracking";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$orderId")({ component: OrderDetail });

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [rider, setRider] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [searchingRiders, setSearchingRiders] = useState(false);
  const [clientPos, setClientPos] = useState<{ lat: number; lng: number } | null>(null);

  const isClient = user && order && order.client_id === user.id;
  const isSeller = user && shop && shop.owner_id === user.id;

  const trackingActive = order && ["picked_up", "delivered"].includes(order.status);
  const liveRider = useTrackOrder(trackingActive ? orderId : null);

  const load = async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    setOrder(o);
    if (o) {
      const [i, s, a, r] = await Promise.all([
        supabase.from("order_items").select("*, products(name)").eq("order_id", orderId),
        supabase.from("shops").select("*").eq("id", o.shop_id).maybeSingle(),
        o.address_id ? supabase.from("addresses").select("*").eq("id", o.address_id).maybeSingle() : Promise.resolve({ data: null }),
        o.rider_id ? supabase.from("riders").select("*").eq("id", o.rider_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setItems(i.data ?? []); setShop(s.data); setAddress(a.data); setRider(r.data);
    }
  };
  useEffect(() => { load(); }, [orderId]);

  // Client live position when tracking
  useEffect(() => {
    if (!trackingActive || !isClient || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setClientPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [trackingActive, isClient]);

  const updateStatus = async (status: string) => {
    const patch: any = { status };
    if (status === "payment_confirmed") patch.payment_confirmed_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Imehifadhiwa"); load();
  };

  const findRiders = async () => {
    setSearchingRiders(true);
    const { data } = await supabase.from("riders").select("*").eq("available", true);
    let list = data ?? [];
    if (shop?.lat) {
      list = [...list].sort((a, b) => {
        const da = a.current_lat != null ? distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: a.current_lat, lng: a.current_lng }) : 9999;
        const db = b.current_lat != null ? distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: b.current_lat, lng: b.current_lng }) : 9999;
        return da - db;
      });
    }
    setRiders(list.slice(0, 8));
    setSearchingRiders(false);
  };

  const assignRider = async (riderId: string) => {
    const { error } = await supabase.from("orders").update({ rider_id: riderId, status: "rider_assigned" }).eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Boda imekabidhiwa"); setRiders([]); load();
  };

  if (!order) return <AppShell><p>Inapakia…</p></AppShell>;

  const riderPos = liveRider ?? (rider?.current_lat ? { lat: rider.current_lat, lng: rider.current_lng } : null);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Oda</h1>
          <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {/* Status-driven action panel */}
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Hatua inayofuata</h3>

            {/* CLIENT actions */}
            {isClient && order.status === "placed" && (
              <p className="mt-2 text-sm text-muted-foreground">Subiri muuzaji akubali oda yako.</p>
            )}
            {isClient && order.status === "accepted" && (
              <div className="mt-3 space-y-3">
                <p className="text-sm">Muuzaji amekubali. Lipa kwa M-Pesa kisha thibitisha:</p>
                {shop?.lipa_number && (
                  <div className="rounded-xl border bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground">Lipa Number</p>
                    <p className="text-2xl font-bold">{shop.lipa_number}</p>
                    {shop.qr_code_url && <img src={shop.qr_code_url} alt="QR" className="mt-2 h-32 w-32 object-contain" />}
                  </div>
                )}
                <PaymentProofDialog orderId={orderId} onSubmitted={load} />
              </div>
            )}
            {isClient && order.status === "payment_submitted" && (
              <p className="mt-2 text-sm text-muted-foreground">Asante. Tunasubiri muuzaji athibitishe malipo.</p>
            )}
            {isClient && order.status === "payment_confirmed" && (
              <p className="mt-2 text-sm">Malipo yamethibitishwa. Muuzaji anatafuta boda boda…</p>
            )}
            {isClient && order.status === "rider_assigned" && (
              <p className="mt-2 text-sm">Boda imepatikana. Inasubiri kuokota bidhaa.</p>
            )}
            {isClient && order.status === "delivered" && (
              <Button className="mt-3" onClick={() => updateStatus("completed")}>Nimepokea bidhaa</Button>
            )}

            {/* SELLER actions */}
            {isSeller && order.status === "placed" && (
              <Button className="mt-3" onClick={() => updateStatus("accepted")}>Kubali oda</Button>
            )}
            {isSeller && order.status === "accepted" && (
              <p className="mt-2 text-sm text-muted-foreground">Subiri mteja alipe na atume uthibitisho.</p>
            )}
            {isSeller && order.status === "payment_submitted" && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">Mteja amesema amelipa:</p>
                {order.payment_ref && <p className="text-sm">Namba ya muamala: <b>{order.payment_ref}</b></p>}
                {order.payment_proof_url && (
                  <a href={order.payment_proof_url} target="_blank" rel="noreferrer">
                    <img src={order.payment_proof_url} alt="proof" className="max-h-60 rounded-lg border" />
                  </a>
                )}
                <Button onClick={() => updateStatus("payment_confirmed")}>Thibitisha malipo</Button>
              </div>
            )}
            {isSeller && order.status === "payment_confirmed" && (
              <div className="mt-3 space-y-3">
                <Button onClick={findRiders} className="gap-1.5"><Bike className="h-4 w-4" /> Tafuta boda karibu</Button>
                {searchingRiders && <p className="text-sm text-muted-foreground">Inatafuta…</p>}
                {riders.length > 0 && (
                  <div className="space-y-2">
                    {riders.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <div className="flex items-center gap-2 font-medium">{r.full_name ?? "Rider"} {r.license_verified && <ShieldCheck className="h-4 w-4 text-success" />}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Star className="h-3 w-3 fill-warning text-warning" />{(r.rating ?? 5).toFixed(1)} · {r.plate ?? "—"}
                            {shop?.lat && r.current_lat && <span>· {distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: r.current_lat, lng: r.current_lng }).toFixed(1)} km</span>}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => assignRider(r.id)}>Chagua</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isSeller && order.status === "rider_assigned" && (
              <Button className="mt-3" onClick={() => updateStatus("picked_up")}>Mkabidhi boda — anza usafirishaji</Button>
            )}
            {isSeller && order.status === "picked_up" && (
              <p className="mt-2 text-sm text-muted-foreground">Bidhaa iko njiani. Mteja anaweza kufuatilia kwenye ramani.</p>
            )}

            {/* RIDER actions */}
            {rider && user && rider.user_id === user.id && order.status === "picked_up" && (
              <Button className="mt-3" onClick={() => updateStatus("delivered")}>Nimemfikishia mteja</Button>
            )}
          </section>

          {/* Live tracking map */}
          {trackingActive && (
            <section className="rounded-2xl border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" /> Fuatilia kwenye ramani</h3>
              <TrackingMap
                shop={shop?.lat ? { lat: shop.lat, lng: shop.lng } : null}
                destination={address?.lat ? { lat: address.lat, lng: address.lng } : null}
                client={clientPos}
                rider={riderPos}
                height={340}
              />
              {!liveRider && <p className="mt-2 text-xs text-muted-foreground">Inasubiri ishara ya boda…</p>}
              {liveRider && <p className="mt-2 text-xs text-success">Boda inaonekana moja kwa moja</p>}
            </section>
          )}

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Bidhaa</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.qty}× {i.products?.name}</span>
                  <span>{formatKES(Number(i.price) * i.qty)}</span>
                </li>
              ))}
            </ul>
          </section>

          {order.rider_id && <ReportDialog targetType="rider" targetId={order.rider_id} />}
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border bg-card p-4 text-sm">
            <Row label="Jumla ndogo" v={formatKES(Number(order.subtotal))} />
            <Row label="Usafirishaji" v={formatKES(Number(order.delivery_fee))} />
            <div className="my-2 border-t" />
            <Row label="Jumla" v={formatKES(Number(order.subtotal) + Number(order.delivery_fee))} bold />
          </div>
          <div className="rounded-2xl border bg-card p-4 text-sm">
            <p className="text-muted-foreground">Kutoka <b className="text-foreground">{shop?.name}</b></p>
            <p className="mt-1 text-muted-foreground">Hadi <b className="text-foreground">{address?.label ?? "—"}</b></p>
            {order.distance_km && <p className="mt-1 text-xs text-muted-foreground">{Number(order.distance_km).toFixed(1)} km · {order.eta_min} min</p>}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}><span className="text-muted-foreground">{label}</span><span>{v}</span></div>;
}
