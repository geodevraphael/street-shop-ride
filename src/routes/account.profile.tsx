import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/account/profile")({ component: Profile });

function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.full_name ?? ""); setPhone(data?.phone ?? "");
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  if (!user) return <AppShell><p>Please sign in.</p></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-3">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div><Label>Email</Label><Input value={user.email ?? ""} disabled /></div>
        <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </AppShell>
  );
}
