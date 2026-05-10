import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ReportDialog({
  targetType,
  targetId,
  trigger,
}: {
  targetType: "seller" | "rider";
  targetId: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in to report"); setBusy(false); return; }
    const { error } = await supabase.from("reports").insert({
      reporter_id: u.user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      notes,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted");
    setOpen(false);
    setReason(""); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="ghost" size="sm" className="gap-1.5 text-destructive"><Flag className="h-3.5 w-3.5" /> Report</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report {targetType}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Reason (e.g. fraud, harassment)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Textarea placeholder="Tell us what happened" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          <Button onClick={submit} disabled={busy || !reason.trim()} className="w-full">Submit report</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
