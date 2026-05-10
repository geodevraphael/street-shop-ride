import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/lib/cart";
import { formatKES } from "@/lib/pricing";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { Plus, Search, Sparkles, X, Package } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 24;

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/products/search")({
  validateSearch: (s) => searchSchema.parse(s),
  head: ({ match }) => {
    const c = (match.search as { category?: string }).category;
    const title = c ? `${getCategory(c).sw} · ${getCategory(c).en} — Soko` : "Tafuta bidhaa · Search products — Soko";
    return { meta: [{ title }, { name: "description", content: "Bidhaa kutoka maduka ya karibu nawe Tanzania." }] };
  },
  component: SearchPage,
});

function SearchPage() {
  const { category, q: q0 } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(q0 ?? "");

  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ["products", "search", category ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id,name,description,price,image_url,category,shop_id,shops(name,street)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(120);
      if (category) query = query.eq("category", category);
      const { data } = await query;
      return data ?? [];
    },
  });

  // Sync q to URL (debounced lightly)
  useEffect(() => {
    const t = setTimeout(() => navigate({ search: (s: any) => ({ ...s, q: q || undefined }), replace: true }), 250);
    return () => clearTimeout(t);
  }, [q, navigate]);

  const filtered = useMemo(() => {
    if (!q) return products;
    const needle = q.toLowerCase();
    return products.filter((p) => (p.name + " " + (p.description ?? "") + " " + (p.category ?? "")).toLowerCase().includes(needle));
  }, [products, q]);

  const recommended = useMemo(() => products.slice(0, 4), [products]);
  const cat = category ? getCategory(category) : null;

  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {cat ? <>{cat.sw} <span className="text-muted-foreground text-base font-normal">· {cat.en}</span></> : "Tafuta bidhaa"}
        </h1>
        <Link to="/products/search" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          Aina zote
        </Link>
      </div>

      {/* Active category chip */}
      {cat && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-primary/10 px-3 py-1 text-sm text-primary">
          <cat.icon className="h-3.5 w-3.5" />
          {cat.sw}
          <Link to="/products/search" className="rounded-full p-0.5 hover:bg-primary/20" aria-label="Ondoa kichujio">
            <X className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Horizontal category scroller — quick switch */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          <CategoryPill to={{ to: "/products/search" } as any} active={!cat} icon={Package} label="Zote" />
          {CATEGORIES.map((c) => (
            <CategoryPill
              key={c.key}
              to={{ to: "/products/search", search: { category: c.key } } as any}
              active={cat?.key === c.key}
              icon={c.icon}
              label={c.sw}
            />
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Tafuta — 'nyanya', 'chapati', 'simu'…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!q && !cat && recommended.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Imependekezwa kwako
          </h2>
          <Grid items={recommended} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          {loading ? "Inapakia…" : q ? `${filtered.length} matokeo` : `${filtered.length} bidhaa`}
        </h2>
        <Grid items={filtered} emptyText={cat ? `Hakuna bidhaa katika ${cat.sw} bado.` : "Hakuna bidhaa."} />
      </section>
    </AppShell>
  );
}

function CategoryPill({ to, active, icon: Icon, label }: { to: any; active: boolean; icon: any; label: string }) {
  return (
    <Link
      {...to}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

function Grid({ items, emptyText = "Hakuna bidhaa." }: { items: any[]; emptyText?: string }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <div key={p.id} className="overflow-hidden rounded-2xl border bg-card transition hover:border-primary hover:shadow-md">
          <Link to="/shops/$shopId" params={{ shopId: p.shop_id }} className="block aspect-square bg-secondary">
            {p.image_url ? (
              <img src={p.image_url} className="h-full w-full object-cover" alt={p.name} loading="lazy" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                {(() => { const I = getCategory(p.category ?? "Other").icon; return <I className="h-6 w-6" />; })()}
              </div>
            )}
          </Link>
          <div className="p-2.5">
            <h3 className="truncate text-sm font-semibold">{p.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{p.shops?.name ?? "Duka"}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">{formatKES(Number(p.price))}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => {
                  cart.add({
                    productId: p.id, shopId: p.shop_id, shopName: p.shops?.name ?? "Shop",
                    name: p.name, price: Number(p.price), qty: 1, image_url: p.image_url,
                  });
                  toast.success("Imeongezwa kwenye kikapu");
                }}
                aria-label="Ongeza kikapuni"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
