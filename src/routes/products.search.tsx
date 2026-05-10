import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/lib/cart";
import { formatTSh } from "@/lib/pricing";
import { Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/products/search")({
  head: () => ({ meta: [{ title: "Search products — Soko" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("products").select("*, shops(name, street)").eq("active", true).limit(60).then(({ data }) => setProducts(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (!q) return products;
    return products.filter((p) => (p.name + " " + (p.description ?? "") + " " + (p.category ?? "")).toLowerCase().includes(q.toLowerCase()));
  }, [products, q]);

  const recommended = useMemo(() => products.slice(0, 4), [products]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Search products</h1>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Try 'tomatoes', 'chapati', 'phone case'…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!q && recommended.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> Recommended for you</h2>
          <Grid items={recommended} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{q ? `${filtered.length} results` : "All products"}</h2>
        <Grid items={filtered} />
      </section>
    </AppShell>
  );
}

function Grid({ items }: { items: any[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No products.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p) => (
        <div key={p.id} className="overflow-hidden rounded-2xl border bg-card">
          <Link to="/shops/$shopId" params={{ shopId: p.shop_id }} className="block aspect-square bg-secondary">
            {p.image_url ? <img src={p.image_url} className="h-full w-full object-cover" alt={p.name} /> : null}
          </Link>
          <div className="p-3">
            <h3 className="truncate text-sm font-semibold">{p.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{p.shops?.name ?? "Shop"}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">{formatKES(Number(p.price))}</span>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => {
                cart.add({ productId: p.id, shopId: p.shop_id, shopName: p.shops?.name ?? "Shop", name: p.name, price: Number(p.price), qty: 1, image_url: p.image_url });
                toast.success("Added");
              }}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
