-- igo trips, one row per trip per user. Run once in the Supabase SQL editor.
create table if not exists public.trips (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  primary key (user_id, id)
);

alter table public.trips enable row level security;

create policy "Read own trips" on public.trips for select to authenticated using (auth.uid() = user_id);
create policy "Add own trips" on public.trips for insert to authenticated with check (auth.uid() = user_id);
create policy "Change own trips" on public.trips for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own trips" on public.trips for delete to authenticated using (auth.uid() = user_id);
