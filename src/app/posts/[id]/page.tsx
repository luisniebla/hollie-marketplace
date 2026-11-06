import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/types";
import ReportButton from "@/components/ReportButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Flourish } from "@/components/Botanicals";
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
  const authorName: string = post.profiles?.display_name ?? "A neighbor";
  const authorCreatedAt = post.profiles?.created_at as string | undefined;
  // eslint-disable-next-line react-hooks/purity -- RSC renders fresh per request; capturing "now" is intentional
  const renderedAt = Date.now();
  const isNewAuthor =
    !!authorCreatedAt &&
    renderedAt - new Date(authorCreatedAt).getTime() < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
  const postedOn = new Date(post.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <article className="flex flex-col gap-6">
      <Button asChild variant="ghost" className="-ml-3 self-start font-heading text-lg">
        <Link href="/">
          <ArrowLeft data-icon="inline-start" />
          Back to the garden
        </Link>
      </Button>

      {post.image_url && (
        <div className="relative">
          <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2rem] bg-rose" />
          <Image
          src={post.image_url}
          width={post.image_width ?? 900}
          height={post.image_height ?? 900}
          sizes="(max-width: 768px) 100vw, 640px"
          alt={post.herb}
          priority
          className="relative h-auto max-h-[70vh] w-full rounded-[2rem] object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{post.kind === "offer" ? "On offer" : "Wanted"}</Badge>
          {post.kind === "offer" && (
            <span className="font-heading text-2xl text-rose-deep">{formatPrice(post.price_cents)}</span>
          )}
        </div>
        <h1 className="text-5xl leading-none">{post.herb}</h1>
        <Flourish />
        {post.neighborhood && (
          <p className="flex items-center gap-1.5 italic text-muted-foreground">
            <MapPin className="size-4" />
            {post.neighborhood}
          </p>
        )}
        {post.description && (
          <p className="text-xl leading-relaxed whitespace-pre-wrap">{post.description}</p>
        )}
      </div>

      <Item variant="outline" className="rounded-3xl bg-card p-4">
        <ItemMedia>
          <Avatar size="lg">
            <AvatarFallback className="bg-secondary font-heading text-xl text-secondary-foreground">{authorName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="font-heading text-xl text-pine">
            {authorName}
            {isNewAuthor && (
              <Badge variant="outline" title="Account is less than a week old">
                New
              </Badge>
            )}
          </ItemTitle>
          <ItemDescription>{isAuthor ? `You posted this ${postedOn}` : `Posted ${postedOn}`}</ItemDescription>
        </ItemContent>
        {user && !isAuthor && (
          <ItemActions>
            <ReportButton targetKind="post" targetId={post.id} />
          </ItemActions>
        )}
      </Item>

      {!user ? (
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Sign in to message</Link>
        </Button>
      ) : isAuthor ? (
        <DeletePostButton postId={post.id} />
      ) : (
        <StartChatButton postId={post.id} />
      )}
    </article>
  );
}
