"use server";

import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendPush, type StoredSubscription } from "@/lib/push";
import type { Message } from "@/lib/types";
import type { ActionResult } from "./posts";

const SendMessageInput = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1, "Message can't be empty.").max(2000),
});

export async function sendMessage(raw: unknown): Promise<ActionResult<Message>> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }

  const limit = rateLimit(`sendMessage:${user.id}`, RATE_LIMITS.sendMessage);
  if (!limit.ok) return { ok: false, error: `Slow down — try again in ${limit.retryAfterSeconds}s.` };

  const parsed = SendMessageInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }

  const { data: thread } = await supabase
    .from("threads")
    .select("id, poster_id, requester_id")
    .eq("id", parsed.data.threadId)
    .maybeSingle();
  if (!thread) return { ok: false, error: "Thread not found." };
  if (thread.poster_id !== user.id && thread.requester_id !== user.id) {
    return { ok: false, error: "Not in this thread." };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ thread_id: thread.id, sender_id: user.id, body: parsed.data.body })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Send failed." };

  // Fire push to the other participant. Best-effort; failures don't block.
  const recipientId = thread.poster_id === user.id ? thread.requester_id : thread.poster_id;
  notifyRecipient({
    senderId: user.id,
    recipientId,
    threadId: thread.id,
    body: parsed.data.body,
  }).catch(() => {});

  return { ok: true, data: data as Message };
}

async function notifyRecipient({
  senderId,
  recipientId,
  threadId,
  body,
}: {
  senderId: string;
  recipientId: string;
  threadId: string;
  body: string;
}) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const [{ data: subs }, { data: sender }] = await Promise.all([
    supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", recipientId),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", senderId)
      .maybeSingle(),
  ]);

  if (!subs || subs.length === 0) return;

  const senderName = sender?.display_name ?? "Someone";
  const preview = body.length > 80 ? body.slice(0, 77) + "..." : body;
  const payload = {
    title: `${senderName} sent a message`,
    body: preview,
    url: `/chats/${threadId}`,
  };

  const stale: string[] = [];
  await Promise.all(
    (subs as StoredSubscription[]).map(async (sub) => {
      const result = await sendPush(sub, payload);
      if (!result.ok && result.gone) stale.push(sub.endpoint);
    }),
  );
  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }
}
