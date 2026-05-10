import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WizardStepper } from "@/components/WizardStepper";
import { GeoAverager } from "@/components/GeoAverager";
import { MapPin, Plus, Trash2, Home, Building2, Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account/addresses")({ component: Addresses });

function Addresses() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const load = () => { if (user) supabase.from("addresses").select("*").eq("user_id", user.id).order("created_at").then(({ data }) => setList(data ?? [])); };
  useEffect(() => { load(); }, [user]);

  const del = async (id: string) => { await supabase.from("addresses").delete().eq("id", id); toast.success("Removed"); load(); };

  const iconFor = (label: string) => /home/i.test(label) ? Home : /office|work/i.test(label) ? Building2 : Heart;

  if (!user) return <AppShell><p>Please sign in.</p></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved addresses</h1>
        <AddressWizard userId={user.id} onDone={load} />
      </div>
      {list.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No addresses yet. Add Home, Office, Mom's…</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {list.map((a) => {
            const Icon = iconFor(a.label);
            return (
              <div key={a.id} className="flex items-start justify-between rounded-2xl border bg-card p-4">
                <div className="flex gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.street ?? `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}`}</div>
                    {a.notes && <div className="mt-1 text-xs text-muted-foreground">{a.notes}</div>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

export function AddressWizard({ userId, onDone, trigger }: { userId: string; onDone: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const steps = ["Label", "Location", "Notes"];
  const [label, setLabel] = useState("");
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [street, setStreet] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setStep(0); setLabel(""); setCoord(null); setStreet(""); setNotes(""); };

  const save = async () => {
    if (!coord) return toast.error("Capture location");
    setBusy(true);
    const { error } = await supabase.from("addresses").insert({ user_id: userId, label, lat: coord.lat, lng: coord.lng, street, notes });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); reset(); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add address</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New saved address</DialogTitle></DialogHeader>
        <WizardStepper steps={steps} current={step} />
        {step === 0 && (
          <div className="space-y-3">
            <div><Label>Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Office, Mom's…" /></div>
            <div className="flex flex-wrap gap-1">
              {["Home", "Office", "Mom's", "Dad's", "School"].map((s) => (
                <button key={s} type="button" onClick={() => setLabel(s)} className="rounded-full border px-3 py-1 text-xs hover:border-primary">{s}</button>
              ))}
            </div>
          </div>
        )}
        {step === 1 && <GeoAverager onResult={setCoord} durationMs={15000} />}
        {step === 2 && (
          <div className="space-y-3">
            <div><Label>Street / building</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} /></div>
            <div><Label>Notes for rider</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Gate code, landmark…" /></div>
          </div>
        )}
        <div className="mt-2 flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !label}>Next</Button>
          ) : (
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save address"}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
