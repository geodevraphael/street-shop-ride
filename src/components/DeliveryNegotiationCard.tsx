import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/pricing";
import { computeClientShare, computeSellerShare } from "@/lib/delivery-share";
import { Bike, HandCoins, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  orderId: string;
  initialFee?: number;
  initialPct?: number;
  onSaved?: () => void;
};

const PRESETS = [
  { pct: 0, label: "Mteja alipe yote", hint: "0%" },
  { pct: 50, label: "Tugawane sawa", hint: "50/50" },
  { pct: 100, label: "Mimi nalipia yote", hint: "100% bure kwa mteja" },
];

export function DeliveryNegotiationCard({ orderId, initialFee = 0, initialPct = 0, onSaved }: Props) {
  const [fee, setFee] = useState<string>(initialFee ? String(initialFee) : "");
  const [pct, setPct] = useState<number>(initialPct ?? 0);
  const [busy, setBusy] = useState(false);

  const feeNum = Number(fee) || 0;
  const clientShare = computeClientShare(feeNum, pct);
  const sellerShare = computeSellerShare(feeNum, pct);

  const save = async () => {
    if (feeNum <= 0) return toast.error("Weka nauli ya boda kwanza");
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({
        delivery_fee: feeNum,
        delivery_subsidy_pct: pct,
        delivery_negotiated: true,
      })
      .eq("id", orderId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Nauli imetumwa kwa mteja");
    onSaved?.();
  };

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Bike className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Panga nauli ya boda</h4>
          <p className="text-xs text-muted-foreground">
            Jadiliana na boda, kisha weka nauli na mchango wako (kama upo).
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="fee">Nauli ya boda (TZS)</Label>
          <Input
            id="fee"
            type="number"
            inputMode="numeric"
            placeholder="mfano 3000"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="mb-2 block">Mchango wako</Label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.pct}
                type="button"
                onClick={() => setPct(p.pct)}
                className={`rounded-xl border p-2 text-left text-xs transition ${
                  pct === p.pct
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "hover:bg-secondary"
                }`}
              >
                <div className="font-semibold">{p.label}</div>
                <div className="text-muted-foreground">{p.hint}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Slider
              value={[pct]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setPct(v[0])}
              className="flex-1"
            />
            <span className="w-12 text-right text-sm font-semibold">{pct}%</span>
          </div>
        </div>

        <div className="rounded-xl bg-secondary/60 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Mteja atalipa boda</span>
            <span className="font-bold text-primary">{formatKES(clientShare)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <HandCoins className="h-3 w-3" />
              Wewe utachangia
            </span>
            <span className="font-semibold text-success">{formatKES(sellerShare)}</span>
          </div>
          {pct === 100 && feeNum > 0 && (
            <p className="mt-2 rounded-lg bg-success/10 p-2 text-xs text-success">
              Mteja hatalipa boda chochote — utaonekana kama duka linalotoa delivery bure 🎉
            </p>
          )}
        </div>

        <Button onClick={save} disabled={busy || feeNum <= 0} className="w-full">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Tuma kwa mteja
        </Button>
      </div>
    </div>
  );
}
