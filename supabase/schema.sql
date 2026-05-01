-- Hollie Marketplace schema
-- Safe to re-run.

do $$ begin
  create type post_kind as enum ('offer', 'request');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('open', 'closed');
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
  status post_status not null default 'open',
  created_at timestamptz default now()
);
create index if not exists posts_created_idx on posts (created_at desc);
create index if not exists posts_kind_idx on posts (kind);

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

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Row level security
alter table profiles enable row level security;
alter table posts enable row level security;
alter table threads enable row level security;
alter table messages enable row level security;

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
