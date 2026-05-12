import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, MapPin, Radio } from "lucide-react";

const STEPS = [
  { key: "placed", label: "Imewekwa" },
  { key: "accepted", label: "Imekubaliwa" },
  { key: "payment_submitted", label: "Malipo" },
  { key: "payment_confirmed", label: "Yamethibitishwa" },
  { key: "rider_assigned", label: "Boda" },
  { key: "picked_up", label: "Njiani" },
  { key: "delivered", label: "Imefika" },
  { key: "completed", label: "Imekamilika" },
] as const;

const ORDER_INDEX: Record<string, number> = STEPS.reduce((acc, s, i) => ({ ...acc, [s.key]: i }), {});

// What's the next thing the BUYER must do (or wait for)?
const BUYER_NEXT: Record<string, { cta: string; waiting?: boolean }> = {
  placed: { cta: "Subiri muuzaji akubali", waiting: true },
  accepted: { cta: "Lipa & tuma uthibitisho" },
  payment_submitted: { cta: "Subiri muuzaji athibitishe", waiting: true },
  payment_confirmed: { cta: "Muuzaji anatafuta boda", waiting: true },
  rider_assigned: { cta: "Boda inakuja kuokota", waiting: true },
  picked_up: { cta: "Fuatilia boda kwenye ramani" },
  delivered: { cta: "Thibitisha umepokea bidhaa" },
  completed: { cta: "Oda imekamilika" },
  cancelled: { cta: "Oda imeghairiwa" },
};

const LIVE_STATUSES = new Set(["payment_confirmed", "rider_assigned", "picked_up"]);

export function OrderProgressMini({ orderId, status }: { orderId: string; status: string }) {
  const idx = ORDER_INDEX[status] ?? 0;
  const next = BUYER_NEXT[status] ?? { cta: "Fungua oda" };
  const live = LIVE_STATUSES.has(status);
  const done = status === "completed";
  const cancelled = status === "cancelled";

  return (
    <div className="mt-3 space-y-2">
      {/* Step bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const isDone = i < idx;
          const isActive = i === idx && !done && !cancelled;
          return (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full ${
                cancelled
                  ? "bg-destructive/30"
                  : isDone || done
                  ? "bg-success"
                  : isActive
                  ? "bg-primary animate-pulse"
                  : "bg-muted"
              }`}
              title={s.label}
            />
          );
        })}
      </div>

      {/* CTA row */}
      <Link
        to="/orders/$orderId"
        params={{ orderId }}
        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
          cancelled
            ? "bg-destructive/10 text-destructive"
            : done
            ? "bg-success/10 text-success"
            : next.waiting
            ? "bg-secondary text-foreground hover:bg-secondary/80"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        <span className="flex items-center gap-1.5">
          {cancelled ? null : done ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : live ? (
            <Radio className="h-4 w-4 animate-pulse" />
          ) : next.waiting ? (
            <Clock className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {next.cta}
        </span>
        {!done && !cancelled && (
          <span className="flex items-center gap-1">
            Fuatilia <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </Link>
    </div>
  );
}
