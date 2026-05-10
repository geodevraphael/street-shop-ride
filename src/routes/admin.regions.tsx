import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map as MapIcon, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/regions")({ component: AdminRegions });

type LevelKey = "region" | "district" | "ward" | "village" | "street";
const LEVELS: { key: LevelKey; label: string }[] = [
  { key: "region", label: "Region (Mkoa)" },
  { key: "district", label: "District (Wilaya)" },
  { key: "ward", label: "Ward (Kata)" },
  { key: "village", label: "Village (Kijiji)" },
  { key: "street", label: "Street (Mtaa)" },
];

function AdminRegions() {
  const [regions, setRegions] = useState<any[]>([]);
  const [bulkName, setBulkName] = useState("");
  const [level, setLevel] = useState<LevelKey>("region");
  const [parentId, setParentId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  // Field mapping: which property in the source GeoJSON maps to which target field
  const [mapName, setMapName] = useState<string>("");
  const [mapLevel, setMapLevel] = useState<string>("");
  const [mapParent, setMapParent] = useState<string>("");

  const load = () => supabase.from("regions").select("*").order("name").then(({ data }) => setRegions(data ?? []));
  useEffect(() => { load(); }, []);

  const features: any[] = useMemo(() => {
    if (!preview) return [];
    if (preview.type === "FeatureCollection") return preview.features ?? [];
    if (preview.type === "Feature") return [preview];
    return [];
  }, [preview]);

  const sourceProps = useMemo(() => {
    const set = new Set<string>();
    features.slice(0, 50).forEach((f) => Object.keys(f?.properties ?? {}).forEach((k) => set.add(k)));
    return [...set];
  }, [features]);

  // Auto-suggest mapping
  useEffect(() => {
    if (sourceProps.length === 0) return;
    const find = (cands: string[]) => sourceProps.find((p) => cands.some((c) => p.toLowerCase().includes(c)));
    if (!mapName) setMapName(find(["name", "shape", "title"]) ?? sourceProps[0] ?? "");
    if (!mapLevel) setMapLevel(find(["level", "admin", "type"]) ?? "");
    if (!mapParent) setMapParent(find(["parent", "region", "district", "ward"]) ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceProps]);

  const onFile = async (f: File | null) => {
    setFile(f); setPreview(null); setMapName(""); setMapLevel(""); setMapParent("");
    if (!f) return;
    try { setPreview(JSON.parse(await f.text())); } catch { toast.error("Invalid GeoJSON"); }
  };

  const upload = async () => {
    if (!preview) return toast.error("GeoJSON required");
    setBusy(true);

    let rows: any[] = [];
    if (features.length > 0 && mapName) {
      // Multi-feature import using mapping
      rows = features
        .map((f) => {
          const props = f?.properties ?? {};
          const name = String(props[mapName] ?? "").trim();
          if (!name) return null;
          const lvlRaw = mapLevel ? String(props[mapLevel] ?? "").toLowerCase() : level;
          const lvl: LevelKey = (LEVELS.find((l) => l.key === lvlRaw)?.key) ?? level;
          return {
            name,
            level: lvl,
            parent_id: parentId || null,
            geojson: { type: "Feature", geometry: f.geometry, properties: props },
          };
        })
        .filter(Boolean) as any[];
    } else {
      // Single layer fallback
      if (!bulkName) { setBusy(false); return toast.error("Layer name required"); }
      rows = [{ name: bulkName, level, parent_id: parentId || null, geojson: preview }];
    }

    if (rows.length === 0) { setBusy(false); return toast.error("Nothing to import"); }

    const { error } = await supabase.from("regions").insert(rows);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${rows.length} layer${rows.length === 1 ? "" : "s"}`);
    setBulkName(""); setFile(null); setPreview(null); setParentId("");
    setMapName(""); setMapLevel(""); setMapParent("");
    load();
  };

  const del = async (id: string) => {
    await supabase.from("regions").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <MapIcon className="h-4 w-4 text-primary" /> Upload GeoJSON layer (Tanzania admin)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Region → District → Ward → Village/Street. Map your file's property names to our fields below.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Default level</Label>
            <Select value={level} onValueChange={(v: LevelKey) => setLevel(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Parent layer (optional)</Label>
            <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.level})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>GeoJSON file</Label>
            <Input type="file" accept=".json,.geojson,application/geo+json" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        {features.length > 0 && (
          <div className="mt-4 rounded-xl border bg-secondary p-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              Field mapping · {features.length} feature{features.length === 1 ? "" : "s"} detected
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <MapField label="Name *" value={mapName} onChange={setMapName} options={sourceProps} />
              <MapField label="Level (optional)" value={mapLevel} onChange={setMapLevel} options={sourceProps} allowNone />
              <MapField label="Parent name (optional)" value={mapParent} onChange={setMapParent} options={sourceProps} allowNone />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Each feature becomes one layer. Empty Level falls back to the default above.
            </p>
          </div>
        )}

        {features.length === 0 && preview && (
          <div className="mt-3">
            <Label>Layer name</Label>
            <Input value={bulkName} onChange={(e) => setBulkName(e.target.value)} placeholder="e.g. Dar es Salaam" />
          </div>
        )}

        <Button className="mt-4" onClick={upload} disabled={busy || !preview}>
          {busy ? "Saving…" : features.length > 1 ? `Import ${features.length} layers` : "Save layer"}
        </Button>
      </section>

      <section>
        <h3 className="font-semibold">Layers</h3>
        {regions.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No layers yet.</p> : (
          <ul className="mt-2 divide-y rounded-2xl border bg-card">
            {regions.map((r) => (
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
