import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map as MapIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/regions")({ component: AdminRegions });

function AdminRegions() {
  const [regions, setRegions] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<"region"|"county"|"subcounty"|"ward"|"village">("region");
  const [parentId, setParentId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => supabase.from("regions").select("*").order("name").then(({ data }) => setRegions(data ?? []));
  useEffect(() => { load(); }, []);

  const onFile = async (f: File | null) => {
    setFile(f); setPreview(null);
    if (!f) return;
    try { setPreview(JSON.parse(await f.text())); } catch { toast.error("Invalid GeoJSON"); }
  };

  const upload = async () => {
    if (!name || !preview) return toast.error("Name and GeoJSON required");
    setBusy(true);
    const { error } = await supabase.from("regions").insert({ name, level, parent_id: parentId || null, geojson: preview });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Region saved");
    setName(""); setFile(null); setPreview(null); setParentId("");
    load();
  };

  const del = async (id: string) => {
    await supabase.from("regions").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const featureCount = preview?.features?.length ?? (preview?.type === "Feature" ? 1 : 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="flex items-center gap-2 font-semibold"><MapIcon className="h-4 w-4 text-primary" /> Upload GeoJSON layer</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nairobi County" /></div>
          <div>
            <Label>Level</Label>
            <Select value={level} onValueChange={(v: any) => setLevel(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="region">Region</SelectItem>
                <SelectItem value="county">County</SelectItem>
                <SelectItem value="subcounty">Sub-county</SelectItem>
                <SelectItem value="ward">Ward</SelectItem>
                <SelectItem value="village">Village</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Parent (optional)</Label>
            <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.level})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>GeoJSON file</Label><Input type="file" accept=".json,.geojson,application/geo+json" onChange={(e) => onFile(e.target.files?.[0] ?? null)} /></div>
        </div>
        {preview && (
          <div className="mt-3 rounded-xl border bg-secondary p-3 text-xs">
            <div className="font-medium">Preview · {featureCount} feature(s)</div>
            <pre className="mt-1 max-h-40 overflow-auto text-[10px]">{JSON.stringify(preview, null, 2).slice(0, 1500)}…</pre>
          </div>
        )}
        <Button className="mt-3" onClick={upload} disabled={busy || !name || !preview}>{busy ? "Saving…" : "Save layer"}</Button>
      </section>

      <section>
        <h3 className="font-semibold">Layers</h3>
        {regions.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No layers yet.</p> : (
          <ul className="mt-2 divide-y rounded-2xl border bg-card">
            {regions.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3">
                <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.level}</div></div>
                <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
