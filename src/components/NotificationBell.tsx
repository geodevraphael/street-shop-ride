import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  order_id: string | null;
  read_at: string | null;
  created_at: string;
};

const SOUND_TYPES = new Set([
  "order_placed",
  "payment_submitted",
  "offer_new",
  "rider_assigned",
  "offer_accepted",
]);

// Tiny WebAudio "ding" — no asset needed
function playDing() {
  try {
    const Ctx =
      (typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) ||
      null;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start();
    o.stop(ctx.currentTime + 0.4);
    if ("vibrate" in navigator) navigator.vibrate?.(120);
  } catch {
    /* ignore */
  }
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "sasa hivi";
  if (m < 60) return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}saa`;
  const d = Math.floor(h / 24);
  return `${d}sk`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const firstLoad = useRef(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notification[]) ?? []);
    firstLoad.current = false;
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 20));
          if (SOUND_TYPES.has(n.type)) playDing();
          toast(n.title, {
            description: n.body ?? undefined,
            action: n.link
              ? {
                  label: "Fungua",
                  onClick: () => {
                    window.location.href = n.link!;
                  },
                }
              : undefined,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const unread = items.filter((i) => !i.read_at).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
  };

  const markOneRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i)));
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Arifa" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-primary px-1 text-center text-[9px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-semibold">Arifa</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead}>
              <Check className="h-3 w-3" /> Soma zote
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Hakuna arifa bado.</p>
          ) : (
            items.map((n) => {
              const content = (
                <div
                  className={`flex flex-col gap-0.5 border-b px-3 py-2.5 text-sm transition hover:bg-secondary/60 ${
                    n.read_at ? "opacity-70" : "bg-primary/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                </div>
              );
              return n.link ? (
                <Link
                  key={n.id}
                  to={n.link}
                  onClick={() => {
                    setOpen(false);
                    if (!n.read_at) markOneRead(n.id);
                  }}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={n.id}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => !n.read_at && markOneRead(n.id)}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
