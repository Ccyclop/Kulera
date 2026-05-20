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
