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

    // Cache: level|name|parent -> id
    const cache: Record<string, string> = {};
    const key = (level: LevelKey, name: string, parent: string | null) => `${level}|${(name || "").trim().toLowerCase()}|${parent ?? ""}`;

    // Pre-load existing rows
    const { data: existing } = await supabase.from("regions").select("id,name,level,parent_id");
    (existing ?? []).forEach((r: any) => { cache[key(r.level, r.name, r.parent_id)] = r.id; });

    // Bulk insert helper: inserts unique rows for a level in chunks, updates cache
    const bulkInsert = async (
      level: LevelKey,
      rows: Array<{ name: string; parent_id: string | null; geojson?: any }>,
    ) => {
      // dedupe within batch + skip ones already cached
      const seen = new Set<string>();
      const fresh: typeof rows = [];
      for (const r of rows) {
        const k = key(level, r.name, r.parent_id);
        if (cache[k] || seen.has(k)) continue;
        seen.add(k);
        fresh.push({ ...r, name: r.name.trim() });
      }
      const CHUNK = 500;
      for (let i = 0; i < fresh.length; i += CHUNK) {
        const slice = fresh.slice(i, i + CHUNK).map((r) => ({
          name: r.name, level, parent_id: r.parent_id, geojson: r.geojson ?? null,
        }));
        const { data, error } = await supabase.from("regions").insert(slice).select("id,name,parent_id");
        if (error) throw error;
        (data ?? []).forEach((row: any) => { cache[key(level, row.name, row.parent_id)] = row.id; });
        setProgress(`${level}: ${Math.min(i + CHUNK, fresh.length)}/${fresh.length}`);
      }
    };

    let created = 0, skipped = 0;
    try {
      // Pass 1: regions
      const regionNames = new Set<string>();
      for (const f of features) {
        const v = String(f?.properties?.[fVillage] ?? "").trim();
        if (!v) continue;
        if (fRegion) {
          const n = String(f.properties[fRegion] ?? "").trim();
          if (n) regionNames.add(n);
        }
      }
      await bulkInsert("region", [...regionNames].map((name) => ({ name, parent_id: null })));

      // Pass 2: districts
      const districtRows: Array<{ name: string; parent_id: string | null }> = [];
      for (const f of features) {
        const p = f?.properties ?? {};
        if (!String(p[fVillage] ?? "").trim()) continue;
        const dName = fDistrict ? String(p[fDistrict] ?? "").trim() : "";
        if (!dName) continue;
        const rName = fRegion ? String(p[fRegion] ?? "").trim() : "";
        const parent = rName ? cache[key("region", rName, null)] ?? null : null;
        districtRows.push({ name: dName, parent_id: parent });
      }
      await bulkInsert("district", districtRows);

      // Pass 3: wards
      const wardRows: Array<{ name: string; parent_id: string | null }> = [];
      for (const f of features) {
        const p = f?.properties ?? {};
        if (!String(p[fVillage] ?? "").trim()) continue;
        const wName = fWard ? String(p[fWard] ?? "").trim() : "";
        if (!wName) continue;
        const dName = fDistrict ? String(p[fDistrict] ?? "").trim() : "";
        const rName = fRegion ? String(p[fRegion] ?? "").trim() : "";
        const rId = rName ? cache[key("region", rName, null)] ?? null : null;
        const dId = dName ? cache[key("district", dName, rId)] ?? null : null;
        wardRows.push({ name: wName, parent_id: dId });
      }
      await bulkInsert("ward", wardRows);

      // Pass 4: villages (with geojson)
      const villageRows: Array<{ name: string; parent_id: string | null; geojson: any }> = [];
      for (const f of features) {
        const p = f?.properties ?? {};
        const vName = String(p[fVillage] ?? "").trim();
        if (!vName) { skipped++; continue; }
        const wName = fWard ? String(p[fWard] ?? "").trim() : "";
        const dName = fDistrict ? String(p[fDistrict] ?? "").trim() : "";
        const rName = fRegion ? String(p[fRegion] ?? "").trim() : "";
        const rId = rName ? cache[key("region", rName, null)] ?? null : null;
        const dId = dName ? cache[key("district", dName, rId)] ?? null : null;
        const wId = wName ? cache[key("ward", wName, dId)] ?? null : null;
        villageRows.push({
          name: vName,
          parent_id: wId,
          geojson: { type: "Feature", geometry: f.geometry, properties: p },
        });
        created++;
      }
      await bulkInsert("village", villageRows);

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
