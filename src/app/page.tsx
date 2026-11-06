import Link from "next/link";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type Post, type PostKind } from "@/lib/types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Flourish, HerbIllustration, HillBottom, Sprig } from "@/components/Botanicals";
import NearMeButton from "./NearMeButton";
import FeedTabs from "./FeedTabs";

export const dynamic = "force-dynamic";

function buildQs(params: Record<string, string | undefined>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    lat?: string;
    lng?: string;
    km?: string;
    kind?: string;
  }>;
}) {
  const { q, lat, lng, km, kind } = await searchParams;
  const supabase = await createClient();

  const activeKind: PostKind = kind === "request" ? "request" : "offer";
  const latN = lat ? Number(lat) : NaN;
  const lngN = lng ? Number(lng) : NaN;
  const kmN = km ? Math.max(0.5, Math.min(50, Number(km))) : 8;
  const useRadius = Number.isFinite(latN) && Number.isFinite(lngN);

  let posts: Post[];

  if (useRadius) {
    const { data } = await supabase
      .rpc("posts_near", {
        search_lat: latN,
        search_lng: lngN,
        radius_km: kmN,
        search_kind: activeKind,
        search_q: q && q.trim() ? q.trim() : null,
        max_rows: 50,
      })
      .select("*, profiles(display_name)");
    posts = (data as Post[] | null) ?? [];
  } else {
    let query = supabase
      .from("posts")
      .select("*, profiles(display_name)")
      .eq("status", "open")
      .eq("kind", activeKind)
      .order("created_at", { ascending: true })
      .limit(50);
    if (q) query = query.ilike("herb", `%${q}%`);
    const { data } = await query;
    posts = (data as Post[] | null) ?? [];
  }

  const baseParams = { q, lat, lng, km };
  const offersHref = `/${buildQs({ ...baseParams })}`;
  const requestsHref = `/${buildQs({ ...baseParams, kind: "request" })}`;
  const clearSearchHref = `/${buildQs({ lat, lng, km, kind: activeKind === "request" ? "request" : undefined })}`;

  const filtered = Boolean(q || useRadius);
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-12">
      {!filtered && (
        <section className="relative grid items-center gap-6 pt-4 pb-10 sm:grid-cols-[1.25fr_1fr]">
          <HillBottom className="-bottom-6 -left-[40vw] -z-10 h-56 w-[110vw] sm:-left-[30vw] sm:w-[75vw]" />
          <div className="flex flex-col gap-5">
            <h1 className="text-5xl leading-[0.95] sm:text-6xl">
              Herbs, Cuttings &amp; Neighborly Swaps
            </h1>
            <Flourish />
            <p className="text-xl leading-relaxed">
              Phoenix gardeners trading what&apos;s thriving: rosemary that won&apos;t quit, basil
              before the heat takes it, a jar of dried chamomile. Take a sprig, share a sprig.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={user ? "/new" : "/login"}>Share your harvest</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="font-heading text-xl">
                <Link href={requestsHref}>See what&apos;s wanted</Link>
              </Button>
            </div>
          </div>
          <HerbIllustration className="mx-auto hidden max-w-sm sm:block" />
          <Sprig className="absolute top-2 -right-4 w-20 opacity-70 sm:hidden" />
        </section>
      )}

      <section className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-4xl">
            {activeKind === "request" ? "Wanted Around Town" : "From Neighbors' Gardens"}
          </h2>
          <Flourish />
        </div>

        <FeedTabs active={activeKind} offersHref={offersHref} requestsHref={requestsHref} />

        <div className="flex flex-col gap-3">
          <form action="/">
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput name="q" defaultValue={q ?? ""} placeholder="Look for mint, sage, lemongrass…" />
              {q && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton asChild size="icon-xs" aria-label="Clear search">
                    <Link href={clearSearchHref}>
                      <X />
                    </Link>
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            {lat && <input type="hidden" name="lat" value={lat} />}
            {lng && <input type="hidden" name="lng" value={lng} />}
            {km && <input type="hidden" name="km" value={km} />}
            {activeKind === "request" && <input type="hidden" name="kind" value="request" />}
          </form>
          <NearMeButton />
        </div>

        {posts.length === 0 ? (
          <Empty className="rounded-3xl border border-dashed border-rose-deep/50 bg-card/60">
            <EmptyHeader>
              <EmptyMedia>
                <Sprig className="w-16" />
              </EmptyMedia>
              <EmptyTitle className="text-2xl text-pine">
                {useRadius
                  ? "Nothing growing nearby yet"
                  : activeKind === "request"
                    ? "No one's searching right now"
                    : "The garden's quiet"}
              </EmptyTitle>
              <EmptyDescription className="text-base">
                {useRadius
                  ? "Try a wider radius, or clear the location filter."
                  : activeKind === "request"
                    ? "Need a handful of cilantro? Ask, and a neighbor might have extra."
                    : "Be the first to share what's thriving in your yard."}
              </EmptyDescription>
            </EmptyHeader>
            {!useRadius && (
              <EmptyContent>
                <Button asChild>
                  <Link href={user ? "/new" : "/login"}>
                    {activeKind === "request" ? "Ask for an herb" : "Share an herb"}
                  </Link>
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/posts/${p.id}`}
                className="group rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card className="h-full gap-0 rounded-3xl p-2 ring-border transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <AspectRatio ratio={1} className="overflow-hidden rounded-2xl bg-muted">
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        fill
                        sizes="(max-width: 640px) 50vw, 240px"
                        alt={p.herb}
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-secondary/60">
                        <Sprig className="w-14" />
                      </div>
                    )}
                  </AspectRatio>
                  <CardHeader className="gap-0.5 px-2 pt-3 pb-1">
                    <CardTitle className="flex items-baseline justify-between gap-2 text-xl leading-tight text-pine">
                      <span className="truncate">{p.herb}</span>
                      {p.kind === "offer" && (
                        <span className="shrink-0 text-lg text-rose-deep">{formatPrice(p.price_cents)}</span>
                      )}
                    </CardTitle>
                    <CardDescription className="truncate text-sm italic">
                      {p.neighborhood?.split(" · ")[0] ?? `from ${p.profiles?.display_name ?? "a neighbor"}`}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
