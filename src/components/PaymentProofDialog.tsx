import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, LoaderCircle, Upload } from "lucide-react";
import { toast } from "sonner";

export function PaymentProofDialog({
  orderId,
  userId,
  onSubmitted,
  disabled = false,
  triggerLabel = "Nimelipia",
}: {
  orderId: string;
  userId: string;
  onSubmitted: () => void | Promise<void>;
  disabled?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!userId) return toast.error("Ingia kwanza uendelee");
    if (!ref.trim() && !file) {
      return toast.error("Weka risiti au namba ya M-Pesa");
    }
    setBusy(true);
    let proofUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${orderId}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) {
        setBusy(false);
        return toast.error(upErr.message);
      }
      const { data } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      proofUrl = data?.signedUrl ?? null;
    }
    const { error } = await supabase
      .from("orders")
      .update({
        status: "payment_submitted",
        payment_proof_url: proofUrl,
        payment_ref: ref.trim() || null,
        payment_submitted_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Asante! Muuzaji atathibitisha malipo");
    setSubmitted(true);
    setFile(null);
    setRef("");
    setOpen(false);
    await onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-1.5" disabled={disabled || busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {busy ? "Inatuma ushahidi…" : submitted ? "Ushahidi umetumwa" : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thibitisha malipo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Namba ya muamala (M-Pesa)</Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              placeholder="QABCDE12345"
            />
          </div>
          <div>
            <Label>Ambatisha SMS / risiti (picha)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Picha ya SMS au screenshot ya M-Pesa. Unaweza pia kuweka namba ya muamala hapo juu.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={disabled || busy || (!ref.trim() && !file)} className="gap-1.5">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Inatuma…" : "Tuma uthibitisho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
