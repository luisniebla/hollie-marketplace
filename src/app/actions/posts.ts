"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const CreatePostInput = z.object({
  kind: z.enum(["offer", "request"]),
  herb: z.string().trim().min(1, "Pick an herb.").max(80),
  description: z.string().trim().max(2000).optional().nullable(),
  neighborhood: z.string().trim().max(120).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  image_width: z.number().int().positive().max(10000).optional().nullable(),
  image_height: z.number().int().positive().max(10000).optional().nullable(),
  price_cents: z.number().int().min(0).max(100_000_00).optional().nullable(),
  lat: z.number().gte(-90).lte(90).optional().nullable(),
  lng: z.number().gte(-180).lte(180).optional().nullable(),
});

export type CreatePostInput = z.infer<typeof CreatePostInput>;
export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createPost(raw: unknown): Promise<ActionResult<{ id: string }>> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }

  const limit = rateLimit(`createPost:${user.id}`, RATE_LIMITS.createPost);
  if (!limit.ok) return { ok: false, error: `Slow down — try again in ${limit.retryAfterSeconds}s.` };

  const parsed = CreatePostInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const input = parsed.data;
  if (input.kind === "offer" && !input.image_url) {
    return { ok: false, error: "Offers need a photo." };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      kind: input.kind,
      herb: input.herb,
      description: input.description || null,
      neighborhood: input.neighborhood || null,
      image_url: input.image_url || null,
      image_width: input.image_width ?? null,
      image_height: input.image_height ?? null,
      price_cents: input.kind === "offer" ? (input.price_cents ?? null) : null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Couldn't save post." };

  revalidatePath("/");
  return { ok: true, data: { id: data.id } };
}

const DeletePostInput = z.object({ postId: z.string().uuid() });

export async function deletePost(raw: unknown): Promise<ActionResult<null>> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }

  const limit = rateLimit(`deletePost:${user.id}`, RATE_LIMITS.deletePost);
  if (!limit.ok) return { ok: false, error: `Slow down — try again in ${limit.retryAfterSeconds}s.` };

  const parsed = DeletePostInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid post id." };

  const { data: post } = await supabase
    .from("posts")
    .select("author_id, image_url")
    .eq("id", parsed.data.postId)
    .maybeSingle();

  if (!post) return { ok: false, error: "Post not found." };
  if (post.author_id !== user.id) return { ok: false, error: "Not your post." };

  if (post.image_url) {
    const marker = "/post-images/";
    const idx = post.image_url.indexOf(marker);
    if (idx !== -1) {
      const path = post.image_url.slice(idx + marker.length).split("?")[0];
      await supabase.storage.from("post-images").remove([path]);
    }
  }

  const { error } = await supabase.from("posts").delete().eq("id", parsed.data.postId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true, data: null };
}
