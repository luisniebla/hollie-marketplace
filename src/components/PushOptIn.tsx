"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { registerPushSubscription, removePushSubscription } from "@/app/actions/push";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

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
      <Alert>
        <BellOff />
        <AlertTitle>Notifications are blocked</AlertTitle>
        <AlertDescription>
          Allow notifications for this site in your browser settings to hear about new messages.
        </AlertDescription>
      </Alert>
    );
  }

  const on = status === "subscribed";

  return (
    <Item variant="outline" className="rounded-3xl bg-secondary/50 p-4">
      <ItemMedia variant="icon" className="text-rose-deep">{on ? <BellRing /> : <Bell />}</ItemMedia>
      <ItemContent>
        <ItemTitle className="font-heading text-xl text-pine">{on ? "Notifications are on" : "Turn on notifications"}</ItemTitle>
        <ItemDescription>
          {error ?? (on ? "This device gets a ping for new messages." : "Get a ping on this device when someone messages you.")}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          size="sm"
          variant={on ? "outline" : "default"}
          onClick={on ? unsubscribe : subscribe}
          disabled={busy}
        >
          {busy && <Spinner data-icon="inline-start" />}
          {on ? "Turn off" : "Turn on"}
        </Button>
      </ItemActions>
    </Item>
  );
}
