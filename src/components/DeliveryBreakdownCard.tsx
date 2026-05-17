import { formatKES } from "@/lib/pricing";
import { computeClientShare, computeSellerShare } from "@/lib/delivery-share";
import { HandCoins, Sparkles } from "lucide-react";

type Props = {
  subtotal: number;
  deliveryFee: number;
  subsidyPct: number;
};

export function DeliveryBreakdownCard({ subtotal, deliveryFee, subsidyPct }: Props) {
  const clientBoda = computeClientShare(deliveryFee, subsidyPct);
  const sellerBoda = computeSellerShare(deliveryFee, subsidyPct);
  const clientTotal = Number(subtotal) + clientBoda;
  const isFree = subsidyPct >= 100 && deliveryFee > 0;
  const isShared = subsidyPct > 0 && subsidyPct < 100;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Mchanganuo wa malipo yako</h4>
        {isFree && (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
            <Sparkles className="mr-1 inline h-3 w-3" />
            Delivery bure
          </span>
        )}
        {isShared && (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warning-foreground">
            <HandCoins className="mr-1 inline h-3 w-3" />
            Muuzaji amechangia {subsidyPct}%
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-sm">
        <Row label="Bidhaa" v={formatKES(subtotal)} />
        {deliveryFee > 0 && (
          <>
            <Row label="Nauli ya boda (jumla)" v={formatKES(deliveryFee)} muted />
            {sellerBoda > 0 && (
              <Row
                label="Mchango wa muuzaji"
                v={`− ${formatKES(sellerBoda)}`}
                className="text-success"
              />
            )}
            <Row
              label={isFree ? "Utalipa boda" : "Utalipa boda mkononi"}
              v={formatKES(clientBoda)}
              className={isFree ? "text-success" : ""}
            />
          </>
        )}
        <div className="my-2 border-t" />
        <Row label="Utalipa muuzaji sasa" v={formatKES(clientTotal)} bold large />
      </div>

      {isShared && (
        <p className="mt-3 rounded-lg bg-secondary/60 p-2 text-xs text-muted-foreground">
          Muuzaji anachangia nauli ya boda. Wewe utalipa bidhaa + sehemu yako ya nauli moja kwa moja
          kwa boda atakapokufikia.
        </p>
      )}
      {subsidyPct === 0 && deliveryFee > 0 && (
        <p className="mt-3 rounded-lg bg-secondary/60 p-2 text-xs text-muted-foreground">
          Utalipa bidhaa kwa muuzaji sasa, na nauli ya boda utampa boda mkononi atakapokufikia.
        </p>
      )}
      {isFree && (
        <p className="mt-3 rounded-lg bg-success/10 p-2 text-xs text-success">
          Muuzaji analipia boda yote — usimpe boda chochote.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  v,
  bold,
  large,
  muted,
  className = "",
}: {
  label: string;
  v: string;
  bold?: boolean;
  large?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""} ${large ? "text-base" : ""} ${className}`}>
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span>{v}</span>
    </div>
  );
}
