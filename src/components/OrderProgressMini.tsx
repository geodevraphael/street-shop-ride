import { useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const idx = ORDER_INDEX[status] ?? 0;
  const next = BUYER_NEXT[status] ?? { cta: "Fungua oda" };
  const live = LIVE_STATUSES.has(status);
  const done = status === "completed";
  const cancelled = status === "cancelled";

  const handleFuatilia = (e: React.MouseEvent) => {
    // Prevent the parent card's link from also firing if there is one
    e.stopPropagation();
    e.preventDefault();
    navigate({ to: "/orders/$orderId", params: { orderId } });
  };

  // Choose icon based on status
  const Icon = cancelled ? null
    : done ? CheckCircle2
    : status === "picked_up" ? Radio   // live delivery — show pulsing radio
    : live ? Radio
    : next.waiting ? Clock
    : status === "accepted" ? MapPin   // payment action
    : MapPin;

  const ctaClass = cancelled
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : done
    ? "bg-success/10 text-success border-success/20"
    : status === "picked_up"
    ? "bg-warning/15 text-warning-foreground border-warning/30 ring-1 ring-warning/40"  // most important: live tracking
    : !next.waiting
    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"            // action needed
    : "bg-secondary text-foreground border-border hover:bg-secondary/80";                // waiting

  return (
    <div className="mt-3 space-y-2">
      {/* Step progress bar */}
      <div className="flex items-center gap-1" role="progressbar" aria-label={`Hatua: ${status}`}>
        {STEPS.map((s, i) => {
          const isDone = i < idx;
          const isActive = i === idx && !done && !cancelled;
          return (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
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

      {/*
        CTA button — this is a <button> (not a nested <Link>) so it works correctly
        even when placed inside a parent <Link> card. It navigates programmatically.
      */}
      <button
        id={`fuatilia-${orderId}`}
        onClick={handleFuatilia}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
          ctaClass
        }`}
        aria-label={`${next.cta} — Fungua oda ${orderId.slice(0, 6)}`}
        type="button"
      >
        <span className="flex items-center gap-1.5">
          {Icon && (
            <Icon
              className={`h-4 w-4 ${
                status === "picked_up" || (live && !next.waiting) ? "animate-pulse" : ""
              }`}
            />
          )}
          {next.cta}
        </span>
        {!done && !cancelled && (
          <span className="flex items-center gap-1 opacity-80">
            Fuatilia <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
    </div>
  );
}
