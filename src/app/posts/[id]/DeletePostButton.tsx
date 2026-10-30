"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/app/actions/posts";

export default function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setBusy(true);
    setError(null);
    const result = await deletePost({ postId });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-full border-2 border-clay/40 bg-white px-5 py-3 text-sm font-semibold text-clay-deep transition hover:border-clay"
      >
        Delete post
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border-2 border-clay/40 bg-white p-4">
      <p className="text-sm text-bark">Delete this post? This can&apos;t be undone.</p>
      {error && <p className="text-sm text-clay-deep">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="flex-1 rounded-full bg-clay px-4 py-3 text-sm font-bold text-cream transition hover:bg-clay-deep disabled:opacity-60"
        >
          {busy ? "Deleting..." : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="flex-1 rounded-full border-2 border-cream-deep bg-white px-4 py-3 text-sm font-semibold text-bark"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
