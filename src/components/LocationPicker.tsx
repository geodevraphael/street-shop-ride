import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Node = { id: string; name: string; parent_id: string | null; geojson: any };

export type LocationValue = {
  region?: Node;
  district?: Node;
  ward?: Node;
  village?: Node;
  /** centroid lat/lng (from village polygon centroid) */
  lat?: number;
  lng?: number;
  /** "Region › District › Ward › Village" */
  label: string;
};

export function LocationPicker({
  value,
  onChange,
  required = false,
}: {
  value?: LocationValue;
  onChange: (v: LocationValue) => void;
  required?: boolean;
}) {
  const [regions, setRegions] = useState<Node[]>([]);
  const [districts, setDistricts] = useState<Node[]>([]);
  const [wards, setWards] = useState<Node[]>([]);
  const [villages, setVillages] = useState<Node[]>([]);

  const [region, setRegion] = useState<Node | undefined>(value?.region);
  const [district, setDistrict] = useState<Node | undefined>(value?.district);
  const [ward, setWard] = useState<Node | undefined>(value?.ward);
  const [village, setVillage] = useState<Node | undefined>(value?.village);

  useEffect(() => {
    supabase
      .from("regions")
      .select("id,name,parent_id,geojson")
      .eq("level", "region")
      .order("name")
      .then(({ data }) => setRegions((data as any) ?? []));
  }, []);

  useEffect(() => {
    if (!region) {
      setDistricts([]);
      setDistrict(undefined);
      return;
    }
    supabase
      .from("regions")
      .select("id,name,parent_id,geojson")
      .eq("level", "district")
      .eq("parent_id", region.id)
      .order("name")
      .then(({ data }) => setDistricts((data as any) ?? []));
  }, [region?.id]);

  useEffect(() => {
    if (!district) {
      setWards([]);
      setWard(undefined);
      return;
    }
    supabase
      .from("regions")
      .select("id,name,parent_id,geojson")
      .eq("level", "ward")
      .eq("parent_id", district.id)
      .order("name")
      .then(({ data }) => setWards((data as any) ?? []));
  }, [district?.id]);

  useEffect(() => {
    if (!ward) {
      setVillages([]);
      setVillage(undefined);
      return;
    }
    supabase
      .from("regions")
      .select("id,name,parent_id,geojson")
      .eq("level", "village")
      .eq("parent_id", ward.id)
      .order("name")
      .then(({ data }) => setVillages((data as any) ?? []));
  }, [ward?.id]);

  const value2 = useMemo<LocationValue>(() => {
    const parts = [region?.name, district?.name, ward?.name, village?.name].filter(Boolean);
    let lat: number | undefined;
    let lng: number | undefined;
    if (village?.geojson?.coordinates) {
      [lng, lat] = village.geojson.coordinates;
    }
    return { region, district, ward, village, lat, lng, label: parts.join(" › ") };
  }, [region, district, ward, village]);

  useEffect(() => {
    onChange(value2);
    // eslint-disable-next-line
  }, [region?.id, district?.id, ward?.id, village?.id]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Mkoa" required={required}>
        <Select
          value={region?.id ?? ""}
          onValueChange={(id) => setRegion(regions.find((r) => r.id === id))}
        >
          <SelectTrigger><SelectValue placeholder="Chagua mkoa" /></SelectTrigger>
          <SelectContent>
            {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Wilaya" required={required}>
        <Select
          value={district?.id ?? ""}
          onValueChange={(id) => setDistrict(districts.find((d) => d.id === id))}
          disabled={!region}
        >
          <SelectTrigger><SelectValue placeholder={region ? "Chagua wilaya" : "Chagua mkoa kwanza"} /></SelectTrigger>
          <SelectContent>
            {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Kata">
        <Select
          value={ward?.id ?? ""}
          onValueChange={(id) => setWard(wards.find((w) => w.id === id))}
          disabled={!district}
        >
          <SelectTrigger><SelectValue placeholder={district ? "Chagua kata" : "Chagua wilaya kwanza"} /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {wards.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Kijiji / Mtaa">
        <Select
          value={village?.id ?? ""}
          onValueChange={(id) => setVillage(villages.find((v) => v.id === id))}
          disabled={!ward}
        >
          <SelectTrigger><SelectValue placeholder={ward ? "Chagua kijiji / mtaa" : "Chagua kata kwanza"} /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {villages.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
