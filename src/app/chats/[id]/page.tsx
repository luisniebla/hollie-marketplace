import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatThread from "./ChatThread";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: thread } = await supabase
    .from("threads")
    .select("*, posts(herb, kind, id)")
    .eq("id", id)
    .single();

  if (!thread) notFound();

  const { data: initialMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = thread.posts as any;

  return (
    <div className="space-y-3">
      <Link href="/chats" className="inline-flex items-center gap-1 text-sm font-semibold text-forest">
        ← All chats
      </Link>
      <Link
        href={`/posts/${post.id}`}
        className="block rounded-2xl border-2 border-cream-deep bg-white px-4 py-3 text-sm"
      >
        <span className="text-bark-soft">About: </span>
        <span className="font-semibold text-forest-deep">
          {post.kind === "offer" ? "🌱" : "🙏"} {post.herb}
        </span>
      </Link>
      <ChatThread threadId={id} userId={user.id} initialMessages={initialMessages ?? []} />
    </div>
  );
}
