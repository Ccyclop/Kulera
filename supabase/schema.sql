create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique,
  avatar_url text,
  bio text,
  notification_prefs jsonb not null default '{"comments": true, "ratings": true}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists notification_prefs jsonb not null default '{"comments": true, "ratings": true}'::jsonb;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null,
  image_url text,
  video_url text,
  cooking_time integer not null check (cooking_time > 0),
  difficulty text not null check (difficulty in ('მარტივი', 'საშუალო', 'რთული')),
  servings text not null,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  search_vector tsvector,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes
add column if not exists search_vector tsvector;

create or replace function public.recipe_ingredients_search_text(ingredients jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    string_agg(
      case
        when jsonb_typeof(item.value) = 'string' then item.value #>> '{}'
        when jsonb_typeof(item.value) = 'object' then concat_ws(
          ' ',
          item.value ->> 'name',
          item.value ->> 'title',
          item.value ->> 'ingredient',
          item.value ->> 'amount',
          item.value ->> 'quantity',
          item.value ->> 'measure'
        )
        else item.value::text
      end,
      ' '
    ),
    ''
  )
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(ingredients, '[]'::jsonb)) = 'array' then coalesce(ingredients, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) as item(value);
$$;

create or replace function public.set_recipe_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector =
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('simple', public.recipe_ingredients_search_text(new.ingredients)), 'C');

  return new;
end;
$$;

drop trigger if exists recipes_set_search_vector on public.recipes;
create trigger recipes_set_search_vector
before insert or update of title, description, ingredients
on public.recipes
for each row execute function public.set_recipe_search_vector();

update public.recipes
set search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', public.recipe_ingredients_search_text(ingredients)), 'C')
where search_vector is null;

create index if not exists recipes_search_vector_idx
on public.recipes using gin (search_vector);

comment on column public.recipes.search_vector is
  'Full-text index generated from title, description, and ingredients using PostgreSQL simple config. Georgian stemming is limited.';

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value integer not null check (value between 1 and 5),
  created_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create or replace view public.recipe_stats
with (security_invoker = true) as
select
  r.id as recipe_id,
  coalesce(avg(rt.value), 0)::numeric(3, 2) as average_rating,
  count(distinct rt.id)::integer as ratings_count,
  count(distinct c.id)::integer as comments_count,
  count(distinct s.id)::integer as save_count,
  (coalesce(avg(rt.value), 0) * ln(count(distinct rt.id) + 1))::numeric(10, 4) as recipe_score
from public.recipes r
left join public.ratings rt on rt.recipe_id = r.id
left join public.comments c on c.recipe_id = r.id
left join public.saved_recipes s on s.recipe_id = r.id
group by r.id;

create or replace view public.cook_stats
with (security_invoker = true) as
select
  p.id as user_id,
  coalesce(avg(rs.average_rating), 0)::numeric(3, 2) as average_recipe_rating,
  count(distinct r.id)::integer as total_published_recipes,
  coalesce(sum(rs.ratings_count), 0)::integer as total_ratings,
  (
    coalesce(avg(rs.average_rating), 0)
    * ln(coalesce(sum(rs.ratings_count), 0) + 1)
    * (1 + least(count(distinct r.id), 20)::numeric / 20)
  )::numeric(10, 4) as cook_score
from public.profiles p
left join public.recipes r on r.user_id = p.id and r.status = 'published'
left join public.recipe_stats rs on rs.recipe_id = r.id
group by p.id;

alter view public.recipe_stats set (security_invoker = true);
alter view public.cook_stats set (security_invoker = true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Kulera user'),
    coalesce(new.raw_user_meta_data ->> 'username', 'user-' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.recipes enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.saved_recipes enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Users manage own profile" on public.profiles;
drop policy if exists "Categories are readable" on public.categories;
drop policy if exists "Published recipes are readable" on public.recipes;
drop policy if exists "Users can read own recipes" on public.recipes;
drop policy if exists "Users create own recipes" on public.recipes;
drop policy if exists "Users update own recipes" on public.recipes;
drop policy if exists "Users delete own recipes" on public.recipes;
drop policy if exists "Ratings are readable" on public.ratings;
drop policy if exists "Users manage own ratings" on public.ratings;
drop policy if exists "Comments are readable" on public.comments;
drop policy if exists "Users manage own comments" on public.comments;
drop policy if exists "Users manage own saved recipes" on public.saved_recipes;

create policy "Profiles are readable" on public.profiles
for select to anon, authenticated
using (true);

create policy "Users can create own profile" on public.profiles
for insert to authenticated
with check ((select auth.uid()) = id);

create policy "Users manage own profile" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Categories are readable" on public.categories
for select to anon, authenticated
using (true);

create policy "Published recipes are readable" on public.recipes
for select to anon, authenticated
using (status = 'published');

create policy "Users can read own recipes" on public.recipes
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create own recipes" on public.recipes
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update own recipes" on public.recipes
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete own recipes" on public.recipes
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Ratings are readable" on public.ratings
for select to anon, authenticated
using (true);

create policy "Users manage own ratings" on public.ratings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Comments are readable" on public.comments
for select to anon, authenticated
using (true);

create policy "Users manage own comments" on public.comments
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own saved recipes" on public.saved_recipes
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- ============================================================================
-- Collections (link-only sharing + meal-plans) — see migrations/202606130001_collections.sql
-- ============================================================================

alter table public.recipes
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'unlisted'));

