"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startThread } from "@/app/actions/threads";

export default function StartChatButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    const result = await startThread({ postId });
    if (!result.ok) {
      if (result.error === "Not signed in.") {
        router.push("/login");
        return;
      }
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/chats/${result.data.threadId}`);
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
