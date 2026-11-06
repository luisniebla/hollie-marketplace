@AGENTS.md

# Hollie's Herb Swap — project context

Hyper-local marketplace for herbs: Facebook Marketplace, but herbs-only. Phoenix, AZ–focused mobile web app. Neighbors post their abundance (giving away or selling) and seekers find them and connect over per-post chat threads.

## Core flows

- **Post** an offer or request. Offers require a photo and may carry a price (free or $). Requests are text-only and optional photo. Created via `src/app/new/NewPostForm.tsx`.
- **Browse** at `/`. Default feed is **oldest → newest**, `status='open'`, segmented by **kind** (`offer` | `request`) via `?kind=`. Optional `?q=` (herb ILIKE) and `?lat=&lng=&km=` (PostGIS radius). The radius branch goes through the `posts_near` RPC.
- **Chat** — per-post threads. A requester opens at most one thread with the poster (`unique (post_id, requester_id)`). Messages are sent via Server Action, and the realtime channel + a Web Push fan-out notify the recipient.

## Stack (as of 2026-05)

- **Next.js 16.2.4** App Router. Mutations go through **Server Actions** in `src/app/actions/`. RSC + `next/cache` `revalidatePath` for cache busts. See AGENTS.md for the version warning.
- **React 19.2.4** (note: `react-hooks/purity` is on — `Date.now()` / `Math.random()` at render time are linted; disable inline for RSC-only uses).
- **TailwindCSS v4** + **shadcn/ui** (`radix-nova` style, neutral base, lucide icons). Components live in `src/components/ui/`; add more with `npx shadcn@latest add <name>`.
- **Supabase** — Postgres + PostGIS + Auth + Realtime (`postgres_changes`) + Storage (public `post-images` bucket). Image transforms not used.
- **Zod 4** for validation in Server Actions.
- **web-push** for VAPID-signed push (Node runtime, server-only).
- **Vercel** deploy target.

## Conventions

- **UI is shadcn-only, dressed as an apothecary.** Build screens from `src/components/ui/*` and theme tokens; no raw styled `<button>`/`<input>`, no ad-hoc hex, no emoji as UI. Look follows a TinyBiotics-style herbal aesthetic: parchment background, dusty-rose waves (`WaveTop`/`HillBottom`), sage pill buttons, pine headings in **Patrick Hand** (`font-heading`, applied to h1–h3 and shadcn titles) over **Crimson Pro** body. Palette lives in `globals.css` `:root` (`--rose`, `--rose-deep`, `--pine`, `--sage`, `--marigold` are extras beyond shadcn tokens). Light-only (`next-themes` forced light). Original SVG art + `Flourish` (dots-and-dash heading divider) + `PageHeading` are in `src/components/Botanicals.tsx`. shadcn `button`/`tabs`/`input`/`textarea`/`input-group`/`field` were locally edited for pill shapes and larger sizes. Action errors surface via `sonner` toasts or an inline `Alert`; destructive confirms use `AlertDialog`.

