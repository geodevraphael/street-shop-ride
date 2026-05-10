import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map as MapIcon, Trash2, Wand2, Layers } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/regions")({ component: AdminRegions });

type LevelKey = "region" | "district" | "ward" | "village" | "street";

function AdminRegions() {
  const [regions, setRegions] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");

  // Field mapping for hierarchical import (one village GeoJSON → 4 levels)
  const [fVillage, setFVillage] = useState("");
  const [fWard, setFWard] = useState("");
  const [fDistrict, setFDistrict] = useState("");
  const [fRegion, setFRegion] = useState("");

  const load = () =>
    supabase.from("regions").select("*").order("level").order("name").then(({ data }) => setRegions(data ?? []));
  useEffect(() => { load(); }, []);

  const features: any[] = useMemo(() => {
    if (!preview) return [];
    if (preview.type === "FeatureCollection") return preview.features ?? [];
    if (preview.type === "Feature") return [preview];
    return [];
  }, [preview]);

  const sourceProps = useMemo(() => {
    const set = new Set<string>();
    features.slice(0, 100).forEach((f) => Object.keys(f?.properties ?? {}).forEach((k) => set.add(k)));
    return [...set];
  }, [features]);

  // Auto-suggest mapping based on common Tanzania admin field names
  useEffect(() => {
    if (sourceProps.length === 0) return;
    const find = (cands: string[]) =>
      sourceProps.find((p) => cands.some((c) => p.toLowerCase().includes(c))) ?? "";
    if (!fVillage) setFVillage(find(["village", "kijiji", "vil_name", "mtaa", "street"]) || find(["name"]));
    if (!fWard) setFWard(find(["ward", "kata"]));
    if (!fDistrict) setFDistrict(find(["district", "wilaya", "council"]));
    if (!fRegion) setFRegion(find(["region", "mkoa"]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceProps]);

  const onFile = async (f: File | null) => {
    setPreview(null);
    setFVillage(""); setFWard(""); setFDistrict(""); setFRegion("");
    if (!f) return;
    try { setPreview(JSON.parse(await f.text())); }
    catch { toast.error("Invalid GeoJSON"); }
  };

  const upload = async () => {
    if (!preview || features.length === 0) return toast.error("GeoJSON required");
    if (!fVillage) return toast.error("Map at least the Village name field");
    setBusy(true);

    // Cache: level → name|parentId → row id
    const cache: Record<string, string> = {};
    const key = (level: LevelKey, name: string, parent: string | null) => `${level}|${(name || "").toLowerCase()}|${parent ?? ""}`;

    // Pre-load existing rows into cache to avoid duplicates across re-imports
    const { data: existing } = await supabase.from("regions").select("id,name,level,parent_id");
    (existing ?? []).forEach((r: any) => { cache[key(r.level, r.name, r.parent_id)] = r.id; });

    const ensure = async (level: LevelKey, name: string, parent: string | null, geojson?: any): Promise<string | null> => {
      const n = (name || "").trim();
      if (!n) return null;
      const k = key(level, n, parent);
      if (cache[k]) return cache[k];
      const { data, error } = await supabase
        .from("regions")
        .insert({ name: n, level, parent_id: parent, geojson: geojson ?? null })
        .select("id")
        .single();
      if (error) throw error;
      cache[k] = data.id;
      return data.id;
    };

    let created = 0, skipped = 0;
    try {
      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        const p = f?.properties ?? {};
        const regionName = fRegion ? String(p[fRegion] ?? "").trim() : "";
        const districtName = fDistrict ? String(p[fDistrict] ?? "").trim() : "";
        const wardName = fWard ? String(p[fWard] ?? "").trim() : "";
        const villageName = String(p[fVillage] ?? "").trim();

        if (!villageName) { skipped++; continue; }

        const regionId = regionName ? await ensure("region", regionName, null) : null;
        const districtId = districtName ? await ensure("district", districtName, regionId) : null;
        const wardId = wardName ? await ensure("ward", wardName, districtId) : null;
        await ensure("village", villageName, wardId, { type: "Feature", geometry: f.geometry, properties: p });
        created++;

        if (i % 25 === 0) setProgress(`${i + 1} / ${features.length}`);
      }
      setProgress("");
      toast.success(`Imported ${created} villages (skipped ${skipped})`);
      setPreview(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    await supabase.from("regions").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    regions.forEach((r) => { c[r.level] = (c[r.level] ?? 0) + 1; });
    return c;
  }, [regions]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <MapIcon className="h-4 w-4 text-primary" /> Import villages GeoJSON (hierarchical)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          One file with village geometries + attributes (region, district, ward, village).
          We auto-build the Region → District → Ward → Village tree and link them.
        </p>

        <div className="mt-3">
          <Label>GeoJSON file</Label>
          <Input type="file" accept=".json,.geojson,application/geo+json" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </div>

        {features.length > 0 && (
          <div className="mt-4 rounded-xl border bg-secondary p-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              Field mapping · {features.length} village{features.length === 1 ? "" : "s"} detected
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <MapField label="Region (Mkoa)" value={fRegion} onChange={setFRegion} options={sourceProps} allowNone />
              <MapField label="District (Wilaya)" value={fDistrict} onChange={setFDistrict} options={sourceProps} allowNone />
              <MapField label="Ward (Kata)" value={fWard} onChange={setFWard} options={sourceProps} allowNone />
              <MapField label="Village / Mtaa *" value={fVillage} onChange={setFVillage} options={sourceProps} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Parent levels are created once per unique name. Re-importing won't duplicate them.
            </p>
          </div>
        )}

        <Button className="mt-4" onClick={upload} disabled={busy || !preview}>
          {busy ? `Importing… ${progress}` : `Import ${features.length || ""} villages`}
        </Button>
      </section>

      <section>
        <h3 className="flex items-center gap-2 font-semibold">
          <Layers className="h-4 w-4 text-primary" /> Layers
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {(["region","district","ward","village","street"] as LevelKey[]).map((l) => `${l}: ${counts[l] ?? 0}`).join(" · ")}
          </span>
        </h3>
        {regions.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No layers yet.</p> : (
          <ul className="mt-2 max-h-96 divide-y overflow-y-auto rounded-2xl border bg-card">
            {regions.slice(0, 500).map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.level}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => del(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
            {regions.length > 500 && (
              <li className="p-3 text-center text-xs text-muted-foreground">…and {regions.length - 500} more</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function MapField({
  label, value, onChange, options, allowNone,
}: { label: string; value: string; onChange: (v: string) => void; options: string[]; allowNone?: boolean }) {
  return (
    <div>
      <Label className="text-[11px]">{label}</Label>
      <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="none">— none —</SelectItem>}
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
