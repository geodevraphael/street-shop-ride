import { supabase } from "@/integrations/supabase/client";

// ---- Defaults (used when admin hasn't customised) ----
export const DEFAULT_PRICING = {
  min_fare: 1500,
  per_km: 100,
  per_min: 20,
};

export type PricingConfig = typeof DEFAULT_PRICING;

// Legacy named exports for backwards compat
export const MIN_FARE = DEFAULT_PRICING.min_fare;
export const PER_KM = DEFAULT_PRICING.per_km;
export const PER_MIN = DEFAULT_PRICING.per_min;

let _cache: { cfg: PricingConfig; t: number } | null = null;
const TTL_MS = 60_000;

export async function getPricingConfig(): Promise<PricingConfig> {
  if (_cache && Date.now() - _cache.t < TTL_MS) return _cache.cfg;
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "delivery_pricing")
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<PricingConfig>;
  const cfg: PricingConfig = {
    min_fare: Number(v.min_fare ?? DEFAULT_PRICING.min_fare),
    per_km: Number(v.per_km ?? DEFAULT_PRICING.per_km),
    per_min: Number(v.per_min ?? DEFAULT_PRICING.per_min),
  };
  _cache = { cfg, t: Date.now() };
  return cfg;
}

export function invalidatePricingCache() {
  _cache = null;
}

export function computeFareWith(cfg: PricingConfig, km: number, minutes: number): number {
  const computed = cfg.min_fare + cfg.per_km * km + cfg.per_min * minutes;
  return Math.max(cfg.min_fare, Math.round(computed));
}

// Legacy sync API (uses defaults)
export function computeFare(km: number, minutes: number): number {
  return computeFareWith(DEFAULT_PRICING, km, minutes);
}

// Haversine distance in km (straight-line, used as fallback / for sorting)
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Real driving distance using OSRM (public demo server). Returns km + minutes.
// Falls back to haversine + heuristic ETA on network/HTTP failure.
export async function routeDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): Promise<{ km: number; min: number; source: "osrm" | "fallback" }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(to);
    if (!res.ok) throw new Error("osrm http " + res.status);
    const json = await res.json();
    const r = json?.routes?.[0];
    if (!r) throw new Error("no route");
    return {
      km: r.distance / 1000,
      min: Math.max(1, Math.round(r.duration / 60)),
      source: "osrm",
    };
  } catch {
    const km = distanceKm(a, b);
    return { km, min: etaMinutes(km), source: "fallback" };
  }
}

// Rough ETA fallback: assume avg 25 km/h urban boda
export function etaMinutes(km: number): number {
  return Math.max(5, Math.round((km / 25) * 60));
}

// Tanzanian Shilling formatter (kept name for backwards-compat).
export function formatKES(amount: number): string {
  return `TSh ${amount.toLocaleString()}`;
}
export const formatTSH = formatKES;
