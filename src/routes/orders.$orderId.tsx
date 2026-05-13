import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { OrderTimeline } from "@/components/OrderTimeline";
import { ContactActions } from "@/components/ContactActions";
import { Button } from "@/components/ui/button";
import { formatKES, distanceKm } from "@/lib/pricing";
import { Bike, Star, ShieldCheck, MapPin, Copy, XCircle, RefreshCcw, ExternalLink } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import { PaymentProofDialog } from "@/components/PaymentProofDialog";
import { TrackingMap } from "@/components/TrackingMap";
import { useTrackOrder } from "@/lib/tracking";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$orderId")({ component: OrderDetail });

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
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [rider, setRider] = useState<any>(null);
  const [riderPhone, setRiderPhone] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [searchingRiders, setSearchingRiders] = useState(false);
  const [clientPos, setClientPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Role precedence on this order: client > seller > rider.
  // If you placed the order, you're the buyer here — even if you also own the
  // shop or ride. Seller/rider actions for self-orders happen on their own
  // dashboards (/seller/orders, /rider). This prevents the buyer view from
  // disappearing when a seller buys from their own shop.
  const isClient = !!(user && order && order.client_id === user.id);
  const isSeller = !!(user && shop && shop.owner_id === user.id) && !isClient;
  const isRider = !!(user && rider && rider.user_id === user.id) && !isClient && !isSeller;

  const trackingActive = order && ["payment_confirmed", "rider_assigned", "picked_up", "delivered"].includes(order.status);
  const liveRider = useTrackOrder(trackingActive ? orderId : null);
  const canCancel = order && (order.status === "placed" || order.status === "accepted");

  const load = async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    setOrder(o);
    if (!o) return;
    const [i, s, a, r, cp] = await Promise.all([
      supabase.from("order_items").select("*, products(name)").eq("order_id", orderId),
      supabase.from("shops").select("*").eq("id", o.shop_id).maybeSingle(),
      o.address_id ? supabase.from("addresses").select("*").eq("id", o.address_id).maybeSingle() : Promise.resolve({ data: null } as any),
      o.rider_id ? supabase.from("riders").select("*").eq("id", o.rider_id).maybeSingle() : Promise.resolve({ data: null } as any),
      supabase.from("profiles").select("full_name, phone").eq("id", o.client_id).maybeSingle(),
    ]);
    setItems(i.data ?? []); setShop(s.data); setAddress(a.data); setRider(r.data); setClientProfile(cp.data);
    if (s.data?.owner_id) {
      const { data: sp } = await supabase.from("profiles").select("full_name, phone").eq("id", s.data.owner_id).maybeSingle();
      setSellerProfile(sp);
    }
    if (r.data?.user_id) {
      const { data: rp } = await supabase.from("profiles").select("phone").eq("id", r.data.user_id).maybeSingle();
      setRiderPhone(rp?.phone ?? null);
    } else {
      setRiderPhone(null);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orderId]);

  // Realtime: refresh on any update to this order
  useEffect(() => {
    const ch = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
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

  const updateStatus = async (status: string, extra: Record<string, any> = {}) => {
    setBusy(true);
    const patch: any = { status, ...extra };
    if (status === "payment_confirmed") patch.payment_confirmed_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Imehifadhiwa"); load();
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
        const da = a.current_lat != null && a.current_lng != null ? distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: a.current_lat, lng: a.current_lng }) : 9999;
        const db = b.current_lat != null && b.current_lng != null ? distanceKm({ lat: shop.lat, lng: shop.lng }, { lat: b.current_lat, lng: b.current_lng }) : 9999;
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
  const shopPos = shop?.lat != null && shop?.lng != null ? { lat: shop.lat, lng: shop.lng } : null;
  const destinationPos = address?.lat != null && address?.lng != null ? { lat: address.lat, lng: address.lng } : null;
  const orderTag = `Oda #${order.id.slice(0, 8)}`;
  const mapUrl = buildMapsUrl({ shop: shopPos, destination: destinationPos, rider: riderPos });

  // Quick-contact: the most relevant other party for the current user, right now
  const quickContact = (() => {
    if (isClient) {
      if (rider && riderPhone) return { phone: riderPhone, label: "boda", title: `Boda · ${rider.full_name ?? ""} ${rider.plate ? `(${rider.plate})` : ""}` };
      if (sellerProfile?.phone) return { phone: sellerProfile.phone, label: "muuzaji", title: `Muuzaji · ${shop?.name ?? ""}` };
    }
    if (isSeller) {
      if (rider && riderPhone) return { phone: riderPhone, label: "boda", title: `Boda · ${rider.full_name ?? ""}` };
      if (clientProfile?.phone) return { phone: clientProfile.phone, label: "mteja", title: `Mteja · ${clientProfile.full_name ?? ""}` };
    }
    if (isRider) {
      if (clientProfile?.phone) return { phone: clientProfile.phone, label: "mteja", title: `Mteja · ${clientProfile.full_name ?? ""}` };
      if (sellerProfile?.phone) return { phone: sellerProfile.phone, label: "muuzaji", title: `Muuzaji · ${shop?.name ?? ""}` };
    }
    return null;
  })();

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Oda</h1>
            {isSeller && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">Muuzaji</span>}
            {isClient && !isSeller && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Mteja</span>}
            {isRider && <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning-foreground">Boda</span>}
          </div>
          <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSeller && <>Unaona oda hii kama <b>muuzaji wa {shop?.name}</b>. Hatua zote hapa chini ni zako kama muuzaji.</>}
            {isClient && !isSeller && <>Unaona oda hii kama <b>mteja</b>. Fuata hatua zako hapa chini.</>}
            {isRider && <>Unaona oda hii kama <b>boda</b>. Fuata hatua zako hapa chini.</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={load} title="Onyesha mpya"><RefreshCcw className="h-4 w-4" /></Button>
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
            <ContactActions phone={quickContact.phone} label={quickContact.label} message={orderTag} />
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

            {/* CLIENT actions — kila status ina kitufe au taarifa wazi */}
            {isClient && (() => {
              const steps = ["placed","accepted","payment_submitted","payment_confirmed","rider_assigned","picked_up","delivered","completed"];
              const idx = steps.indexOf(order.status);
              const stepLabel = idx >= 0 ? `Hatua ${idx + 1} ya ${steps.length}` : null;
              const scrollToMap = () => document.getElementById("track-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
              return (
                <div className="space-y-3">
                  {stepLabel && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{stepLabel}</p>}

                  {order.status === "placed" && (
                    <div className="space-y-2">
                      <p className="text-sm">⏳ Tunamsubiri muuzaji akubali oda yako.</p>
                      {sellerProfile?.phone && (
                        <ContactActions phone={sellerProfile.phone} label="muuzaji" message={`${orderTag} — naomba ukubali oda yangu tafadhali`} />
                      )}
                      <Button variant="outline" size="sm" disabled={busy} onClick={cancelOrder}>Ghairi oda</Button>
                    </div>
                  )}

                  {order.status === "accepted" && (
                    <div className="space-y-3">
                      <p className="text-sm">✅ Muuzaji amekubali. <b>Lipa sasa</b> kisha tuma uthibitisho — au chagua kulipa cash unapofika.</p>
                      {shop?.lipa_number ? (
                        <div className="rounded-xl border bg-primary/5 p-3">
                          <p className="text-xs text-muted-foreground">Lipa Number (M-Pesa)</p>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold">{shop.lipa_number}</p>
                            <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(shop.lipa_number); toast.success("Imenakiliwa"); }}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">Kiasi: <b>{formatKES(Number(order.subtotal))}</b></p>
                          {shop.qr_code_url && <img src={shop.qr_code_url} alt="QR" className="mt-2 h-32 w-32 object-contain" />}
                        </div>
                      ) : (
                        <p className="rounded-xl border bg-warning/10 p-3 text-xs text-muted-foreground">
                          Duka halijaweka namba ya Lipa. Wasiliana na muuzaji moja kwa moja kupanga malipo.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <PaymentProofDialog orderId={orderId} onSubmitted={load} />
                        <Button variant="outline" disabled={busy} onClick={() => updateStatus("payment_submitted", { payment_ref: "CASH/OFFLINE" })}>
                          Nitalipa nikifika (cash)
                        </Button>
                      </div>
                    </div>
                  )}

                  {order.status === "payment_submitted" && (
                    <div className="space-y-2">
                      <p className="text-sm">📨 Uthibitisho umetumwa. Tunamsubiri muuzaji athibitishe malipo.</p>
                      {sellerProfile?.phone && (
                        <ContactActions phone={sellerProfile.phone} label="muuzaji" message={`${orderTag} — nimelipa, tafadhali thibitisha`} />
                      )}
                    </div>
                  )}

                  {order.status === "payment_confirmed" && (
                    <div className="space-y-2">
                      <p className="text-sm">💰 Malipo yamethibitishwa. Muuzaji anatafuta boda…</p>
                      {sellerProfile?.phone && (
                        <ContactActions phone={sellerProfile.phone} label="muuzaji" message={`${orderTag} — naomba upange boda`} />
                      )}
                    </div>
                  )}

                  {order.status === "rider_assigned" && (
                    <div className="space-y-2">
                      <p className="text-sm">🛵 Boda <b>{rider?.full_name ?? "rider"}</b> {rider?.plate ? `(${rider.plate})` : ""} amekabidhiwa. Inasubiri kuokota bidhaa dukani.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={scrollToMap}>Fuatilia kwenye ramani</Button>
                        {riderPhone && <ContactActions phone={riderPhone} label="boda" message={orderTag} />}
                      </div>
                    </div>
                  )}

                  {order.status === "picked_up" && (
                    <div className="space-y-2">
                      <p className="text-sm">📦 Bidhaa iko njiani kuja kwako!</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="lg" onClick={scrollToMap}>Fuatilia boda kwenye ramani</Button>
                        {riderPhone && <ContactActions phone={riderPhone} label="boda" message={orderTag} />}
                      </div>
                    </div>
                  )}

                  {order.status === "delivered" && (
                    <div className="space-y-2">
                      <p className="text-sm">📬 Boda anasema amekufikishia. Thibitisha umepokea bidhaa.</p>
                      <Button size="lg" disabled={busy} onClick={() => updateStatus("completed")}>✓ Nimepokea bidhaa — kamilisha</Button>
                      {riderPhone && <ContactActions phone={riderPhone} label="boda" message={`${orderTag} — sijaipokea bado`} />}
                    </div>
                  )}

                  {order.status === "completed" && (
                    <p className="text-sm text-success">🎉 Asante! Oda imekamilika.</p>
                  )}
                </div>
              );
            })()}

            {/* SELLER actions */}
            {isSeller && order.status === "placed" && (
              <div className="space-y-2">
                <Button size="lg" disabled={busy} onClick={() => updateStatus("accepted")}>Kubali oda</Button>
                <Button variant="outline" disabled={busy} onClick={cancelOrder}>Kataa oda</Button>
              </div>
            )}
            {isSeller && order.status === "accepted" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tunamsubiri mteja alipe. Ukishapokea malipo (M-Pesa, cash, au benki) endelea moja kwa moja:</p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => updateStatus("payment_confirmed")}>✓ Nimepokea malipo — endelea</Button>
                </div>
              </div>
            )}
            {isSeller && order.status === "payment_submitted" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Mteja amesema amelipa. Hakiki:</p>
                {order.payment_ref && (
                  <div className="rounded-lg border bg-secondary/40 p-2 text-sm">
                    Namba ya muamala: <b>{order.payment_ref}</b>
                  </div>
                )}
                {order.payment_proof_url && (
                  <a href={order.payment_proof_url} target="_blank" rel="noreferrer">
                    <img src={order.payment_proof_url} alt="proof" className="max-h-60 rounded-lg border" />
                  </a>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => updateStatus("payment_confirmed")}>✓ Thibitisha malipo</Button>
                  <Button variant="outline" disabled={busy} onClick={() => updateStatus("accepted")}>Kataa — rudisha</Button>
                </div>
              </div>
            )}
            {isSeller && order.status === "payment_confirmed" && (
              <div className="space-y-3">
                <p className="text-sm">Malipo yamethibitishwa. Sasa tafuta boda boda kumkabidhi bidhaa.</p>
                <Button onClick={findRiders} className="gap-1.5"><Bike className="h-4 w-4" /> Tafuta boda karibu nawe</Button>
                {searchingRiders && <p className="text-sm text-muted-foreground">Inatafuta…</p>}
                {riders.length > 0 && (
                  <div className="space-y-2">
                    {riders.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <div className="flex items-center gap-2 font-medium">{r.full_name ?? "Rider"} {r.license_verified && <ShieldCheck className="h-4 w-4 text-success" />}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
              <Button size="lg" disabled={busy} onClick={() => updateStatus("picked_up")}>Nimemkabidhi boda — anza usafirishaji</Button>
            )}
            {isSeller && order.status === "picked_up" && (
              <p className="text-sm text-muted-foreground">Bidhaa iko njiani. Mteja anafuatilia kwenye ramani.</p>
            )}
            {isSeller && order.status === "delivered" && (
              <p className="text-sm text-muted-foreground">Bidhaa imefika. Tunamsubiri mteja athibitishe upokeaji.</p>
            )}

            {/* RIDER actions */}
            {isRider && order.status === "rider_assigned" && (
              <Button size="lg" disabled={busy} onClick={() => updateStatus("picked_up")}>Nimeokota bidhaa — anza safari</Button>
            )}
            {isRider && order.status === "picked_up" && (
              <Button size="lg" disabled={busy} onClick={() => updateStatus("delivered")}>Nimemfikishia mteja</Button>
            )}

            {canCancel && (isClient || isSeller) && order.status !== "cancelled" && (
              <button onClick={cancelOrder} className="mt-4 flex items-center gap-1 text-xs text-destructive hover:underline">
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
                <h3 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" /> Fuatilia kwenye ramani</h3>
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

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
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

          {/* Contacts: show the OTHER parties to the current user */}
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Mawasiliano</h3>
            <div className="space-y-3 text-sm">
              {!isClient && clientProfile?.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Mteja · {clientProfile.full_name ?? ""}</p>
                  <ContactActions phone={clientProfile.phone} label="mteja" message={orderTag} />
                </div>
              )}
              {!isSeller && sellerProfile?.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Muuzaji · {shop?.name}</p>
                  <ContactActions phone={sellerProfile.phone} label="muuzaji" message={orderTag} />
                </div>
              )}
              {rider && !isRider && (
                <div>
                  <p className="text-xs text-muted-foreground">Boda · {rider.full_name ?? ""} {rider.plate ? `(${rider.plate})` : ""}</p>
                  <ContactActions phone={riderPhone} label="boda" message={orderTag} />
                </div>
              )}
              {(isClient && !sellerProfile?.phone && !rider) || (isSeller && !clientProfile?.phone) ? (
                <p className="text-xs text-muted-foreground">Hakuna mawasiliano yaliyowekwa bado.</p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}><span className="text-muted-foreground">{label}</span><span>{v}</span></div>;
}
