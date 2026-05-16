import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Truck, Phone, MessageCircle, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/couriers")({ component: AdminCouriers });

type Vendor = {
  id: string;
  name: string;
  logo_url: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  pricing_notes: string | null;
  regions_served: string[];
  active: boolean;
  created_at: string;
};

function AdminCouriers() {
  const [list, setList] = useState<Vendor[]>([]);
  const load = () => supabase.from("courier_vendors").select("*").order("name").then(({ data }) => setList((data as any) ?? []));
  useEffect(() => { load(); }, []);

  const toggle = async (v: Vendor) => {
    const { error } = await supabase.from("courier_vendors").update({ active: !v.active }).eq("id", v.id);
    if (error) return toast.error(error.message);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Futa wakala huyu?")) return;
    const { error } = await supabase.from("courier_vendors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Imefutwa");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Wakala wa Usafirishaji wa Mikoa</h2>
          <p className="text-sm text-muted-foreground">USIRI, SuperLink na wengine. Wanatumika kwa oda za kati ya mikoa.</p>
        </div>
        <VendorDialog onSaved={load} trigger={<Button className="gap-1.5"><Plus className="h-4 w-4" /> Ongeza wakala</Button>} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {list.map((v) => (
          <div key={v.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{v.name}</div>
                  {v.contact_phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{v.contact_phone}</div>
                  )}
                  {v.contact_whatsapp && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle className="h-3 w-3" />{v.contact_whatsapp}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={v.active} onCheckedChange={() => toggle(v)} />
                <StaffDialog vendor={v} trigger={<Button size="sm" variant="outline">Wakala</Button>} />
                <VendorDialog
                  vendor={v}
                  onSaved={load}
                  trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                />
                <Button size="icon" variant="ghost" onClick={() => del(v.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {v.regions_served?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {v.regions_served.map((r) => (
                  <span key={r} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{r}</span>
                ))}
              </div>
            )}
            {v.pricing_notes && <p className="mt-2 text-xs text-muted-foreground">{v.pricing_notes}</p>}
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">Bado hakuna wakala. Ongeza mmoja kuanza.</p>}
      </div>
    </div>
  );
}

function VendorDialog({ vendor, onSaved, trigger }: { vendor?: Vendor; onSaved: () => void; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(vendor?.name ?? "");
  const [phone, setPhone] = useState(vendor?.contact_phone ?? "");
  const [whatsapp, setWhatsapp] = useState(vendor?.contact_whatsapp ?? "");
  const [notes, setNotes] = useState(vendor?.pricing_notes ?? "");
  const [regions, setRegions] = useState((vendor?.regions_served ?? []).join(", "));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error("Jina linahitajika");
    setBusy(true);
    const payload = {
      name: name.trim(),
      contact_phone: phone.trim() || null,
      contact_whatsapp: whatsapp.trim() || null,
      pricing_notes: notes.trim() || null,
      regions_served: regions.split(",").map((r) => r.trim()).filter(Boolean),
    };
    const res = vendor
      ? await supabase.from("courier_vendors").update(payload).eq("id", vendor.id)
      : await supabase.from("courier_vendors").insert(payload);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Imehifadhiwa");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{vendor ? "Hariri wakala" : "Ongeza wakala"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Jina</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Simu</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
          </div>
          <div>
            <Label>Mikoa wanayotoa huduma (tenganisha kwa koma)</Label>
            <Input value={regions} onChange={(e) => setRegions(e.target.value)} placeholder="Dar es Salaam, Arusha, Mwanza" />
          </div>
          <div><Label>Maelezo ya bei</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy}>{busy ? "Inahifadhi…" : "Hifadhi"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
