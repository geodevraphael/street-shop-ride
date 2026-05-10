import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { Store, ShoppingBag, MapPin, Search, ArrowRight, Star, Package } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soko — Nunua karibu nawe, kwa boda" },
      { name: "description", content: "Order from local shops across Tanzania. Pay with Lipa or QR. Delivered by nearby boda boda." },
    ],
  }),
  component: Index,
});

type Shop = { id: string; name: string; category: string | null; street: string | null; cover_url: string | null; rating: number | null };

function Index() {
  const [tab, setTab] = useState<"categories" | "shops">("categories");

  const { data: shops = [] } = useQuery({
    queryKey: ["shops", "home"],
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,name,category,street,cover_url,rating").limit(60);
      return (data ?? []) as Shop[];
    },
  });

  const { data: counts = new Map<string, number>() } = useQuery({
    queryKey: ["category-counts"],
    queryFn: async () => {
      const { data } = await supabase.rpc("category_counts");
      const m = new Map<string, number>();
      (data ?? []).forEach((r: any) => m.set(r.category, Number(r.count)));
      return m;
    },
  });

  const total = useMemo(() => [...counts.values()].reduce((a, b) => a + b, 0), [counts]);

  return (
    <AppShell>
      {/* Quick search shortcut */}
      <Link
        to="/products/search"
        className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        Tafuta bidhaa kutoka maduka ya karibu nawe…
      </Link>

      {/* Switcher */}
      <div className="mt-5 grid w-full grid-cols-2 rounded-2xl border bg-card p-1 shadow-sm">
        <SwitchBtn active={tab === "categories"} onClick={() => setTab("categories")} icon={Package}>
          Aina <span className="hidden sm:inline opacity-70">· Categories</span>
        </SwitchBtn>
        <SwitchBtn active={tab === "shops"} onClick={() => setTab("shops")} icon={ShoppingBag}>
          Maduka <span className="hidden sm:inline opacity-70">· Shops</span>
        </SwitchBtn>
      </div>

      {tab === "categories" ? (
        <section className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Chagua aina · Pick a category</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            <CategoryChip
              to={{ to: "/products/search" } as any}
              label="Zote" sub="All" count={total}
              icon={Package}
            />
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c.key}
                to={{ to: "/products/search", search: { category: c.key } } as any}
                label={c.sw} sub={c.en}
                count={counts.get(c.key) ?? 0}
                icon={c.icon}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-4">
          {shops.length === 0 ? (
            <EmptyState text="Hakuna maduka bado. Jisajili kama muuzaji ili kuanza." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shops.map((s) => (
                <Link key={s.id} to="/shops/$shopId" params={{ shopId: s.id }} className="group overflow-hidden rounded-2xl border bg-card transition hover:border-primary hover:shadow-md">
                  <div className="aspect-[5/3] overflow-hidden bg-secondary">
                    {s.cover_url ? (
                      <img src={s.cover_url} alt={s.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground"><ShoppingBag className="h-6 w-6" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate font-semibold">{s.name}</h3>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-warning text-warning" />{(s.rating ?? 5).toFixed(1)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.category ?? "Duka"} · {s.street ?? "—"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link to="/shops" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Maduka yote <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Pickup hint */}
      <p className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 text-primary" /> Tanzania · soko la mtaa wako
      </p>
    </AppShell>
  );
}

function SwitchBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon?: any; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function CategoryChip({
  to, label, sub, count, icon: Icon,
}: { to: any; label: string; sub: string; count: number; icon: any }) {
  return (
    <Link
      {...to}
      className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center transition hover:border-primary hover:bg-primary/5"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="truncate text-xs font-medium leading-tight">{label}</span>
      <span className="truncate text-[10px] text-muted-foreground leading-tight">{sub}{count ? ` · ${count}` : ""}</span>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">{text}</div>;
}

// Decorative imports kept to avoid TS unused warnings if we re-add later
void Store;
