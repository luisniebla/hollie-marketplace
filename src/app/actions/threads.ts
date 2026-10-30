"use server";

import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { ActionResult } from "./posts";

const StartThreadInput = z.object({ postId: z.string().uuid() });

export async function startThread(raw: unknown): Promise<ActionResult<{ threadId: string }>> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }

  const limit = rateLimit(`startThread:${user.id}`, RATE_LIMITS.startThread);
  if (!limit.ok) return { ok: false, error: `Slow down — try again in ${limit.retryAfterSeconds}s.` };

  const parsed = StartThreadInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid post id." };

  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id")
    .eq("id", parsed.data.postId)
    .maybeSingle();
  if (!post) return { ok: false, error: "Post not found." };
  if (post.author_id === user.id) return { ok: false, error: "You can't message your own post." };

  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("post_id", post.id)
    .eq("requester_id", user.id)
    .maybeSingle();
  if (existing?.id) return { ok: true, data: { threadId: existing.id } };

  const { data, error } = await supabase
    .from("threads")
    .insert({ post_id: post.id, poster_id: post.author_id, requester_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't start chat." };

  return { ok: true, data: { threadId: data.id } };
}
