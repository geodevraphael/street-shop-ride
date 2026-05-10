import { useEffect, useState } from "react";

const KEY = "soko_splash_seen_v1";

export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) return; } catch { return; }
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const t1 = setTimeout(() => setLeaving(true), 1600);
    const t2 = setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem(KEY, "1"); } catch {}
    }, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] grid place-items-center bg-gradient-to-br from-background via-background to-primary/5 transition-opacity duration-500 ${leaving ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-28 w-28">
          {/* Animated ring */}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke="hsl(var(--primary) / 0.15)"
              strokeWidth="3"
            />
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="289"
              strokeDashoffset="289"
              className="splash-ring"
            />
          </svg>
          {/* Logo reveal */}
          <div className="absolute inset-2 grid place-items-center overflow-hidden rounded-2xl">
            <img
              src="/icon-512.png"
              alt="Soko"
              className="splash-logo h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="splash-word text-center">
          <p className="text-2xl font-extrabold tracking-tight">Soko</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Buy local · Deliver fast</p>
        </div>
      </div>

      <style>{`
        @keyframes splashRing { to { stroke-dashoffset: 0; } }
        @keyframes splashLogo {
          0% { opacity: 0; transform: scale(0.6); filter: blur(6px); }
          60% { opacity: 1; transform: scale(1.05); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashWord {
          0%, 40% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .splash-ring { animation: splashRing 1.2s ease-out forwards; }
        .splash-logo { animation: splashLogo 1.1s cubic-bezier(.2,.7,.2,1) forwards; }
        .splash-word { animation: splashWord 1.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
