import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

let configured = false;

function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT_EMAIL ?? "mailto:admin@example.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(contact, pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; gone: boolean; error: string }> {
  if (!configure()) return { ok: false, gone: false, error: "VAPID not configured" };
  const subscription: WebPushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err: unknown) {
    const code = (err as { statusCode?: number })?.statusCode;
    const gone = code === 404 || code === 410;
    const msg = err instanceof Error ? err.message : "push failed";
    return { ok: false, gone, error: msg };
  }
}
