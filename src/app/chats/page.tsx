import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PageHeading, Sprig } from "@/components/Botanicals";
import { createClient } from "@/lib/supabase/server";
import PushOptIn from "@/components/PushOptIn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";

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
    <div className="flex flex-col gap-6">
      <PageHeading title="Garden notes" subtitle="Your conversations with neighbors." />
      <PushOptIn />
      {(!threads || threads.length === 0) ? (
        <Empty className="rounded-3xl border border-dashed border-rose-deep/50 bg-card/60">
          <EmptyHeader>
            <EmptyMedia>
              <Sprig className="w-16" />
            </EmptyMedia>
            <EmptyTitle className="text-2xl text-pine">No conversations yet</EmptyTitle>
            <EmptyDescription className="text-base">
              Find an herb you like and say hello to the grower.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/">Browse herbs</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ItemGroup className="gap-0 rounded-3xl border bg-card p-2">
          {threads.map((t, i) => {
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
              <div key={t.id} role="listitem">
                {i > 0 && <ItemSeparator className="my-0" />}
                <Item asChild className="rounded-2xl">
                  <Link href={`/chats/${t.id}`}>
                    <ItemMedia>
                      <Avatar size="lg">
                        <AvatarFallback className="bg-secondary font-heading text-xl text-secondary-foreground">{initial}</AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="font-heading text-xl text-pine">{otherName ?? "A neighbor"}</ItemTitle>
                      <ItemDescription className="text-base italic">
                        {post?.herb}, {post?.kind === "offer" ? "on offer" : "wanted"}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </ItemActions>
                  </Link>
                </Item>
              </div>
            );
          })}
        </ItemGroup>
      )}
    </div>
  );
}