- **Auth: Sign in with Google (only).** `src/app/login/LoginForm.tsx` calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`; `src/app/login/page.tsx` is a thin server wrapper that surfaces `?error=`. Callback at `src/app/auth/callback/route.ts` exchanges the PKCE code and bounces failures back to `/login?error=`. Magic-link/OTP sign-in was removed. Profile is auto-created on first signup by the `handle_new_user` trigger; `display_name` prefers Google's `full_name`/`name` and falls back to the email local part.
- **Google OAuth credentials live in Supabase, not the app.** Hosted: Dashboard → Authentication → Providers → Google. Local: `[auth.external.google]` in `supabase/config.toml` reads `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`. The Google Cloud OAuth client's authorized redirect URI is `<supabase-url>/auth/v1/callback` — *not* the app's `/auth/callback`. App origins must also be listed in Supabase's redirect allow-list (`additional_redirect_urls` locally).
- **Geolocation is persisted.** `useMyLocation` in `NewPostForm` collects rounded coords, `posts.lat/lng/geog` store them, and the `posts_near` Postgres function does radius search via `ST_DWithin`. Coords are rounded to ~500 m in the form before the row is inserted.
- **All mutations go through Server Actions.** Files in `src/app/actions/` always: (1) `requireUser()`, (2) `rateLimit(...)`, (3) `zod.safeParse(...)`, (4) Supabase call, (5) return `ActionResult<T>`. RLS is defense-in-depth, not the only check. Per the Next 16 docs, Server Functions are reachable via direct POST — auth/authorization checks live inside each action.
- **Rate limits are per-process in-memory** (`src/lib/rate-limit.ts`). Soft cap only; serverless instances each have their own bucket. Replace with Upstash/Vercel KV once abuse is observed.
- **Image upload stays client-side.** The browser resizes to ≤1600 px WebP (`resizeImage` returns `{blob, width, height}`), uploads direct to Supabase Storage, then calls `createPost` with the URL **and intrinsic dimensions** so `next/image` can render without layout shift. Dimensions are stored in `posts.image_width/image_height`.
- **`next/image` is used everywhere.** `remotePatterns` in `next.config.ts` allow `**.supabase.co/storage/v1/object/public/**`. The `<img>` in `NewPostForm` (live blob preview) is the only exception — eslint disabled inline.
- **Phoenix-only is branding, not a guard.** Nothing server-side restricts signup, posting, or browsing to Arizona.
- **Posts ordering is intentionally ascending** (oldest first) per product spec.
- **Push notifications require VAPID keys.** Run `npx web-push generate-vapid-keys` and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_CONTACT_EMAIL` in `.env.local`. Without them, the opt-in UI hides itself and `sendMessage` silently skips the push.
- **`src/proxy.ts` is what was `middleware.ts`.** Next 16 renamed the convention — same code, same matcher.

## Filesystem map

- `src/app/actions/` — Server Actions (`posts`, `threads`, `messages`, `push`, `reports`, `auth` — sign-out). Every mutation lives here.
- `src/app/page.tsx` — feed (Offers/Requests tab via `FeedTabs`, search, radius via `NearMeButton`).
- `src/app/new/NewPostForm.tsx` — kind toggle, photo, price, location.
- `src/app/posts/[id]/` — detail page + `StartChatButton`, `DeletePostButton`.
- `src/app/chats/` — thread list + per-thread page with `ChatThread.tsx` (realtime).
- `src/lib/` — `auth.ts`, `rate-limit.ts`, `push.ts`, `types.ts` (incl. `formatPrice`), `image.ts` (resize only — old `thumb` helpers were removed), `herbs.ts`, `supabase/{client,server}.ts`.
- `src/components/` — `Botanicals` (SVG art, flourish, page heading), `UserMenu` (avatar dropdown + sign out), `ThemeProvider`, `PushOptIn`, `ReportButton` (Dialog), and `ui/` (shadcn).
- `public/sw.js` — service worker for push notifications.
- `supabase/schema.sql` — full schema; safe to re-run. Includes PostGIS extension, `posts_near` RPC, `push_subscriptions`, `reports`, RLS for all tables.

## Schema additions worth knowing

- `posts`: `lat`, `lng`, `geog` (PostGIS geography point, trigger-maintained), `image_width`, `image_height`, `price_cents` (null = free; check `>= 0`).
- `push_subscriptions`: one row per device, unique by `endpoint`. RLS: users manage their own.
- `reports`: `(reporter_id, target_kind ∈ {post, thread}, target_id, reason, note?, status)`. RLS allows insert by reporter and select-own; moderator review path is TODO.

## Open follow-ups

- Set VAPID keys in env to actually fire push.
- Replace in-memory rate limiter with Upstash/KV before launch.
- Reports inbox / moderation UI (currently writable but no admin view).
- Realtime chat still uses `postgres_changes` — fine until ~1k DAU, plan B is Supabase Broadcast.
- README still describes the old username flow; refresh when the user updates it.
