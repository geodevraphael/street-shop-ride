import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/pricing";
import { Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/orders")({ component: SellerOrders });

const ACTIVE = new Set(["placed", "accepted", "payment_submitted", "payment_confirmed", "rider_assigned", "picked_up", "delivered"]);

// Inline action: { label, nextStatus } — no nextStatus means "open the order page"
type Action = { label: string; nextStatus?: string; variant?: "default" | "outline" };
const ACTION: Record<string, Action> = {
  placed: { label: "Kubali oda", nextStatus: "accepted", variant: "default" },
  accepted: { label: "Subiri malipo", variant: "outline" },
  payment_submitted: { label: "Hakiki malipo", variant: "default" }, // needs proof view → open page
  payment_confirmed: { label: "Tafuta boda", variant: "default" }, // needs rider picker → open page
  rider_assigned: { label: "Mkabidhi boda", nextStatus: "picked_up", variant: "default" },
  picked_up: { label: "Inasafirishwa", variant: "outline" },
  delivered: { label: "Subiri uthibitisho", variant: "outline" },
};

function SellerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);

  const load = async (sid?: string) => {
    const id = sid ?? shopId;
    if (!id) return;
    const { data } = await supabase.from("orders").select("*").eq("shop_id", id).order("created_at", { ascending: false });
    setOrders(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("shops").select("id").eq("owner_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setShopId(data.id);
      load(data.id);
    });
  }, [user]);

  useEffect(() => {
    if (!shopId) return;
    const ch = supabase
      .channel(`seller-orders-${shopId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${shopId}` }, () => load(shopId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [shopId]);

  const active = useMemo(() => orders.filter((o) => ACTIVE.has(o.status)), [orders]);
  const past = useMemo(() => orders.filter((o) => !ACTIVE.has(o.status)), [orders]);
  const needsAction = useMemo(() => orders.filter((o) => o.status === "placed" || o.status === "payment_submitted").length, [orders]);

  if (orders.length === 0) return <p className="text-muted-foreground">Bado hakuna oda.</p>;

  return (
    <div className="space-y-4">
      {needsAction > 0 && (
        <div className="flex items-center gap-2 rounded-xl border bg-warning/10 p-3 text-sm">
          <Bell className="h-4 w-4 text-warning" />
          <span><b>{needsAction}</b> oda zinahitaji hatua yako sasa hivi.</span>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Inaendelea ({active.length})</h2>
          <div className="space-y-2">{active.map((o) => <Row key={o.id} o={o} onChanged={() => load()} />)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Historia ({past.length})</h2>
          <div className="space-y-2">{past.map((o) => <Row key={o.id} o={o} onChanged={() => load()} />)}</div>
        </section>
      )}
    </div>
  );
}

function Row({ o, onChanged }: { o: any; onChanged: () => void }) {
  const urgent = o.status === "placed" || o.status === "payment_submitted";
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const action = ACTION[o.status];

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!action) return;
    // No inline transition → open the order page so seller can complete the step there
    if (!action.nextStatus) {
      nav({ to: "/orders/$orderId", params: { orderId: o.id } });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: action.nextStatus }).eq("id", o.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Imehifadhiwa");
    onChanged();
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition hover:border-primary ${urgent ? "ring-1 ring-warning" : ""}`}
    >
      <Link
        to="/orders/$orderId"
        params={{ orderId: o.id }}
        className="min-w-0 flex-1"
      >
        <div className="font-semibold">#{o.id.slice(0, 8)}</div>
        <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
        <div className="mt-1 text-sm">{formatKES(Number(o.subtotal))}</div>
      </Link>
      <OrderStatusPill status={o.status} />
      {action && (
        <Button size="sm" variant={action.variant ?? "outline"} disabled={busy} onClick={handleAction}>
          {busy ? "Inahifadhi…" : action.label}
        </Button>
      )}
    </div>
  );
}
