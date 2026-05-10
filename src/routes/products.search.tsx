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
import { ChevronLeft, ChevronRight, Plus, Search, Sparkles, X, Package } from "lucide-react";
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
  const { category, q: q0, page: pageParam } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(q0 ?? "");
  const page = Math.max(1, pageParam ?? 1);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["products", "search", category ?? "all", page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("products")
        .select("id,name,description,price,image_url,category,shop_id,shops(name,street)", { count: "exact" })
        .eq("active", true)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (category) query = query.eq("category", category);
      const { data, count } = await query;
      return { items: data ?? [], total: count ?? 0 };
    },
  });
  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Sync q to URL (debounced lightly) — reset to page 1 on search change
  useEffect(() => {
    const t = setTimeout(
      () => navigate({ search: (s: any) => ({ ...s, q: q || undefined, page: undefined }), replace: true }),
      250,
    );
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
        <h2 className="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground">
          <span>{loading ? "Inapakia…" : q ? `${filtered.length} matokeo` : `${total} bidhaa`}</span>
          {!q && totalPages > 1 && (
            <span className="text-xs font-normal">Ukurasa {page} / {totalPages}</span>
          )}
        </h2>
        <Grid items={filtered} emptyText={cat ? `Hakuna bidhaa katika ${cat.sw} bado.` : "Hakuna bidhaa."} />
        {!q && totalPages > 1 && (
          <Pager page={page} totalPages={totalPages} onGo={(p) => {
            navigate({ search: (s: any) => ({ ...s, page: p === 1 ? undefined : p }) });
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          }} />
        )}
      </section>
    </AppShell>
  );
}

function Pager({ page, totalPages, onGo }: { page: number; totalPages: number; onGo: (p: number) => void }) {
  // Compact window of pages around current — mobile friendly
  const window: number[] = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, start + 2);
  for (let i = start; i <= end; i++) window.push(i);

  const baseBtn = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border bg-card px-3 text-sm font-semibold transition active:scale-95 disabled:opacity-40 disabled:active:scale-100";

  return (
    <nav aria-label="Pagination" className="mt-5">
      {/* Mobile: prev / page indicator / next — sticky-feel chunky pills */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <button type="button" className={baseBtn} disabled={page <= 1} onClick={() => onGo(page - 1)} aria-label="Iliyotangulia">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {Array.from({ length: totalPages }).slice(0, 8).map((_, i) => {
            const p = i + 1;
            const isActive = p === page;
            return (
              <span
                key={p}
                className={`h-2 rounded-full transition-all ${isActive ? "w-6 bg-primary" : "w-2 bg-border"}`}
              />
            );
          })}
          {totalPages > 8 && <span className="ml-1 text-xs text-muted-foreground">+{totalPages - 8}</span>}
        </div>
        <button type="button" className={baseBtn} disabled={page >= totalPages} onClick={() => onGo(page + 1)} aria-label="Inayofuata">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Desktop / tablet: numbered pager */}
      <div className="hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
        <button type="button" className={baseBtn} disabled={page <= 1} onClick={() => onGo(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Nyuma
        </button>
        {start > 1 && (
          <>
            <button type="button" className={baseBtn} onClick={() => onGo(1)}>1</button>
            {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
          </>
        )}
        {window.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onGo(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${baseBtn} ${p === page ? "border-primary bg-primary text-primary-foreground" : ""}`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
            <button type="button" className={baseBtn} onClick={() => onGo(totalPages)}>{totalPages}</button>
          </>
        )}
        <button type="button" className={baseBtn} disabled={page >= totalPages} onClick={() => onGo(page + 1)}>
          Mbele <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
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
          <Link to="/products/$productId" params={{ productId: p.id }} className="block aspect-square bg-secondary">
            {p.image_url ? (
              <img src={p.image_url} className="h-full w-full object-cover" alt={p.name} loading="lazy" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                {(() => { const I = getCategory(p.category ?? "Other").icon; return <I className="h-6 w-6" />; })()}
              </div>
            )}
          </Link>
          <div className="p-2.5">
            <Link to="/products/$productId" params={{ productId: p.id }} className="block">
              <h3 className="truncate text-sm font-semibold hover:text-primary">{p.name}</h3>
              <p className="truncate text-xs text-muted-foreground">{p.shops?.name ?? "Duka"}</p>
            </Link>
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
