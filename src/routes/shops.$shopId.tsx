import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/lib/cart";
import { formatKES } from "@/lib/pricing";
import { MapPin, Plus, Star, Share2 } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/shops/$shopId")({ component: ShopDetail });

function ShopDetail() {
  const { shopId } = Route.useParams();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("shops").select("*").eq("id", shopId).maybeSingle().then(({ data }) => setShop(data));
    supabase.from("products").select("*").eq("shop_id", shopId).eq("active", true).then(({ data }) => setProducts(data ?? []));
  }, [shopId]);

  if (!shop) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;

  return (
    <AppShell>
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="aspect-[5/2] bg-secondary">
          {shop.cover_url ? <img src={shop.cover_url} alt={shop.name} className="h-full w-full object-cover" /> : null}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{shop.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{shop.category} · <MapPin className="inline h-3 w-3" /> {shop.street ?? "—"}</p>
              {shop.description && <p className="mt-2 max-w-xl text-sm">{shop.description}</p>}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-warning text-warning" /> {(shop.rating ?? 5).toFixed(1)} rating
                {shop.verified && <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">Verified</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ShareButton url={`/shops/${shop.id}`} title={shop.name} text={`${shop.name} — ${shop.category ?? "Duka"} on Soko`} />
              <ReportDialog targetType="seller" targetId={shop.id} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {shop.lipa_number && <span className="rounded-full bg-secondary px-3 py-1">Lipa: <b className="text-foreground">{shop.lipa_number}</b></span>}
            {shop.qr_code_url && <a href={shop.qr_code_url} target="_blank" className="rounded-full bg-secondary px-3 py-1 underline">View Scan QR</a>}
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Products</h2>
      {products.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-2xl border bg-card transition hover:border-primary hover:shadow-md">
              <Link to="/products/$productId" params={{ productId: p.id }} className="block aspect-square bg-secondary">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" /> : null}
              </Link>
              <div className="p-3">
                <Link to="/products/$productId" params={{ productId: p.id }} className="block">
                  <h3 className="truncate font-semibold hover:text-primary">{p.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                </Link>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="font-semibold text-primary">{formatKES(Number(p.price))}</span>
                  <div className="flex items-center gap-1">
                    <ShareButton
                      url={`/products/${p.id}`}
                      title={p.name}
                      text={`${p.name} — ${formatKES(Number(p.price))} · ${shop.name}`}
                      iconOnly
                      label="Shiriki bidhaa"
                    />
                    <Button size="sm" className="gap-1" onClick={() => {
                      cart.add({ productId: p.id, shopId: shop.id, shopName: shop.name, name: p.name, price: Number(p.price), qty: 1, image_url: p.image_url });
                      toast.success("Imeongezwa kikapuni");
                    }}>
                      <Plus className="h-3.5 w-3.5" /> Ongeza
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
