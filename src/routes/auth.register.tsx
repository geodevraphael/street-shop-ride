import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, ShoppingBag, Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "client" | "seller" | "rider";

export const Route = createFileRoute("/auth/register")({
  validateSearch: (s: Record<string, unknown>) => ({ role: (s.role as Role) ?? undefined }),
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
  const [busy, setBusy] = useState(false);

  if (!role) {
    const opts: { id: Role; icon: any; title: string; desc: string }[] = [
      { id: "client", icon: ShoppingBag, title: "Client", desc: "Order from local shops" },
      { id: "seller", icon: Store, title: "Seller", desc: "Sell products from your shop" },
      { id: "rider", icon: Bike, title: "Boda Boda", desc: "Earn from deliveries" },
    ];
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">Pick your role</h1>
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
        data: { full_name: name, phone, role },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    if (!data.session) {
      toast("Check your email to confirm, then sign in.");
      nav({ to: "/auth/login" });
      return;
    }
    // route to next step per role
    if (role === "seller") nav({ to: "/seller", search: { setup: 1 } as any });
    else if (role === "rider") nav({ to: "/rider", search: { setup: 1 } as any });
    else nav({ to: "/account/addresses" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold">Create {role} account</h1>
        <button onClick={() => setRole(null)} className="mt-1 text-xs text-muted-foreground underline">Change role</button>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div><Label>Full name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" /></div>
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Have an account? <Link to="/auth/login" className="text-primary underline">Sign in</Link>
        </p>
      </div>
    </AppShell>
  );
}
