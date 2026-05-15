import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const { kind, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select("*, profiles(display_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  if (kind === "offer" || kind === "request") query = query.eq("kind", kind);
  if (q) query = query.ilike("herb", `%${q}%`);

  const { data: posts } = await query;

  return (
    <div className="space-y-5">
      <form action="/" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="🔍  Search a herb..."
          className="flex-1 rounded-full border-2 border-cream-deep bg-white px-5 py-3 text-base placeholder:text-bark-soft/60 focus:border-forest focus:outline-none"
        />
        {q && (
          <Link
            href={kind ? `/?kind=${kind}` : "/"}
            className="flex items-center justify-center rounded-full bg-cream-deep px-4 text-bark-soft"
            aria-label="Clear search"
          >
            ✕
          </Link>
        )}
      </form>

      <div className="flex gap-2">
        <FilterChip current={kind} value={undefined} label="Everything" />
        <FilterChip current={kind} value="offer" label="🌱 Offers" />
        <FilterChip current={kind} value="request" label="🙏 Requests" />
      </div>

      {(posts ?? []).length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-cream-deep bg-white/60 p-10 text-center">
          <p className="font-serif text-xl text-forest-deep">No posts yet</p>
          <p className="mt-2 text-sm text-bark-soft">Tap &ldquo;+ New post&rdquo; to start it off.</p>
        </div>
      ) : (
        <div className="columns-2 gap-3">
          {(posts as Post[]).map((p) => (
            <div key={p.id} className="mb-3 break-inside-avoid">
              <Link
                href={`/posts/${p.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-sm transition active:scale-[0.98]"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.herb} className="w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-cream-deep/50 text-4xl">
                    🌿
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-serif text-base font-semibold leading-tight text-bark">
                      {p.herb}
                    </h3>
                    <KindBadge kind={p.kind} />
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

function FilterChip({
  current,
  value,
  label,
}: {
  current: string | undefined;
  value: string | undefined;
  label: string;
}) {
  const active = current === value || (!current && !value);
  const href = value ? `/?kind=${value}` : "/";
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-forest-deep text-cream"
          : "border-2 border-cream-deep bg-white text-bark-soft"
      }`}
    >
      {label}
    </Link>
  );
}

function KindBadge({ kind }: { kind: "offer" | "request" }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        kind === "offer" ? "bg-leaf/30 text-forest-deep" : "bg-sun/40 text-bark"
      }`}
    >
      {kind === "offer" ? "Offer" : "Want"}
    </span>
  );
}
