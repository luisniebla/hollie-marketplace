"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewPostForm() {
  const router = useRouter();
  const [herb, setHerb] = useState("");
  const [description, setDescription] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
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
    } catch (err: any) {
      setError(err?.message ?? "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) {
      setError("Please add a photo.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, imageFile, { upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setSubmitting(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("post-images")
      .getPublicUrl(path);

    const { data, error: insertError } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        kind: "offer",
        herb: herb.trim(),
        description: description.trim() || null,
        neighborhood: neighborhood.trim() || null,
        image_url: publicUrl,
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push(`/posts/${data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h1 className="font-serif text-3xl font-bold text-forest-deep">Share something</h1>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-bark">Photo *</span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-full overflow-hidden rounded-2xl border-2 border-dashed border-cream-deep bg-white transition hover:border-forest"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-bark-soft">
              <span className="text-4xl">📷</span>
              <span className="text-sm font-semibold">Tap to add a photo</span>
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
