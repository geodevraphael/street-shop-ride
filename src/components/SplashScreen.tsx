import { useEffect, useState } from "react";
import splashBg from "@/assets/splash-bg.jpg";

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

    const progressStart = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) { clearInterval(interval); return 100; }
          const increment = Math.max(1, Math.floor((100 - prev) / 8));
          return Math.min(100, prev + increment);
        });
      }, 80);
      return () => clearInterval(interval);
    }, 400);

    const t1 = setTimeout(() => setLeaving(true), 2400);
    const t2 = setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem(KEY, "1"); } catch {}
    }, 3000);

    return () => {
      clearTimeout(progressStart);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] overflow-hidden transition-opacity duration-700 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden
    >
      {/* Hero photograph — full-bleed, Ken Burns slow zoom */}
      <img
        src={splashBg}
        alt=""
        className="splash-hero absolute inset-0 h-full w-full object-cover"
      />

      {/* Brand gradient wash — warm cream top → deep brand orange bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, hsl(35 90% 96%) 70%, transparent) 0%, transparent 28%, transparent 55%, color-mix(in oklab, oklch(0.35 0.12 45) 75%, transparent) 100%)",
        }}
      />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]" />

      {/* Content overlay */}
      <div className="relative flex h-full w-full flex-col items-center justify-between px-8 py-16">
        {/* Top: Logo lockup */}
        <div className="splash-top flex flex-col items-center gap-4 pt-6">
          <div className="relative">
            <div className="splash-glow absolute inset-0 -m-4 rounded-3xl bg-primary/40 blur-2xl" />
            <img
              src="/icon-512.png"
              alt="Soko"
              className="splash-icon relative h-24 w-24 rounded-2xl shadow-2xl ring-2 ring-white/30"
            />
          </div>
          <p className="splash-wordmark text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
            Soko
          </p>
          <div className="splash-rule h-[2px] w-12 rounded-full bg-primary/90 shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
        </div>

        {/* Bottom: tagline + progress */}
        <div className="splash-bottom flex w-full max-w-xs flex-col items-center gap-5">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/70">
              Mtaa wako · Duka lako
            </p>
            <p className="mt-2 text-lg font-semibold text-white drop-shadow">
              Nunua karibu nawe
            </p>
          </div>

          <div className="w-full">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
              <div
                className="splash-progress h-full rounded-full bg-primary transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-[11px] font-medium text-white/80">
              {progress < 100 ? "Inapakia…" : "Karibu Soko!"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes splashHero {
          0% { transform: scale(1.08); }
          100% { transform: scale(1.0); }
        }
        @keyframes splashTop {
          0% { opacity: 0; transform: translateY(-16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashBottom {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashIcon {
          0% { opacity: 0; transform: scale(0.7); filter: blur(8px); }
          60% { opacity: 1; transform: scale(1.06); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes splashGlow {
          0%, 20% { opacity: 0; transform: scale(0.8); }
          60% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0.7; transform: scale(1); }
        }
        @keyframes splashRule {
          0% { width: 0; opacity: 0; }
          100% { width: 3rem; opacity: 1; }
        }
        .splash-hero { animation: splashHero 3.2s ease-out forwards; }
        .splash-top { animation: splashTop 0.9s ease-out 0.2s both; }
        .splash-bottom { animation: splashBottom 0.9s ease-out 0.6s both; }
        .splash-icon { animation: splashIcon 1.1s cubic-bezier(.2,.7,.2,1) 0.2s both; }
        .splash-glow { animation: splashGlow 1.5s ease-out 0.3s both; }
        .splash-wordmark { animation: splashBottom 0.8s ease-out 0.45s both; }
        .splash-rule { animation: splashRule 0.7s ease-out 0.7s both; }
        .splash-progress { box-shadow: 0 0 12px hsl(25 95% 53% / 0.7); }
      `}</style>
    </div>
  );
}
