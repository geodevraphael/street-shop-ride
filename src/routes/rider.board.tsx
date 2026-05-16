import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatKES } from "@/lib/pricing";
import { toast } from "sonner";
import { Package, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/rider/board")({ component: RiderBoard });

type Order = {
  id: string;
  shop_id: string;
  subtotal: number;
  delivery_fee: number;
  distance_km: number | null;
  eta_min: number | null;
  status: string;
  delivery_mode: string;
  created_at: string;
};

type Offer = { id: string; order_id: string; rider_id: string; amount: number; status: string };

function RiderBoard() {
  const { user } = useAuth();
  const [riderId, setRiderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOffers, setMyOffers] = useState<Record<string, Offer>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("riders").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setRiderId(data?.id ?? null));
  }, [user]);

  const load = async () => {
    const { data: o } = await supabase
      .from("orders")
      .select("id,shop_id,subtotal,delivery_fee,distance_km,eta_min,status,delivery_mode,created_at")
      .eq("status", "payment_confirmed")
      .eq("delivery_mode", "boda")
      .order("created_at", { ascending: false });
    setOrders((o as any) ?? []);

    if (riderId) {
      const { data: offs } = await supabase
        .from("delivery_offers")
        .select("*")
        .eq("rider_id", riderId)
        .in("status", ["pending", "accepted"]);
      const m: Record<string, Offer> = {};
      (offs as any[] | null)?.forEach((x) => { m[x.order_id] = x; });
      setMyOffers(m);
    }
  };

  useEffect(() => { load(); }, [riderId]);

  if (!user) return <p>Ingia kuendelea.</p>;
  if (!riderId) return <p className="text-sm text-muted-foreground">Sajili akaunti yako ya boda kwanza.</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold">Bodi ya Kazi</h2>
      <p className="text-sm text-muted-foreground">Oda zinazohitaji boda. Weka bei yako na muuzaji atakuchagua.</p>

      <div className="mt-4 space-y-3">
        {orders.length === 0 && <p className="text-sm text-muted-foreground">Hakuna kazi kwa sasa.</p>}
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-3 min-w-0">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Package className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <div className="font-semibold">Oda #{o.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {o.distance_km ? `${Number(o.distance_km).toFixed(1)} km` : "—"}
                    {o.eta_min ? ` · ~${o.eta_min} min` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">Bei iliyokadiriwa: {formatKES(Number(o.delivery_fee))}</div>
                </div>
              </div>
              <OfferButton orderId={o.id} riderId={riderId} suggested={Number(o.delivery_fee)} existing={myOffers[o.id]} onSaved={load} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfferButton({
  orderId, riderId, suggested, existing, onSaved,
}: { orderId: string; riderId: string; suggested: number; existing?: Offer; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(existing?.amount ?? suggested));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return toast.error("Bei si sahihi");
    setBusy(true);
    if (existing && existing.status === "pending") {
      // withdraw old then insert new
      await supabase.from("delivery_offers").update({ status: "withdrawn" }).eq("id", existing.id);
    }
    const { error } = await supabase.from("delivery_offers").insert({
      order_id: orderId, rider_id: riderId, amount: n, note: note.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Ofa yako imepelekwa");
    setOpen(false);
    onSaved();
  };

  if (existing?.status === "accepted") {
    return <Link to="/orders/$orderId" params={{ orderId }}><Button size="sm">Umechaguliwa</Button></Link>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={existing ? "outline" : "default"} className="gap-1.5">
          <Send className="h-4 w-4" />
          {existing ? "Badilisha bei" : "Weka bei"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Bei yako ya usafiri</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Bei (TSh)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Kadirio la mfumo: {formatKES(suggested)}</p>
          </div>
          <div><Label>Maelezo (hiari)</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mfano: nina mzigo mwingine njiani" /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? "Inatuma…" : "Tuma ofa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
