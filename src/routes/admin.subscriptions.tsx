import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatTSh } from "@/lib/pricing";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subscriptions")({ component: AdminSubs });

function AdminSubs() {
  const [shops, setShops] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const load = async () => {
    const [s, r, i] = await Promise.all([
      supabase.from("shops").select("id,name,sales_count,subscription_active,owner_id"),
      supabase.from("riders").select("id,full_name,deliveries_count,subscription_active,user_id"),
      supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setShops(s.data ?? []); setRiders(r.data ?? []); setInvoices(i.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const activate = async (kind: "seller" | "rider", userId: string, amount: number) => {
    const { data: sub } = await supabase.from("subscriptions").insert({ user_id: userId, role: kind, monthly_amount: amount }).select("*").single();
    if (sub) {
      const start = new Date();
      const end = new Date(); end.setMonth(end.getMonth() + 1);
      await supabase.from("invoices").insert({ subscription_id: sub.id, amount, period_start: start.toISOString(), period_end: end.toISOString() });
      if (kind === "seller") await supabase.from("shops").update({ subscription_active: true }).eq("owner_id", userId);
      else await supabase.from("riders").update({ subscription_active: true }).eq("user_id", userId);
      toast.success("Activated"); load();
    }
  };

  const markPaid = async (id: string) => {
    await supabase.from("invoices").update({ paid: true, paid_at: new Date().toISOString() }).eq("id", id);
    toast.success("Marked paid"); load();
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold">Sellers eligible (10+ sales)</h2>
        <div className="mt-2 space-y-2">
          {shops.filter((s) => s.sales_count >= 10 && !s.subscription_active).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-2xl border bg-card p-3">
              <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.sales_count} sales</div></div>
              <Button size="sm" onClick={() => activate("seller", s.owner_id, 20000)}>Activate {formatKES(20000)}</Button>
            </div>
          ))}
          {shops.filter((s) => s.sales_count >= 10 && !s.subscription_active).length === 0 && <p className="text-sm text-muted-foreground">None pending.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Riders eligible (10+ routes)</h2>
        <div className="mt-2 space-y-2">
          {riders.filter((r) => r.deliveries_count >= 10 && !r.subscription_active).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-2xl border bg-card p-3">
              <div><div className="font-medium">{r.full_name}</div><div className="text-xs text-muted-foreground">{r.deliveries_count} routes</div></div>
              <Button size="sm" onClick={() => activate("rider", r.user_id, 10000)}>Activate {formatKES(10000)}</Button>
            </div>
          ))}
          {riders.filter((r) => r.deliveries_count >= 10 && !r.subscription_active).length === 0 && <p className="text-sm text-muted-foreground">None pending.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Recent invoices</h2>
        <div className="mt-2 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase text-muted-foreground"><tr><th className="p-3 text-left">Period</th><th className="p-3 text-left">Amount</th><th className="p-3">Status</th><th></th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-3">{new Date(i.period_start).toLocaleDateString()} – {new Date(i.period_end).toLocaleDateString()}</td>
                  <td className="p-3">{formatKES(Number(i.amount))}</td>
                  <td className="p-3 text-center"><span className={i.paid ? "text-success" : "text-warning-foreground"}>{i.paid ? "Paid" : "Due"}</span></td>
                  <td className="p-3 text-right">{!i.paid && <Button size="sm" variant="outline" onClick={() => markPaid(i.id)}>Mark paid</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
