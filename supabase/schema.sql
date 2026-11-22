-- ============================================================================
-- The LOL Report: fresh start. Run this whole file once in the Supabase SQL
-- editor (new query). It is safe to re-run.
-- Creates tables, row-level security, the public humor pages, the derived
-- "studies" views, and sample data. Your earliest signed-in user becomes the
-- superadmin.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables ----
create table if not exists public.profiles (
  id uuid primary key,
  first_name text,
  last_name text,
  avatar_url text,
  email text,
  bio text,
  is_superadmin boolean not null default false,
  is_in_study boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_datetime_utc timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  created_datetime_utc timestamptz not null default now(),
  modified_datetime_utc timestamptz,
  url text,
  is_common_use boolean not null default false,
  is_public boolean not null default true,
  profile_id uuid references public.profiles(id) on delete set null,
  additional_context text,
  image_description text,
  celebrity_recognition text
);

create table if not exists public.humor_flavors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  description text,
  is_pinned boolean not null default false,
  created_datetime_utc timestamptz not null default now()
);

create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  voice text,
  content text,
  prompt text,
  model text,
  score integer,
  created_at timestamptz not null default now(),
  created_datetime_utc timestamptz not null default now(),
  image_id uuid references public.images(id) on delete cascade,
  humor_flavor_id uuid references public.humor_flavors(id) on delete set null,
  like_count integer not null default 0,
  is_public boolean not null default true,
  is_featured boolean not null default false
);

create table if not exists public.caption_votes (
  id uuid primary key default gen_random_uuid(),
  caption_id uuid not null references public.captions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  vote_value smallint not null,
  is_from_study boolean not null default true,
  created_datetime_utc timestamptz not null default now()
);

create index if not exists caption_votes_caption_idx on public.caption_votes (caption_id);
create index if not exists caption_votes_profile_idx on public.caption_votes (profile_id);
create index if not exists captions_user_idx on public.captions (user_id);

create table if not exists public.user_public_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  username text not null unique
    check (username = lower(username) and username ~ '^[a-z0-9][a-z0-9_-]{2,19}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 180),
  avatar_emoji text not null default '😎' check (char_length(avatar_emoji) between 1 and 24),
  theme text not null default 'sunset'
    check (theme in ('sunset', 'ocean', 'grape', 'lime')),
  is_public boolean not null default false,
  featured_caption_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------ superadmin + sign-up ----
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_superadmin from public.profiles p where p.id = auth.uid()), false);
$$;
grant execute on function public.is_superadmin() to authenticated;

-- Every new auth user gets a profile; the very first one becomes superadmin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, avatar_url, is_superadmin)
  values (
    new.id,
    new.email,
    split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1),
    nullif(substring(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '') from ' (.*)$'), ''),
    new.raw_user_meta_data ->> 'avatar_url',
    not exists (select 1 from public.profiles where is_superadmin)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: profiles for users who already signed in; earliest becomes superadmin.
insert into public.profiles (id, email, first_name, last_name, avatar_url)
select
  u.id,
  u.email,
  split_part(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), ' ', 1),
  nullif(substring(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '') from ' (.*)$'), ''),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users as u
on conflict (id) do nothing;

update public.profiles
set is_superadmin = true
where id = (
  select u.id from auth.users u
  join public.profiles p on p.id = u.id
  order by u.created_at limit 1
)
and not exists (select 1 from public.profiles where is_superadmin);

-- -------------------------------------------------- row-level security ----
alter table public.profiles enable row level security;
alter table public.images enable row level security;
alter table public.humor_flavors enable row level security;
alter table public.captions enable row level security;
alter table public.caption_votes enable row level security;
alter table public.user_public_profiles enable row level security;

drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_superadmin());
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "images read" on public.images;
drop policy if exists "images insert own" on public.images;
create policy "images read" on public.images for select to authenticated
  using (is_public or profile_id = (select auth.uid()) or public.is_superadmin());
create policy "images insert own" on public.images for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists "flavors read" on public.humor_flavors;
create policy "flavors read" on public.humor_flavors for select to authenticated using (true);

