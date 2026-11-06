import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ReportButton from "@/components/ReportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [thread.poster_id, thread.requester_id]);
  const names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = thread.posts as any;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="-ml-2" aria-label="All messages">
          <Link href="/chats">
            <ArrowLeft />
          </Link>
        </Button>
        <Link href={`/posts/${post.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
          <span className="truncate font-heading text-3xl text-pine">{post.herb}</span>
          <Badge variant="secondary">{post.kind === "offer" ? "On offer" : "Wanted"}</Badge>
        </Link>
        <ReportButton targetKind="thread" targetId={id} />
      </div>
      <ChatThread threadId={id} userId={user.id} names={names} initialMessages={initialMessages ?? []} />
    </div>
  );
}
