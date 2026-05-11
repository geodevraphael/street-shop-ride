import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ShoppingBag, Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

type Role = "client" | "seller" | "rider";

export const Route = createFileRoute("/auth/register")({
  validateSearch: (s: Record<string, unknown>) => ({
    role: (s.role as Role) ?? undefined,
    ref: typeof s.ref === "string" ? (s.ref as string) : undefined,
  }),
  component: Register,
});

function Register() {
  const nav = useNavigate();
  const search = useSearch({ from: "/auth/register" });
  const [role, setRole] = useState<Role | null>(search.role ?? null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [refCode, setRefCode] = useState(search.ref ?? "");
  const [busy, setBusy] = useState(false);

  if (!role) {
    const opts: { id: Role; icon: any; title: string; desc: string }[] = [
      { id: "client", icon: ShoppingBag, title: "Mteja", desc: "Nunua kutoka maduka ya karibu" },
      { id: "seller", icon: Store, title: "Muuzaji", desc: "Uza bidhaa kutoka kwenye duka lako" },
      { id: "rider", icon: Bike, title: "Boda Boda", desc: "Pata mapato ya kufikisha bidhaa" },
    ];
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">Chagua jukumu lako</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {opts.map((o) => (
              <button key={o.id} onClick={() => setRole(o.id)} className="rounded-2xl border bg-card p-5 text-left transition hover:border-primary hover:shadow-md">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary"><o.icon className="h-5 w-5" /></div>
                <h3 className="mt-3 font-semibold">{o.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name, phone, role, ref_code: refCode || undefined },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Akaunti imeundwa");
    if (!data.session) {
      toast("Thibitisha email yako kisha ingia.");
      nav({ to: "/auth/login" });
      return;
    }
    if (role === "seller") nav({ to: "/seller", search: { setup: 1 } as any });
    else if (role === "rider") nav({ to: "/rider", search: { setup: 1 } as any });
    else nav({ to: "/account/addresses" });
  };

  const google = async () => {
    setBusy(true);
    // pass ref + role via localStorage so post-OAuth we can apply them on the new profile if needed
    if (refCode) localStorage.setItem("pending_ref_code", refCode);
    if (role) localStorage.setItem("pending_role", role);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      return toast.error(result.error.message ?? "Google sign-in failed");
    }
    if (result.redirected) return;
    nav({ to: "/" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold">Fungua akaunti ya {role}</h1>
        <button onClick={() => setRole(null)} className="mt-1 text-xs text-muted-foreground underline">Badilisha jukumu</button>

        <Button type="button" variant="outline" className="mt-6 w-full gap-2" onClick={google} disabled={busy}>
          <GoogleIcon /> Endelea na Google
        </Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> AU <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div><Label>Jina kamili</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Simu</Label><Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" /></div>
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div>
            <Label>Referral code <span className="text-xs text-muted-foreground">— hiari</span></Label>
            <Input value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} placeholder="Mfano: ABC12345" />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Inaunda…" : "Fungua akaunti"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Una akaunti? <Link to="/auth/login" className="text-primary underline">Ingia</Link>
        </p>
      </div>
    </AppShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.85 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.67-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.67 2.84C6.72 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
