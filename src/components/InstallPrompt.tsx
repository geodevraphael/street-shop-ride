import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "soko-install-dismissed-at";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    // iOS
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function recentlyDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < DISMISS_DAYS * 24 * 3600 * 1000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [iosShow, setIosShow] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || inIframe() || recentlyDismissed()) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari: no beforeinstallprompt — show manual instructions
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIOS && isSafari) {
      const t = setTimeout(() => {
        setIosShow(true);
        setHidden(false);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (hidden || (!evt && !iosShow)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setEvt(null);
      setHidden(true);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4 md:bottom-6"
      role="dialog"
      aria-label="Install Soko"
    >
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-lg">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Sakinisha Soko</p>
          {evt ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pakua programu kwa matumizi ya haraka na ya skrini nzima.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bonyeza <span className="font-medium">Share</span> kisha{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          )}
          {evt && (
            <Button size="sm" className="mt-2" onClick={install}>
              Sakinisha
            </Button>
          )}
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
