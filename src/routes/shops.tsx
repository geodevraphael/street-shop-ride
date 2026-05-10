import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { distanceKm } from "@/lib/pricing";
import { MapPin, Star, Search, Locate } from "lucide-react";

export const Route = createFileRoute("/shops")({
  head: () => ({ meta: [{ title: "Browse shops — Soko" }, { name: "description", content: "Local shops near you, by street or search." }] }),
  component: Shops,
});

type Shop = { id: string; name: string; category: string | null; street: string | null; lat: number | null; lng: number | null; cover_url: string | null; rating: number | null; verified: boolean };

function Shops() {
  const [q, setQ] = useState("");
  const [street, setStreet] = useState("");
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  const { data: shops = [] } = useQuery({
    queryKey: ["shops", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,name,category,street,lat,lng,cover_url,rating,verified");
      return (data ?? []) as Shop[];
    },
  });

  const filtered = useMemo(() => {
    let list = shops;
    if (q) list = list.filter((s) => (s.name + " " + (s.category ?? "")).toLowerCase().includes(q.toLowerCase()));
    if (street) list = list.filter((s) => (s.street ?? "").toLowerCase().includes(street.toLowerCase()));
    if (me) {
      list = [...list].sort((a, b) => {
        if (a.lat == null || b.lat == null) return 0;
        return distanceKm(me, { lat: a.lat, lng: a.lng! }) - distanceKm(me, { lat: b.lat, lng: b.lng! });
      });
    }
    return list;
  }, [shops, q, street, me]);

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition((p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }), () => alert("Location denied"));
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Shops</h1>
      <p className="mt-1 text-sm text-muted-foreground">Browse local shops by name, street, or nearby.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search shop or category" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Filter by street / area" value={street} onChange={(e) => setStreet(e.target.value)} />
        </div>
        <Button variant={me ? "default" : "outline"} onClick={useMyLocation} className="gap-2">
          <Locate className="h-4 w-4" /> {me ? "Sorted nearby" : "Near me"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">No shops yet. If you're a seller, register and add yours.</div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Link key={s.id} to="/shops/$shopId" params={{ shopId: s.id }} className="group overflow-hidden rounded-2xl border bg-card transition hover:border-primary hover:shadow-md">
              <div className="aspect-[5/3] overflow-hidden bg-secondary">
                {s.cover_url ? (
                  <img src={s.cover_url} alt={s.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">{s.name[0]}</div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <h3 className="truncate font-semibold">{s.name}</h3>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-warning text-warning" />{(s.rating ?? 5).toFixed(1)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.category ?? "Shop"} · {s.street ?? "—"}</p>
                {me && s.lat != null && (
                  <p className="mt-1 text-xs text-primary">{distanceKm(me, { lat: s.lat, lng: s.lng! }).toFixed(1)} km away</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
