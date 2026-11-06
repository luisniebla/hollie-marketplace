"use server";

import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { REPORT_REASONS } from "@/lib/types";
import type { ActionResult } from "./posts";

const ReportInput = z.object({
  targetKind: z.enum(["post", "thread"]),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function submitReport(raw: unknown): Promise<ActionResult<null>> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireUser());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: err.message };
    throw err;
  }

  const limit = rateLimit(`report:${user.id}`, RATE_LIMITS.report);
  if (!limit.ok) return { ok: false, error: `Slow down — try again in ${limit.retryAfterSeconds}s.` };

  const parsed = ReportInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid report." };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_kind: parsed.data.targetKind,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    note: parsed.data.note || null,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, data: null };
}
