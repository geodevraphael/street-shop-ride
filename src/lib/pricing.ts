// Bolt-like delivery pricing
export const MIN_FARE = 1500;
export const PER_KM = 100;
export const PER_MIN = 20;

export function computeFare(km: number, minutes: number): number {
  const computed = MIN_FARE + PER_KM * km + PER_MIN * minutes;
  return Math.max(MIN_FARE, Math.round(computed));
}

// Haversine distance in km
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

// Rough ETA: assume avg 25 km/h urban boda
export function etaMinutes(km: number): number {
  return Math.max(5, Math.round((km / 25) * 60));
}

// Tanzanian Shilling formatter (kept name for backwards-compat).
export function formatKES(amount: number): string {
  return `TSh ${amount.toLocaleString()}`;
}
export const formatTSH = formatKES;
