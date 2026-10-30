import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PushOptIn from "@/components/PushOptIn";

export const dynamic = "force-dynamic";

export default async function ChatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: threads } = await supabase
    .from("threads")
    .select(
      "id, created_at, posts(herb, kind), poster:poster_id(display_name), requester:requester_id(display_name), poster_id, requester_id"
    )
    .or(`poster_id.eq.${user.id},requester_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-bold text-forest-deep">Your chats</h1>
      <PushOptIn />
      {(!threads || threads.length === 0) ? (
        <div className="rounded-3xl border-2 border-dashed border-cream-deep bg-white/60 p-10 text-center">
          <p className="text-3xl">🌾</p>
          <p className="mt-3 font-serif text-xl text-forest-deep">No conversations yet</p>
          <p className="mt-2 text-sm text-bark-soft">Find a post and say hi.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {threads.map((t) => {
            const otherName =
              t.poster_id === user.id
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (t.requester as any)?.display_name
                : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (t.poster as any)?.display_name;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const post = t.posts as any;
            const initial = (otherName ?? "?").charAt(0).toUpperCase();
            return (
              <li key={t.id}>
                <Link
                  href={`/chats/${t.id}`}
                  className="flex items-center gap-4 rounded-3xl border-2 border-cream-deep bg-white p-4 transition active:scale-[0.99]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-leaf/40 font-serif text-xl font-bold text-forest-deep">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-bark">{otherName ?? "a neighbor"}</p>
                    <p className="truncate text-sm text-bark-soft">
                      {post?.kind === "offer" ? "🌱" : "🙏"} {post?.herb}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
