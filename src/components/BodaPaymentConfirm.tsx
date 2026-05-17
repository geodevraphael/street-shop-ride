import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/pricing";
import { CheckCircle2, HandCoins, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  orderId: string;
  clientShare: number;
  confirmed: boolean;
  onConfirmed?: () => void;
};

export function BodaPaymentConfirm({ orderId, clientShare, confirmed, onConfirmed }: Props) {
  const [busy, setBusy] = useState(false);

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <p className="font-semibold">Umemkabidhi boda nauli yake</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Asante. Sasa unaweza kukamilisha oda.
        </p>
      </div>
    );
  }

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({
        boda_paid_confirmed: true,
        boda_paid_confirmed_at: new Date().toISOString(),
        boda_paid_by: "client",
      })
      .eq("id", orderId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Asante — umethibitisha");
    onConfirmed?.();
  };

  return (
    <div className="rounded-2xl border-2 border-warning/40 bg-warning/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-full bg-warning/20 p-2 text-warning-foreground">
          <HandCoins className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Je, umemkabidhi boda nauli yake?</h4>
          <p className="text-xs text-muted-foreground">
            Boda anatakiwa kupata <b className="text-foreground">{formatKES(clientShare)}</b> kutoka
            kwako.
          </p>
        </div>
      </div>
      <Button onClick={confirm} disabled={busy} className="w-full">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
        Ndiyo, nimempa
      </Button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Hii inalinda boda na kukamilisha oda. Kama bado, mpe kwanza halafu thibitisha.
      </p>
    </div>
  );
}
