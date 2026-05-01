"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewPostForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"offer" | "request">("offer");
  const [herb, setHerb] = useState("");
  const [description, setDescription] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        kind,
        herb: herb.trim(),
        description: description.trim() || null,
        neighborhood: neighborhood.trim() || null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/posts/${data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h1 className="font-serif text-3xl font-bold text-forest-deep">Share something</h1>

      <div className="grid grid-cols-2 gap-3">
        <KindToggle active={kind === "offer"} onClick={() => setKind("offer")} emoji="🌱" label="I'm offering" />
        <KindToggle active={kind === "request"} onClick={() => setKind("request")} emoji="🙏" label="I'm asking" />
      </div>

      <Field label="Which herb?">
        <input
          required
          value={herb}
          onChange={(e) => setHerb(e.target.value)}
          placeholder="Rosemary, basil, mint..."
          className="w-full rounded-2xl border-2 border-cream-deep bg-white px-5 py-3 text-base focus:border-forest focus:outline-none"
        />
      </Field>

      <Field label="Tell us more (optional)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="How much, when it's ready, anything else..."
          rows={4}
          className="w-full rounded-2xl border-2 border-cream-deep bg-white px-5 py-3 text-base focus:border-forest focus:outline-none"
        />
      </Field>

      <Field label="Neighborhood">
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          placeholder="Arcadia, Roosevelt Row, North Phoenix..."
          className="w-full rounded-2xl border-2 border-cream-deep bg-white px-5 py-3 text-base focus:border-forest focus:outline-none"
        />
      </Field>

      {error && <p className="text-sm text-clay-deep">{error}</p>}

      <button
        disabled={submitting}
        className="w-full rounded-full bg-clay px-5 py-4 text-base font-bold text-cream shadow-sm transition hover:bg-clay-deep disabled:opacity-60"
      >
        {submitting ? "Posting..." : "🌿 Post it"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-bark">{label}</span>
      {children}
    </label>
  );
}

function KindToggle({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-5 text-sm font-semibold transition ${
        active
          ? "border-forest bg-leaf/20 text-forest-deep"
          : "border-cream-deep bg-white text-bark-soft"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      {label}
    </button>
  );
}
