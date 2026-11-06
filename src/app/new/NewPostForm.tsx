"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/app/actions/posts";
import { HERBS } from "@/lib/herbs";
import { resizeImage } from "@/lib/image";
import { Camera, CircleAlert, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading, Sprig } from "@/components/Botanicals";

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

  const suggestions = herbSuggestions(herb);
  const showSuggestions =
    herbFocused && suggestions.length > 0 && !suggestions.some((h) => h === herb.trim());

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="relative">
        <PageHeading
          title={kind === "offer" ? "Share your harvest" : "Ask the neighborhood"}
          subtitle={
            kind === "offer"
              ? "Extra basil, a rooted cutting, seeds you saved? Pass it along."
              : "Tell neighbors what you're hunting for. Someone's yard probably has it."
          }
          className="pr-20"
        />
        <Sprig className="absolute -top-2 right-0 w-16" />
      </div>

      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
        <TabsList className="w-full">
          <TabsTrigger value="offer">Offering</TabsTrigger>
          <TabsTrigger value="request">Looking for</TabsTrigger>
        </TabsList>
      </Tabs>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="photo">
            Photo
            {kind === "request" && <span className="font-sans text-sm italic text-muted-foreground">optional</span>}
          </FieldLabel>
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-3xl border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not optimizable */}
              <img src={imagePreview} alt="Preview" className="max-h-96 w-full object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 bottom-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Change photo
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-44 w-full flex-col gap-2 rounded-3xl border-2 border-dashed border-rose-deep/50 bg-card font-heading text-xl text-pine"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-7 text-rose-deep" />
              {kind === "offer" ? "Snap your herbs" : "Add a photo"}
            </Button>
          )}
          <input
            id="photo"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onImageChange}
            className="sr-only"
            tabIndex={-1}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="herb">Herb</FieldLabel>
          <Popover open={showSuggestions} onOpenChange={(o) => !o && setHerbFocused(false)}>
            <PopoverAnchor asChild>
              <Input
                id="herb"
                required
                value={herb}
                onChange={(e) => setHerb(e.target.value)}
                onFocus={() => setHerbFocused(true)}
                onBlur={() => setHerbFocused(false)}
                placeholder="Rosemary, basil, mint"
                autoComplete="off"
              />
            </PopoverAnchor>
            <PopoverContent
              align="start"
              className="w-(--radix-popover-trigger-width) p-0"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
            >
              <Command shouldFilter={false}>
                <CommandList>
                  <CommandGroup>
                    {suggestions.map((h) => (
                      <CommandItem
                        key={h}
                        value={h}
                        onSelect={() => {
                          setHerb(h);
                          setHerbFocused(false);
                        }}
                      >
                        {h}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </Field>

        {kind === "offer" && (
          <Field>
            <FieldLabel>Price</FieldLabel>
            <Tabs value={forSale ? "sale" : "free"} onValueChange={(v) => setForSale(v === "sale")}>
              <TabsList className="w-full">
                <TabsTrigger value="free">Free</TabsTrigger>
                <TabsTrigger value="sale">For sale</TabsTrigger>
              </TabsList>
            </Tabs>
            {forSale && (
              <>
                <InputGroup className="max-w-40">
                  <InputGroupAddon>
                    <InputGroupText>$</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Price in dollars"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max="1000"
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    placeholder="3.00"
                  />
                </InputGroup>
                <FieldDescription>Usually cash or Venmo at pickup.</FieldDescription>
              </>
            )}
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="description">
            Details
            {kind === "offer" && <span className="font-sans text-sm italic text-muted-foreground">optional</span>}
          </FieldLabel>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              kind === "offer"
                ? "How much you have, when it's ready to snip, sun or shade grown…"
                : "A small bunch for soup tonight, happy to pick up"
            }
            rows={3}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="neighborhood">Area</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Arcadia, near Indian School Rd"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={useMyLocation} disabled={locating}>
                {locating ? <Spinner /> : <MapPin />}
                Use my location
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>We only save a rough area, never your address.</FieldDescription>
          {coords && (
            <div className="overflow-hidden rounded-3xl border">
              <iframe
                title="Approximate area"
                aria-label="Approximate area map"
                className="block h-44 w-full"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.01}%2C${coords.lat - 0.006}%2C${coords.lon + 0.01}%2C${coords.lat + 0.006}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`}
              />
            </div>
          )}
        </Field>
      </FieldGroup>

      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Spinner data-icon="inline-start" />}
        {submitting ? "Planting your post" : kind === "offer" ? "Share it" : "Post request"}
      </Button>
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
