import { useState } from "react";
import { Copy, Check, ShieldCheck, Phone, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProvider, ACCOUNT_TYPE_LABELS } from "@/lib/payment-providers";
import { formatKES } from "@/lib/pricing";
import { toast } from "sonner";

export type BrandedLipa = {
  id: string;
  provider: string;
  account_type: string;
  number: string;
  account_name?: string | null;
  instructions?: string | null;
  qr_code_url?: string | null;
};

export function BrandedPaymentCard({
  lipa,
  amount,
  verified,
  shopName,
}: {
  lipa: BrandedLipa;
  amount: number;
  verified?: boolean;
  shopName?: string;
}) {
  const p = getProvider(lipa.provider);
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Imenakiliwa");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-lg"
      style={{ borderColor: p.bg }}
    >
      {/* Header — brand band */}
      <div
        className="relative px-4 py-4"
        style={{
          background: `linear-gradient(135deg, ${p.bg} 0%, ${p.accent} 100%)`,
          color: p.fg,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl text-lg font-black shadow-md"
            style={{ background: p.fg, color: p.bg }}
          >
            {p.monogram}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Lipa kupitia</p>
            <p className="truncate text-lg font-bold">{p.name}</p>
          </div>
          {verified && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold backdrop-blur"
              title="Duka limethibitishwa"
            >
              <BadgeCheck className="h-3 w-3" /> IMETHIBITISHWA
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 bg-card p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {ACCOUNT_TYPE_LABELS[lipa.account_type as keyof typeof ACCOUNT_TYPE_LABELS] ?? "Namba"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-mono text-3xl font-black tracking-tight" style={{ color: p.bg }}>
              {lipa.number}
            </p>
            <Button size="icon" variant="outline" onClick={() => copy(lipa.number)} aria-label="Nakili namba">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {lipa.account_name && (
          <div className="rounded-xl border-2 border-dashed p-3" style={{ borderColor: `${p.bg}30` }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Jina la mpokeaji — hakikisha linafanana
            </p>
            <p className="mt-0.5 text-base font-bold">{lipa.account_name}</p>
            {shopName && (
              <p className="text-xs text-muted-foreground">Duka: {shopName}</p>
            )}
          </div>
        )}

        <div
          className="rounded-xl p-3"
          style={{ background: `${p.bg}10`, border: `1px solid ${p.bg}30` }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kiasi cha kulipa</p>
          <p className="text-2xl font-black" style={{ color: p.bg }}>
            {formatKES(amount)}
          </p>
        </div>

        {p.ussd && (
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" style={{ color: p.bg }} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">USSD</p>
                <p className="font-mono text-base font-bold">{p.ussd}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => copy(p.ussd!)}>Nakili</Button>
          </div>
        )}

        {p.steps && p.steps.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hatua za kulipa</p>
            <ol className="space-y-1.5 text-sm">
              {p.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                    style={{ background: p.bg, color: p.fg }}
                  >
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {lipa.instructions && (
          <p className="rounded-lg bg-secondary/60 p-2 text-xs">{lipa.instructions}</p>
        )}

        {lipa.qr_code_url && (
          <div className="flex flex-col items-center gap-2 rounded-xl border bg-secondary/40 p-3">
            <img src={lipa.qr_code_url} alt="QR" className="h-40 w-40 rounded object-contain" />
            <p className="text-xs text-muted-foreground">Au scan QR kwa kulipa moja kwa moja</p>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-success/10 p-2 text-xs text-success">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <b>Usalama:</b> Hutoshiriki PIN yako na mtu yeyote. Baada ya kulipa, tuma uthibitisho hapa chini.
          </p>
        </div>
      </div>
    </div>
  );
}
