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
import { ShieldCheck, Locate, Radio } from "lucide-react";
import { useBroadcastPosition } from "@/lib/tracking";
import { toast } from "sonner";

export const Route = createFileRoute("/rider/")({ component: RiderHome });

function RiderHome() {
  const { user } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [openOrders, setOpenOrders] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("riders").select("*").eq("user_id", user.id).maybeSingle();
    setRider(data); setLoading(false);
    if (data) setAvailable(data.available);
    if (data) {
      const { data: o } = await supabase.from("orders").select("*, shops(name)").eq("rider_id", data.id).order("created_at", { ascending: false }).limit(20);
      setOpenOrders(o ?? []);
    }
  };
  useEffect(() => { load(); }, [user]);

  const updateLocation = () => {
    navigator.geolocation.getCurrentPosition(async (p) => {
      await supabase.from("riders").update({ current_lat: p.coords.latitude, current_lng: p.coords.longitude }).eq("id", rider.id);
      toast.success("Location updated"); load();
    });
  };

  const toggleAvail = async (v: boolean) => {
    setAvailable(v);
    await supabase.from("riders").update({ available: v }).eq("id", rider.id);
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!rider) return <RiderWizard onDone={load} />;

  const remaining = Math.max(0, 10 - rider.deliveries_count);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold">{rider.full_name} {rider.license_verified && <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success"><ShieldCheck className="h-3 w-3" /> Verified</span>}</div>
            <div className="text-xs text-muted-foreground">Plate {rider.plate} · {rider.deliveries_count} deliveries</div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Available</Label>
            <Switch checked={available} onCheckedChange={toggleAvail} />
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={updateLocation}><Locate className="h-3.5 w-3.5" /> Update my location</Button>
      </div>

      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-accent p-4">
        <h3 className="font-semibold">Subscription</h3>
        {rider.subscription_active ? <p className="mt-1 text-sm">Active — TSh 10,000/month.</p>
          : remaining > 0 ? <p className="mt-1 text-sm text-muted-foreground">{remaining} more route{remaining === 1 ? "" : "s"} until TSh 10,000/month begins.</p>
          : <p className="mt-1 text-sm">Threshold reached. TSh 10,000/month is now due.</p>}
      </div>

      <div>
        <h3 className="font-semibold">My deliveries</h3>
        {openOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sellers and clients can find you when they need a rider near them.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {openOrders.map((o) => (
              <Link to="/orders/$orderId" params={{ orderId: o.id }} key={o.id} className="flex items-center justify-between rounded-2xl border bg-card p-3 hover:border-primary">
                <div>
                  <div className="font-medium">{o.shops?.name}</div>
                  <div className="text-xs text-muted-foreground">{o.distance_km?.toFixed(1)} km · TSh {Number(o.delivery_fee).toLocaleString()}</div>
                </div>
                <OrderStatusPill status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
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
