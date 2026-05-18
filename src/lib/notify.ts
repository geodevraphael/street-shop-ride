/**
 * Notification + alert sound helpers.
 *
 * Works in browsers AND inside a TWA / Capacitor APK wrap:
 * - Web Audio API synthesizes the alert ring (no asset shipping needed,
 *   plays even on cellular or offline).
 * - Notification API shows a system notification — in a TWA, Android shows
 *   it as a real system notification with sound + vibration.
 * - A tiny service worker (public/sw.js) is registered so that background
 *   push notifications via SW.showNotification() can also fire.
 */

let audioCtx: AudioContext | null = null;
let ringTimer: number | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

/** Plays a short two-tone "ding-dong" using Web Audio. */
export function playAlertOnce() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  const tones = [
    { f: 880, t: 0.0 },
    { f: 660, t: 0.18 },
    { f: 880, t: 0.4 },
    { f: 1320, t: 0.58 },
  ];
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = tone.f;
    gain.gain.setValueAtTime(0.0001, now + tone.t);
    gain.gain.exponentialRampToValueAtTime(0.35, now + tone.t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + tone.t);
    osc.stop(now + tone.t + 0.2);
  }
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate([200, 80, 200, 80, 400]);
    } catch {}
  }
}

/** Rings repeatedly until stopAlert() is called. */
export function ringAlert(durationMs = 8000) {
  stopAlert();
  playAlertOnce();
  const start = Date.now();
  ringTimer = window.setInterval(() => {
    if (Date.now() - start > durationMs) {
      stopAlert();
      return;
    }
    playAlertOnce();
  }, 900);
}

export function stopAlert() {
  if (ringTimer != null) {
    window.clearInterval(ringTimer);
    ringTimer = null;
  }
}

/** Asks the user for permission to show system notifications. Returns true if granted. */
export async function requestNotifPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

export function notifPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Shows a system notification. Prefers Service Worker so it works when app is in background. */
export async function showSystemNotification(title: string, body: string, url?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "soko-alert",
    requireInteraction: true,
    data: { url: url ?? "/" },
    // @ts-ignore — supported by Chromium/Android
    vibrate: [200, 100, 200],
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch {
    try {
      new Notification(title, options);
    } catch {}
  }
}

/** Fire-and-forget alert: sound + system notification. */
export async function alertUser(title: string, body: string, url?: string) {
  ringAlert();
  await showSystemNotification(title, body, url);
}

/** Registers the alert service worker. Safe to call multiple times. */
export function registerAlertServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Defer past first paint
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
