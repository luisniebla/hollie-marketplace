"use client";
import { useEffect, useState } from "react";
import { registerPushSubscription, removePushSubscription } from "@/app/actions/push";

type Status = "loading" | "unsupported" | "denied" | "subscribed" | "available";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export default function PushOptIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (cancelled) return;
      setStatus(sub ? "subscribed" : "available");
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function subscribe() {
    if (!vapidKey) return;
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      const result = await registerPushSubscription({
        endpoint: json.endpoint!,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (!result.ok) {
        await sub.unsubscribe();
        setError(result.error);
        setBusy(false);
        return;
      }
      setStatus("subscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setStatus("available");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  if (status === "denied") {
    return (
      <p className="rounded-2xl border-2 border-cream-deep bg-white px-4 py-3 text-xs text-bark-soft">
        Notifications are blocked in your browser. Enable them in site settings to get pinged on
        new messages.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-cream-deep bg-white px-4 py-3 text-sm">
      {status === "subscribed" ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-bark">🔔 Notifications on for this device</span>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={busy}
            className="text-xs font-semibold text-clay-deep disabled:opacity-60"
          >
            Turn off
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-bark">Get notified when you have a new message.</span>
          <button
            type="button"
            onClick={subscribe}
            disabled={busy}
            className="rounded-full bg-forest px-4 py-2 text-xs font-bold text-cream transition hover:bg-forest-deep disabled:opacity-60"
          >
            {busy ? "..." : "Enable"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-clay-deep">{error}</p>}
    </div>
  );
}
