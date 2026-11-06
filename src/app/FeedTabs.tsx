"use client";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PostKind } from "@/lib/types";

export default function FeedTabs({
  active,
  offersHref,
  requestsHref,
}: {
  active: PostKind;
  offersHref: string;
  requestsHref: string;
}) {
  const router = useRouter();
  return (
    <Tabs
      value={active}
      onValueChange={(v) => router.push(v === "request" ? requestsHref : offersHref)}
    >
      <TabsList className="mx-auto">
        <TabsTrigger value="offer">On offer</TabsTrigger>
        <TabsTrigger value="request">Wanted</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
