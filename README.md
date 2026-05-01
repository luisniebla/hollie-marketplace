# Hollie's Herb Swap 🌿

A Phoenix, AZ-only mobile-web app for sharing and requesting herbs. Built with Next.js + Supabase.

## Setup

1. **Create a Supabase project** at https://supabase.com (free tier is fine).
2. In the Supabase SQL editor, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. In Authentication → URL Configuration, add `http://localhost:3000/auth/callback` to the redirect URLs (and your production URL when you deploy).
4. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API → anon/public key
5. Install + run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Features

- Magic-link email sign-in (no password)
- Browse posts (offers + requests) with herb search and filter
- Create posts (offer or request) with neighborhood
- Per-post chat threads with realtime messaging
- Row Level Security: users can only read/write their own threads & messages

## Roadmap (v2)

- Photo uploads (Supabase Storage)
- Map / geolocation
- Push notifications for new messages
- Mark posts as fulfilled
- Block / report users
