import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LipaNumberForm, EMPTY_LIPA, type LipaFormValue } from "@/components/LipaNumberForm";
import { getProvider, ACCOUNT_TYPE_LABELS } from "@/lib/payment-providers";
import { toast } from "sonner";
import { Plus, Star, Trash2, Pencil, Loader2, CreditCard } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/seller/payments")({ component: SellerPayments });

function SellerPayments() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<LipaFormValue>(EMPTY_LIPA);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: s } = await supabase.from("shops").select("id, name").eq("owner_id", user.id).maybeSingle();
    setShop(s);
    if (s) {
      const { data } = await supabase
        .from("shop_lipa_numbers")
        .select("*")
        .eq("shop_id", s.id)
        .order("is_default", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      setRows(data ?? []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_LIPA, is_default: rows.length === 0 });
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing(row);
    setForm({
      provider: row.provider,
      account_type: row.account_type,
      number: row.number,
      account_name: row.account_name ?? "",
      instructions: row.instructions ?? "",
      qr_code_url: row.qr_code_url,
      is_default: row.is_default,
      active: row.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.provider || !form.number.trim()) return toast.error("Jaza taarifa zote muhimu");
    setBusy(true);
    const payload = {
      shop_id: shop.id,
      provider: form.provider,
      account_type: form.account_type,
      number: form.number.trim(),
      account_name: form.account_name.trim() || null,
      instructions: form.instructions.trim() || null,
      qr_code_url: form.qr_code_url,
      is_default: form.is_default,
      active: form.active,
    };
    const { error } = editing
      ? await supabase.from("shop_lipa_numbers").update(payload).eq("id", editing.id)
      : await supabase.from("shop_lipa_numbers").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Imesasishwa" : "Imeongezwa");
    setOpen(false);
    load();
  };

  const setDefault = async (id: string) => {
    const { error } = await supabase.from("shop_lipa_numbers").update({ is_default: true }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("shop_lipa_numbers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Imefutwa");
    load();
  };
  const toggleActive = async (row: any) => {
    const { error } = await supabase.from("shop_lipa_numbers").update({ active: !row.active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!shop) return <p className="text-muted-foreground">Hujasajili duka bado.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold"><CreditCard className="h-5 w-5" /> Njia za malipo</h2>
          <p className="text-sm text-muted-foreground">Ongeza M-Pesa, Mixx, Airtel, NMB, CRDB, Selcom n.k. Mteja atachagua ipi atumie.</p>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Ongeza</Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 font-medium">Bado huna njia ya malipo</p>
          <p className="text-sm text-muted-foreground">Ongeza walau moja ili wateja waweze kulipa.</p>
          <Button onClick={openNew} className="mt-3 gap-1.5"><Plus className="h-4 w-4" /> Ongeza ya kwanza</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const p = getProvider(row.provider);
            return (
              <div key={row.id} className="overflow-hidden rounded-2xl border bg-card">
                <div
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                  style={{ background: p.bg, color: p.fg }}
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-md text-xs font-black"
                    style={{ background: p.fg, color: p.bg }}
                  >{p.monogram}</span>
                  <span className="flex-1 truncate">{p.shortName}</span>
                  {row.is_default && (
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                      <Star className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[row.account_type as keyof typeof ACCOUNT_TYPE_LABELS]}
                    </p>
                    <p className="font-mono text-lg font-bold">{row.number}</p>
                  </div>
                  {row.account_name && (
                    <p className="text-xs"><span className="text-muted-foreground">Jina:</span> <b>{row.account_name}</b></p>
                  )}
                  {!row.active && (
                    <p className="text-xs text-warning-foreground">Imezimwa (haitaonekana kwa mteja)</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {!row.is_default && (
                      <Button size="sm" variant="outline" onClick={() => setDefault(row.id)} className="gap-1">
                        <Star className="h-3 w-3" /> Default
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)} className="gap-1">
                      <Pencil className="h-3 w-3" /> Hariri
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(row)}>
                      {row.active ? "Zima" : "Washa"}
                    </Button>
                    <ConfirmDialog
                      title="Futa njia ya malipo?"
                      description={`${p.shortName} — ${row.number}`}
                      confirmLabel="Futa"
                      onConfirm={async () => { await remove(row.id); }}
                      trigger={
                        <Button size="sm" variant="outline" className="gap-1 text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Hariri njia ya malipo" : "Ongeza njia ya malipo"}</DialogTitle>
          </DialogHeader>
          {user && (
            <LipaNumberForm
              value={form}
              onChange={setForm}
              userId={user.id}
              onSubmit={save}
              submitLabel={editing ? "Sasisha" : "Hifadhi"}
              busy={busy}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
