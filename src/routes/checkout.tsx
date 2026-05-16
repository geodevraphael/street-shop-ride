import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useCart, cart } from "@/lib/cart";
import { computeFare, distanceKm, etaMinutes, formatKES } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MapPin, Plus, Locate, Loader2 } from "lucide-react";
import { AddressWizard } from "@/routes/account.addresses";

export const Route = createFileRoute("/checkout")({ component: Checkout });

type Tables = Database["public"]["Tables"];
type Address = Tables["addresses"]["Row"];
type Shop = Tables["shops"]["Row"];

function Checkout() {
  const items = useCart();
  const nav = useNavigate();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const loadAddresses = () => {
    if (!user) return;
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAddresses(data ?? []);
        if (data && data.length && !addressId) setAddressId(data[0].id);
      });
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const useCurrentLocation = () => {
    if (!user) return;
    if (!navigator.geolocation) return toast.error("Geolocation haitumiki");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        const street = `GPS ±${Math.round(p.coords.accuracy)}m`;
        // Reuse the existing "Eneo langu sasa" record instead of creating duplicates
        const existing = addresses.find((a) => a.label === "Eneo langu sasa");
        if (existing) {
          const { data, error } = await supabase
            .from("addresses")
            .update({ lat, lng, street })
            .eq("id", existing.id)
            .select("*")
            .single();
          setLocating(false);
          if (error || !data) return toast.error(error?.message ?? "Imeshindikana");
          toast.success("Eneo limesasishwa");
          setAddresses((prev) => prev.map((a) => (a.id === data.id ? data : a)));
          setAddressId(data.id);
          return;
        }
        const { data, error } = await supabase
          .from("addresses")
          .insert({
            user_id: user.id,
            label: "Eneo langu sasa",
            lat,
            lng,
            street,
          })
          .select("*")
          .single();
        setLocating(false);
        if (error || !data) return toast.error(error?.message ?? "Imeshindikana");
        toast.success("Eneo limeongezwa");
        setAddresses((prev) => [data, ...prev]);
        setAddressId(data.id);
      },
      (err) => {
        setLocating(false);
        toast.error(err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  useEffect(() => {
    if (items[0])
      supabase
        .from("shops")
        .select("*")
        .eq("id", items[0].shopId)
        .maybeSingle()
        .then(({ data }) => setShop(data));
  }, [items]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const address = addresses.find((a) => a.id === addressId);

  const fare = useMemo(() => {
    if (shop?.lat == null || shop?.lng == null || address?.lat == null || address?.lng == null) {
      return { km: 0, min: 0, fee: 1500 };
    }
    const km = distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: address.lat, lng: address.lng });
    const min = etaMinutes(km);
    return { km, min, fee: computeFare(km, min) };
  }, [shop, address]);

  if (!user)
    return (
      <AppShell>
        <div className="py-16 text-center">
          <p>Please sign in to checkout.</p>
          <Button className="mt-3" onClick={() => nav({ to: "/auth/login" })}>
            Sign in
          </Button>
        </div>
      </AppShell>
    );
  if (items.length === 0)
    return (
      <AppShell>
        <p>Your cart is empty.</p>
      </AppShell>
    );

  const place = async () => {
    if (!addressId) return toast.error("Pick a delivery address");
    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        client_id: user.id,
        shop_id: items[0].shopId,
        address_id: addressId,
        subtotal,
        delivery_fee: fare.fee,
        distance_km: fare.km,
        eta_min: fare.min,
      })
      .select("*")
      .single();

    if (error || !order) {
      setBusy(false);
      return toast.error(error?.message ?? "Failed");
    }

    const itemRows = items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      qty: i.qty,
      price: i.price,
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      setBusy(false);
      return toast.error(itemsError.message);
    }

    cart.clear();
    setBusy(false);
    toast.success("Oda imewekwa. Subiri muuzaji aikubali.");
    nav({ to: "/orders/$orderId", params: { orderId: order.id } });
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Deliver to</h3>
              <span className="text-xs text-muted-foreground">{addresses.length} hifadhi</span>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={useCurrentLocation}
                disabled={locating}
                className="gap-1.5"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Locate className="h-4 w-4" />
                )}
                Tumia eneo langu sasa
              </Button>
              <AddressWizard
                userId={user.id}
                onDone={loadAddresses}
                trigger={
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" /> Ongeza eneo
                  </Button>
                }
              />
            </div>

            {addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bado huna eneo lolote lililohifadhiwa. Tumia GPS au ongeza moja.
              </p>
            ) : (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAddressId(a.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${addressId === a.id ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">{a.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.street ?? `${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 font-semibold">Malipo baada ya oda kukubaliwa</h3>
            <p className="text-sm text-muted-foreground">
              Weka oda kwanza. Muuzaji akiikubali, utalipa kiasi kamili na kutuma proof/reference
              kwenye ukurasa wa oda.
            </p>
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
            <Row
              label={`Delivery (${fare.km.toFixed(1)} km · ${fare.min} min)`}
              v={formatKES(fare.fee)}
            />
            <div className="my-2 border-t" />
            <Row label="Total" v={formatKES(subtotal + fare.fee)} bold />
          </div>
          <Button className="mt-4 w-full" onClick={place} disabled={busy}>
            {busy ? "Inaweka oda..." : "Weka oda"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Min delivery fee TSh 1,500.</p>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{v}</span>
    </div>
  );
}
