import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { OrderProgressMini } from "@/components/OrderProgressMini";
import { formatKES } from "@/lib/pricing";
import { Truck, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders")({ component: Orders });

const TRACKING_STATUSES = new Set(["placed", "accepted", "payment_submitted", "payment_confirmed", "rider_assigned", "picked_up", "delivered"]);
const LIVE_STATUSES = new Set(["payment_confirmed", "rider_assigned", "picked_up"]);

const NEXT_HINT: Record<string, string> = {
  placed: "Subiri muuzaji akubali",
  accepted: "Lipa & tuma uthibitisho",
  payment_submitted: "Subiri muuzaji athibitishe malipo",
  payment_confirmed: "Muuzaji anatafuta boda",
  rider_assigned: "Boda inaokota bidhaa",
  picked_up: "Bidhaa iko njiani",
  delivered: "Thibitisha umepokea",
};

function Orders() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  if (pathname !== "/orders") {
    return <Outlet />;
  }

  const load = () => {
    if (!user) return;
    setLoading(true);
    supabase.from("orders")
      .select("*, shops(name)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false); });
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: auto-refresh list when any of our orders change
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`orders-list-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `client_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `client_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const active = useMemo(() => orders.filter((o) => TRACKING_STATUSES.has(o.status)), [orders]);
  const past = useMemo(() => orders.filter((o) => !TRACKING_STATUSES.has(o.status)), [orders]);

  if (!user) return <AppShell><p>Ingia ili uone oda zako.</p></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Oda zangu</h1>
          <p className="text-xs text-muted-foreground">Fuatilia hatua ya oda na eneo la boda kwenye ramani</p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} title="Onyesha mpya" aria-label="Refresh">
          <RefreshCcw className="h-4 w-4" />
        </Button>
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

function OrderCard({ o }: { o: any; live?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-4 transition hover:border-primary/40">
      {/*
        FIX: Previously the entire card was wrapped in a <Link>, and OrderProgressMini
        also rendered a <Link> inside — nested <a> tags are invalid HTML and break
        the inner "Fuatilia" button. Now the header is its own link, separate from
        the progress mini which has its own independent link.
      */}
      <Link
        to="/orders/$orderId"
        params={{ orderId: o.id }}
        className="flex items-center justify-between gap-3"
        aria-label={`Fungua oda ya ${o.shops?.name ?? "Duka"}`}
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
      {/* OrderProgressMini contains its own independent <Link> — must NOT be nested inside another <Link> */}
      <OrderProgressMini orderId={o.id} status={o.status} />
    </div>
  );
}
