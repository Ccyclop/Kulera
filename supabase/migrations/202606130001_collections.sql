-- Collections feature: link-only sharing + meal-plans.
-- Adds recipe visibility, collections + collection_recipes, token-gated read
-- functions, RLS, and the "public collection -> only public recipes" invariant.
-- Idempotent: safe to re-run.

-- 1. Recipe visibility (discoverability axis, orthogonal to the status lifecycle).
--    A recipe shows in public listings iff status='published' AND visibility='public';
--    link/collection access needs only status='published'.
alter table public.recipes
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'unlisted'));

create index if not exists recipes_visibility_idx on public.recipes (visibility);

-- 2. collections
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  visibility text not null default 'private'
    check (visibility in ('public', 'unlisted', 'private')),
  -- 128-bit unguessable hex token (no pgcrypto dependency); UNIQUE backstops collisions.
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collections_user_id_idx on public.collections (user_id);
create index if not exists collections_share_token_idx on public.collections (share_token);
create index if not exists collections_visibility_idx on public.collections (visibility);

-- Ensure the shared updated_at helper exists (older DBs may predate it).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

-- 3. collection_recipes (membership + ordering + optional section label)
--    section NULL  -> flat ordered list
--    section set   -> meal-plan group label ("დღე 1", "ორშაბათი"); a single
--    `position` drives both flat order and section grouping.
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

-- 4. Link-only read: SECURITY DEFINER functions gated by the secret token.
--    These are the ONLY path that returns unlisted/private collections (and any
--    unlisted recipes inside them) to non-owners — and only for a valid token.
create or replace function public.get_shared_collection(p_token text)
returns setof public.collections
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.collections where share_token = p_token limit 1;
$$;

-- Returns ONLY the membership/ordering rows (which are RLS-protected for
-- unlisted/private collections). Full recipe data is then fetched by id through
-- normal RLS (published recipes are readable), so cards keep category/creator/stats.
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
    and r.status = 'published'   -- never expose drafts/archived, even via the link
  order by cr.position asc, cr.created_at asc;
$$;

grant execute on function public.get_shared_collection(text) to anon, authenticated;
grant execute on function public.get_shared_collection_recipes(text) to anon, authenticated;

-- 5. RLS
alter table public.collections enable row level security;
alter table public.collection_recipes enable row level security;

drop policy if exists "Public collections are readable" on public.collections;
drop policy if exists "Users read own collections" on public.collections;
drop policy if exists "Users create own collections" on public.collections;
drop policy if exists "Users update own collections" on public.collections;
drop policy if exists "Users delete own collections" on public.collections;
drop policy if exists "Public or owned collection recipes are readable" on public.collection_recipes;
drop policy if exists "Users manage own collection recipes" on public.collection_recipes;

-- Unlisted/private collections are deliberately NOT selectable via normal RLS;
-- unlisted reach is only through get_shared_collection(token), private only by owner.
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

-- 6. "public collection -> only public recipes" invariant (DB-enforced, three paths).
-- 6a. Block adding a non-public recipe to a public collection.
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

-- 6b. Block flipping a collection to public while it still holds non-public recipes.
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

-- 6c. When a recipe goes public -> unlisted, auto-remove it from PUBLIC collections
--     (never block the owner from making their own recipe unlisted; it stays in
--     unlisted/private collections).
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
