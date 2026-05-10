import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatKES } from "@/lib/pricing";

export const Route = createFileRoute("/rider/billing")({ component: RiderBilling });

function RiderBilling() {
  const { user } = useAuth();
  const [rider, setRider] = useState<any>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("riders").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => setRider(data));
  }, [user]);
  if (!rider) return null;
  const remaining = Math.max(0, 10 - rider.deliveries_count);
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Subscription</h2>
      {rider.subscription_active
        ? <p className="mt-1 text-sm">Active — {formatKES(10000)} / month.</p>
        : remaining > 0 ? <p className="mt-1 text-sm text-muted-foreground">Free until 10 routes — {remaining} to go.</p>
        : <p className="mt-1 text-sm">Threshold reached. Admin will activate {formatKES(10000)}/month.</p>}
    </div>
  );
}
