import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { OrderTimeline } from "@/components/OrderTimeline";
import { ContactActions } from "@/components/ContactActions";
import { Button } from "@/components/ui/button";
import { formatKES, distanceKm } from "@/lib/pricing";
import {
  Bike,
  Star,
  ShieldCheck,
  MapPin,
  Copy,
  XCircle,
  RefreshCcw,
  ExternalLink,
  PackageCheck,
  Truck,
  CheckCircle2,
  CreditCard,
  Search,
  Check,
  LoaderCircle,
  BadgeCheck,
  UserRound,
} from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import { PaymentProofDialog } from "@/components/PaymentProofDialog";
import { TrackingMap } from "@/components/TrackingMap";
import { useTrackOrder } from "@/lib/tracking";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$orderId")({ component: OrderDetail });

type Tables = Database["public"]["Tables"];
type Order = Tables["orders"]["Row"];
type OrderStatus = Order["status"];
type OrderItem = Tables["order_items"]["Row"] & { products: { name: string | null } | null };
type Shop = Tables["shops"]["Row"];
type Address = Tables["addresses"]["Row"];
type Rider = Tables["riders"]["Row"];
type ProfileContact = Pick<Tables["profiles"]["Row"], "full_name" | "phone">;

const ACTIVE_ORDER_STATUSES = [
  "placed",
  "accepted",
  "payment_submitted",
  "payment_confirmed",
  "rider_assigned",
  "picked_up",
  "delivered",
] as const;

function hasPoint(lat?: number | null, lng?: number | null): lat is number {
  return lat != null && lng != null;
}

