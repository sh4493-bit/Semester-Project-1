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

alter table public.user_public_profiles enable row level security;

drop policy if exists "Public profiles are visible when published"
  on public.user_public_profiles;
drop policy if exists "Users can create their own public profile"
  on public.user_public_profiles;
drop policy if exists "Users can update their own public profile"
  on public.user_public_profiles;
drop policy if exists "Users can delete their own public profile"
  on public.user_public_profiles;

create policy "Public profiles are visible when published"
  on public.user_public_profiles for select
  to anon, authenticated
  using (is_public or profile_id = (select auth.uid()));

create policy "Users can create their own public profile"
  on public.user_public_profiles for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "Users can update their own public profile"
  on public.user_public_profiles for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "Users can delete their own public profile"
  on public.user_public_profiles for delete
  to authenticated
  using (profile_id = (select auth.uid()));

grant select on public.user_public_profiles to anon, authenticated;
grant insert, update, delete on public.user_public_profiles to authenticated;

create or replace view public.user_public_profile_showcase
with (security_invoker = false, security_barrier = true)
as
select
  profile.username,
  profile.display_name,
  profile.bio,
  profile.avatar_emoji,
  profile.theme,
  showcase.caption_id,
  showcase.caption_content,
  showcase.image_url
from public.user_public_profiles as profile
left join (
  select
    caption.id as caption_id,
    caption.content as caption_content,
    image.url as image_url
  from public.captions as caption
  left join public.images as image
    on image.id = caption.image_id
    and image.is_public = true
  where caption.is_public = true
) as showcase
  on showcase.caption_id::text = any(profile.featured_caption_ids)
where profile.is_public = true;

grant select on public.user_public_profile_showcase to anon, authenticated;

-- Aggregate-only "humor style" summary for published pages. Exposes counts and
-- the top humor flavor slug, never individual votes or private captions.
create or replace view public.user_public_profile_humor_style
with (security_invoker = false, security_barrier = true)
as
select
  profile.username,
  (
    select count(*) from public.captions as caption
    where caption.user_id = profile.profile_id and caption.is_public = true
  )::int as public_caption_count,
  (
    select count(*) from public.caption_votes as vote
    where vote.profile_id = profile.profile_id
  )::int as votes_cast_count,
  (
    select count(*) from public.caption_votes as vote
    where vote.profile_id = profile.profile_id and vote.vote_value > 0
  )::int as upvotes_cast_count,
  (
    select caption.voice
    from public.captions as caption
    where caption.user_id = profile.profile_id
      and caption.is_public = true
      and caption.voice is not null
    group by caption.voice
    order by count(*) desc, caption.voice
    limit 1
  ) as top_flavor
from public.user_public_profiles as profile
where profile.is_public = true;

grant select on public.user_public_profile_humor_style to anon, authenticated;
