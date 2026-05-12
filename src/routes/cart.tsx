import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart, cart } from "@/lib/cart";
import { formatKES } from "@/lib/pricing";
import { Minus, Plus, Trash2, ShoppingBag, MapPin, Truck, Radio, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";

export const Route = createFileRoute("/cart")({ component: Cart });

const TRACKING_STATUSES = new Set([
  "placed", "accepted", "payment_submitted", "payment_confirmed",
  "rider_assigned", "picked_up", "delivered",
]);
const LIVE_STATUSES = new Set(["picked_up"]);

function Cart() {
  const items = useCart();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const loadOrders = () => {
    if (!user) return;
    setLoadingOrders(true);
    supabase
      .from("orders")
      .select("*, shops(name)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data ?? []);
        setLoadingOrders(false);
      });
  };

  useEffect(() => { loadOrders(); /* eslint-disable-next-line */ }, [user]);

  // Realtime — refresh when any of the user's orders changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`client-orders-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `client_id=eq.${user.id}` }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  const active = useMemo(() => orders.filter((o) => TRACKING_STATUSES.has(o.status)), [orders]);
  const past = useMemo(() => orders.filter((o) => !TRACKING_STATUSES.has(o.status)), [orders]);

  const defaultTab = items.length === 0 && orders.length > 0 ? "orders" : "cart";

  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kikapu changu</h1>
          <p className="mt-1 text-xs text-muted-foreground">Bidhaa kwenye kikapu na oda zako zote sehemu moja.</p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="cart" className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Kikapu {items.length > 0 && <span className="rounded-full bg-primary/15 px-2 text-xs text-primary">{items.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4" /> Oda zangu {orders.length > 0 && <span className="rounded-full bg-primary/15 px-2 text-xs text-primary">{orders.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cart">
          <CartView items={items} />
        </TabsContent>

        <TabsContent value="orders">
          {!user ? (
            <p className="py-6 text-sm text-muted-foreground">Ingia ili uone oda zako.</p>
          ) : loadingOrders ? (
            <p className="py-6 text-sm text-muted-foreground">Inapakia…</p>
          ) : orders.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Bado huna oda yoyote.</p>
              <Link to="/products/search" className="mt-3 inline-block text-sm font-semibold text-primary">Anza kununua</Link>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {active.length > 0 && (
                <section>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary" /> Inaendelea ({active.length})
                  </h2>
                  <div className="space-y-2">
                    {active.map((o) => <OrderCard key={o.id} o={o} live={LIVE_STATUSES.has(o.status)} />)}
                  </div>
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Historia ({past.length})</h2>
                  <div className="space-y-2">
                    {past.map((o) => <OrderCard key={o.id} o={o} />)}
                  </div>
                </section>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function CartView({ items }: { items: ReturnType<typeof useCart> }) {
  const nav = useNavigate();
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-xl font-semibold">Kikapu chako ni tupu</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tafuta maduka na ongeza bidhaa.</p>
        <Link to="/shops"><Button className="mt-4">Tazama maduka</Button></Link>
      </div>
    );

  const shop = items[0];
  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground">Kutoka <b>{shop.shopName}</b></p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.productId} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <div className="h-14 w-14 overflow-hidden rounded-lg bg-secondary">
                {i.image_url ? <img src={i.image_url} className="h-full w-full object-cover" alt={i.name} /> : null}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{i.name}</h3>
                <p className="text-sm text-muted-foreground">{formatKES(i.price)} kwa moja</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.setQty(i.productId, i.qty - 1)}><Minus className="h-3 w-3" /></Button>
                <span className="w-8 text-center text-sm">{i.qty}</span>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.setQty(i.productId, i.qty + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
              <Button size="icon" variant="ghost" onClick={() => cart.remove(i.productId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-semibold">Muhtasari</h3>
          <div className="mt-3 flex justify-between text-sm"><span>Jumla ndogo</span><span>{formatKES(total)}</span></div>
          <div className="mt-1 text-xs text-muted-foreground">Gharama ya usafirishaji itahesabiwa wakati wa malipo.</div>
          <Button className="mt-4 w-full" onClick={() => nav({ to: "/checkout" })}>Endelea na malipo</Button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ o }: { o: any; live?: boolean }) {
  return (
    <div className="block rounded-2xl border bg-card p-4">
      <Link
        to="/orders/$orderId"
        params={{ orderId: o.id }}
        className="flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <div className="truncate font-semibold">{o.shops?.name ?? "Duka"}</div>
          <div className="text-xs text-muted-foreground">
            #{o.id.slice(0, 6)} · {new Date(o.created_at).toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <OrderStatusPill status={o.status} />
          <div className="mt-1 text-sm font-semibold">
            {formatKES(Number(o.subtotal) + Number(o.delivery_fee))}
          </div>
        </div>
      </Link>
      <OrderProgressMini orderId={o.id} status={o.status} />
    </div>
  );
}
