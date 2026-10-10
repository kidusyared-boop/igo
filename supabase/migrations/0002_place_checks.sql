-- Local checks of the place catalogue. Run in the Supabase SQL editor; safe to run again.

-- People allowed to check places. Add a row per local reviewer:
--   insert into public.reviewers (email, name) values ('someone@example.com', 'Abebe, Addis Ababa');
create table if not exists public.reviewers (
  email text primary key,
  name text not null
);

alter table public.reviewers enable row level security;

drop policy if exists "Reviewers can see themselves" on public.reviewers;
create policy "Reviewers can see themselves" on public.reviewers
  for select to authenticated using (lower(email) = lower(auth.jwt() ->> 'email'));

-- One row per verdict. Nothing is updated in place, so the history stays readable.
create table if not exists public.place_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_key text not null,
  verdict text not null check (verdict in ('ok', 'fix', 'gone')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists place_reviews_key on public.place_reviews (place_key, created_at desc);

alter table public.place_reviews enable row level security;

drop policy if exists "Reviewers add checks" on public.place_reviews;
create policy "Reviewers add checks" on public.place_reviews
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.reviewers r where lower(r.email) = lower(auth.jwt() ->> 'email'))
  );

drop policy if exists "Reviewers read checks" on public.place_reviews;
create policy "Reviewers read checks" on public.place_reviews
  for select to authenticated
  using (exists (select 1 from public.reviewers r where lower(r.email) = lower(auth.jwt() ->> 'email')));

-- What every visitor sees: the latest verdict per place, without notes or names.
create or replace view public.place_checks as
  select distinct on (place_key) place_key, verdict, created_at as checked_at
  from public.place_reviews
  order by place_key, created_at desc;

grant select on public.place_checks to anon, authenticated;
