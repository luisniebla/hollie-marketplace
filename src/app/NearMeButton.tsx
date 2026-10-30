"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function NearMeButton() {
  const router = useRouter();
  const params = useSearchParams();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lat = params.get("lat");
  const lng = params.get("lng");
  const km = params.get("km") ?? "8";
  const active = lat && lng;

  async function findMe() {
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
      const next = new URLSearchParams(params.toString());
      next.set("lat", String(Math.round(pos.coords.latitude * 1000) / 1000));
      next.set("lng", String(Math.round(pos.coords.longitude * 1000) / 1000));
      if (!next.has("km")) next.set("km", "8");
      router.push(`/?${next.toString()}`);
    } catch {
      setError("Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  function setRadius(nextKm: string) {
    const next = new URLSearchParams(params.toString());
    next.set("km", nextKm);
    router.push(`/?${next.toString()}`);
  }

  function clearLocation() {
    const next = new URLSearchParams(params.toString());
    next.delete("lat");
    next.delete("lng");
    next.delete("km");
    const q = next.toString();
    router.push(q ? `/?${q}` : "/");
  }

  if (active) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-full border-2 border-leaf/40 bg-leaf/10 px-3 py-2 text-sm">
        <span className="font-semibold text-forest-deep">📍 Within</span>
        {(["3", "8", "16"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setRadius(opt)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              km === opt ? "bg-forest text-cream" : "text-forest-deep hover:bg-leaf/30"
            }`}
          >
            {opt === "3" ? "2 mi" : opt === "8" ? "5 mi" : "10 mi"}
          </button>
        ))}
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            clearLocation();
          }}
          className="ml-auto text-xs font-semibold text-bark-soft hover:text-clay-deep"
        >
          Clear
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={findMe}
        disabled={locating}
        className="inline-flex items-center gap-2 self-start rounded-full border-2 border-cream-deep bg-white px-4 py-2 text-sm font-semibold text-forest-deep transition hover:border-forest disabled:opacity-60"
      >
        {locating ? "Finding you..." : "📍 Show posts near me"}
      </button>
      {error && <p className="text-xs text-clay-deep">{error}</p>}
    </div>
  );
}
