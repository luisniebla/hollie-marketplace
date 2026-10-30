import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/types";
import ReportButton from "@/components/ReportButton";
import StartChatButton from "./StartChatButton";
import DeletePostButton from "./DeletePostButton";

const NEW_ACCOUNT_DAYS = 7;

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("*, profiles(display_name, created_at)")
    .eq("id", id)
    .single();

  if (!post) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthor = user?.id === post.author_id;
  const authorCreatedAt = post.profiles?.created_at as string | undefined;
  // eslint-disable-next-line react-hooks/purity -- RSC renders fresh per request; capturing "now" is intentional
  const renderedAt = Date.now();
  const isNewAuthor =
    !!authorCreatedAt &&
    renderedAt - new Date(authorCreatedAt).getTime() < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;

  return (
    <article className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-forest">
        ← Back
      </Link>

      {post.image_url && (
        <div className="overflow-hidden rounded-3xl">
          <Image
            src={post.image_url}
            width={post.image_width ?? 900}
            height={post.image_height ?? 900}
            sizes="(max-width: 768px) 100vw, 700px"
            alt={post.herb}
            priority
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      <div
        className={`rounded-3xl border-2 p-6 ${
          post.kind === "offer" ? "border-leaf/50 bg-leaf/15" : "border-sun/60 bg-sun/15"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              post.kind === "offer" ? "bg-forest text-cream" : "bg-clay text-cream"
            }`}
          >
            {post.kind === "offer" ? "🌱 Offering" : "🙏 Wanted"}
          </span>
          {post.kind === "offer" && (
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                post.price_cents == null
                  ? "bg-leaf/40 text-forest-deep"
                  : "bg-clay/20 text-clay-deep"
              }`}
            >
              {formatPrice(post.price_cents)}
            </span>
          )}
        </div>
        <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-forest-deep">{post.herb}</h1>
        {post.description && (
          <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-bark">{post.description}</p>
        )}
        <p className="mt-5 text-sm text-bark-soft">
          by <span className="font-semibold text-forest-deep">{post.profiles?.display_name ?? "a neighbor"}</span>
          {isNewAuthor && (
            <span
              className="ml-2 rounded-full bg-sun/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bark"
              title="Account is less than a week old"
            >
              new
            </span>
          )}
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
          <div className="space-y-3">
            <p className="rounded-2xl bg-cream-deep/60 p-4 text-center text-sm text-bark-soft">
              This is your post.
            </p>
            <DeletePostButton postId={post.id} />
          </div>
        ) : (
          <StartChatButton postId={post.id} />
        )}
      </div>

      {user && !isAuthor && (
        <div className="flex justify-end">
          <ReportButton targetKind="post" targetId={post.id} />
        </div>
      )}
    </article>
  );
}
