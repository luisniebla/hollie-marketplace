"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server-side so the session cookie is cleared and the root layout (which
// renders the header's UserMenu) is re-rendered in the same round trip. A
// client-side signOut + router.push left the stale signed-in header cached.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
