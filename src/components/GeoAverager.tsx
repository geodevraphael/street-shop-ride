import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Check } from "lucide-react";

export type Coord = { lat: number; lng: number; accuracy?: number };

/** Samples GPS for ~30s and averages for high accuracy. */
export function GeoAverager({
  durationMs = 30000,
  onResult,
}: {
  durationMs?: number;
  onResult: (c: Coord) => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<Coord | null>(null);
  const watchId = useRef<number | null>(null);
  const samples = useRef<Coord[]>([]);
  const startedAt = useRef(0);

  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);

  const start = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    samples.current = [];
    setCount(0);
    setProgress(0);
    setResult(null);
    setRunning(true);
    startedAt.current = Date.now();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        samples.current.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setCount(samples.current.length);
      },
      (err) => { console.error(err); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      setProgress(Math.min(100, (elapsed / durationMs) * 100));
      if (elapsed >= durationMs) {
        clearInterval(tick);
        if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
        setRunning(false);
        if (samples.current.length === 0) { alert("Could not capture location"); return; }
        // weighted average by inverse accuracy
        const weights = samples.current.map((s) => 1 / Math.max(1, s.accuracy ?? 50));
        const wSum = weights.reduce((a, b) => a + b, 0);
        const lat = samples.current.reduce((a, s, i) => a + s.lat * weights[i], 0) / wSum;
        const lng = samples.current.reduce((a, s, i) => a + s.lng * weights[i], 0) / wSum;
        const accuracy = samples.current.reduce((a, s, i) => a + (s.accuracy ?? 50) * weights[i], 0) / wSum;
        const c = { lat, lng, accuracy };
        setResult(c);
        onResult(c);
      }
    }, 250);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <MapPin className="h-4 w-4 text-primary" /> 30-second GPS averaging
      </div>
      {!running && !result && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Stand still at your shop entrance and tap Start. We'll sample your GPS for 30s for an accurate location.
          </p>
          <Button onClick={start}>Start capture</Button>
        </>
      )}
      {running && (
        <>
          <div className="mb-2 h-2 overflow-hidden rounded bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sampling… {count} readings
          </div>
        </>
      )}
      {result && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-success"><Check className="h-4 w-4" /> Location captured</div>
          <div className="text-xs text-muted-foreground">
            {result.lat.toFixed(6)}, {result.lng.toFixed(6)} · ±{Math.round(result.accuracy ?? 0)}m
          </div>
          <Button variant="outline" size="sm" onClick={start}>Re-capture</Button>
        </div>
      )}
    </div>
  );
}
