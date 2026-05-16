import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { OrderStatusPill } from "@/components/OrderStatusPill";
import { formatKES } from "@/lib/pricing";
import { Package, MapPin, ExternalLink, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/courier/")({ component: CourierBoard });

type Membership = { vendor_id: string; office: string | null; vendor: { name: string } };
type Order = {
  id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  courier_vendor_id: string;
  courier_office_pickup: string | null;
  courier_office_drop: string | null;
  courier_tracking_ref: string | null;
  created_at: string;
  shop_id: string;
  client_id: string;
  shops: { name: string } | null;
};

const STAGES = ["payment_confirmed", "courier_dropped", "courier_in_transit", "courier_arrived"] as const;

function CourierBoard() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadOrders = async (vendorIds: string[]) => {
    if (vendorIds.length === 0) { setOrders([]); return; }
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,subtotal,delivery_fee,courier_vendor_id,courier_office_pickup,courier_office_drop,courier_tracking_ref,created_at,shop_id,client_id,shops(name)")
      .eq("delivery_mode", "courier")
      .in("courier_vendor_id", vendorIds)
      .in("status", [...STAGES])
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data as any) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("courier_staff")
        .select("vendor_id, office, vendor:courier_vendors(name)")
        .eq("user_id", user.id);
      const mems = (data as any) ?? [];
      setMemberships(mems);
      await loadOrders(mems.map((m: Membership) => m.vendor_id));
      setLoading(false);
    })();
  }, [user]);

  const vendorIds = useMemo(() => memberships.map((m) => m.vendor_id), [memberships]);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const refresh = () => loadOrders(vendorIds);

  if (loading) return <p className="text-sm text-muted-foreground">Inapakia…</p>;

  if (memberships.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <Package className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 font-semibold">Akaunti yako haijaunganishwa na wakala wowote</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Wasiliana na msimamizi wa Lovable Cloud akuongeze kama wakala wa kampuni yako ya usafirishaji.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {memberships.map((m) => (
            <span key={m.vendor_id} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {m.vendor?.name}{m.office ? ` — ${m.office}` : ""}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="all">Zote ({orders.length})</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Hakuna vifurushi kwa sasa.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const advance = async (next: string, extra: Record<string, any> = {}) => {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: next as any, ...extra }).eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Hatua imesasishwa");
    onChanged();
  };

  const nextActions: Array<{ to: typeof STAGES[number] | "delivered"; label: string; needsRef?: boolean }> = (() => {
    switch (order.status) {
      case "payment_confirmed": return [{ to: "courier_dropped", label: "Imewasilishwa ofisi yetu", needsRef: true }];
      case "courier_dropped": return [{ to: "courier_in_transit", label: "Imeondoka — safarini" }];
      case "courier_in_transit": return [{ to: "courier_arrived", label: "Imefika ofisi ya mwisho" }];
      case "courier_arrived": return [{ to: "delivered", label: "Mteja amepokea" }];
      default: return [];
    }
  })();

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
            <OrderStatusPill status={order.status} />
          </div>
          <div className="mt-1 font-semibold">{order.shops?.name ?? "Duka"}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()} · Bidhaa {formatKES(Number(order.subtotal))} · Usafirishaji {formatKES(Number(order.delivery_fee))}
          </div>
          {(order.courier_office_pickup || order.courier_office_drop) && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {order.courier_office_pickup && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />Kuchukua: {order.courier_office_pickup}</span>
              )}
              {order.courier_office_drop && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />Kufikisha: {order.courier_office_drop}</span>
              )}
            </div>
          )}
          {order.courier_tracking_ref && (
            <div className="mt-1 text-xs">Tracking: <span className="font-mono">{order.courier_tracking_ref}</span></div>
          )}
        </div>
        <Link to="/orders/$orderId" params={{ orderId: order.id }} className="text-xs text-primary hover:underline">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {nextActions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {nextActions.map((a) =>
            a.needsRef ? (
              <DropoffDialog key={a.to} order={order} onConfirm={(payload) => advance(a.to, payload)} disabled={busy} label={a.label} />
            ) : (
              <Button key={a.to} size="sm" onClick={() => advance(a.to)} disabled={busy}>{a.label}</Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function DropoffDialog({
  order, onConfirm, disabled, label,
}: { order: Order; onConfirm: (payload: Record<string, any>) => void; disabled?: boolean; label: string }) {
  const [open, setOpen] = useState(false);
  const [pickup, setPickup] = useState(order.courier_office_pickup ?? "");
  const [drop, setDrop] = useState(order.courier_office_drop ?? "");
  const [ref, setRef] = useState(order.courier_tracking_ref ?? "");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Thibitisha kuwasili ofisini</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Ofisi ya kuchukua</Label><Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="mfano: USIRI Ubungo" /></div>
          <div><Label>Ofisi ya kufikisha</Label><Input value={drop} onChange={(e) => setDrop(e.target.value)} placeholder="mfano: USIRI Arusha" /></div>
          <div><Label>Nambari ya kufuatilia</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Tracking ref" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onConfirm({
            courier_office_pickup: pickup.trim() || null,
            courier_office_drop: drop.trim() || null,
            courier_tracking_ref: ref.trim() || null,
          }); setOpen(false); }}>Hifadhi na endelea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
