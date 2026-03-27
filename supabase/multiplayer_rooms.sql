create table if not exists public.multiplayer_rooms (
  id text primary key,
  status text not null default 'waiting',
  host_name text,
  guest_name text,
  host_connected_at timestamptz,
  guest_connected_at timestamptz,
  rules jsonb not null default '{}'::jsonb,
  draft_state jsonb,
  match_ready jsonb,
  match_result jsonb,
  match_started_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.multiplayer_rooms
add column if not exists draft_state jsonb;

alter table public.multiplayer_rooms
add column if not exists match_ready jsonb;

alter table public.multiplayer_rooms
add column if not exists match_result jsonb;

alter table public.multiplayer_rooms
add column if not exists match_started_at timestamptz;

alter table public.multiplayer_rooms
add column if not exists host_connected_at timestamptz;

alter table public.multiplayer_rooms
add column if not exists guest_connected_at timestamptz;

alter table public.multiplayer_rooms enable row level security;

create policy "Public read multiplayer rooms"
on public.multiplayer_rooms
for select
to anon
using (true);

create policy "Public insert multiplayer rooms"
on public.multiplayer_rooms
for insert
to anon
with check (true);

create policy "Public update multiplayer rooms"
on public.multiplayer_rooms
for update
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.multiplayer_rooms;
