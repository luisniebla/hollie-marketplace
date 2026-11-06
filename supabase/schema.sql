-- Hollie Marketplace schema
-- Safe to re-run.

do $$ begin
  create type post_kind as enum ('offer', 'request');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_target as enum ('post', 'thread');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('pending', 'reviewed', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  neighborhood text,
  created_at timestamptz default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  kind post_kind not null,
  herb text not null,
  description text,
  neighborhood text,
  image_url text,
  status post_status not null default 'open',
  created_at timestamptz default now()
);
alter table posts add column if not exists image_url text;
alter table posts add column if not exists image_width integer;
alter table posts add column if not exists image_height integer;
alter table posts add column if not exists price_cents integer;
do $$ begin
  alter table posts add constraint posts_price_nonneg check (price_cents is null or price_cents >= 0);
exception when duplicate_object then null; end $$;
create index if not exists posts_created_idx on posts (created_at desc);
create index if not exists posts_kind_idx on posts (kind);

-- Geospatial: coords + PostGIS geography for radius search
create extension if not exists postgis;
alter table posts add column if not exists lat double precision;
alter table posts add column if not exists lng double precision;
alter table posts add column if not exists geog geography(point);

create or replace function posts_set_geog()
returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.geog := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  else
    new.geog := null;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_geog_trigger on posts;
create trigger posts_geog_trigger
  before insert or update of lat, lng on posts
  for each row execute function posts_set_geog();

create index if not exists posts_geog_idx on posts using gist (geog);

-- Radius search; results are post rows so PostgREST can embed `profiles`.
create or replace function posts_near(
  search_lat double precision,
  search_lng double precision,
  radius_km double precision,
  search_kind post_kind default 'offer',
  search_q text default null,
  max_rows int default 50
)
returns setof posts
language sql stable as $$
  select p.*
  from posts p
  where p.status = 'open'
    and p.kind = search_kind
    and (search_q is null or p.herb ilike '%' || search_q || '%')
    and p.geog is not null
    and st_dwithin(
      p.geog,
      st_setsrid(st_makepoint(search_lng, search_lat), 4326)::geography,
      radius_km * 1000
    )
  order by p.created_at asc
  limit max_rows
$$;

create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  poster_id uuid not null references profiles(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, requester_id)
);
create index if not exists threads_poster_idx on threads (poster_id);
create index if not exists threads_requester_idx on threads (requester_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists messages_thread_idx on messages (thread_id, created_at);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_kind report_target not null,
  target_id uuid not null,
  reason text not null,
  note text,
  status report_status not null default 'pending',
  created_at timestamptz default now()
);
create index if not exists reports_target_idx on reports (target_kind, target_id);
create index if not exists reports_status_idx on reports (status, created_at desc);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Google OAuth populates `full_name` / `name` in raw_user_meta_data.
  insert into profiles (id, display_name)
  values (new.id, coalesce(
    new.raw_user_meta_data->>'display_name',
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  ));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Storage bucket for post images
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post images are public" on storage.objects;
create policy "post images are public" on storage.objects
  for select using (bucket_id = 'post-images');

drop policy if exists "auth users upload post images" on storage.objects;
create policy "auth users upload post images" on storage.objects
  for insert with check (bucket_id = 'post-images' and auth.uid() is not null);

drop policy if exists "users delete own post images" on storage.objects;
create policy "users delete own post images" on storage.objects
  for delete using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Realtime: ChatThread subscribes to `postgres_changes` on messages, which only
-- fires for tables in the supabase_realtime publication.
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;

-- Row level security
alter table profiles enable row level security;
alter table posts enable row level security;
alter table threads enable row level security;
alter table messages enable row level security;
alter table push_subscriptions enable row level security;
alter table reports enable row level security;

drop policy if exists "users manage own push subscriptions" on push_subscriptions;
create policy "users manage own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users insert own reports" on reports;
create policy "users insert own reports" on reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "users read own reports" on reports;
create policy "users read own reports" on reports for select
  using (auth.uid() = reporter_id);

drop policy if exists "profiles are public" on profiles;
create policy "profiles are public" on profiles for select using (true);
drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles for update using (auth.uid() = id);

drop policy if exists "posts are public" on posts;
create policy "posts are public" on posts for select using (true);
drop policy if exists "users insert own posts" on posts;
create policy "users insert own posts" on posts for insert with check (auth.uid() = author_id);
drop policy if exists "users update own posts" on posts;
create policy "users update own posts" on posts for update using (auth.uid() = author_id);
drop policy if exists "users delete own posts" on posts;
create policy "users delete own posts" on posts for delete using (auth.uid() = author_id);

drop policy if exists "thread participants read" on threads;
create policy "thread participants read" on threads for select
  using (auth.uid() = poster_id or auth.uid() = requester_id);
drop policy if exists "requester creates thread" on threads;
create policy "requester creates thread" on threads for insert
  with check (auth.uid() = requester_id);

drop policy if exists "thread participants read messages" on messages;
create policy "thread participants read messages" on messages for select
  using (exists (select 1 from threads t where t.id = thread_id
    and (t.poster_id = auth.uid() or t.requester_id = auth.uid())));
drop policy if exists "thread participants send messages" on messages;
create policy "thread participants send messages" on messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from threads t where t.id = thread_id
    and (t.poster_id = auth.uid() or t.requester_id = auth.uid())));

-- Table privileges. Newer Supabase projects no longer auto-grant the API roles
-- access to tables in `public`, so without these every query fails with
-- "permission denied for table ..." before RLS is even consulted. Grants mirror
-- the policies above; RLS still filters rows.
grant usage on schema public to anon, authenticated;
grant select on profiles, posts to anon;
grant select, update on profiles to authenticated;
grant select, insert, update, delete on posts to authenticated;
grant select, insert on threads, messages, reports to authenticated;
grant select, insert, update, delete on push_subscriptions to authenticated;
grant execute on function posts_near to anon, authenticated;
