import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WizardStepper } from "@/components/WizardStepper";
import { GeoAverager } from "@/components/GeoAverager";
import { uploadFile } from "@/lib/upload";
import { toast } from "sonner";
import { Store, Receipt, ClipboardList, TrendingUp } from "lucide-react";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_GROUPS } from "@/lib/business-categories";

export const Route = createFileRoute("/seller/")({ component: SellerHome });

function SellerHome() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ orders: 0, sales: 0 });

  const load = async () => {
    if (!user) return;
    const { data: s } = await supabase.from("shops").select("*").eq("owner_id", user.id).maybeSingle();
    setShop(s);
    setLoading(false);
    if (s) {
      const { data: o } = await supabase.from("orders").select("subtotal,status").eq("shop_id", s.id);
      const completed = (o ?? []).filter((x: any) => x.status === "completed");
      setStats({ orders: o?.length ?? 0, sales: completed.reduce((sum: number, x: any) => sum + Number(x.subtotal), 0) });
    }
  };
  useEffect(() => { load(); }, [user]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!shop) return <SellerWizard onDone={load} />;

  const remaining = Math.max(0, 10 - shop.sales_count);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Store} label="Sales count" value={shop.sales_count} />
        <Stat icon={ClipboardList} label="Orders" value={stats.orders} />
        <Stat icon={TrendingUp} label="Revenue" value={`TSh ${stats.sales.toLocaleString()}`} />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">{shop.name}</h2>
        <p className="text-sm text-muted-foreground">{shop.category} · {shop.street ?? "No street"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Lipa: {shop.lipa_number ?? "—"}</p>
      </div>

      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-accent p-4">
        <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /><h3 className="font-semibold">Subscription status</h3></div>
        {shop.subscription_active ? (
          <p className="mt-1 text-sm">Active — TSh 20,000/month.</p>
        ) : remaining > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{remaining} more sale{remaining === 1 ? "" : "s"} until your TSh 20,000/month plan kicks in.</p>
        ) : (
          <p className="mt-1 text-sm text-warning-foreground">You've crossed 10 sales — TSh 20,000/month is now due.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function SellerWizard({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const steps = ["Business", "ID & Selfie", "Location", "Payments"];
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [street, setStreet] = useState("");
  const [idType, setIdType] = useState<"national_id"|"passport"|"driving_licence"|"business_permit">("national_id");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [lipa, setLipa] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (!user) return;
    if (!coord) return toast.error("Capture your location");
    setBusy(true);

    const qrUrl = qrFile ? await uploadFile("qr-codes", user.id, qrFile, "qr") : null;
    const { data: shop, error } = await supabase.from("shops").insert({
      owner_id: user.id, name, category, description, street,
      lat: coord.lat, lng: coord.lng,
      lipa_number: lipa, qr_code_url: qrUrl,
    }).select("*").single();

    if (error || !shop) { setBusy(false); return toast.error(error?.message ?? "Failed"); }

    const idUrl = idFile ? await uploadFile("id-photos", user.id, idFile, "id") : null;
    const selfieUrl = selfieFile ? await uploadFile("selfies", user.id, selfieFile, "selfie") : null;
    await supabase.from("seller_documents").insert({
      shop_id: shop.id, id_type: idType, id_photo_url: idUrl, selfie_url: selfieUrl,
    });

    setBusy(false);
    toast.success("Shop created");
    onDone();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">Set up your shop</h2>
      <p className="text-sm text-muted-foreground">Streamlined registration. Takes ~2 minutes.</p>
      <div className="mt-6"><WizardStepper steps={steps} current={step} /></div>

      <div className="rounded-2xl border bg-card p-5">
        {step === 0 && (
          <div className="space-y-3">
            <div><Label>Business name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>Business category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Chagua aina ya biashara · Choose business type" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {BUSINESS_CATEGORY_GROUPS.map((g) => {
                    const items = BUSINESS_CATEGORIES.filter((c) => c.group === g);
                    if (items.length === 0) return null;
                    return (
                      <div key={g}>
                        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</div>
                        {items.map((c) => {
                          const Icon = c.icon;
                          return (
                            <SelectItem key={c.key} value={c.key}>
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <span>{c.sw} <span className="text-muted-foreground">· {c.en}</span></span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Street / area</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>ID type</Label>
              <Select value={idType} onValueChange={(v: any) => setIdType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="driving_licence">Driving Licence</SelectItem>
                  <SelectItem value="business_permit">Business Permit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>ID photo</Label><Input type="file" accept="image/*" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Selfie</Label><Input type="file" accept="image/*" capture="user" onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} /></div>
          </div>
        )}
        {step === 2 && <GeoAverager onResult={setCoord} />}
        {step === 3 && (
          <div className="space-y-3">
            <div><Label>Lipa Number (Paybill / Till)</Label><Input value={lipa} onChange={(e) => setLipa(e.target.value)} placeholder="e.g. 123456" /></div>
            <div><Label>Scan-to-Pay QR (image)</Label><Input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files?.[0] ?? null)} /></div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !name}>Next</Button>
          ) : (
            <Button onClick={finish} disabled={busy}>{busy ? "Creating…" : "Create shop"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