drop policy if exists "captions read" on public.captions;
drop policy if exists "captions insert own" on public.captions;
drop policy if exists "captions update own" on public.captions;
create policy "captions read" on public.captions for select to authenticated
  using (is_public or user_id = (select auth.uid()) or public.is_superadmin());
create policy "captions insert own" on public.captions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "captions update own" on public.captions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "votes read" on public.caption_votes;
drop policy if exists "votes insert own" on public.caption_votes;
create policy "votes read" on public.caption_votes for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_superadmin());
create policy "votes insert own" on public.caption_votes for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists "Public profiles are visible when published" on public.user_public_profiles;
drop policy if exists "Users can create their own public profile" on public.user_public_profiles;
drop policy if exists "Users can update their own public profile" on public.user_public_profiles;
drop policy if exists "Users can delete their own public profile" on public.user_public_profiles;
create policy "Public profiles are visible when published" on public.user_public_profiles
  for select to anon, authenticated
  using (is_public or profile_id = (select auth.uid()));
create policy "Users can create their own public profile" on public.user_public_profiles
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "Users can update their own public profile" on public.user_public_profiles
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "Users can delete their own public profile" on public.user_public_profiles
  for delete to authenticated using (profile_id = (select auth.uid()));

grant select on public.profiles to authenticated;
grant update (first_name, last_name, avatar_url, bio) on public.profiles to authenticated;
grant select, insert on public.images, public.captions to authenticated;
grant update on public.captions to authenticated;
grant select on public.humor_flavors to authenticated;
grant select, insert on public.caption_votes to authenticated;
grant select on public.user_public_profiles to anon, authenticated;
grant insert, update, delete on public.user_public_profiles to authenticated;

-- ------------------------------------------ public humor page (no login) ----
create or replace view public.user_public_profile_showcase
with (security_invoker = false, security_barrier = true)
as
select
  profile.username, profile.display_name, profile.bio, profile.avatar_emoji, profile.theme,
  showcase.caption_id, showcase.caption_content, showcase.image_url
from public.user_public_profiles as profile
left join (
  select caption.id as caption_id, caption.content as caption_content, image.url as image_url
  from public.captions as caption
  left join public.images as image on image.id = caption.image_id and image.is_public = true
  where caption.is_public = true
) as showcase on showcase.caption_id::text = any(profile.featured_caption_ids)
where profile.is_public = true;

create or replace view public.user_public_profile_humor_style
with (security_invoker = false, security_barrier = true)
as
select
  profile.username,
  (select count(*) from public.captions c
     where c.user_id = profile.profile_id and c.is_public)::int as public_caption_count,
  (select count(*) from public.caption_votes v
     where v.profile_id = profile.profile_id)::int as votes_cast_count,
  (select count(*) from public.caption_votes v
     where v.profile_id = profile.profile_id and v.vote_value > 0)::int as upvotes_cast_count,
  -- Signature style = the humor flavor of the captions this person liked most.
  (select f.slug from public.caption_votes v
     join public.captions c on c.id = v.caption_id
     join public.humor_flavors f on f.id = c.humor_flavor_id
     where v.profile_id = profile.profile_id and v.vote_value > 0
     group by f.slug order by count(*) desc, f.slug limit 1) as top_flavor,
  array(select f.slug from public.caption_votes v
     join public.captions c on c.id = v.caption_id
     join public.humor_flavors f on f.id = c.humor_flavor_id
     where v.profile_id = profile.profile_id and v.vote_value > 0
     group by f.slug order by count(*) desc, f.slug limit 3) as top_flavors
from public.user_public_profiles as profile
where profile.is_public = true;

grant select on public.user_public_profile_showcase,
  public.user_public_profile_humor_style to anon, authenticated;

-- ---------------------------- "studies" derived from votes (superadmin) ----
-- One study = one calendar week of caption_votes; study 1 is the earliest week.
drop view if exists public.study_caption_navigation_events;
drop view if exists public.study_caption_vote_events;
drop view if exists public.study_caption_mappings;
drop view if exists public.studies;
drop view if exists public.study_votes_base;

