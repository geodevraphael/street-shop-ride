import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

export type MapPoint = { lat: number; lng: number; label?: string };

function divIcon(kind: "shop" | "rider" | "client" | "dest", letter: string) {
  return L.divIcon({
    html: `<div class="brand-marker ${kind}">${letter}</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 15);
      return;
    }
    const b = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
  }, [points, map]);
  return null;
}

export function TrackingMap({
  shop, rider, client, destination, height = 320,
}: {
  shop?: MapPoint | null;
  rider?: MapPoint | null;
  client?: MapPoint | null;
  destination?: MapPoint | null;
  height?: number;
}) {
  const points = useMemo(
    () => [shop, rider, client, destination].filter(Boolean) as MapPoint[],
    [shop, rider, client, destination],
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lng]
    : [-6.7924, 39.2083]; // Dar es Salaam fallback

  const path = [shop, rider, destination]
    .filter(Boolean)
    .map((p) => [p!.lat, p!.lng] as [number, number]);

  if (points.length === 0 || !mounted) {
    return (
      <div className="grid place-items-center rounded-2xl border bg-secondary text-sm text-muted-foreground"
           style={{ height }}>
        {points.length === 0 ? "Hakuna eneo lililobainishwa" : "Inapakia ramani…"}
      </div>
    );
  }

  return (
    <div className="brand-map border" style={{ height }}>
      <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {shop && <Marker position={[shop.lat, shop.lng]} icon={divIcon("shop", "S")} />}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={divIcon("dest", "D")} />}
        {client && <Marker position={[client.lat, client.lng]} icon={divIcon("client", "U")} />}
        {rider && <Marker position={[rider.lat, rider.lng]} icon={divIcon("rider", "R")} />}
        {path.length >= 2 && (
          <Polyline positions={path} pathOptions={{ color: "oklch(0.74 0.16 65)", weight: 4, opacity: 0.7, dashArray: "6 8" }} />
        )}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
