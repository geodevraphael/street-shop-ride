import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { ShieldCheck, Locate, Radio, Package, CheckCircle2, Bike, AlertCircle, Star, TrendingUp, Calendar } from "lucide-react";
import { useBroadcastPosition } from "@/lib/tracking";
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
          .select("*, shops(name, lat, lng)")
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
      setOpenOrders(o ?? []);
      const all = done ?? [];
      setEarnings({
        today: all.filter((x: any) => x.created_at >= startToday).reduce((s: number, x: any) => s + Number(x.delivery_fee), 0),
        week: all.reduce((s: number, x: any) => s + Number(x.delivery_fee), 0),
        todayCount: all.filter((x: any) => x.created_at >= startToday).length,
      });
    }
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: refresh when any assigned order changes
  useEffect(() => {
    if (!rider) return;
    const ch = supabase
      .channel(`rider-orders-${rider.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `rider_id=eq.${rider.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rider?.id]);

  const updateOrderStatus = async (orderId: string, status: RiderOrderStatus) => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    setBusy(false);
    if (error) return toast.error(error.message);
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

      {/* LIVE BROADCAST — active delivery in progress */}
      {activeDelivery && (
        <div className="space-y-3">
          <LiveBroadcastCard orderId={activeDelivery.id} riderId={rider.id} />
          <div className="rounded-2xl border-2 border-warning bg-warning/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bike className="h-5 w-5 text-warning" />
              <h3 className="font-bold text-base">Unasafirisha sasa hivi</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{activeDelivery.shops?.name}</span>
              {" → Mteja"}
            </p>
            <p className="text-xs text-muted-foreground mb-3">Oda #{activeDelivery.id.slice(0, 8)}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                id={`delivered-btn-${activeDelivery.id}`}
                size="lg"
                disabled={busy}
                onClick={() => updateOrderStatus(activeDelivery.id, "delivered")}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Nimemfikishia mteja
              </Button>
              <Link to="/orders/$orderId" params={{ orderId: activeDelivery.id }}>
                <Button variant="outline" size="lg">Maelezo zaidi</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* PENDING PICKUP — assigned but not yet picked up */}
      {pendingPickup && !activeDelivery && (
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-primary animate-pulse" />
            <h3 className="font-bold text-base">Oda inakusubiri!</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            Nenda <span className="font-medium text-foreground">{pendingPickup.shops?.name}</span> uokote bidhaa
          </p>
          <p className="text-xs text-muted-foreground mb-3">Oda #{pendingPickup.id.slice(0, 8)}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              id={`pickup-btn-${pendingPickup.id}`}
              size="lg"
              disabled={busy}
              onClick={() => updateOrderStatus(pendingPickup.id, "picked_up")}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Nimeokota — anza safari
            </Button>
            <Link to="/orders/$orderId" params={{ orderId: pendingPickup.id }}>
              <Button variant="outline" size="lg">Maelezo zaidi</Button>
            </Link>
          </div>
        </div>
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
        </div>
      )}
    </div>
  );
}

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
