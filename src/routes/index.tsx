import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/pricing";
import { CATEGORIES, getCategory } from "@/lib/categories";
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

type Product = { id: string; name: string; price: number; image_url: string | null; category: string | null; shop_id: string };
type Shop = { id: string; name: string; category: string | null; street: string | null; cover_url: string | null; rating: number | null };

function Index() {
  const [tab, setTab] = useState<"categories" | "shops">("categories");
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("products").select("id,name,price,image_url,category,shop_id").eq("active", true).limit(200)
      .then(({ data }) => setProducts((data ?? []) as Product[]));
    supabase.from("shops").select("id,name,category,street,cover_url,rating").limit(60)
      .then(({ data }) => setShops((data ?? []) as Shop[]));
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p) => {
      const k = p.category?.trim() || "Other";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [products]);

  const filteredProducts = useMemo(
    () => (activeCat ? products.filter((p) => (p.category ?? "Other") === activeCat) : products).slice(0, 12),
    [products, activeCat],
  );

  return (
    <AppShell>
      {/* Hero */}
      <section className="rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-accent p-6 md:p-10">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <MapPin className="h-3 w-3 text-primary" /> Tanzania · soko la mtaa wako
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Nunua mtaani. <span className="text-primary">Letewa na boda.</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Vinjari maduka, lipa kwa Lipa Number au QR, upate bidhaa nyumbani — kuanzia {formatKES(1500)}.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/products/search" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Search className="h-4 w-4" /> Tafuta bidhaa
            </Link>
            <Link to="/shops" className="inline-flex items-center gap-2 rounded-xl border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary">
              <Store className="h-4 w-4" /> Maduka yote
            </Link>
          </div>
        </div>
      </section>

      {/* Switcher */}
      <div className="mt-8 inline-flex rounded-xl border bg-card p-1">
        <SwitchBtn active={tab === "categories"} onClick={() => setTab("categories")}>Aina · Categories</SwitchBtn>
        <SwitchBtn active={tab === "shops"} onClick={() => setTab("shops")}>Maduka · Shops</SwitchBtn>
      </div>

      {tab === "categories" ? (
        <section className="mt-4">
          {/* Predefined category grid (always visible) */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            <CategoryChip
              label="Zote"
              sub="All"
              count={products.length}
              active={!activeCat}
              onClick={() => setActiveCat(null)}
              icon={Package}
            />
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c.key}
                label={c.sw}
                sub={c.en}
                count={counts.get(c.key) ?? 0}
                active={activeCat === c.key}
                onClick={() => setActiveCat(c.key)}
                icon={c.icon}
              />
            ))}
          </div>

          <h2 className="mt-6 text-sm font-semibold text-muted-foreground">
            {activeCat ? `${getCategory(activeCat).sw} · ${getCategory(activeCat).en}` : "Bidhaa zilizopendekezwa"}
          </h2>

          {filteredProducts.length === 0 ? (
            <EmptyState text={activeCat ? "Hakuna bidhaa katika aina hii bado." : "Hakuna bidhaa bado. Wauzaji wanaweza kuongeza kutoka dashibodi yao."} />
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((p) => (
                <Link key={p.id} to="/shops/$shopId" params={{ shopId: p.shop_id }} className="group overflow-hidden rounded-2xl border bg-card transition hover:border-primary hover:shadow-md">
                  <div className="aspect-square overflow-hidden bg-secondary">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">
                        {(() => { const I = getCategory(p.category ?? "Other").icon; return <I className="h-6 w-6" />; })()}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 text-sm font-semibold text-primary">{formatKES(Number(p.price))}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
    </AppShell>
  );
}

function SwitchBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function CategoryChip({
  label, sub, count, active, onClick, icon: Icon,
}: { label: string; sub: string; count: number; active: boolean; onClick: () => void; icon: any }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition ${
        active ? "border-primary bg-primary/10" : "bg-card hover:border-primary/40"
      }`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="truncate text-xs font-medium leading-tight">{label}</span>
      <span className="truncate text-[10px] text-muted-foreground leading-tight">{sub}{count ? ` · ${count}` : ""}</span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="mt-3 rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">{text}</div>;
}
