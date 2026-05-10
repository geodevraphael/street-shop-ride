import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatKES } from "@/lib/pricing";

export const Route = createFileRoute("/seller/billing")({ component: SellerBilling });

function SellerBilling() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("shops").select("*").eq("owner_id", user.id).maybeSingle().then(({ data }) => setShop(data));
    supabase.from("subscriptions").select("id").eq("user_id", user.id).eq("role", "seller").then(async ({ data }) => {
      if (!data || data.length === 0) return;
      const { data: inv } = await supabase.from("invoices").select("*").in("subscription_id", data.map((x) => x.id)).order("created_at", { ascending: false });
      setInvoices(inv ?? []);
    });
  }, [user]);

  if (!shop) return null;
  const remaining = Math.max(0, 10 - shop.sales_count);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Subscription</h2>
        {shop.subscription_active ? (
          <p className="mt-1 text-sm">Active — {formatKES(20000)} / month.</p>
        ) : remaining > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">You're free until 10 sales. {remaining} to go.</p>
        ) : (
          <p className="mt-1 text-sm">Threshold reached. Admin will activate {formatKES(20000)}/month.</p>
        )}
      </div>
      <div className="rounded-2xl border bg-card p-4">
        <h3 className="font-semibold">Invoices</h3>
        {invoices.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No invoices yet.</p> : (
          <ul className="mt-2 divide-y text-sm">
            {invoices.map((i) => (
              <li key={i.id} className="flex justify-between py-2">
                <span>{new Date(i.period_start).toLocaleDateString()} – {new Date(i.period_end).toLocaleDateString()}</span>
                <span className={i.paid ? "text-success" : "text-warning-foreground"}>{formatKES(Number(i.amount))} · {i.paid ? "Paid" : "Due"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
