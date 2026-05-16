import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Copy, Share2, Gift, Users, Wallet, Check, Send } from "lucide-react";

const PER_INVITE = 1000;
const PAYOUT_THRESHOLD = 20;
const PAYOUT_AMOUNT = PER_INVITE * PAYOUT_THRESHOLD; // 20,000

export const Route = createFileRoute("/referrals")({ component: ReferralsPage });

function ReferralsPage() {
  const { user, roles } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data: setting } = await supabase
      .from("app_settings").select("value").eq("key", "referrals_enabled").maybeSingle();
    setEnabled(setting?.value === true || setting?.value === "true");

    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(p);
    setPhone(p?.payout_phone ?? p?.phone ?? "");
    const { data: refs } = await supabase
      .from("referrals")
      .select("id, referred_role, qualified, qualified_at, created_at, referred_user_id, profiles:referred_user_id(full_name)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });
    setReferrals(refs ?? []);
    const { data: rew } = await supabase
      .from("referral_rewards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRewards(rew ?? []);
  };
  useEffect(() => { load(); }, [user]);

  if (!user) {
    return <AppShell><p>Tafadhali ingia kuona referral yako.</p></AppShell>;
  }

  const code = profile?.referral_code ?? "";
  const link = typeof window !== "undefined" ? `${window.location.origin}/auth/register?ref=${code}` : "";

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Imenakiliwa");
  };

  const shareWA = () => {
    const msg = `Jiunge na Soko utumie code yangu: ${code}\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const savePhone = async () => {
    setSavingPhone(true);
    const { error } = await supabase.from("profiles").update({ payout_phone: phone }).eq("id", user.id);
    setSavingPhone(false);
    if (error) return toast.error(error.message);
    toast.success("Namba ya malipo imehifadhiwa");
    load();
  };

  const sellerRefs = referrals.filter((r) => r.referred_role === "seller");
  const bodaRefs = referrals.filter((r) => r.referred_role === "rider");
  const qualifiedSellers = sellerRefs.filter((r) => r.qualified).length;
  const qualifiedBodas = bodaRefs.filter((r) => r.qualified).length;

  const cashEarned = rewards
    .filter((r) => r.reward_type === "cash_payout")
    .reduce((s, r) => s + Number(r.amount), 0);
  const cashPaid = rewards
    .filter((r) => r.reward_type === "cash_payout" && r.status === "paid")
    .reduce((s, r) => s + Number(r.amount), 0);
  const cashPending = cashEarned - cashPaid;

  const subDiscountMonths = rewards
    .filter((r) => r.reward_type === "subscription_discount")
    .reduce((s, r) => s + Number(r.details?.months ?? 0), 0);
  const bodaDiscountPct = rewards
    .filter((r) => r.reward_type === "boda_discount")
    .reduce((s, r) => s + Number(r.amount), 0);

  const clientRefs = referrals.filter((r) => r.referred_role === "client");
  const qualifiedClients = clientRefs.filter((r) => r.qualified).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Referral Program</h1>
          <p className="text-sm text-muted-foreground">Alika watu — pata zawadi za pesa na punguzo.</p>
        </div>

        {!enabled && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Referral program imezimwa kwa sasa na admin. Bado unaweza kuona historia yako, lakini hakuna zawadi mpya zitatolewa.
          </div>
        )}

        {/* Code + share */}
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-accent p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Gift className="h-4 w-4" /> Code yako</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 rounded-xl border bg-background px-4 py-3 font-mono text-xl tracking-widest">{code || "—"}</div>
            <Button variant="outline" size="icon" onClick={() => copy(code)} aria-label="Copy code"><Copy className="h-4 w-4" /></Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={shareWA} className="gap-2 bg-[#25D366] text-white hover:bg-[#1da851]"><Share2 className="h-4 w-4" /> Shiriki WhatsApp</Button>
            <Button variant="outline" onClick={() => copy(link)} className="gap-2"><Copy className="h-4 w-4" /> Nakili link</Button>
          </div>
          <p className="mt-2 break-all text-xs text-muted-foreground">{link}</p>
        </div>

        {/* Reward rules — show only those applicable to this user */}
        {(() => {
          const isSeller = roles.includes("seller");
          const isRider = roles.includes("rider");
          const cards: React.ReactNode[] = [];
          // Cash payouts: anyone can earn by inviting sellers / clients
          cards.push(<RuleCard key="s10" icon={Wallet} title="Sellers 10 = TSh 10,000" desc="Alika sellers 10 wanaolist bidhaa, pata TSh 10,000 kwa simu yako." progress={`${qualifiedSellers}/10`} />);
          cards.push(<RuleCard key="c100" icon={Users} title="Clients 100 + 30% = TSh 100,000" desc="Alika wateja 100 na angalau 30% wanunue mara ya kwanza, pata TSh 100,000." progress={`${clientRefs.length}/100 · ${qualifiedClients}/30`} />);
          // Subscription discount: only sellers (they pay monthly fee)
          if (isSeller) cards.push(<RuleCard key="s5" icon={Store} title="Sellers 5 = 50% off" desc="Alika sellers 5; pata punguzo 50% kwa miezi 2 ya ada ya mwezi." progress={`${qualifiedSellers}/5`} />);
          // Boda discount: only riders (applied to their boda fees)
          if (isRider) cards.push(<RuleCard key="b2" icon={Bike} title="Boda 2 = 2% off" desc="Kila boda 2 wanaojisajili kupitia kwako, pata 2% punguzo kwenye ada." progress={`${qualifiedBodas}/2`} />);
          return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards}</div>;
        })()}

        {/* Earnings summary */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Pesa zilizopatikana" value={`TSh ${cashEarned.toLocaleString()}`} sub={`Inasubiri: TSh ${cashPending.toLocaleString()}`} />
          <Stat label="Miezi ya punguzo" value={`${subDiscountMonths} mo`} sub="50% off ada ya muuzaji" />
          <Stat label="Punguzo la boda" value={`${bodaDiscountPct}%`} sub="Kwenye ada yako" />
        </div>

        {/* Payout phone */}
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="font-semibold">Namba ya malipo (Mobile money)</h3>
          <p className="text-xs text-muted-foreground">Tutatumia namba hii kutuma TSh 10,000 utakapostahili.</p>
          <div className="mt-3 flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
            <Button onClick={savePhone} disabled={savingPhone || !phone}>Hifadhi</Button>
          </div>
        </div>

        {/* Referrals list */}
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center gap-2 border-b p-4"><Users className="h-4 w-4 text-primary" /><h3 className="font-semibold">Watu uliowaalika ({referrals.length})</h3></div>
          {referrals.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Bado hujamwalika mtu. Shiriki code yako kuanza.</p>
          ) : (
            <ul className="divide-y">
              {referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{r.profiles?.full_name || "Mtumiaji mpya"}</p>
                    <p className="text-xs text-muted-foreground">{r.referred_role} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  {r.qualified ? (
                    <Badge className="gap-1 bg-emerald-600 text-white"><Check className="h-3 w-3" /> Qualified</Badge>
                  ) : (
                    <Badge variant="outline">Inasubiri</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rewards history */}
        <div className="rounded-2xl border bg-card">
          <div className="border-b p-4"><h3 className="font-semibold">Zawadi zako ({rewards.length})</h3></div>
          {rewards.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Hakuna zawadi bado.</p>
          ) : (
            <ul className="divide-y">
              {rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-medium">{labelForReward(r)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant={r.status === "paid" || r.status === "applied" ? "default" : "outline"}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function RuleCard({ icon: Icon, title, desc, progress }: any) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" /> {title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <p className="mt-2 text-xs font-mono text-primary">{progress}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function labelForReward(r: any) {
  if (r.reward_type === "cash_payout") return `TSh ${Number(r.amount).toLocaleString()} cash payout`;
  if (r.reward_type === "subscription_discount") return `${r.details?.percent ?? 50}% off ada x ${r.details?.months ?? 2} miezi`;
  if (r.reward_type === "boda_discount") return `${r.amount}% punguzo (boda referral)`;
  return r.reward_type;
}
