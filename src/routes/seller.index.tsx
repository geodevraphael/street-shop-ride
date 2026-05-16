import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Store, Receipt, ClipboardList, TrendingUp, Camera, Loader2, Gift, Calendar, AlertTriangle, Package, CreditCard, Plus, Trash2, Star } from "lucide-react";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_GROUPS } from "@/lib/business-categories";
import { LipaNumberForm, EMPTY_LIPA, type LipaFormValue } from "@/components/LipaNumberForm";
import { getProvider } from "@/lib/payment-providers";

export const Route = createFileRoute("/seller/")({ component: SellerHome });

function SellerHome() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    weekSales: 0,
    todayOrders: 0,
    pendingActions: 0,
    totalRevenue: 0,
  });
  const [lowStock, setLowStock] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: s } = await supabase.from("shops").select("*").eq("owner_id", user.id).maybeSingle();
    setShop(s);
    setLoading(false);
    if (s) {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startWeek = new Date(now.getTime() - 7 * 86400000).toISOString();

      const [{ data: o }, { data: low }] = await Promise.all([
        supabase.from("orders").select("subtotal,status,created_at").eq("shop_id", s.id),
        supabase.from("products").select("id,name,stock,image_url").eq("shop_id", s.id).lte("stock", 5).gt("stock", -1).order("stock", { ascending: true }).limit(5),
      ]);
      const orders = o ?? [];
      const completed = orders.filter((x: any) => x.status === "completed" || x.status === "delivered");
      setStats({
        todaySales: completed.filter((x: any) => x.created_at >= startToday).reduce((s: number, x: any) => s + Number(x.subtotal), 0),
        weekSales: completed.filter((x: any) => x.created_at >= startWeek).reduce((s: number, x: any) => s + Number(x.subtotal), 0),
        todayOrders: orders.filter((x: any) => x.created_at >= startToday).length,
        pendingActions: orders.filter((x: any) => x.status === "placed" || x.status === "payment_submitted").length,
        totalRevenue: completed.reduce((s: number, x: any) => s + Number(x.subtotal), 0),
      });
      setLowStock(low ?? []);
    }
  };
  useEffect(() => { load(); }, [user]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!shop) return <SellerWizard onDone={load} />;

  const remaining = Math.max(0, 10 - shop.sales_count);

  return (
    <div className="space-y-4">
      <ShopCoverCard shop={shop} onUpdated={load} />

      {stats.pendingActions > 0 && (
        <Link to="/seller/orders" className="flex items-center justify-between rounded-2xl border-2 border-warning bg-warning/10 p-4 transition hover:bg-warning/15">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/20 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{stats.pendingActions} oda zinakusubiri</p>
              <p className="text-xs text-muted-foreground">Bofya kuona na kuchukua hatua</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-warning">→</span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Calendar} label="Mauzo ya leo" value={`TSh ${stats.todaySales.toLocaleString()}`} />
        <Stat icon={TrendingUp} label="Wiki hii" value={`TSh ${stats.weekSales.toLocaleString()}`} />
        <Stat icon={ClipboardList} label="Oda za leo" value={stats.todayOrders} />
        <Stat icon={Store} label="Jumla ya mauzo" value={shop.sales_count} />
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-warning" />
            <h3 className="font-semibold">Stock inakaribia kuisha</h3>
          </div>
          <div className="space-y-2">
            {lowStock.map((p: any) => (
              <Link key={p.id} to="/seller/products" className="flex items-center gap-3 rounded-xl border bg-secondary/40 p-2 hover:bg-secondary">
                <div className="h-10 w-10 overflow-hidden rounded bg-secondary">
                  {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Imebaki {p.stock}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.stock === 0 ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}`}>
                  {p.stock === 0 ? "Imeisha" : "Chache"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">{shop.name}</h2>
            <p className="text-sm text-muted-foreground">{shop.category} · {shop.street ?? "No street"}</p>
          </div>
          <Link to="/seller/payments" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15">
            <CreditCard className="h-3 w-3" /> Njia za malipo
          </Link>
        </div>
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

      <Link to="/referrals" className="flex items-center justify-between rounded-2xl border bg-gradient-to-br from-primary/10 to-accent p-4 transition hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Gift className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold">Alika sellers / boda — pata zawadi</p>
            <p className="text-xs text-muted-foreground">5 sellers = 50% off ada · 10 sellers = TSh 10,000 · 2 boda = 2% off</p>
          </div>
        </div>
        <span className="text-sm text-primary">→</span>
      </Link>
    </div>
  );
}

function ShopCoverCard({ shop, onUpdated }: { shop: any; onUpdated: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const onPick = async (file: File | null) => {
    if (!file || !user) return;
    setBusy(true);
    const url = await uploadFile("shop-covers", user.id, file, "cover");
    if (url) {
      const { error } = await supabase.from("shops").update({ cover_url: url }).eq("id", shop.id);
      if (error) toast.error(error.message); else { toast.success("Cover photo updated"); onUpdated(); }
    } else toast.error("Upload failed");
    setBusy(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[5/2] bg-secondary">
        {shop.cover_url ? (
          <img src={shop.cover_url} alt={shop.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8" />
              <p className="mt-1 text-xs">Ongeza picha kuu ya duka</p>
            </div>
          </div>
        )}
        <label className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur transition hover:bg-background">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          {shop.cover_url ? "Badilisha cover" : "Pakia cover"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} disabled={busy} />
        </label>
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
  const [lipas, setLipas] = useState<LipaFormValue[]>([{ ...EMPTY_LIPA, is_default: true }]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const updateLipa = (i: number, v: LipaFormValue) => {
    setLipas((prev) => {
      const next = [...prev];
      // single default
      if (v.is_default) next.forEach((x, j) => { if (j !== i) x.is_default = false; });
      next[i] = v;
      return next;
    });
  };
  const addLipa = () => setLipas((prev) => [...prev, { ...EMPTY_LIPA }]);
  const removeLipa = (i: number) => setLipas((prev) => {
    const next = prev.filter((_, j) => j !== i);
    if (next.length && !next.some((x) => x.is_default)) next[0].is_default = true;
    return next;
  });

  const finish = async () => {
    if (!user) return;
    if (!coord) return toast.error("Capture your location");
    const validLipas = lipas.filter((l) => l.provider && l.number.trim());
    if (validLipas.length === 0) return toast.error("Ongeza walau njia moja ya malipo");
    setBusy(true);

    const coverUrl = coverFile ? await uploadFile("shop-covers", user.id, coverFile, "cover") : null;
    const firstLipa = validLipas.find((l) => l.is_default) ?? validLipas[0];
    const { data: shop, error } = await supabase.from("shops").insert({
      owner_id: user.id, name, category, description, street,
      lat: coord.lat, lng: coord.lng,
      lipa_number: firstLipa.number, qr_code_url: firstLipa.qr_code_url, cover_url: coverUrl,
    }).select("*").single();

    if (error || !shop) { setBusy(false); return toast.error(error?.message ?? "Failed"); }

    await supabase.from("shop_lipa_numbers").insert(
      validLipas.map((l, i) => ({
        shop_id: shop.id,
        provider: l.provider,
        account_type: l.account_type,
        number: l.number.trim(),
        account_name: l.account_name.trim() || null,
        instructions: l.instructions.trim() || null,
        qr_code_url: l.qr_code_url,
        is_default: l.is_default,
        active: true,
        sort_order: i,
      }))
    );

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
            <div>
              <Label>Picha kuu ya duka (cover) <span className="text-xs text-muted-foreground">— hiari</span></Label>
              <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              {coverFile && <p className="mt-1 text-xs text-muted-foreground">Imechaguliwa: {coverFile.name}</p>}
            </div>
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
          <div className="space-y-4">
            <div className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
              Ongeza walau njia moja ya malipo. Unaweza kuongeza nyingi (M-Pesa, Mixx, Airtel, NMB, CRDB, Selcom…) — mteja atachagua ipi atumie.
            </div>
            {lipas.map((l, i) => {
              const p = l.provider ? getProvider(l.provider) : null;
              return (
                <div key={i} className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Njia #{i + 1}{p ? ` — ${p.shortName}` : ""}
                      {l.is_default && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary"><Star className="h-3 w-3" /> Default</span>}
                    </span>
                    {lipas.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeLipa(i)} className="gap-1 text-destructive">
                        <Trash2 className="h-3 w-3" /> Ondoa
                      </Button>
                    )}
                  </div>
                  <LipaNumberForm
                    value={l}
                    onChange={(v) => updateLipa(i, v)}
                    userId={user!.id}
                  />
                </div>
              );
            })}
            <Button variant="outline" onClick={addLipa} className="w-full gap-1.5">
              <Plus className="h-4 w-4" /> Ongeza njia nyingine
            </Button>
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
