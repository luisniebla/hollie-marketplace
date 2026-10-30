import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, type Post, type PostKind } from "@/lib/types";
import NearMeButton from "./NearMeButton";

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

  return (
    <div className="space-y-5">
      <form action="/" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="🔍  Search a herb..."
          className="flex-1 rounded-full border-2 border-cream-deep bg-white px-5 py-3 text-base placeholder:text-bark-soft/60 focus:border-forest focus:outline-none"
        />
        {lat && <input type="hidden" name="lat" value={lat} />}
        {lng && <input type="hidden" name="lng" value={lng} />}
        {km && <input type="hidden" name="km" value={km} />}
        {activeKind === "request" && <input type="hidden" name="kind" value="request" />}
        {q && (
          <Link
            href={`/${buildQs({ lat, lng, km, kind: activeKind === "request" ? "request" : undefined })}`}
            className="flex items-center justify-center rounded-full bg-cream-deep px-4 text-bark-soft"
            aria-label="Clear search"
          >
            ✕
          </Link>
        )}
      </form>

      <NearMeButton />

      <div className="grid grid-cols-2 gap-1 rounded-full border-2 border-cream-deep bg-cream p-1">
        <Link
          href={offersHref}
          className={`rounded-full py-2 text-center text-sm font-semibold transition ${
            activeKind === "offer" ? "bg-forest text-cream" : "text-bark-soft"
          }`}
        >
          🌱 Offering
        </Link>
        <Link
          href={requestsHref}
          className={`rounded-full py-2 text-center text-sm font-semibold transition ${
            activeKind === "request" ? "bg-clay text-cream" : "text-bark-soft"
          }`}
        >
          🙏 Wanted
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-cream-deep bg-white/60 p-10 text-center">
          <p className="font-serif text-xl text-forest-deep">
            {useRadius
              ? "Nothing nearby yet"
              : activeKind === "request"
                ? "No one is looking right now"
                : "No posts yet"}
          </p>
          <p className="mt-2 text-sm text-bark-soft">
            {useRadius
              ? "Try a wider radius, or clear the location filter."
              : activeKind === "request"
                ? "Post a request to let neighbors know what you need."
                : "Tap “+ New post” to start it off."}
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-3">
          {posts.map((p) => (
            <div key={p.id} className="mb-3 break-inside-avoid">
              <Link
                href={`/posts/${p.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-sm transition active:scale-[0.98]"
              >
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    width={p.image_width ?? 400}
                    height={p.image_height ?? 400}
                    sizes="(max-width: 640px) 50vw, 300px"
                    alt={p.herb}
                    className="h-auto w-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex aspect-square items-center justify-center text-4xl ${
                      p.kind === "request" ? "bg-sun/30" : "bg-cream-deep/50"
                    }`}
                  >
                    {p.kind === "request" ? "🙏" : "🌿"}
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-base font-semibold leading-tight text-bark">
                      {p.herb}
                    </h3>
                    {p.kind === "offer" && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          p.price_cents == null
                            ? "bg-leaf/40 text-forest-deep"
                            : "bg-clay/20 text-clay-deep"
                        }`}
                      >
                        {formatPrice(p.price_cents)}
                      </span>
                    )}
                  </div>
                  {p.neighborhood && (
                    <p className="mt-1 text-xs text-bark-soft">📍 {p.neighborhood}</p>
                  )}
                  <p className="mt-1 text-xs text-bark-soft/70">
                    {p.profiles?.display_name ?? "a neighbor"}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