function buildMapsUrl({
  shop,
  destination,
  rider,
}: {
  shop?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  rider?: { lat: number; lng: number } | null;
}) {
  if (shop && destination) {
    return `https://www.google.com/maps/dir/?api=1&origin=${shop.lat},${shop.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  }
  if (rider) {
    return `https://www.google.com/maps/search/?api=1&query=${rider.lat},${rider.lng}`;
  }
  if (destination) {
    return `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lng}`;
  }
  if (shop) {
    return `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`;
  }
  return null;
}

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading, ready: authReady } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);
  const [riderPhone, setRiderPhone] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<ProfileContact | null>(null);
  const [sellerProfile, setSellerProfile] = useState<ProfileContact | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [searchingRiders, setSearchingRiders] = useState(false);
  const [clientPos, setClientPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [trackBusy, setTrackBusy] = useState(false);
  const [trackReady, setTrackReady] = useState(false);
  const trackTimeoutRef = useRef<number | null>(null);

  // Role precedence on this order: client > seller > rider.
  // If you placed the order, you're the buyer here â€” even if you also own the
  // shop or ride. Seller/rider actions for self-orders happen on their own
  // dashboards (/seller/orders, /rider). This prevents the buyer view from
  // disappearing when a seller buys from their own shop.
  const isClient = !!(user && order && order.client_id === user.id);
  const isSeller = !!(user && shop && shop.owner_id === user.id) && !isClient;
  const isRider = !!(user && rider && rider.user_id === user.id) && !isClient && !isSeller;

  const trackingActive =
    order &&
    ["payment_confirmed", "rider_assigned", "picked_up", "delivered"].includes(order.status);
  const liveRider = useTrackOrder(trackingActive ? orderId : null);
  const canCancel = order && (order.status === "placed" || order.status === "accepted");

  const load = async () => {
    if (!user) {
      setOrder(null);
      setLoadingOrder(false);
      return;
    }

    setLoadingOrder(true);
    const { data: o, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) {
      setLoadingOrder(false);
      toast.error(orderError.message);
      return;
    }

    setOrder(o);
    if (!o) {
      setLoadingOrder(false);
      return;
    }

    const [i, s, a, r, cp] = await Promise.all([
      supabase.from("order_items").select("*, products(name)").eq("order_id", orderId),
      supabase.from("shops").select("*").eq("id", o.shop_id).maybeSingle(),
      o.address_id
        ? supabase.from("addresses").select("*").eq("id", o.address_id).maybeSingle()
        : Promise.resolve({ data: null }),
      o.rider_id
        ? supabase.from("riders").select("*").eq("id", o.rider_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("profiles").select("full_name, phone").eq("id", o.client_id).maybeSingle(),
    ]);
    setItems((i.data ?? []) as OrderItem[]);
    setShop(s.data);
    setAddress(a.data);
    setRider(r.data);
    setClientProfile(cp.data);
    if (s.data?.owner_id) {
      const { data: sp } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", s.data.owner_id)
        .maybeSingle();
      setSellerProfile(sp);
    }
    if (r.data?.user_id) {
      const { data: rp } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", r.data.user_id)
        .maybeSingle();
      setRiderPhone(rp?.phone ?? null);
    } else {
      setRiderPhone(null);
    }
    setLoadingOrder(false);
  };

  useEffect(() => {
    if (authLoading) return;
    load();
    /* eslint-disable-next-line */
  }, [orderId, authLoading, user?.id]);

  // Realtime: refresh on any update to this order
  useEffect(() => {
    const ch = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line
  }, [orderId]);

  useEffect(() => {
    if (!trackingActive || !isClient || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setClientPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [trackingActive, isClient]);

  useEffect(() => {
    setTrackReady(false);
    if (trackTimeoutRef.current) window.clearTimeout(trackTimeoutRef.current);
    if (!trackingActive) return;

    trackTimeoutRef.current = window.setTimeout(() => {
      setTrackReady(true);
      setTrackBusy(false);
    }, 250);

    return () => {
      if (trackTimeoutRef.current) window.clearTimeout(trackTimeoutRef.current);
    };
  }, [trackingActive, order?.status, authReady]);

  const openTracking = () => {
    setTrackBusy(true);
    document.getElementById("track-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      setTrackBusy(false);
      setTrackReady(true);
    }, 450);
  };

  const roleInfo = useMemo(() => {
    if (isClient) {
      return {
        label: "Mteja",
        title: "Unafanya hatua za mnunuzi kwenye oda hii",
        note:
          "Ndiyo maana unaweza kubofya Fuatilia, kutuma ushahidi wa malipo, na kuthibitisha umepokea mzigo inapofika.",
        tone: "bg-primary/10 text-primary border-primary/20",
        icon: UserRound,
      };
    }

    if (isSeller) {
      return {
        label: "Muuzaji",
        title: `Unafanya hatua za duka ${shop?.name ?? "hili"}`,
        note:
          "Hapa utaona vitendo vya kukubali oda, kuthibitisha malipo, na kumpa boda mzigo. Hatua za mteja zimefichwa kwako kwenye oda hii.",
        tone: "bg-accent/60 text-accent-foreground border-accent/30",
        icon: StoreRoleIcon,
      };
    }

    if (isRider) {
      return {
        label: "Boda",
        title: "Unafanya hatua za usafirishaji kwenye oda hii",
        note:
          "Hapa utaona kuokota mzigo, kusasisha safari, na kuthibitisha umefikisha. Fuatilia ya mteja haionekani kama wewe si mnunuzi wa oda hii.",
        tone: "bg-warning/15 text-warning-foreground border-warning/30",
        icon: Bike,
      };
    }

    return {
      label: "Mtazamaji",
      title: "Role yako haijatambuliwa kwenye oda hii",
      note:
        "Kama ulipaswa kuona vitendo vya oda, fungua ukiwa umeingia na account iliyoweka oda au yenye jukumu la oda hii.",
      tone: "bg-secondary text-secondary-foreground border-border",
      icon: BadgeCheck,
    };
  }, [isClient, isSeller, isRider, shop?.name]);

  const updateStatus = async (status: OrderStatus, extra: Partial<Order> = {}) => {
    setBusy(true);
    const patch: Partial<Order> = { status, ...extra };
    if (status === "payment_submitted" && !patch.payment_submitted_at)
      patch.payment_submitted_at = new Date().toISOString();
    if (status === "payment_confirmed") patch.payment_confirmed_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Imehifadhiwa");
    load();
  };

  const cancelOrder = async () => {
    if (!confirm("Una uhakika unataka kughairi oda hii?")) return;
    await updateStatus("cancelled");
  };

  const findRiders = async () => {
    setSearchingRiders(true);
    const { data } = await supabase.from("riders").select("*").eq("available", true);
    let list = data ?? [];
    if (shop?.lat) {
      list = [...list].sort((a, b) => {
        const da =
          a.current_lat != null && a.current_lng != null
            ? distanceKm(
                { lat: shop.lat, lng: shop.lng },
                { lat: a.current_lat, lng: a.current_lng },
              )
            : 9999;
        const db =
          b.current_lat != null && b.current_lng != null
            ? distanceKm(
                { lat: shop.lat, lng: shop.lng },
                { lat: b.current_lat, lng: b.current_lng },
              )
            : 9999;
        return da - db;
      });
    }
    setRiders(list.slice(0, 8));
    setSearchingRiders(false);
  };

  const assignRider = async (riderId: string) => {
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ rider_id: riderId, status: "rider_assigned" })
      .eq("id", orderId);
    if (!error) await supabase.from("riders").update({ available: false }).eq("id", riderId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Boda imekabidhiwa");
    setRiders([]);
    load();
  };

  if (authLoading || loadingOrder)
    return (
      <AppShell>
        <p>Inapakiaâ€¦</p>
      </AppShell>
    );
  if (!user)
    return (
      <AppShell>
        <p>Ingia ili uone oda hii.</p>
      </AppShell>
    );
  if (!order)
    return (
      <AppShell>
        <p>Oda hii haijapatikana au huna ruhusa ya kuiona.</p>
      </AppShell>
    );

  const riderPos =
    liveRider ?? (rider?.current_lat ? { lat: rider.current_lat, lng: rider.current_lng } : null);
  const shopPos = shop?.lat != null && shop?.lng != null ? { lat: shop.lat, lng: shop.lng } : null;
  const destinationPos =
    address?.lat != null && address?.lng != null ? { lat: address.lat, lng: address.lng } : null;
  const orderTag = `Oda #${order.id.slice(0, 8)}`;
  const orderTotal = Number(order.subtotal) + Number(order.delivery_fee);
  const mapUrl = buildMapsUrl({ shop: shopPos, destination: destinationPos, rider: riderPos });

  // Quick-contact: the most relevant other party for the current user, right now
  const quickContact = (() => {
    if (isClient) {
      if (rider && riderPhone)
        return {
          phone: riderPhone,
          label: "boda",
          title: `Boda Â· ${rider.full_name ?? ""} ${rider.plate ? `(${rider.plate})` : ""}`,
        };
      if (sellerProfile?.phone)
        return {
          phone: sellerProfile.phone,
          label: "muuzaji",
          title: `Muuzaji Â· ${shop?.name ?? ""}`,
        };
    }
    if (isSeller) {
      if (rider && riderPhone)
        return { phone: riderPhone, label: "boda", title: `Boda Â· ${rider.full_name ?? ""}` };
      if (clientProfile?.phone)
        return {
          phone: clientProfile.phone,
          label: "mteja",
          title: `Mteja Â· ${clientProfile.full_name ?? ""}`,
        };
    }
    if (isRider) {
      if (clientProfile?.phone)
        return {
          phone: clientProfile.phone,
          label: "mteja",
          title: `Mteja Â· ${clientProfile.full_name ?? ""}`,
        };
      if (sellerProfile?.phone)
        return {
          phone: sellerProfile.phone,
          label: "muuzaji",
          title: `Muuzaji Â· ${shop?.name ?? ""}`,
        };
    }
    return null;
  })();

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Oda</h1>
            {isSeller && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                Muuzaji
              </span>
            )}
            {isClient && !isSeller && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                Mteja
              </span>
            )}
            {isRider && (
              <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning-foreground">
                Boda
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            #{order.id.slice(0, 8)} Â· {new Date(order.created_at).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSeller && (
              <>
                Unaona oda hii kama <b>muuzaji wa {shop?.name}</b>. Hatua zote hapa chini ni zako
                kama muuzaji.
              </>
            )}
            {isClient && !isSeller && (
              <>
                Unaona oda hii kama <b>mteja</b>. Fuata hatua zako hapa chini.
              </>
            )}
            {isRider && (
              <>
                Unaona oda hii kama <b>boda</b>. Fuata hatua zako hapa chini.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={load} title="Onyesha mpya">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <OrderStatusPill status={order.status} />
        </div>
      </div>

      {quickContact && (
        <div className="mt-4 rounded-2xl border bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            {isSeller ? "Wasiliana na" : isRider ? "Wasiliana na" : "Mawasiliano ya haraka"}
          </p>
          <p className="text-sm font-semibold">{quickContact.title}</p>
          <div className="mt-2">
            <ContactActions
              phone={quickContact.phone}
              label={quickContact.label}
              message={orderTag}
            />
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {/* Next-action panel */}
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="mb-3 font-semibold">Hatua inayofuata</h3>

            {order.status === "cancelled" && (
              <p className="text-sm text-destructive">Oda hii imeghairiwa.</p>
            )}

            {/* CLIENT actions â€” kila status ina kitufe au taarifa wazi */}
            {isClient &&
              (() => {
                const steps = [
                  "placed",
                  "accepted",
                  "payment_submitted",
                  "payment_confirmed",
                  "rider_assigned",
                  "picked_up",
                  "delivered",
                  "completed",
                ];
                const idx = steps.indexOf(order.status);
                const stepLabel = idx >= 0 ? `Hatua ${idx + 1} ya ${steps.length}` : null;
                const scrollToMap = () =>
                  document
                    .getElementById("track-map")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                return (
                  <div className="space-y-3">
                    {stepLabel && (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {stepLabel}
                      </p>
                    )}

                    {order.status === "placed" && (
                      <div className="space-y-2">
                        <p className="text-sm">â³ Tunamsubiri muuzaji akubali oda yako.</p>
                        {sellerProfile?.phone && (
                          <ContactActions
                            phone={sellerProfile.phone}
                            label="muuzaji"
                            message={`${orderTag} â€” naomba ukubali oda yangu tafadhali`}
                          />
                        )}
                        <Button variant="outline" size="sm" disabled={busy} onClick={cancelOrder}>
                          Ghairi oda
                        </Button>
                      </div>
                    )}

                    {order.status === "accepted" && (
                      <div className="space-y-3">
                        <p className="text-sm">
                          Muuzaji amekubali. <b>Lipa sasa</b> kisha tuma uthibitisho wa malipo ili
                          muuzaji aanze delivery.
                        </p>
                        {shop?.lipa_number ? (
                          <div className="rounded-xl border bg-primary/5 p-3">
                            <p className="text-xs text-muted-foreground">Lipa Number (M-Pesa)</p>
                            <div className="flex items-center gap-2">
                              <p className="text-2xl font-bold">{shop.lipa_number}</p>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(shop.lipa_number);
                                  toast.success("Imenakiliwa");
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Kiasi cha kulipa: <b>{formatKES(orderTotal)}</b>
                            </p>
                            {shop.qr_code_url && (
                              <img
                                src={shop.qr_code_url}
                                alt="QR"
                                className="mt-2 h-32 w-32 object-contain"
                              />
                            )}
                          </div>
                        ) : (
                          <p className="rounded-xl border bg-warning/10 p-3 text-xs text-muted-foreground">
                            Duka halijaweka namba ya Lipa. Wasiliana na muuzaji moja kwa moja
                            kupanga malipo.
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <PaymentProofDialog
                            orderId={orderId}
                            userId={user.id}
                            onSubmitted={load}
                          />
                        </div>
                      </div>
                    )}

                    {order.status === "payment_submitted" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          ðŸ“¨ Uthibitisho umetumwa. Tunamsubiri muuzaji athibitishe malipo.
                        </p>
                        {sellerProfile?.phone && (
                          <ContactActions
                            phone={sellerProfile.phone}
                            label="muuzaji"
                            message={`${orderTag} â€” nimelipa, tafadhali thibitisha`}
                          />
                        )}
                      </div>
                    )}

                    {order.status === "payment_confirmed" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          ðŸ’° Malipo yamethibitishwa. Muuzaji anatafuta bodaâ€¦
                        </p>
                        {sellerProfile?.phone && (
                          <ContactActions
                            phone={sellerProfile.phone}
                            label="muuzaji"
                            message={`${orderTag} â€” naomba upange boda`}
                          />
                        )}
                      </div>
                    )}

                    {order.status === "rider_assigned" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          ðŸ›µ Boda <b>{rider?.full_name ?? "rider"}</b>{" "}
                          {rider?.plate ? `(${rider.plate})` : ""} amekabidhiwa. Inasubiri kuokota
                          bidhaa dukani.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={scrollToMap}>
                            Fuatilia kwenye ramani
                          </Button>
                          {riderPhone && (
                            <ContactActions phone={riderPhone} label="boda" message={orderTag} />
                          )}
                        </div>
                      </div>
                    )}

                    {order.status === "picked_up" && (
                      <div className="space-y-2">
                        <p className="text-sm">ðŸ“¦ Bidhaa iko njiani kuja kwako!</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="lg" onClick={scrollToMap}>
                            Fuatilia boda kwenye ramani
                          </Button>
                          {riderPhone && (
                            <ContactActions phone={riderPhone} label="boda" message={orderTag} />
                          )}
                        </div>
                      </div>
                    )}

                    {order.status === "delivered" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          ðŸ“¬ Boda anasema amekufikishia. Thibitisha umepokea bidhaa.
                        </p>
                        <Button size="lg" disabled={busy} onClick={() => updateStatus("completed")}>
                          âœ“ Nimepokea bidhaa â€” kamilisha
                        </Button>
                        {riderPhone && (
                          <ContactActions
                            phone={riderPhone}
                            label="boda"
                            message={`${orderTag} â€” sijaipokea bado`}
                          />
                        )}
                      </div>
                    )}

                    {order.status === "completed" && (
                      <p className="text-sm text-success">ðŸŽ‰ Asante! Oda imekamilika.</p>
                    )}
                  </div>
                );
              })()}
            {/* SELLER actions */}
            {isSeller && order.status === "placed" && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  className="h-12 gap-2"
                  disabled={busy}
                  onClick={() => updateStatus("accepted")}
                >
                  <Check className="h-5 w-5" />
                  Kubali oda
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2 text-destructive"
                  disabled={busy}
                  onClick={cancelOrder}
                >
                  <XCircle className="h-5 w-5" />
                  Kataa oda
                </Button>
              </div>
            )}
            {isSeller && order.status === "accepted" && (
              <div className="space-y-4">
                <div className="rounded-xl border bg-secondary/50 p-4">
                  <p className="text-sm font-medium">
                    Oda imekubaliwa. Sasa tunamsubiri mteja alipe na kutuma proof/reference ya
                    malipo.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ukishapata proof, hatua ya kuhakiki malipo itaonekana hapa moja kwa moja.
                  </p>
                </div>
              </div>
            )}
            {isSeller && order.status === "payment_submitted" && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <CreditCard className="h-5 w-5" />
                  Mteja amesema amelipa. Hakiki:
                </p>
                {order.payment_ref && (
                  <div className="rounded-xl border-2 border-primary/10 bg-secondary/30 p-3 text-sm">
                    <span className="text-xs text-muted-foreground block uppercase font-bold">
                      Namba ya muamala
                    </span>
                    <b className="text-lg">{order.payment_ref}</b>
                  </div>
                )}
                {order.payment_proof_url && (
                  <a
                    href={order.payment_proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block group relative"
                  >
                    <img
                      src={order.payment_proof_url}
                      alt="proof"
                      className="max-h-60 rounded-xl border w-full object-cover transition-opacity group-hover:opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="secondary" size="sm" className="gap-1">
                        <ExternalLink className="h-4 w-4" /> Fungua
                      </Button>
                    </div>
                  </a>
                )}
                {!order.payment_ref && !order.payment_proof_url && (
                  <p className="rounded-xl border bg-warning/10 p-3 text-sm text-muted-foreground">
                    Hakuna proof iliyoambatishwa. Rudisha kwa mteja aweke reference au picha ya
                    risiti.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    className="h-12 gap-2"
                    disabled={busy}
                    onClick={() => updateStatus("payment_confirmed")}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Kubali malipo
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 gap-2"
                    disabled={busy}
                    onClick={() =>
                      updateStatus("accepted", {
                        payment_ref: null,
                        payment_proof_url: null,
                        payment_submitted_at: null,
                      })
                    }
                  >
                    <XCircle className="h-5 w-5" />
                    Kataa proof
                  </Button>
                </div>
              </div>
            )}
            {isSeller && order.status === "payment_confirmed" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 p-4 text-sm text-primary font-medium">
                  <Bike className="h-5 w-5" />
                  <p>Malipo yamethibitishwa. Sasa tafuta boda boda kumkabidhi bidhaa.</p>
                </div>
                <Button
                  size="lg"
                  className="h-12 w-full gap-2 shadow-md shadow-primary/20"
                  onClick={findRiders}
                >
                  <Search className="h-5 w-5" />
                  Tafuta boda karibu nawe
                </Button>
                {searchingRiders && (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCcw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                {riders.length > 0 && (
                  <div className="grid gap-2 mt-2">
                    {riders.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-xl border bg-card p-4 transition hover:border-primary/50 hover:bg-primary/5 group"
                      >
                        <div>
                          <div className="flex items-center gap-2 font-bold group-hover:text-primary transition-colors">
                            {r.full_name ?? "Rider"}
                            {r.license_verified && (
                              <ShieldCheck className="h-4 w-4 text-success fill-success/10" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              {(r.rating ?? 5).toFixed(1)}
                            </span>
                            <span>{r.plate ?? "â€”"}</span>
                            {shop?.lat && r.current_lat && (
                              <span className="font-medium text-primary">
                                {distanceKm(
                                  { lat: shop.lat, lng: shop.lng },
                                  { lat: r.current_lat, lng: r.current_lng },
                                ).toFixed(1)}{" "}
                                km
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-full h-10 px-6 font-bold"
                          disabled={busy}
                          onClick={() => assignRider(r.id)}
                        >
                          Chagua
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isSeller && order.status === "rider_assigned" && (
              <Button
                size="lg"
                className="h-14 w-full gap-2 text-lg font-bold shadow-lg shadow-primary/20"
                disabled={busy}
                onClick={() => updateStatus("picked_up")}
              >
                <PackageCheck className="h-6 w-6" />
                Nimemkabidhi boda
              </Button>
            )}
            {isSeller && order.status === "picked_up" && (
              <div className="flex items-center gap-3 rounded-xl bg-warning/10 p-4 text-sm text-warning-foreground font-medium">
                <Truck className="h-6 w-6 animate-pulse" />
                <p>Bidhaa iko njiani kuelekea kwa mteja.</p>
              </div>
            )}
            {isSeller && order.status === "delivered" && (
              <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p>Bidhaa imefika. Tunamsubiri mteja athibitishe upokeaji.</p>
              </div>
            )}

            {/* RIDER actions */}
            {isRider && order.status === "rider_assigned" && (
              <Button
                size="lg"
                className="h-16 w-full gap-3 text-xl font-black shadow-xl shadow-primary/30"
                disabled={busy}
                onClick={() => updateStatus("picked_up")}
              >
                <PackageCheck className="h-7 w-7" />
                Nimeokota bidhaa â€” anza safari
              </Button>
            )}
            {isRider && order.status === "picked_up" && (
              <Button
                size="lg"
                className="h-16 w-full gap-3 text-xl font-black bg-success hover:bg-success/90 shadow-xl shadow-success/30"
                disabled={busy}
                onClick={() => updateStatus("delivered")}
              >
                <CheckCircle2 className="h-7 w-7" />
                Nimemfikishia mteja
              </Button>
            )}

            {canCancel && (isClient || isSeller) && order.status !== "cancelled" && (
              <button
                onClick={cancelOrder}
                className="mt-4 flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <XCircle className="h-3.5 w-3.5" /> Ghairi oda
              </button>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="mb-3 font-semibold">Hatua za oda</h3>
            <OrderTimeline status={order.status} />
          </section>

          {/* Live tracking map */}
          {trackingActive && (
            <section id="track-map" className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4 text-primary" /> Fuatilia kwenye ramani
                </h3>
                {mapUrl && (
                  <Button asChild size="sm" variant="outline">
                    <a href={mapUrl} target="_blank" rel="noreferrer" className="gap-1.5">
                      Fungua ramani
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </div>
              <TrackingMap
                shop={shopPos}
                destination={destinationPos}
                client={clientPos}
                rider={riderPos}
                height={340}
              />
              {!liveRider && (
                <p className="mt-2 text-xs text-muted-foreground">Inasubiri ishara ya bodaâ€¦</p>
              )}
              {liveRider && (
                <p className="mt-2 text-xs text-success">Boda inaonekana moja kwa moja</p>
              )}
            </section>
          )}

          <section className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Bidhaa</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span>
                    {i.qty}Ã— {i.products?.name}
                  </span>
                  <span>{formatKES(Number(i.price) * i.qty)}</span>
                </li>
              ))}
            </ul>
          </section>

          {order.rider_id && <ReportDialog targetType="rider" targetId={order.rider_id} />}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-card p-4 text-sm">
            <Row label="Jumla ndogo" v={formatKES(Number(order.subtotal))} />
            <Row label="Usafirishaji" v={formatKES(Number(order.delivery_fee))} />
            <div className="my-2 border-t" />
            <Row label="Jumla" v={formatKES(orderTotal)} bold />
          </div>

          <div className="rounded-2xl border bg-card p-4 text-sm">
            <p className="text-muted-foreground">
              Kutoka <b className="text-foreground">{shop?.name}</b>
            </p>
            <p className="mt-1 text-muted-foreground">
              Hadi <b className="text-foreground">{address?.label ?? "â€”"}</b>
            </p>
            {order.distance_km && (
              <p className="mt-1 text-xs text-muted-foreground">
                {Number(order.distance_km).toFixed(1)} km Â· {order.eta_min} min
              </p>
            )}
          </div>

          {/* Contacts: show the OTHER parties to the current user */}
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Mawasiliano</h3>
            <div className="space-y-3 text-sm">
              {!isClient && clientProfile?.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Mteja Â· {clientProfile.full_name ?? ""}
                  </p>
                  <ContactActions phone={clientProfile.phone} label="mteja" message={orderTag} />
                </div>
              )}
              {!isSeller && sellerProfile?.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Muuzaji Â· {shop?.name}</p>
                  <ContactActions phone={sellerProfile.phone} label="muuzaji" message={orderTag} />
                </div>
              )}
              {rider && !isRider && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Boda Â· {rider.full_name ?? ""} {rider.plate ? `(${rider.plate})` : ""}
                  </p>
                  <ContactActions phone={riderPhone} label="boda" message={orderTag} />
                </div>
              )}
              {(isClient && !sellerProfile?.phone && !rider) ||
              (isSeller && !clientProfile?.phone) ? (
                <p className="text-xs text-muted-foreground">
                  Hakuna mawasiliano yaliyowekwa bado.
                </p>
              ) : null}
            </div>
          </div>
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
