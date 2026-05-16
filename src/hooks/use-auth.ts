import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "client" | "seller" | "rider" | "admin" | "support";

async function fetchRoles(userId: string | null | undefined) {
  if (!userId) return [] as Role[];

  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((row: any) => row.role as Role);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncFromSession = async (nextSession: Session | null) => {
      if (cancelled) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      const nextRoles = await fetchRoles(nextSession?.user?.id);
      if (!cancelled) setRoles(nextRoles);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncFromSession(nextSession);
    });

    void supabase.auth.getSession().then(({ data }) => {
      void syncFromSession(data.session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    roles,
    loading,
    ready: !loading,
    signOut: () => supabase.auth.signOut(),
  };
}