create view public.study_votes_base
with (security_invoker = false, security_barrier = true)
as
select
  v.id as vote_id, v.caption_id, v.profile_id, v.vote_value,
  v.created_datetime_utc as voted_at,
  date_trunc('week', v.created_datetime_utc) as week_start
from public.caption_votes as v
where public.is_superadmin();

create view public.studies
with (security_invoker = false, security_barrier = true)
as
select
  (dense_rank() over (order by week_start))::bigint as id,
  'week-' || to_char(week_start, 'YYYY-MM-DD') as slug,
  'Votes cast during the week of ' || to_char(week_start, 'Mon DD, YYYY') as description,
  week_start as start_datetime_utc,
  week_start + interval '7 days' as end_datetime_utc,
  week_start as created_datetime_utc
from (select distinct week_start from public.study_votes_base) as weeks;

create view public.study_caption_mappings
with (security_invoker = false, security_barrier = true)
as
select
  (row_number() over (order by s.id, b.caption_id))::bigint as id,
  s.id as study_id, b.caption_id, min(b.voted_at) as created_datetime_utc
from public.study_votes_base as b
join public.studies as s on s.start_datetime_utc = b.week_start
group by s.id, b.caption_id;

create view public.study_caption_vote_events
with (security_invoker = false, security_barrier = true)
as
select
  (row_number() over (order by b.voted_at, b.vote_id))::bigint as id,
  b.caption_id,
  b.vote_id::text as client_event_id,
  b.profile_id as created_by_user_id,
  b.voted_at as created_datetime_utc,
  'unknown'::text as input_method,
  b.profile_id,
  null::text as session_id,
  m.id as study_caption_mapping_id,
  null::bigint as time_to_vote_ms,
  case when b.vote_value > 0 then 'funny'
       when b.vote_value < 0 then 'not funny at all'
       else 'meh' end as vote_value
from public.study_votes_base as b
join public.studies as s on s.start_datetime_utc = b.week_start
join public.study_caption_mappings as m on m.study_id = s.id and m.caption_id = b.caption_id;

-- No navigation tracking exists, so this stays empty by design.
create view public.study_caption_navigation_events
with (security_invoker = false, security_barrier = true)
as
select
  null::bigint as id, null::uuid as caption_id, null::text as client_event_id,
  null::uuid as created_by_user_id, null::timestamptz as created_datetime_utc,
  null::text as input_method, null::uuid as profile_id, null::text as session_id,
  null::bigint as study_caption_mapping_id, null::bigint as time_to_next_caption_ms
where false;

revoke all on public.study_votes_base, public.studies, public.study_caption_mappings,
  public.study_caption_vote_events, public.study_caption_navigation_events from anon, public;
grant select on public.study_votes_base, public.studies, public.study_caption_mappings,
  public.study_caption_vote_events, public.study_caption_navigation_events to authenticated;

-- ----------------------------------------------------------- sample data ----
-- Runs only while there are no captions. Captions go to the superadmin.
do $$
declare
  owner_id uuid := (select id from public.profiles where is_superadmin limit 1);
