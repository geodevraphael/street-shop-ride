import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROMPT_KEY = "soko-notifications-dismissed-at";
const DISMISS_DAYS = 7;

declare global {
  interface Window {
    sokoNotify?: (payload: { title?: string; body?: string; tag?: string; url?: string }) => void;
  }
}

function recentlyDismissed() {
  try {
    const value = localStorage.getItem(PROMPT_KEY);
    return value ? Date.now() - Number(value) < DISMISS_DAYS * 24 * 3600 * 1000 : false;
  } catch {
    return false;
  }
}

function shouldAskForNotifications() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "default" &&
    !recentlyDismissed()
  );
}

async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (error) {
    console.error("Soko service worker registration failed", error);
    return null;
  }
}

export function NativeAppRuntime() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    let mounted = true;

    registerServiceWorker().then((registration) => {
      if (!mounted) return;

      window.sokoNotify = (payload) => {
        const target = registration?.active ?? navigator.serviceWorker.controller;
        target?.postMessage({
          type: "SOKO_SHOW_NOTIFICATION",
          title: payload.title,
          body: payload.body,
          tag: payload.tag,
          url: payload.url,
        });
      };

      if (shouldAskForNotifications()) setShowPrompt(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!showPrompt) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(PROMPT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShowPrompt(false);
  };

  const enableNotifications = async () => {
    const result = await Notification.requestPermission();
    setShowPrompt(false);

    if (result === "granted") {
      window.sokoNotify?.({
        title: "Soko notifications enabled",
        body: "Order updates will appear here.",
        tag: "soko-notifications-ready",
        url: "/orders",
      });
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4 md:bottom-6"
      role="dialog"
      aria-label="Enable notifications"
    >
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-lg">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Washa notifications</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pata taarifa za oda, malipo, na delivery moja kwa moja kwenye simu.
          </p>
          <Button size="sm" className="mt-2" onClick={enableNotifications}>
            Ruhusu
          </Button>
        </div>
        <button
          onClick={dismiss}
          aria-label="Funga"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
