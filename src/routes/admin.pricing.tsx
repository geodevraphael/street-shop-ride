import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_PRICING, invalidatePricingCache, computeFareWith, formatKES, type PricingConfig } from "@/lib/pricing";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/admin/pricing")({ component: AdminPricing });

function AdminPricing() {
  const [cfg, setCfg] = useState<PricingConfig>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "delivery_pricing").maybeSingle().then(({ data }) => {
      const v = (data?.value ?? {}) as Partial<PricingConfig>;
      setCfg({
        min_fare: Number(v.min_fare ?? DEFAULT_PRICING.min_fare),
        per_km: Number(v.per_km ?? DEFAULT_PRICING.per_km),
        per_min: Number(v.per_min ?? DEFAULT_PRICING.per_min),
      });
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "delivery_pricing", value: cfg as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    invalidatePricingCache();
    toast.success("Vigezo vya bei vimehifadhiwa");
  };

  const reset = () => setCfg(DEFAULT_PRICING);

  // Live preview
  const sample = [
    { km: 2, min: 8 },
    { km: 5, min: 15 },
    { km: 10, min: 25 },
  ];

  if (loading) return <p className="text-sm text-muted-foreground">Inapakia…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Vigezo vya bei ya delivery</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Badilisha kima cha chini, gharama kwa kilomita, na gharama kwa dakika. Mabadiliko yataonekana kwenye checkout mara moja.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="min_fare">Kima cha chini (TSh)</Label>
          <Input id="min_fare" type="number" min={0} value={cfg.min_fare}
            onChange={(e) => setCfg({ ...cfg, min_fare: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="per_km">Kwa km (TSh)</Label>
          <Input id="per_km" type="number" min={0} value={cfg.per_km}
            onChange={(e) => setCfg({ ...cfg, per_km: Number(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="per_min">Kwa dakika (TSh)</Label>
          <Input id="per_min" type="number" min={0} value={cfg.per_min}
            onChange={(e) => setCfg({ ...cfg, per_min: Number(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Mfano wa bei</h3>
        <table className="mt-2 w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="text-left">Umbali</th><th className="text-left">Muda</th><th className="text-right">Bei</th></tr>
          </thead>
          <tbody>
            {sample.map((s) => (
              <tr key={s.km} className="border-t">
                <td className="py-2">{s.km} km</td>
                <td>{s.min} min</td>
                <td className="text-right font-semibold">{formatKES(computeFareWith(cfg, s.km, s.min))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" /> {saving ? "Inahifadhi…" : "Hifadhi"}
        </Button>
        <Button onClick={reset} variant="outline" className="gap-1.5">
          <RotateCcw className="h-4 w-4" /> Rudisha chaguo-msingi
        </Button>
      </div>
    </div>
  );
}
