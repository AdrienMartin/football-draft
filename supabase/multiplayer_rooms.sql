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
  rematch_ready jsonb,
  match_result jsonb,
  match_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.multiplayer_rooms
add column if not exists draft_state jsonb;

alter table public.multiplayer_rooms
add column if not exists match_ready jsonb;

alter table public.multiplayer_rooms
add column if not exists rematch_ready jsonb;

alter table public.multiplayer_rooms
add column if not exists match_result jsonb;

alter table public.multiplayer_rooms
add column if not exists match_started_at timestamptz;

alter table public.multiplayer_rooms
add column if not exists host_connected_at timestamptz;

alter table public.multiplayer_rooms
add column if not exists guest_connected_at timestamptz;

alter table public.multiplayer_rooms
add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_multiplayer_room_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_multiplayer_room_updated_at on public.multiplayer_rooms;

create trigger set_multiplayer_room_updated_at
before update on public.multiplayer_rooms
for each row
execute function public.set_multiplayer_room_updated_at();

create index if not exists multiplayer_rooms_status_idx
on public.multiplayer_rooms (status);

create index if not exists multiplayer_rooms_updated_at_idx
on public.multiplayer_rooms (updated_at desc);

create or replace function public.cleanup_expired_multiplayer_rooms()
returns bigint
language plpgsql
as $$
declare
  deleted_count bigint;
begin
  delete from public.multiplayer_rooms
  where (
    status = 'finished'
    and coalesce(match_started_at, updated_at, created_at) < now() - interval '90 minutes'
  )
  or (
    status <> 'finished'
    and coalesce(updated_at, created_at) < now() - interval '6 hours'
  );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

alter table public.multiplayer_rooms enable row level security;

drop policy if exists "Public read multiplayer rooms" on public.multiplayer_rooms;
create policy "Public read multiplayer rooms"
on public.multiplayer_rooms
for select
to anon
using (true);

drop policy if exists "Public insert multiplayer rooms" on public.multiplayer_rooms;
create policy "Public insert multiplayer rooms"
on public.multiplayer_rooms
for insert
to anon
with check (true);

drop policy if exists "Public update multiplayer rooms" on public.multiplayer_rooms;
create policy "Public update multiplayer rooms"
on public.multiplayer_rooms
for update
to anon
using (
  coalesce(updated_at, created_at) > now() - interval '12 hours'
)
with check (
  coalesce(updated_at, created_at) > now() - interval '12 hours'
);

alter publication supabase_realtime add table public.multiplayer_rooms;