create index if not exists recipes_visibility_idx on public.recipes (visibility);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  visibility text not null default 'private'
    check (visibility in ('public', 'unlisted', 'private')),
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collections_user_id_idx on public.collections (user_id);
create index if not exists collections_share_token_idx on public.collections (share_token);
create index if not exists collections_visibility_idx on public.collections (visibility);

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

create table if not exists public.collection_recipes (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  section text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, recipe_id)
);

create index if not exists collection_recipes_collection_idx
  on public.collection_recipes (collection_id, position);
create index if not exists collection_recipes_recipe_idx
  on public.collection_recipes (recipe_id);

create or replace function public.get_shared_collection(p_token text)
returns setof public.collections
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.collections where share_token = p_token limit 1;
$$;

create or replace function public.get_shared_collection_recipes(p_token text)
returns table (
  cr_id uuid,
  recipe_id uuid,
  section text,
  "position" integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select cr.id, cr.recipe_id, cr.section, cr.position
  from public.collections c
  join public.collection_recipes cr on cr.collection_id = c.id
  join public.recipes r on r.id = cr.recipe_id
  where c.share_token = p_token
    and r.status = 'published'
  order by cr.position asc, cr.created_at asc;
$$;

grant execute on function public.get_shared_collection(text) to anon, authenticated;
grant execute on function public.get_shared_collection_recipes(text) to anon, authenticated;

alter table public.collections enable row level security;
alter table public.collection_recipes enable row level security;

drop policy if exists "Public collections are readable" on public.collections;
drop policy if exists "Users read own collections" on public.collections;
drop policy if exists "Users create own collections" on public.collections;
drop policy if exists "Users update own collections" on public.collections;
drop policy if exists "Users delete own collections" on public.collections;
drop policy if exists "Public or owned collection recipes are readable" on public.collection_recipes;
drop policy if exists "Users manage own collection recipes" on public.collection_recipes;

create policy "Public collections are readable" on public.collections
for select to anon, authenticated
using (visibility = 'public');

create policy "Users read own collections" on public.collections
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create own collections" on public.collections
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update own collections" on public.collections
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete own collections" on public.collections
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Public or owned collection recipes are readable" on public.collection_recipes
for select to anon, authenticated
using (
  exists (
    select 1 from public.collections c
    where c.id = collection_id
      and (c.visibility = 'public' or c.user_id = (select auth.uid()))
  )
);

create policy "Users manage own collection recipes" on public.collection_recipes
for all to authenticated
using (
  exists (
    select 1 from public.collections c
    where c.id = collection_id and c.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.collections c
    where c.id = collection_id and c.user_id = (select auth.uid())
  )
);

create or replace function public.enforce_public_collection_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collection_visibility text;
  v_recipe_visibility text;
begin
  select visibility into v_collection_visibility from public.collections where id = new.collection_id;
  select visibility into v_recipe_visibility from public.recipes where id = new.recipe_id;

  if v_collection_visibility = 'public' and coalesce(v_recipe_visibility, 'public') <> 'public' then
    raise exception 'PUBLIC_COLLECTION_REQUIRES_PUBLIC_RECIPE';
  end if;

  return new;
end;
$$;

drop trigger if exists collection_recipes_enforce_public on public.collection_recipes;
create trigger collection_recipes_enforce_public
before insert or update on public.collection_recipes
for each row execute function public.enforce_public_collection_membership();

create or replace function public.enforce_collection_visibility_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility = 'public' and old.visibility <> 'public'
     and exists (
       select 1 from public.collection_recipes cr
       join public.recipes r on r.id = cr.recipe_id
       where cr.collection_id = new.id and r.visibility <> 'public'
     ) then
    raise exception 'COLLECTION_HAS_UNLISTED_RECIPES';
  end if;
  return new;
end;
$$;

drop trigger if exists collections_enforce_visibility on public.collections;
create trigger collections_enforce_visibility
before update on public.collections
for each row execute function public.enforce_collection_visibility_change();

create or replace function public.detach_unlisted_recipe_from_public_collections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility = 'unlisted' and old.visibility = 'public' then
    delete from public.collection_recipes cr
    using public.collections c
    where cr.recipe_id = new.id
      and cr.collection_id = c.id
      and c.visibility = 'public';
  end if;
  return new;
end;
$$;

drop trigger if exists recipes_detach_unlisted on public.recipes;
create trigger recipes_detach_unlisted
before update of visibility on public.recipes
for each row execute function public.detach_unlisted_recipe_from_public_collections();
