"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/app/actions/posts";
import { HERBS } from "@/lib/herbs";
import { resizeImage } from "@/lib/image";

type Kind = "offer" | "request";

export default function NewPostForm() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("offer");
  const [herb, setHerb] = useState("");
  const [herbFocused, setHerbFocused] = useState(false);
  const [description, setDescription] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [forSale, setForSale] = useState(false);
  const [priceDollars, setPriceDollars] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function useMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location.");
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        }),
      );
      const lat = Math.round(pos.coords.latitude * 200) / 200;
      const lon = Math.round(pos.coords.longitude * 200) / 200;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lon}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error("Couldn't look up that location.");
      const data = await res.json();
      const a = data.address ?? {};
      const area =
        a.neighbourhood ||
        a.suburb ||
        a.quarter ||
        a.hamlet ||
        a.village ||
        a.town ||
        a.city_district ||
        a.city ||
        null;
      const road = a.road ?? null;
      const label = [area, road && `near ${road}`].filter(Boolean).join(" · ");
      if (!label) throw new Error("Couldn't find an area for your location.");
      setNeighborhood(label);
      setCoords({ lat, lon });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (kind === "offer" && !imageFile) {
      setError("Please add a photo.");
      return;
    }
    setSubmitting(true);
    setError(null);

    let publicUrl: string | null = null;
    let imageWidth: number | null = null;
    let imageHeight: number | null = null;
    if (imageFile) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      let blob: Blob;
      try {
        const resized = await resizeImage(imageFile, { maxEdge: 1600, quality: 0.82 });
        blob = resized.blob;
        imageWidth = resized.width;
        imageHeight = resized.height;
      } catch {
        blob = imageFile;
      }
      const path = `${user.id}/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, blob, {
          upsert: false,
          contentType: "image/webp",
          cacheControl: "31536000",
        });
      if (uploadError) {
        setError(uploadError.message);
        setSubmitting(false);
        return;
      }
      publicUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }

    let priceCents: number | null = null;
    if (kind === "offer" && forSale) {
      const dollars = Number(priceDollars);
      if (!Number.isFinite(dollars) || dollars < 0) {
        setError("Enter a price like 3 or 4.50.");
        setSubmitting(false);
        return;
      }
      priceCents = Math.round(dollars * 100);
    }

    const result = await createPost({
      kind,
      herb: herb.trim(),
      description: description.trim() || null,
      neighborhood: neighborhood.trim() || null,
      image_url: publicUrl,
      image_width: imageWidth,
      image_height: imageHeight,
      price_cents: priceCents,
      lat: coords?.lat ?? null,
      lng: coords?.lon ?? null,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/posts/${result.data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h1 className="font-serif text-3xl font-bold text-forest-deep">
        {kind === "offer" ? "Share something" : "Ask the neighborhood"}
      </h1>

      <div className="grid grid-cols-2 gap-1 rounded-full border-2 border-cream-deep bg-cream p-1">
        <button
          type="button"
          onClick={() => setKind("offer")}
          className={`rounded-full py-2 text-sm font-semibold transition ${
            kind === "offer" ? "bg-forest text-cream" : "text-bark-soft"
          }`}
        >
          🌱 Offering
        </button>
        <button
          type="button"
          onClick={() => setKind("request")}
          className={`rounded-full py-2 text-sm font-semibold transition ${
            kind === "request" ? "bg-clay text-cream" : "text-bark-soft"
          }`}
        >
          🙏 Looking for
        </button>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-bark">
          {kind === "offer" ? "Photo *" : "Photo (optional)"}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-full overflow-hidden rounded-2xl border-2 border-dashed border-cream-deep bg-white transition hover:border-forest"
        >
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL, not optimizable
            <img src={imagePreview} alt="Preview" className="w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-bark-soft">
              <span className="text-4xl">📷</span>
              <span className="text-sm font-semibold">
                {kind === "offer" ? "Tap to add a photo" : "Add a photo (optional)"}
              </span>
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onImageChange}
          className="hidden"
        />
      </div>

      {kind === "offer" && (
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-bark">Price</span>
          <div className="grid grid-cols-2 gap-1 rounded-full border-2 border-cream-deep bg-cream p-1">
            <button
              type="button"
              onClick={() => setForSale(false)}
              className={`rounded-full py-2 text-sm font-semibold transition ${
                !forSale ? "bg-leaf text-forest-deep" : "text-bark-soft"
              }`}
            >
              🎁 Free
            </button>
            <button
              type="button"
              onClick={() => setForSale(true)}
              className={`rounded-full py-2 text-sm font-semibold transition ${
                forSale ? "bg-clay text-cream" : "text-bark-soft"
              }`}
            >
              💵 For sale
            </button>
          </div>
          {forSale && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-semibold text-bark">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="1000"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                placeholder="3.00"
                className="w-32 rounded-2xl border-2 border-cream-deep bg-white px-4 py-2 text-base focus:border-forest focus:outline-none"
              />
              <span className="text-xs text-bark-soft">Cash or Venmo at pickup.</span>
            </div>
          )}
        </div>
      )}

      <Field label="Which herb?">
        <div className="relative">
          <input
            required
            value={herb}
            onChange={(e) => setHerb(e.target.value)}
            onFocus={() => setHerbFocused(true)}
            onBlur={() => setTimeout(() => setHerbFocused(false), 150)}
            placeholder="Rosemary, basil, mint..."
            autoComplete="off"
            className="w-full rounded-2xl border-2 border-cream-deep bg-white px-5 py-3 text-base focus:border-forest focus:outline-none"
          />
          {herbFocused && herb.trim() && herbSuggestions(herb).length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-2xl border-2 border-cream-deep bg-white shadow-lg">
              {herbSuggestions(herb).map((h) => (
                <li key={h}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setHerb(h);
                      setHerbFocused(false);
                    }}
                    className="block w-full px-5 py-2.5 text-left text-base text-bark hover:bg-cream-deep/40"
                  >
                    {h}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      <Field label={kind === "offer" ? "Tell us more (optional)" : "How much, by when, etc."}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            kind === "offer"
              ? "How much, when it's ready, anything else..."
              : "A small bunch for soup tonight, willing to pick up..."
          }
          rows={3}
          className="w-full rounded-2xl border-2 border-cream-deep bg-white px-5 py-3 text-base focus:border-forest focus:outline-none"
        />
      </Field>

      <Field label="Area">
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          placeholder="Arcadia, near Indian School Rd..."
          className="w-full rounded-2xl border-2 border-cream-deep bg-white px-5 py-3 text-base focus:border-forest focus:outline-none"
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="mt-2 inline-flex items-center gap-2 rounded-full border-2 border-cream-deep bg-white px-4 py-2 text-sm font-semibold text-forest-deep transition hover:border-forest disabled:opacity-60"
        >
          {locating ? "Finding area..." : "📍 Use my location"}
        </button>
        <p className="mt-1 text-xs text-bark-soft">
          We only save a rough area — never your exact address.
        </p>
        {coords && (
          <div className="mt-3 overflow-hidden rounded-2xl border-2 border-cream-deep">
            <iframe
              title="Approximate area"
              aria-label="Approximate area map"
              className="block h-44 w-full"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.01}%2C${coords.lat - 0.006}%2C${coords.lon + 0.01}%2C${coords.lat + 0.006}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`}
            />
          </div>
        )}
      </Field>

      {error && <p className="text-sm text-clay-deep">{error}</p>}

      <button
        disabled={submitting}
        className="w-full rounded-full bg-clay px-5 py-4 text-base font-bold text-cream shadow-sm transition hover:bg-clay-deep disabled:opacity-60"
      >
        {submitting ? "Posting..." : kind === "offer" ? "🌿 Post it" : "🙏 Post request"}
      </button>
    </form>
  );
}

function herbSuggestions(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = HERBS.filter((h) => h.toLowerCase().startsWith(q));
  const contains = HERBS.filter(
    (h) => !h.toLowerCase().startsWith(q) && h.toLowerCase().includes(q),
  );
  return [...starts, ...contains].slice(0, 6);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-bark">{label}</span>
      {children}
    </label>
  );
}
