import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { cart } from "@/lib/cart";
import { formatKES } from "@/lib/pricing";
import { getCategory } from "@/lib/categories";
import { ChevronLeft, MapPin, Plus, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({ meta: [{ title: "Bidhaa · Product — Soko" }] }),
  component: ProductDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="rounded-2xl border bg-card p-10 text-center">
        <h1 className="text-lg font-semibold">Bidhaa haijapatikana</h1>
        <Link to="/products/search" className="mt-2 inline-block text-sm text-primary">Rudi kwenye utafutaji</Link>
      </div>
    </AppShell>
  ),
});

function ProductDetail() {
  const { productId } = Route.useParams();
  const [product, setProduct] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, shops(id, name, street, lipa_number, qr_code_url, rating, verified, cover_url)")
        .eq("id", productId)
        .maybeSingle();
      if (!data) { setMissing(true); return; }
      setProduct(data);
      setShop(data.shops);
    })();
  }, [productId]);

  if (missing) throw notFound();
  if (!product) return <AppShell><p className="text-muted-foreground">Inapakia…</p></AppShell>;

  const cat = getCategory(product.category ?? "Other");
  const Icon = cat.icon;
  const shareUrl = `/products/${product.id}`;
  const shareText = `${product.name} — ${formatKES(Number(product.price))} · ${shop?.name ?? "Soko"}`;

  const addToCart = () => {
    cart.add({
      productId: product.id, shopId: product.shop_id, shopName: shop?.name ?? "Shop",
      name: product.name, price: Number(product.price), qty: 1, image_url: product.image_url,
    });
    toast.success("Imeongezwa kikapuni");
  };

  return (
    <AppShell>
      <Link to="/products/search" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Bidhaa zote
      </Link>

      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-secondary">
          <div className="aspect-square">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground"><Icon className="h-12 w-12" /></div>
            )}
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <Icon className="h-3.5 w-3.5" /> {cat.sw} · {cat.en}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{product.name}</h1>
          <p className="mt-1 text-2xl font-bold text-primary">{formatKES(Number(product.price))}</p>
          {product.description && <p className="mt-3 text-sm text-muted-foreground">{product.description}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" className="gap-1.5" onClick={addToCart} disabled={product.stock <= 0}>
              <Plus className="h-4 w-4" /> {product.stock > 0 ? "Ongeza kikapuni" : "Imeisha"}
            </Button>
            <ShareButton url={shareUrl} title={product.name} text={shareText} />
          </div>

          {shop && (
            <Link
              to="/shops/$shopId"
              params={{ shopId: shop.id }}
              className="mt-5 flex items-center gap-3 rounded-2xl border bg-card p-3 transition hover:border-primary"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {shop.cover_url ? <img src={shop.cover_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{shop.name} {shop.verified && <span className="ml-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] text-success">Verified</span>}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <Star className="mr-0.5 inline h-3 w-3 fill-warning text-warning" />{(shop.rating ?? 5).toFixed(1)} · <MapPin className="inline h-3 w-3" /> {shop.street ?? "—"}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
