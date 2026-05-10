import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { formatKES } from "@/lib/pricing";
import { MapPin, Truck, Radio } from "lucide-react";

export const Route = createFileRoute("/orders")({ component: Orders });

const TRACKING_STATUSES = new Set(["accepted", "payment_submitted", "payment_confirmed", "rider_assigned", "picked_up", "delivered"]);
const LIVE_STATUSES = new Set(["picked_up"]);

function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase.from("orders")
      .select("*, shops(name)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false); });
  }, [user]);

  const active = useMemo(() => orders.filter((o) => TRACKING_STATUSES.has(o.status)), [orders]);
  const past = useMemo(() => orders.filter((o) => !TRACKING_STATUSES.has(o.status)), [orders]);

  if (!user) return <AppShell><p>Ingia ili uone oda zako.</p></AppShell>;

  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Oda zangu</h1>
          <p className="text-xs text-muted-foreground">Fuatilia hatua ya oda na eneo la boda kwenye ramani</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Inapakia…</p>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Bado huna oda yoyote.</p>
          <Link to="/products/search" className="mt-3 inline-block text-sm font-semibold text-primary">Anza kununua</Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Truck className="h-4 w-4 text-primary" /> Inaendelea ({active.length})
              </h2>
              <div className="space-y-2">
                {active.map((o) => (
                  <OrderCard key={o.id} o={o} live={LIVE_STATUSES.has(o.status)} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Historia</h2>
              <div className="space-y-2">
                {past.map((o) => (
                  <OrderCard key={o.id} o={o} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}

function OrderCard({ o, live }: { o: any; live?: boolean }) {
  return (
    <Link
      to="/orders/$orderId"
      params={{ orderId: o.id }}
      className="block rounded-2xl border bg-card p-4 transition hover:border-primary"
    >
      <div className="flex items-center justify-between gap-3">
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
      </div>

      {TRACKING_STATUSES.has(o.status) && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-primary">
            {live ? (
              <>
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Boda inaonekana moja kwa moja
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5" />
                Fungua kufuatilia kwenye ramani
              </>
            )}
          </span>
          <span className="font-semibold text-primary">Fuatilia →</span>
        </div>
      )}
    </Link>
  );
}
