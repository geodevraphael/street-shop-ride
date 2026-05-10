import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LatLng = { lat: number; lng: number; t?: number };

/**
 * Lightweight live tracking using Supabase Realtime BROADCAST channels.
 * No DB writes — messages are ephemeral. Channel name: track:{orderId}.
 */
export function useTrackOrder(orderId: string | null) {
  const [riderPos, setRiderPos] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase.channel(`track:${orderId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "pos" }, ({ payload }) => {
      if (payload && typeof payload.lat === "number") setRiderPos(payload as LatLng);
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return riderPos;
}

/**
 * Rider broadcaster: streams position every ~10s while enabled.
 * Persists to riders.current_lat/lng at most every 60s as a cold-load fallback.
 */
export function useBroadcastPosition(orderId: string | null, riderId: string | null, enabled: boolean) {
  const [pos, setPos] = useState<LatLng | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastPersistRef = useRef(0);

  useEffect(() => {
    if (!enabled || !orderId || !riderId) return;
    const channel = supabase.channel(`track:${orderId}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    channelRef.current = channel;

    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (p) => {
        const payload: LatLng = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
        setPos(payload);
        channel.send({ type: "broadcast", event: "pos", payload });
        // Throttled cold-load fallback persistence.
        if (Date.now() - lastPersistRef.current > 60_000) {
          lastPersistRef.current = Date.now();
          await supabase.from("riders").update({ current_lat: payload.lat, current_lng: payload.lng }).eq("id", riderId);
        }
      },
      (err) => console.warn("[geo]", err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, orderId, riderId]);

  return pos;
}
