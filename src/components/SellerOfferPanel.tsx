import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/pricing";
import { Bike, Check, ShieldCheck, Star, XCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

type Offer = {
  id: string;
  order_id: string;
  rider_id: string;
  amount: number;
  note: string | null;
  status: string;
  created_at: string;
  rider?: {
    full_name: string | null;
    plate: string | null;
    rating: number | null;
    license_verified: boolean | null;
    deliveries_count: number | null;
  } | null;
};

export function SellerOfferPanel({
  orderId,
  onAccepted,
}: {
  orderId: string;
  onAccepted?: () => void;
}) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("delivery_offers")
      .select(
        "id, order_id, rider_id, amount, note, status, created_at, rider:riders(full_name, plate, rating, license_verified, deliveries_count)",
      )
      .eq("order_id", orderId)
      .order("amount", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOffers((data ?? []) as unknown as Offer[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`offers-${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_offers", filter: `order_id=eq.${orderId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line
  }, [orderId]);

  const respond = async (offerId: string, status: "accepted" | "rejected") => {
    setBusyId(offerId);
    const { error } = await supabase
      .from("delivery_offers")
      .update({ status })
      .eq("id", offerId);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Ofa imekubaliwa, boda amekabidhiwa" : "Ofa imekataliwa");
    if (status === "accepted") onAccepted?.();
    load();
  };

  const pending = offers.filter((o) => o.status === "pending");
  const others = offers.filter((o) => o.status !== "pending");

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Ofa za boda ({pending.length})</h4>
        </div>
        <Button size="icon" variant="ghost" onClick={load} title="Onyesha mpya">
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && offers.length === 0 && (
        <p className="text-xs text-muted-foreground">Inapakia ofa…</p>
      )}

      {!loading && pending.length === 0 && (
        <p className="rounded-xl border bg-secondary/40 p-3 text-xs text-muted-foreground">
          Bado hakuna ofa kutoka kwa boda. Boda watajitokeza kupitia ubao wao wa kazi.
        </p>
      )}

      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {o.rider?.full_name ?? "Boda"}
                  {o.rider?.license_verified && (
                    <ShieldCheck className="h-4 w-4 text-success" />
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {(o.rider?.rating ?? 5).toFixed(1)}
                  </span>
                  <span>{o.rider?.plate ?? "—"}</span>
                  <span>{o.rider?.deliveries_count ?? 0} safari</span>
                </div>
                {o.note && (
                  <p className="mt-1 text-xs italic text-muted-foreground">“{o.note}”</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-lg font-bold text-primary">
                  {formatKES(Number(o.amount))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === o.id}
                    onClick={() => respond(o.id, "rejected")}
                    className="gap-1"
                  >
                    <XCircle className="h-4 w-4" /> Kataa
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === o.id}
                    onClick={() => respond(o.id, "accepted")}
                    className="gap-1"
                  >
                    <Check className="h-4 w-4" /> Kubali
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Historia ya ofa ({others.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {others.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-lg border bg-secondary/30 px-3 py-2 text-xs"
              >
                <span>
                  {o.rider?.full_name ?? "Boda"} · {formatKES(Number(o.amount))}
                </span>
                <span className="uppercase opacity-70">{o.status}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
