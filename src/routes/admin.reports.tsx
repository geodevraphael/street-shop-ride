import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({ component: AdminReports });

function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const load = () => supabase.from("reports").select("*").order("created_at", { ascending: false }).then(({ data }) => setReports(data ?? []));
  useEffect(() => { load(); }, []);

  const resolve = async (id: string) => {
    await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    toast.success("Resolved"); load();
  };

  if (reports.length === 0) return <p className="text-sm text-muted-foreground">No reports.</p>;
  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <div key={r.id} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">{r.target_type} · {r.status}</div>
              <div className="font-semibold">{r.reason}</div>
              {r.notes && <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>}
            </div>
            {r.status === "open" && <Button size="sm" onClick={() => resolve(r.id)}>Mark resolved</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
