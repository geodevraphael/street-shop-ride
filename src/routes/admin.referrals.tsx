import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Wallet } from "lucide-react";

export const Route = createFileRoute("/admin/referrals")({ component: AdminReferrals });

function AdminReferrals() {
  const [enabled, setEnabled] = useState(true);
  const [rewards, setRewards] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "paid" | "all">("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "referrals_enabled")
      .maybeSingle();
    setEnabled(settings?.value === true || settings?.value === "true");

    const { data } = await supabase
      .from("referral_rewards")
      .select("*, profiles:user_id(full_name, phone, payout_phone, referral_code)")
      .order("created_at", { ascending: false });
    setRewards(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "referrals_enabled", value: next, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); load(); return; }
    toast.success(next ? "Referral program ENABLED" : "Referral program DISABLED");
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase
      .from("referral_rewards")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Imewekwa kuwa imelipwa");
    load();
  };

  const cashRewards = rewards.filter((r) => r.reward_type === "cash_payout");
  const visible = cashRewards.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.profiles?.full_name ?? "").toLowerCase().includes(q) ||
        (r.profiles?.phone ?? "").includes(q) ||
        (r.profiles?.payout_phone ?? "").includes(q) ||
        (r.profiles?.referral_code ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPending = cashRewards
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between rounded-2xl border bg-card p-4">
        <div>
          <h2 className="font-semibold">Referral Program</h2>
          <p className="text-sm text-muted-foreground">{enabled ? "Inaendelea — watumiaji wanaweza kupata zawadi." : "Imezimwa — hakuna zawadi mpya zitatolewa."}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pending payouts" value={`TSh ${totalPending.toLocaleString()}`} icon={Wallet} />
        <Stat label="Cash payouts (total)" value={String(cashRewards.length)} />
        <Stat label="All rewards" value={String(rewards.length)} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "paid", "all"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
        <Input placeholder="Tafuta jina, simu, code…" value={search} onChange={(e) => setSearch(e.target.value)} className="ml-auto max-w-xs" />
      </div>

      {/* Cash payout list */}
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h3 className="font-semibold">Watu wanaostahili kulipwa ({visible.length})</h3></div>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Inapakia…</p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Hakuna rekodi.</p>
        ) : (
          <ul className="divide-y">
            {visible.map((r) => {
              const phone = r.profiles?.payout_phone || r.profiles?.phone || "—";
              const kind = r.details?.kind === "client_100" ? "Clients (100/30)" : r.details?.kind === "seller_10" ? "Sellers (10)" : "Cash";
              return (
                <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{r.profiles?.full_name || "—"} <span className="ml-2 text-xs font-mono text-muted-foreground">{r.profiles?.referral_code}</span></p>
                    <p className="text-xs text-muted-foreground">Lipa kwa: <span className="font-medium text-foreground">{phone}</span> · {kind} · {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "paid" ? "default" : "outline"}>{r.status}</Badge>
                    <span className="text-sm font-bold">TSh {Number(r.amount).toLocaleString()}</span>
                    {r.status !== "paid" && (
                      <Button size="sm" onClick={() => markPaid(r.id)} className="gap-1"><Check className="h-3.5 w-3.5" /> Mark paid</Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{Icon && <Icon className="h-4 w-4" />} {label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
