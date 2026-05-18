import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { WizardStepper } from "@/components/WizardStepper";
import { GeoAverager } from "@/components/GeoAverager";
import { uploadFile } from "@/lib/upload";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import {
  ShieldCheck, Locate, Radio, Package, CheckCircle2, Bike, AlertCircle,
  Star, TrendingUp, Calendar, Navigation, Store, User as UserIcon, BellRing, Volume2,
} from "lucide-react";
import { useBroadcastPosition } from "@/lib/tracking";
import {
  alertUser, ringAlert, stopAlert, requestNotifPermission, notifPermission, playAlertOnce,
} from "@/lib/notify";
import { toast } from "sonner";

export const Route = createFileRoute("/rider/")({ component: RiderHome });

type RiderOrderStatus = "picked_up" | "delivered";

function RiderHome() {
  const { user } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, todayCount: 0 });
  const [notifState, setNotifState] = useState<NotificationPermission | "unsupported">("default");
  const knownOrderIds = useRef<Set<string>>(new Set());
  const knownPickedUp = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNotifState(notifPermission());
  }, []);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("riders").select("*").eq("user_id", user.id).maybeSingle();
    setRider(data); setLoading(false);
    if (data) setAvailable(data.available);
    if (data) {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
      const [{ data: o }, { data: done }] = await Promise.all([
        supabase
          .from("orders")
          .select("*, shops(name, lat, lng, street)")
          .eq("rider_id", data.id)
          .not("status", "in", "(completed,cancelled)")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("delivery_fee, created_at, status")
          .eq("rider_id", data.id)
          .in("status", ["delivered", "completed"])
          .gte("created_at", startWeek),
      ]);
      // Fetch destination addresses for currently open orders (no FK so we
      // can't embed). Merge into each order under `address`.
      let openWithAddresses = o ?? [];
      const addressIds = Array.from(
        new Set((o ?? []).map((x: any) => x.address_id).filter(Boolean)),
      );
      if (addressIds.length) {
        const { data: addrs } = await supabase
          .from("addresses")
          .select("id, label, street, lat, lng")
          .in("id", addressIds);
        const byId = new Map((addrs ?? []).map((a: any) => [a.id, a]));
        openWithAddresses = (o ?? []).map((x: any) => ({
          ...x,
          address: x.address_id ? byId.get(x.address_id) ?? null : null,
        }));
      }
      setOpenOrders(openWithAddresses);
      const all = done ?? [];
      setEarnings({
        today: all.filter((x: any) => x.created_at >= startToday).reduce((s: number, x: any) => s + Number(x.delivery_fee), 0),
        week: all.reduce((s: number, x: any) => s + Number(x.delivery_fee), 0),
        todayCount: all.filter((x: any) => x.created_at >= startToday).length,
      });
    }
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: refresh + ring on new assignment / status flip to picked_up.
  useEffect(() => {
    if (!rider) return;
    const ch = supabase
      .channel(`rider-orders-${rider.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `rider_id=eq.${rider.id}` },
        (payload: any) => {
          const next = payload.new;
          if (next?.status === "rider_assigned" && !knownOrderIds.current.has(next.id)) {
            knownOrderIds.current.add(next.id);
            alertUser(
              "🛵 Oda mpya imekuja!",
              `Oda #${String(next.id).slice(0, 8)} imekupatia. Nenda dukani uokote.`,
              `/orders/${next.id}`,
            );
          }
          load();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); stopAlert(); };
    // eslint-disable-next-line
  }, [rider?.id]);

  // Seed known ids so first load doesn't fire alerts for pre-existing orders.
  useEffect(() => {
    openOrders.forEach((o) => {
      if (o.status === "rider_assigned") knownOrderIds.current.add(o.id);
      if (o.status === "picked_up") knownPickedUp.current.add(o.id);
    });
  }, [openOrders]);

  const enableAlerts = async () => {
    const ok = await requestNotifPermission();
    setNotifState(notifPermission());
    // Prime the audio engine on the same user-gesture so future rings work.
    playAlertOnce();
    if (ok) toast.success("Arifa zimewashwa — utasikia sauti oda ikija");
    else toast.error("Ruhusa imekataliwa. Wezesha arifa kwenye mipangilio ya simu.");
  };

  const updateOrderStatus = async (orderId: string, status: RiderOrderStatus) => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    setBusy(false);
    if (error) return toast.error(error.message);
    stopAlert();
    toast.success(status === "picked_up" ? "✅ Imeokotwa — safari imeanza!" : "🎉 Imefika — kazi nzuri!");
    load();
  };

  const updateLocation = () => {
    if (!navigator.geolocation) return toast.error("GPS haitumiki kwenye kifaa hiki");
    navigator.geolocation.getCurrentPosition(async (p) => {
      await supabase.from("riders").update({ current_lat: p.coords.latitude, current_lng: p.coords.longitude }).eq("id", rider.id);
      toast.success("Eneo limesasishwa"); load();
    }, (err) => toast.error(err.message));
  };

  const toggleAvail = async (v: boolean) => {
    setAvailable(v);
    await supabase.from("riders").update({ available: v }).eq("id", rider.id);
    toast.success(v ? "Uko tayari kupokea oda" : "Umejificha — hutaonekana");
  };

  if (loading) return <p className="text-muted-foreground p-4">Inapakia…</p>;
  if (!rider) return <RiderWizard onDone={load} />;

  const activeDelivery = openOrders.find((o) => o.status === "picked_up");
  const pendingPickup = openOrders.find((o) => o.status === "rider_assigned");
  const remaining = Math.max(0, 10 - rider.deliveries_count);

  return (
    <div className="space-y-4">
      {/* Notification permission banner */}
      {notifState !== "granted" && notifState !== "unsupported" && (
        <button
          onClick={enableAlerts}
          className="w-full rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-3 text-left transition hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Wezesha arifa za sauti</p>
              <p className="text-xs text-muted-foreground">Bonyeza ili usikie mlio oda mpya ikija — hata simu ikiwa imefungwa.</p>
            </div>
          </div>
        </button>
      )}
      {notifState === "granted" && (
        <div className="flex items-center justify-between rounded-xl border bg-success/10 px-3 py-2 text-xs">
          <span className="flex items-center gap-2 text-success">
            <BellRing className="h-3.5 w-3.5" /> Arifa zimewashwa
          </span>
          <button onClick={playAlertOnce} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <Volume2 className="h-3.5 w-3.5" /> Jaribu sauti
          </button>
        </div>
      )}

      {/* Rider profile card */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-lg">
              {rider.full_name}
              {rider.license_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Plate {rider.plate} · {rider.deliveries_count} usafirishaji</div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Label className="text-xs text-muted-foreground">Niko tayari</Label>
            <Switch checked={available} onCheckedChange={toggleAvail} />
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={updateLocation} id="update-location-btn">
          <Locate className="h-3.5 w-3.5" /> Sasisha eneo langu
        </Button>
      </div>

      {/* Earnings */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border bg-card p-3 text-center">
          <Calendar className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-[10px] uppercase text-muted-foreground">Leo</p>
          <p className="text-sm font-bold">TSh {earnings.today.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{earnings.todayCount} safari</p>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-success" />
          <p className="mt-1 text-[10px] uppercase text-muted-foreground">Wiki</p>
          <p className="text-sm font-bold">TSh {earnings.week.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">siku 7</p>
        </div>
        <div className="rounded-2xl border bg-card p-3 text-center">
          <Star className="mx-auto h-4 w-4 text-warning" />
          <p className="mt-1 text-[10px] uppercase text-muted-foreground">Rating</p>
          <p className="text-sm font-bold">{Number(rider.rating ?? 5).toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">jumla</p>
        </div>
      </div>

      {/* STEP 2 — Active delivery: heading to customer */}
      {activeDelivery && (
        <ActiveDeliveryCard
          order={activeDelivery}
          riderId={rider.id}
          busy={busy}
          onDelivered={() => updateOrderStatus(activeDelivery.id, "delivered")}
        />
      )}

      {/* STEP 1 — Assigned: pick up at the shop */}
      {pendingPickup && !activeDelivery && (
        <PendingPickupCard
          order={pendingPickup}
          busy={busy}
          onPickedUp={() => updateOrderStatus(pendingPickup.id, "picked_up")}
        />
      )}

      {/* Subscription status */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-accent p-4">
        <h3 className="font-semibold">Usajili</h3>
        {rider.subscription_active
          ? <p className="mt-1 text-sm">Amili — TSh 10,000/mwezi.</p>
          : remaining > 0
          ? <p className="mt-1 text-sm text-muted-foreground">{remaining} safari zaidi hadi TSh 10,000/mwezi.</p>
          : <p className="mt-1 text-sm">Kiwango kimefikiwa. TSh 10,000/mwezi sasa inadaiwi.</p>
        }
      </div>

      {/* All active orders list */}
      {openOrders.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Oda zangu za sasa</h3>
          <div className="space-y-2">
            {openOrders.map((o) => (
              <Link
                key={o.id}
                to="/orders/$orderId"
                params={{ orderId: o.id }}
                className="flex items-center justify-between rounded-2xl border bg-card p-3 hover:border-primary transition"
              >
                <div>
                  <div className="font-medium">{o.shops?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    #{o.id.slice(0, 8)} · TSh {Number(o.delivery_fee).toLocaleString()}
                  </div>
                </div>
                <OrderStatusPill status={o.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {openOrders.length === 0 && !activeDelivery && !pendingPickup && (
        <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          <Bike className="mx-auto mb-2 h-8 w-8 opacity-30" />
          Hakuna oda kwa sasa. Weka "Niko tayari" ili muuzaji akupate.
          <div className="mt-3">
            <Link to="/rider/board"><Button size="sm" variant="outline">Tazama ubao wa kazi</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1 — Pickup at shop                                              */
/* ------------------------------------------------------------------ */

function PendingPickupCard({
  order, busy, onPickedUp,
}: { order: any; busy: boolean; onPickedUp: () => void }) {
  const shopLat = order.shops?.lat;
  const shopLng = order.shops?.lng;
  const hasShopGeo = Number.isFinite(shopLat) && Number.isFinite(shopLng);
  const dirUrl = hasShopGeo
    ? `https://www.google.com/maps/dir/?api=1&destination=${shopLat},${shopLng}&travelmode=driving`
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary bg-primary/5">
      <div className="flex items-center gap-2 bg-primary px-4 py-2 text-primary-foreground">
        <AlertCircle className="h-4 w-4 animate-pulse" />
        <span className="text-sm font-bold uppercase tracking-wide">Hatua 1 ya 2 · Nenda Dukani</span>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Store className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase text-muted-foreground">Okota kwenye duka</p>
            <p className="text-base font-bold">{order.shops?.name ?? "Duka"}</p>
            {order.shops?.street && <p className="text-xs text-muted-foreground">{order.shops.street}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Oda #{order.id.slice(0, 8)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {dirUrl ? (
            <a href={dirUrl} target="_blank" rel="noreferrer">
              <Button size="lg" className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Navigation className="h-5 w-5" /> Pata mwelekeo wa duka
              </Button>
            </a>
          ) : (
            <Button size="lg" disabled className="w-full gap-2">
              <Navigation className="h-5 w-5" /> Eneo la duka halijapatikana
            </Button>
          )}
          <Button
            id={`pickup-btn-${order.id}`}
            size="lg"
            variant="outline"
            disabled={busy}
            onClick={onPickedUp}
            className="w-full gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Package className="h-5 w-5" /> Nimeokota — anza safari
          </Button>
          <Link to="/orders/$orderId" params={{ orderId: order.id }}>
            <Button variant="ghost" size="sm" className="w-full">Maelezo zaidi ya oda</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — Deliver to customer                                         */
/* ------------------------------------------------------------------ */

function ActiveDeliveryCard({
  order, riderId, busy, onDelivered,
}: { order: any; riderId: string; busy: boolean; onDelivered: () => void }) {
  const destLat = order.address?.lat;
  const destLng = order.address?.lng;
  const hasDestGeo = Number.isFinite(destLat) && Number.isFinite(destLng);
  const dirUrl = hasDestGeo
    ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`
    : null;

  return (
    <div className="space-y-3">
      <LiveBroadcastCard orderId={order.id} riderId={riderId} />
      <div className="overflow-hidden rounded-2xl border-2 border-warning bg-warning/10">
        <div className="flex items-center gap-2 bg-warning px-4 py-2 text-warning-foreground">
          <Bike className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-wide">Hatua 2 ya 2 · Nenda kwa Mteja</span>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-warning text-warning-foreground">
              <UserIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase text-muted-foreground">Mfikishe mteja</p>
              <p className="text-base font-bold">
                {order.addresses?.label ?? "Mteja"}
              </p>
              {order.addresses?.street && (
                <p className="text-xs text-muted-foreground">{order.addresses.street}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Oda #{order.id.slice(0, 8)}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {dirUrl ? (
              <a href={dirUrl} target="_blank" rel="noreferrer">
                <Button size="lg" className="w-full gap-2 bg-warning text-warning-foreground hover:bg-warning/90">
                  <Navigation className="h-5 w-5" /> Pata mwelekeo kwa mteja
                </Button>
              </a>
            ) : (
              <Button size="lg" disabled className="w-full gap-2">
                <Navigation className="h-5 w-5" /> Eneo la mteja halijapatikana
              </Button>
            )}
            <Button
              id={`delivered-btn-${order.id}`}
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={onDelivered}
              className="w-full gap-2 border-warning text-warning-foreground hover:bg-warning hover:text-warning-foreground"
            >
              <CheckCircle2 className="h-5 w-5" /> Nimemfikishia mteja
            </Button>
            <Link to="/orders/$orderId" params={{ orderId: order.id }}>
              <Button variant="ghost" size="sm" className="w-full">Maelezo zaidi ya oda</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Onboarding wizard                                                    */
/* ------------------------------------------------------------------ */

function RiderWizard({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const steps = ["Profile", "ID & Selfie", "Vehicle", "Location"];
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [idType, setIdType] = useState<"national_id"|"passport"|"driving_licence"|"business_permit">("driving_licence");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    const idUrl = idFile ? await uploadFile("id-photos", user.id, idFile, "id") : null;
    const selfieUrl = selfieFile ? await uploadFile("selfies", user.id, selfieFile, "selfie") : null;
    const vehUrl = vehicleFile ? await uploadFile("vehicles", user.id, vehicleFile, "vehicle") : null;
    const { error } = await supabase.from("riders").insert({
      user_id: user.id, full_name: name, plate, id_type: idType,
      id_photo_url: idUrl, selfie_url: selfieUrl, vehicle_photo_url: vehUrl,
      license_verified: idType === "driving_licence",
      current_lat: coord?.lat ?? null, current_lng: coord?.lng ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("You're set"); onDone();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">Become a Boda Boda partner</h2>
      <p className="text-sm text-muted-foreground">Drivers with a Driving Licence get a Verified badge and rank higher in nearby search.</p>
      <div className="mt-6"><WizardStepper steps={steps} current={step} /></div>

      <div className="rounded-2xl border bg-card p-5">
        {step === 0 && (
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Plate number</Label><Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="KMXX 123A" /></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>ID type <span className="text-xs text-muted-foreground">(Driving Licence = Verified)</span></Label>
              <Select value={idType} onValueChange={(v: any) => setIdType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="driving_licence">Driving Licence (recommended)</SelectItem>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>ID photo</Label><Input type="file" accept="image/*" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Selfie</Label><Input type="file" accept="image/*" capture="user" onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} /></div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <div><Label>Vehicle photo</Label><Input type="file" accept="image/*" onChange={(e) => setVehicleFile(e.target.files?.[0] ?? null)} /></div>
          </div>
        )}
        {step === 3 && <GeoAverager onResult={setCoord} />}

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && (!name || !plate)}>Next</Button>
          ) : (
            <Button onClick={finish} disabled={busy}>{busy ? "Saving…" : "Finish"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveBroadcastCard({ orderId, riderId }: { orderId: string; riderId: string }) {
  const [on, setOn] = useState(true);
  const pos = useBroadcastPosition(orderId, riderId, on);
  return (
    <div className="rounded-2xl border bg-warning/10 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold"><Radio className={`h-4 w-4 ${on ? "text-warning animate-pulse" : "text-muted-foreground"}`} /> Tuma eneo moja kwa moja</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {pos ? `Eneo: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Inasubiri GPS…"}
          </p>
        </div>
        <Switch checked={on} onCheckedChange={setOn} />
      </div>
    </div>
  );
}
