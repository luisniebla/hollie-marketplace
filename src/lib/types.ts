export type PostKind = "offer" | "request";
export type PostStatus = "open" | "closed";

export type Post = {
  id: string;
  author_id: string;
  kind: PostKind;
  herb: string;
  description: string | null;
  neighborhood: string | null;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  price_cents: number | null;
  lat: number | null;
  lng: number | null;
  status: PostStatus;
  created_at: string;
  profiles?: { display_name: string } | null;
};

export type Thread = {
  id: string;
  post_id: string;
  poster_id: string;
  requester_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "Free";
  if (cents === 0) return "Free";
  return cents % 100 === 0
    ? `$${cents / 100}`
    : `$${(cents / 100).toFixed(2)}`;
}
