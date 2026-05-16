import { PAYMENT_PROVIDERS, type PaymentProvider } from "@/lib/payment-providers";
import { Check } from "lucide-react";

export function LipaProviderPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (p: PaymentProvider) => void;
}) {
  const groups: { label: string; cat: PaymentProvider["category"] }[] = [
    { label: "Mitandao ya simu", cat: "mobile" },
    { label: "Benki", cat: "bank" },
    { label: "Nyingine", cat: "aggregator" },
  ];

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const list = PAYMENT_PROVIDERS.filter((p) => p.category === g.cat);
        return (
          <div key={g.cat}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {list.map((p) => {
                const selected = value === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => onChange(p)}
                    className={`group relative overflow-hidden rounded-xl border text-left transition-all ${selected ? "ring-2 ring-offset-2 ring-offset-background scale-[0.99]" : "hover:shadow-md"}`}
                    style={selected ? { ["--tw-ring-color" as any]: p.bg } : undefined}
                  >
                    <div
                      className="flex items-center gap-2 px-3 py-2.5"
                      style={{ background: p.bg, color: p.fg }}
                    >
                      <span
                        className="grid h-7 w-7 place-items-center rounded-md text-xs font-black"
                        style={{ background: p.fg, color: p.bg }}
                      >
                        {p.monogram}
                      </span>
                      <span className="truncate text-xs font-semibold">{p.shortName}</span>
                      {selected && <Check className="ml-auto h-4 w-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
