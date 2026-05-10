import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useCart, cart } from "@/lib/cart";
import { computeFare, distanceKm, etaMinutes, formatTSh } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MapPin, Plus } from "lucide-react";

export const Route = createFileRoute("/checkout")({ component: Checkout });

function Checkout() {
  const items = useCart();
  const nav = useNavigate();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [shop, setShop] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("addresses").select("*").eq("user_id", user.id).then(({ data }) => {
      setAddresses(data ?? []);
      if (data && data.length) setAddressId(data[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (items[0]) supabase.from("shops").select("*").eq("id", items[0].shopId).maybeSingle().then(({ data }) => setShop(data));
  }, [items]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const address = addresses.find((a) => a.id === addressId);

  const fare = useMemo(() => {
    if (!shop?.lat || !address?.lat) return { km: 0, min: 0, fee: 1500 };
    const km = distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: address.lat, lng: address.lng });
    const min = etaMinutes(km);
    return { km, min, fee: computeFare(km, min) };
  }, [shop, address]);

  if (!user) return <AppShell><div className="py-16 text-center"><p>Please sign in to checkout.</p><Button className="mt-3" onClick={() => nav({ to: "/auth/login" })}>Sign in</Button></div></AppShell>;
  if (items.length === 0) return <AppShell><p>Your cart is empty.</p></AppShell>;

  const place = async () => {
    if (!addressId) return toast.error("Pick a delivery address");
    setBusy(true);
    const { data: order, error } = await supabase.from("orders").insert({
      client_id: user.id,
      shop_id: items[0].shopId,
      address_id: addressId,
      subtotal,
      delivery_fee: fare.fee,
      distance_km: fare.km,
      eta_min: fare.min,
    }).select("*").single();

    if (error || !order) { setBusy(false); return toast.error(error?.message ?? "Failed"); }

    const itemRows = items.map((i) => ({ order_id: order.id, product_id: i.productId, qty: i.qty, price: i.price }));
    await supabase.from("order_items").insert(itemRows);

    cart.clear();
    setBusy(false);
    toast.success("Order placed");
    nav({ to: "/orders/$orderId", params: { orderId: order.id } });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 font-semibold">Deliver to</h3>
            {addresses.length === 0 ? (
              <Button variant="outline" onClick={() => nav({ to: "/account/addresses" })}><Plus className="mr-1 h-4 w-4" /> Add address</Button>
            ) : (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <button key={a.id} onClick={() => setAddressId(a.id)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${addressId === a.id ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}>
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">{a.label}</div>
                      <div className="text-xs text-muted-foreground">{a.street ?? `${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}`}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 font-semibold">Pay the shop</h3>
            <p className="text-sm text-muted-foreground">After we place the order, pay the shop directly:</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Lipa Number</p>
                <p className="text-xl font-bold">{shop?.lipa_number ?? "—"}</p>
              </div>
              <div className="grid place-items-center rounded-xl border p-3">
                {shop?.qr_code_url ? (
                  <img src={shop.qr_code_url} alt="QR" className="h-28 w-28 object-contain" />
                ) : (
                  <p className="text-xs text-muted-foreground">No QR uploaded</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Scan to pay</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border bg-card p-4 lg:sticky lg:top-20 lg:self-start">
          <h3 className="font-semibold">Summary</h3>
          <div className="mt-3 space-y-1 text-sm">
            <Row label="Subtotal" v={formatKES(subtotal)} />
            <Row label={`Delivery (${fare.km.toFixed(1)} km · ${fare.min} min)`} v={formatKES(fare.fee)} />
            <div className="my-2 border-t" />
            <Row label="Total" v={formatKES(subtotal + fare.fee)} bold />
          </div>
          <Button className="mt-4 w-full" onClick={place} disabled={busy}>{busy ? "Placing…" : "Place order"}</Button>
          <p className="mt-2 text-xs text-muted-foreground">Min delivery fee TSh 1,500.</p>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span><span>{v}</span>
    </div>
  );
}
