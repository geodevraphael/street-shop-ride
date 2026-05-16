import { useEffect, useState } from "react";

const KEY = "soko_splash_seen_v1";

export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) return; } catch { return; }
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;

    // Animate progress bar from 0 to 100
    const progressStart = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          // Ease out — faster at start, slower at end
          const increment = Math.max(1, Math.floor((100 - prev) / 8));
          return Math.min(100, prev + increment);
        });
      }, 80);
      return () => clearInterval(interval);
    }, 400);

    const t1 = setTimeout(() => setLeaving(true), 2200);
    const t2 = setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem(KEY, "1"); } catch {}
    }, 2800);

    return () => {
      clearTimeout(progressStart);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] grid place-items-center transition-opacity duration-700 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden
    >
      {/* Animated background with floating blobs */}
      <div className="absolute inset-0 overflow-hidden bg-background">
        <div className="splash-blob-1 absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
        <div className="splash-blob-2 absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)]" />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo container with glow */}
        <div className="relative">
          {/* Glow behind logo */}
          <div className="splash-glow absolute inset-0 h-28 w-28 rounded-2xl bg-primary/20 blur-xl" />
          <div className="relative h-28 w-28">
            {/* Animated ring */}
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="hsl(var(--primary) / 0.12)"
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
        </div>

        {/* Text content */}
        <div className="text-center">
          <p className="splash-title text-3xl font-extrabold tracking-tight text-foreground">
            Soko
          </p>
          <p className="splash-tagline mt-1.5 text-sm text-muted-foreground font-medium">
            Buy local · Deliver fast
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-48">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="splash-progress h-full rounded-full bg-primary transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {progress < 100 ? "Inapakia…" : "Karibu!"}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes splashRing {
          to { stroke-dashoffset: 0; }
        }
        @keyframes splashLogo {
          0% { opacity: 0; transform: scale(0.5); filter: blur(8px); }
          50% { opacity: 1; transform: scale(1.08); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes splashTitle {
          0%, 30% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashTagline {
          0%, 50% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashGlow {
          0%, 20% { opacity: 0; transform: scale(0.8); }
          60% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.6; transform: scale(1); }
        }
        @keyframes splashBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 15px) scale(1.1); }
        }
        @keyframes splashBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-15px, -20px) scale(1.08); }
        }
        .splash-ring { animation: splashRing 1.4s ease-out forwards; }
        .splash-logo { animation: splashLogo 1.2s cubic-bezier(.2,.7,.2,1) forwards; }
        .splash-title { animation: splashTitle 1s ease-out 0.3s both; }
        .splash-tagline { animation: splashTagline 1s ease-out 0.5s both; }
        .splash-glow { animation: splashGlow 1.5s ease-out forwards; }
        .splash-blob-1 { animation: splashBlob1 8s ease-in-out infinite; }
        .splash-blob-2 { animation: splashBlob2 10s ease-in-out infinite; }
        .splash-progress { box-shadow: 0 0 8px hsl(var(--primary) / 0.4); }
      `}</style>
    </div>
  );
}
