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
