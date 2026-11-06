"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const RADII = [
  { km: "3", label: "2 mi" },
  { km: "8", label: "5 mi" },
  { km: "16", label: "10 mi" },
] as const;

export default function NearMeButton() {
  const router = useRouter();
  const params = useSearchParams();
  const [locating, setLocating] = useState(false);

  const lat = params.get("lat");
  const lng = params.get("lng");
  const km = params.get("km") ?? "8";
  const active = lat && lng;

  async function findMe() {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location.");
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
      toast.error("Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  function setRadius(nextKm: string) {
    if (!nextKm) return;
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
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">Within</span>
        <ToggleGroup type="single" variant="outline" size="sm" value={km} onValueChange={setRadius}>
          {RADII.map((r) => (
            <ToggleGroupItem key={r.km} value={r.km}>
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={clearLocation}>
          <X data-icon="inline-start" />
          Clear
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" className="self-start" onClick={findMe} disabled={locating}>
      {locating ? <Spinner data-icon="inline-start" /> : <MapPin data-icon="inline-start" />}
      {locating ? "Finding you" : "Near me"}
    </Button>
  );
}
