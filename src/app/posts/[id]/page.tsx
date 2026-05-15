import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StartChatButton from "./StartChatButton";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*, profiles(display_name)")
    .eq("id", id)
    .single();

  if (!post) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthor = user?.id === post.author_id;

  return (
    <article className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-forest">
        ← Back
      </Link>

      {post.image_url && (
        <div className="overflow-hidden rounded-3xl">
          <img src={post.image_url} alt={post.herb} className="w-full object-cover" />
        </div>
      )}

      <div
        className={`rounded-3xl border-2 p-6 ${
          post.kind === "offer" ? "border-leaf/50 bg-leaf/15" : "border-sun/60 bg-sun/15"
        }`}
      >
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            post.kind === "offer" ? "bg-forest text-cream" : "bg-clay text-cream"
          }`}
        >
          {post.kind === "offer" ? "🌱 Offering" : "🙏 Wanted"}
        </span>
        <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-forest-deep">{post.herb}</h1>
        {post.description && (
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-bark">{post.description}</p>
        )}
        <p className="mt-5 text-sm text-bark-soft">
          by <span className="font-semibold text-forest-deep">{post.profiles?.display_name ?? "a neighbor"}</span>
          {post.neighborhood ? <> · 📍 {post.neighborhood}</> : null}
        </p>
      </div>

      <div>
        {!user ? (
          <Link
            href="/login"
            className="block w-full rounded-full bg-clay px-5 py-4 text-center text-base font-bold text-cream shadow-sm transition hover:bg-clay-deep"
          >
            Sign in to chat
          </Link>
        ) : isAuthor ? (
          <p className="rounded-2xl bg-cream-deep/60 p-4 text-center text-sm text-bark-soft">
            This is your post.
          </p>
        ) : (
          <StartChatButton postId={post.id} posterId={post.author_id} />
        )}
      </div>
    </article>
  );
}