begin
  if exists (select 1 from public.captions) then
    return;
  end if;

  insert into public.profiles (id, email, first_name, last_name, is_in_study)
  select
    ('00000000-0000-4000-8000-00000000000' || n)::uuid,
    'rater' || n || '@example.test', 'Rater', n::text, true
  from generate_series(1, 6) as n
  on conflict (id) do nothing;

  insert into public.humor_flavors (slug, description, is_pinned) values
    ('dry-wit', 'Deadpan, understated humor', true),
    ('absurdist', 'Surreal and nonsensical', false),
    ('wholesome', 'Warm and friendly jokes', false),
    ('sarcasm', 'Sharp, ironic remarks', false),
    ('dad-jokes', 'Groan-worthy puns', false)
  on conflict (slug) do nothing;

  insert into public.images (url, is_public, profile_id, image_description)
  select 'https://picsum.photos/seed/lol' || n || '/800/600', true, owner_id, 'Sample image ' || n
  from generate_series(1, 8) as n;

  insert into public.captions (user_id, voice, content, image_id, humor_flavor_id, is_public, created_datetime_utc)
  select
    owner_id,
    f.slug,
    (array[
      'When the meeting could have been an email, but you are already here',
      'Me pretending to understand the plot twist',
      'This is fine. Everything is fine.',
      'Nobody: Absolutely nobody: Me at 3 a.m.',
      'Plot twist: the dog was the manager all along',
      'Monday called. I let it go to voicemail.',
      'My cardio is chasing the bus I just missed',
      'Trust me, I read the instructions',
      'Legally, this counts as a salad',
      'I am not lost, I am exploring aggressively',
      'Breaking: local human wins argument with themselves',
      'Please hold while I overthink this'
    ])[((row_number() over ())::int - 1) % 12 + 1],
    i.id,
    f.id,
    true,
    now() - ((row_number() over ())::int % 25) * interval '1 day'
  from (select id, row_number() over (order by id) as rn from public.images) as i
  join (
    select id, slug, row_number() over (order by slug) as rn from public.humor_flavors
  ) as f on f.rn = (i.rn % 5) + 1
  cross join generate_series(1, 2);

  -- Votes from the 6 sample raters, spread across the last four weeks.
  insert into public.caption_votes (caption_id, profile_id, vote_value, created_datetime_utc)
  select
    c.id, p.id,
    case when abs(hashtext(c.id::text || p.id::text)) % 100 < 65 then 1 else -1 end,
    now() - (abs(hashtext(p.id::text || c.id::text)) % 28) * interval '1 day'
          - (abs(hashtext(c.id::text)) % 20) * interval '1 hour'
  from public.captions c
  join public.profiles p on p.email like 'rater%@example.test'
  where abs(hashtext(c.id::text || p.id::text || 'x')) % 100 < 85;

  update public.captions c
  set like_count = (select count(*) from public.caption_votes v
                    where v.caption_id = c.id and v.vote_value > 0);
end $$;

-- ------------------------------------------- landing page (no login) ----
-- Aggregate/public-only data so signed-out visitors can preview the app.
create or replace view public.public_landing_captions
with (security_invoker = false, security_barrier = true)
as
select
  c.id,
  c.content,
  c.voice,
  i.url as image_url,
  (select count(*) from public.caption_votes v where v.caption_id = c.id and v.vote_value > 0)::int as up_votes,
  (select count(*) from public.caption_votes v where v.caption_id = c.id and v.vote_value < 0)::int as down_votes
from public.captions c
join public.images i on i.id = c.image_id and i.is_public
where c.is_public and c.content is not null
order by c.like_count desc, c.created_datetime_utc desc
limit 12;

create or replace view public.public_landing_stats
with (security_invoker = false, security_barrier = true)
as
select
  (select count(*) from public.captions where is_public)::int as caption_count,
  (select count(*) from public.caption_votes)::int as vote_count,
  (select count(distinct profile_id) from public.caption_votes)::int as rater_count,
  (select count(*) from public.user_public_profiles where is_public)::int as page_count;

grant select on public.public_landing_captions, public.public_landing_stats to anon, authenticated;

-- ------------------------------------------------ saved voting (rating) ----
-- Crowd totals per caption, readable by any signed-in user (counts only).
create or replace view public.caption_vote_counts
with (security_invoker = false, security_barrier = true)
as
select
  caption_id,
  (count(*) filter (where vote_value > 0))::int as up_votes,
  (count(*) filter (where vote_value < 0))::int as down_votes
from public.caption_votes
group by caption_id;

grant select on public.caption_vote_counts to authenticated;

-- Keep captions.like_count in sync when someone rates.
create or replace function public.sync_caption_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.captions
  set like_count = (
    select count(*) from public.caption_votes where caption_id = new.caption_id and vote_value > 0
  )
  where id = new.caption_id;
  return new;
end;
$$;

drop trigger if exists caption_votes_sync_like_count on public.caption_votes;
create trigger caption_votes_sync_like_count
  after insert on public.caption_votes
  for each row execute function public.sync_caption_like_count();
