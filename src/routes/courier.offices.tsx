import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/courier/offices")({ component: Offices });

type Row = { vendor_id: string; office: string | null; role: string; vendor: { name: string; contact_phone: string | null } };

function Offices() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("courier_staff").select("vendor_id, office, role, vendor:courier_vendors(name, contact_phone)").eq("user_id", user.id).then(({ data }) => setRows((data as any) ?? []));
  }, [user]);

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Bado hujaongezwa kwenye wakala wowote.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((r) => (
        <div key={r.vendor_id + (r.office ?? "")} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Truck className="h-5 w-5" /></div>
            <div>
              <div className="font-semibold">{r.vendor.name}</div>
              <div className="text-xs text-muted-foreground">{r.office ?? "Ofisi haijabainishwa"} · {r.role}</div>
              {r.vendor.contact_phone && <div className="text-xs text-muted-foreground">{r.vendor.contact_phone}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
