import Link from "next/link";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { PantryBuilder } from "@/components/pantry-builder";
import { PantryRecipeCard } from "@/components/pantry-recipe-card";
import { QuerySelect } from "@/components/query-select";
import { RecipeCard } from "@/components/recipe-card";
import { SearchInput } from "@/components/search-input";
import { EmptyState, FilterChips, Pagination, SidebarCard, SkeletonRecipeCard, Tabs } from "@/components/ui";
import {
  allFilterOption,
  difficultyFilterOptions,
  normalizeCookingTimeFilter,
  normalizeDifficultyFilter,
  normalizeRecipeSort,
  sortOptions,
  timeFilterOptions,
} from "@/lib/content-options";
import { getCategories, getPantryRecipes, getRecipes, searchCategories, searchRecipes } from "@/lib/data";
import { getLocale, getServerTranslator } from "@/lib/i18n/server";
import { formatMinutes, translateCategoryName, translateDifficulty } from "@/lib/i18n/shared";
import { DEFAULT_PAGE_SIZE, paginate, readCursorParam } from "@/lib/pagination";
import { isPantryMode, parsePantryParams, type MaxMissing } from "@/lib/pantry/url";
import { firstSearchParam, pathWithSearchParams, type SearchParamRecord } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamRecord>;
}) {
  const params = await searchParams;
  const [locale, t] = await Promise.all([getLocale(), getServerTranslator()]);
  const pantryMode = isPantryMode(params);
  const pantryState = parsePantryParams(params);
  const query = pantryMode ? "" : firstSearchParam(params, "q");
  const activeCategorySlug = firstSearchParam(params, "category");
  const cookingTime = normalizeCookingTimeFilter(firstSearchParam(params, "time"));
  const difficulty = normalizeDifficultyFilter(firstSearchParam(params, "difficulty"));
  const sort = normalizeRecipeSort(firstSearchParam(params, "sort"));
  const [categories, allRecipes, matchedCategories] = await Promise.all([
    getCategories(),
    getRecipes(),
    !pantryMode && query ? searchCategories(query) : Promise.resolve([]),
  ]);
  const activeCategory = categories.find((category) => category.slug === activeCategorySlug);

  const filters = {
    categoryId: activeCategory?.id,
    cookingTime,
    difficulty,
    sort,
  };

  const pantryResults = pantryMode ? await getPantryRecipes(pantryState, filters) : [];
  const recipes = pantryMode
    ? pantryResults.map((entry) => entry.recipe)
    : await searchRecipes(query, filters);

  const page = paginate(recipes, readCursorParam(params), DEFAULT_PAGE_SIZE);
  const pantryMatchById = pantryMode
    ? new Map(pantryResults.map((entry) => [entry.recipe.id, entry.match]))
    : new Map();

  const categoryOptions = [
    allFilterOption,
    ...categories.map((category) => ({
      label: category.name,
      value: category.slug,
    })),
  ].map((option) => ({
    ...option,
    href: pathWithSearchParams("/search", params, { category: option.value, cursor: null }),
  }));
  const timeOptions = timeFilterOptions.map((option) => ({
    ...option,
    href: pathWithSearchParams("/search", params, { time: option.value, cursor: null }),
  }));
  const difficultyOptions = difficultyFilterOptions.map((option) => ({
    ...option,
    href: pathWithSearchParams("/search", params, { difficulty: option.value, cursor: null }),
  }));
  const modeOptions = [
    {
      label: "ტექსტით",
      value: "text",
      href: pathWithSearchParams("/search", params, {
        mode: null,
        pantry: null,
        freeText: null,
        basics: null,
        missing: null,
        cursor: null,
      }),
    },
    {
      label: "მაცივრიდან",
      value: "pantry",
      href: pathWithSearchParams("/search", params, { mode: "pantry", q: null, cursor: null }),
    },
  ];
  const popularSearches = Array.from(new Set(allRecipes.flatMap((recipe) => [recipe.categoryName, ...recipe.tags]))).slice(0, 6);

  const pantrySelected = pantryState.ids.length + pantryState.freeText.length;
  const summary = pantryMode
    ? pantrySelected === 0
      ? t("აირჩიე ინგრედიენტები, რომ შემოგთავაზოთ რეცეპტები.")
      : t("{count} რეცეპტი მზად არის სანახავად.", { count: recipes.length })
    : query
      ? t("{count} რეცეპტი მოიძებნა “{query}”-სთვის.", { count: recipes.length, query })
      : t("{count} რეცეპტი მზად არის სანახავად.", { count: recipes.length });

  const nextMissing: MaxMissing | null = pantryState.maxMissing < 3 ? ((pantryState.maxMissing + 1) as MaxMissing) : null;

  return (
      <main className="page-main">
        <Reveal as="section" className="mb-6 flex flex-col gap-5 xl:mb-8 xl:grid xl:gap-7 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="hero-panel min-h-[200px] md:min-h-[280px]">
            <p className="eyebrow">{t("ძიება")}</p>
            <h1 className="text-[clamp(34px,5vw,74px)] font-black leading-none tracking-normal">
              <HeroTitle text={t("ძიების შედეგები")} />
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted md:mt-4 md:text-base">
              {t("{summary} შეცვალე ტექსტი ან გამოიყენე ფილტრები.", { summary })}
            </p>
            <div className="mt-5 max-w-3xl md:mt-6">
              <Tabs items={modeOptions} active={pantryMode ? "pantry" : "text"} />
            </div>
            <div className="mt-4 max-w-3xl">
              {pantryMode ? (
                <PantryBuilder initialState={pantryState} />
              ) : (
                <SearchInput key={query} initialQuery={query} placeholder="რეცეპტი ან ინგრედიენტი" />
              )}
            </div>
            <span className="hero-watermark">Search</span>
          </div>
          <aside className="soft-card hidden rounded-[26px] p-5 xl:block">
            <strong className="block text-xl font-black leading-tight">
              {pantryMode ? t("რა გაქვს სახლში?") : t("სწრაფი არჩევა")}
            </strong>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {pantryMode
                ? t("მონიშნე ის პროდუქტები, რაც გაქვს — შევთავაზებთ რეცეპტებს, რომელთათვისაც 1-3 ინგრედიენტი თუ აკლია.")
                : t("გამოიყენე კატეგორია, დრო და დალაგება, რომ ყოველდღიური არჩევანი სწრაფად შეამცირო.")}
            </p>
          </aside>
        </Reveal>

        <section className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-7">
          <div className="min-w-0">
            <div className="soft-card mb-5 flex flex-col gap-4 overflow-hidden rounded-[24px] p-3 md:rounded-[26px] md:p-4">
              <div className="min-w-0">
                <span className="mb-2 block text-xs font-black text-muted">{t("კატეგორია")}</span>
                <FilterChips
                  items={categoryOptions}
                  active={activeCategory?.slug ?? "all"}
                />
              </div>
              <div className="min-w-0">
                <span className="mb-2 block text-xs font-black text-muted">{t("მომზადების დრო")}</span>
                <FilterChips
                  items={timeOptions}
                  active={cookingTime ?? "all"}
                />
              </div>
              <div className="min-w-0">
                <span className="mb-2 block text-xs font-black text-muted">{t("სირთულე")}</span>
                <FilterChips
                  items={difficultyOptions}
                  active={difficulty ?? "all"}
                />
              </div>
              <div className="w-full max-w-xs">
                <QuerySelect label="დალაგება" name="sort" value={sort} options={sortOptions} />
              </div>
            </div>

            {!pantryMode && query && matchedCategories.length > 0 && (
              <div className="mb-5">
                <span className="mb-2 block text-xs font-black text-muted">
                  {t("გამოჩენილი კატეგორიები")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {matchedCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={pathWithSearchParams("/search", params, {
                        category: category.slug,
                        cursor: null,
                      })}
                      className="rounded-full border border-oat bg-surface px-3 py-2 text-xs font-extrabold transition hover:bg-oat"
                    >
                      {translateCategoryName(locale, category.name)}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {pantryMode && pantrySelected === 0 ? (
              <EmptyState
                mark="+"
                title="მაცივარი ცარიელია"
                description="აირჩიე ინგრედიენტები, რომ შემოგთავაზოთ რეცეპტები."
              />
            ) : page.items.length > 0 ? (
              <>
                <Stagger as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
                  {page.items.map((recipe) => {
                    if (pantryMode) {
                      const match = pantryMatchById.get(recipe.id);
                      if (match) {
                        return <PantryRecipeCard key={recipe.id} recipe={recipe} match={match} />;
                      }
                    }
                    return <RecipeCard key={recipe.id} recipe={recipe} />;
                  })}
                </Stagger>
                <Pagination
                  basePath="/search"
                  searchParams={params}
                  prevCursor={page.prevCursor}
                  nextCursor={page.nextCursor}
                  isFirstPage={page.isFirstPage}
                  startIndex={page.startIndex}
                  pageSize={page.pageSize}
                  totalCount={page.totalCount}
                />
              </>
            ) : pantryMode ? (
              <EmptyState
                mark="?"
                title="შედეგი ვერ მოიძებნა"
                description="ვერ მოვძებნეთ შესაბამისი რეცეპტი — სცადე უფრო მეტი დაშვებით."
                action={
                  nextMissing ? (
                    <Link
                      href={pathWithSearchParams("/search", params, {
                        missing: String(nextMissing),
                        cursor: null,
                      })}
                      className="inline-grid min-h-11 place-items-center rounded-full bg-clay px-5 text-xs font-black text-paper no-underline hover:bg-clay-dark"
                    >
                      {t("გაზარდე დასაშვები აკლდენი")}
                    </Link>
                  ) : null
                }
              />
            ) : (
              <EmptyState mark="?" title="შედეგი ვერ მოიძებნა" description="სცადე სხვა ინგრედიენტი, ნაკლები ფილტრი ან უფრო ზოგადი სიტყვა." />
            )}

            <div className="mt-6 hidden grid-cols-3 gap-4">
              <SkeletonRecipeCard />
              <SkeletonRecipeCard />
              <SkeletonRecipeCard />
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-28">
            <SidebarCard title="პოპულარული ძიებები">
              {popularSearches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((item) => (
                    <span key={item} className="rounded-full border border-oat bg-surface px-3 py-2 text-xs font-extrabold">
                      {translateCategoryName(locale, item)}
                    </span>
                  ))}
                </div>
              ) : (
                <p>{t("ძიების ჩიპები რეცეპტებიდან და კატეგორიებიდან შეივსება.")}</p>
              )}
            </SidebarCard>
            <SidebarCard title="სწრაფი იდეები">
              {allRecipes.length > 0 ? (
                <div className="grid gap-3">
                  {allRecipes.slice(0, 3).map((recipe) => (
                    <p key={recipe.id}>
                      <strong className="text-ink">{recipe.title}</strong>
                      <br />
                      {formatMinutes(locale, recipe.cookingTime)} • {translateDifficulty(locale, recipe.difficulty)}
                    </p>
                  ))}
                </div>
              ) : (
                <p>{t("სწრაფი იდეები აქ გამოჩნდება, როცა რეცეპტები დაემატება.")}</p>
              )}
            </SidebarCard>
          </aside>
        </section>
      </main>
  );
}
