"use server";

import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import type { ActionResult } from "./posts";

const SubscriptionInput = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export async function registerPushSubscription(
  raw: unknown,
): Promise<ActionResult<null>> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }

  const parsed = SubscriptionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid subscription." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, ...parsed.data },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

const RemoveInput = z.object({ endpoint: z.string().url() });

export async function removePushSubscription(
  raw: unknown,
): Promise<ActionResult<null>> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }

  const parsed = RemoveInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid endpoint." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
