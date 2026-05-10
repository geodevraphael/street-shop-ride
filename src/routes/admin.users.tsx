import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
          <tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Roles</th><th className="p-3">Joined</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3 font-medium">{r.full_name || "—"}</td>
              <td className="p-3">{r.phone || "—"}</td>
              <td className="p-3"><div className="flex gap-1">{(r.user_roles ?? []).map((x: any) => <span key={x.role} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{x.role}</span>)}</div></td>
              <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
