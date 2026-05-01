"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StartChatButton({ postId, posterId }: { postId: string; posterId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: existing } = await supabase
      .from("threads")
      .select("id")
      .eq("post_id", postId)
      .eq("requester_id", user.id)
      .maybeSingle();

    let threadId = existing?.id;
    if (!threadId) {
      const { data, error } = await supabase
        .from("threads")
        .insert({ post_id: postId, poster_id: posterId, requester_id: user.id })
        .select("id")
        .single();
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      threadId = data.id;
    }
    router.push(`/chats/${threadId}`);
  }

  return (
    <div className="space-y-2">
      <button
        onClick={start}
        disabled={loading}
        className="w-full rounded-full bg-clay px-5 py-4 text-base font-bold text-cream shadow-sm transition hover:bg-clay-deep disabled:opacity-60"
      >
        {loading ? "Opening..." : "💬 Send a message"}
      </button>
      {error && <p className="text-center text-sm text-clay-deep">{error}</p>}
    </div>
  );
}
