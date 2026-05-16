import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export type ReviewTarget = {
  type: "shop" | "product" | "rider";
  id: string;
  label: string;
};

export function ReviewPrompt({
  orderId,
  targets,
}: {
  orderId: string;
  targets: ReviewTarget[];
}) {
  const { user } = useAuth();
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ReviewTarget | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reviews")
      .select("target_type,target_id")
      .eq("order_id", orderId)
      .eq("reviewer_id", user.id)
      .then(({ data }) => {
        setExisting(new Set((data ?? []).map((r: any) => `${r.target_type}:${r.target_id}`)));
      });
  }, [user?.id, orderId]);

  const pending = targets.filter((t) => !existing.has(`${t.type}:${t.id}`));
  if (pending.length === 0) {
    return (
      <p className="text-sm text-success">⭐ Asante kwa kutoa rating yako.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Toa rating — saidia wengine wajue:</p>
      <div className="flex flex-wrap gap-2">
        {pending.map((t) => (
          <Button
            key={`${t.type}:${t.id}`}
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setActive(t);
              setOpen(true);
            }}
          >
            <Star className="h-3.5 w-3.5" /> Rate {labelFor(t.type)} {t.label}
          </Button>
        ))}
      </div>
      <ReviewDialog
        open={open}
        onOpenChange={setOpen}
        target={active}
        orderId={orderId}
        onSaved={(t) => {
          setExisting((prev) => new Set(prev).add(`${t.type}:${t.id}`));
          setOpen(false);
        }}
      />
    </div>
  );
}

function labelFor(t: ReviewTarget["type"]) {
  return t === "shop" ? "duka" : t === "rider" ? "boda" : "bidhaa";
}

function ReviewDialog({
  open,
  onOpenChange,
  target,
  orderId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: ReviewTarget | null;
  orderId: string;
  onSaved: (t: ReviewTarget) => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(5);
      setComment("");
    }
  }, [open, target?.id]);

  const save = async () => {
    if (!user || !target) return;
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      reviewer_id: user.id,
      target_type: target.type,
      target_id: target.id,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Asante kwa rating yako!");
    onSaved(target);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate {target ? labelFor(target.type) : ""} {target?.label}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="transition hover:scale-110"
              aria-label={`Nyota ${n}`}
            >
              <Star
                className={`h-9 w-9 ${
                  n <= rating ? "fill-warning text-warning" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Maoni yako (hiari)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
        />
        <Button onClick={save} disabled={busy}>
          {busy ? "Inahifadhi…" : "Tuma rating"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
