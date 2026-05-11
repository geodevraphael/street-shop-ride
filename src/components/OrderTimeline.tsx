import { Check, Clock, ShoppingBag, CreditCard, ShieldCheck, Bike, Truck, PackageCheck, XCircle } from "lucide-react";

const STEPS = [
  { key: "placed", label: "Oda imewekwa", icon: ShoppingBag },
  { key: "accepted", label: "Muuzaji amekubali", icon: Check },
  { key: "payment_submitted", label: "Mteja amelipa", icon: CreditCard },
  { key: "payment_confirmed", label: "Malipo yamethibitishwa", icon: ShieldCheck },
  { key: "rider_assigned", label: "Boda imepatikana", icon: Bike },
  { key: "picked_up", label: "Inasafirishwa", icon: Truck },
  { key: "delivered", label: "Imefika", icon: PackageCheck },
  { key: "completed", label: "Imekamilika", icon: Check },
] as const;

const ORDER_INDEX: Record<string, number> = STEPS.reduce((acc, s, i) => ({ ...acc, [s.key]: i }), {});

export function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
        <XCircle className="h-5 w-5" /> Oda imeghairiwa
      </div>
    );
  }
  const current = ORDER_INDEX[status] ?? 0;
  return (
    <ol className="space-y-2">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <li key={s.key} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                done
                  ? "border-success bg-success text-success-foreground"
                  : active
                  ? "border-primary bg-primary text-primary-foreground animate-pulse"
                  : "border-muted bg-background text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : active ? <Clock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={`text-sm ${active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
