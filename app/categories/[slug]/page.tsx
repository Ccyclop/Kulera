import { notFound } from "next/navigation";
import { CategoryCard } from "@/components/category-card";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { QuerySelect } from "@/components/query-select";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState, FilterChips, Pagination, SidebarCard, SkeletonRecipeCard } from "@/components/ui";
import {
  difficultyFilterOptions,
  normalizeCookingTimeFilter,
  normalizeDifficultyFilter,
  normalizeRecipeSort,
  sortOptions,
  timeFilterOptions,
} from "@/lib/content-options";
import { getCategories, getCategoryBySlug, getRecipesByCategoryId } from "@/lib/data";
import { getLocale, getServerTranslator } from "@/lib/i18n/server";
import { formatRecipeCount, localizeCategory, translateDifficulty } from "@/lib/i18n/shared";
import { DEFAULT_PAGE_SIZE, paginate, readCursorParam } from "@/lib/pagination";
import { firstSearchParam, pathWithSearchParams, type SearchParamRecord } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParamRecord>;
}) {
  const { slug } = await params;
  const queryParams = await searchParams;
  const [locale, t] = await Promise.all([getLocale(), getServerTranslator()]);
  const cookingTime = normalizeCookingTimeFilter(firstSearchParam(queryParams, "time"));
  const difficulty = normalizeDifficultyFilter(firstSearchParam(queryParams, "difficulty"));
  const sort = normalizeRecipeSort(firstSearchParam(queryParams, "sort"));
  const [category, categories] = await Promise.all([getCategoryBySlug(slug), getCategories()]);

  if (!category) {
    notFound();
  }
  const localizedCategory = localizeCategory(locale, category);

  const categoryRecipes = await getRecipesByCategoryId(category.id, {
    cookingTime,
    difficulty,
    sort,
  });
  const page = paginate(categoryRecipes, readCursorParam(queryParams), DEFAULT_PAGE_SIZE);
  const pathname = `/categories/${slug}`;
  const timeOptions = timeFilterOptions.map((option) => ({
    ...option,
    href: pathWithSearchParams(pathname, queryParams, { time: option.value, cursor: null }),
  }));
  const difficultyOptions = difficultyFilterOptions.map((option) => ({
    ...option,
    href: pathWithSearchParams(pathname, queryParams, { difficulty: option.value, cursor: null }),
  }));

  return (
      <main className="page-main">
        <Reveal as="section" className="mb-6 flex flex-col gap-5 xl:mb-8 xl:grid xl:gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="hero-panel min-h-[220px] md:min-h-[300px]">
            <p className="eyebrow">{t("კატეგორია")}</p>
            <h1 className="text-[clamp(34px,5vw,74px)] font-black leading-none tracking-normal">
              <HeroTitle text={t("{category} რეცეპტები", { category: localizedCategory.name })} />
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted md:mt-4 md:text-base">{localizedCategory.description}</p>
            <div className="mt-4 text-sm font-black text-clay md:mt-6">{formatRecipeCount(locale, categoryRecipes.length || category.recipeCount)}</div>
            <span className="hero-watermark">{localizedCategory.name}</span>
          </div>
          <aside className="soft-card hidden content-between rounded-[26px] p-5 xl:grid">
            <div>
              <strong className="block text-xl font-black leading-tight">{t("ამ კატეგორიაში")}</strong>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t("დაალაგე პოპულარობით, რეიტინგით ან მომზადების დროით.")}
              </p>
            </div>
          </aside>
        </Reveal>

        <section className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-7">
          <div className="min-w-0">
            <div className="soft-card mb-5 flex flex-col gap-4 overflow-hidden rounded-[24px] p-3 md:rounded-[26px] md:p-4">
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

            {page.items.length > 0 ? (
              <>
                <Stagger as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
                  {page.items.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </Stagger>
                <Pagination
                  basePath={pathname}
                  searchParams={queryParams}
                  prevCursor={page.prevCursor}
                  nextCursor={page.nextCursor}
                  isFirstPage={page.isFirstPage}
                  startIndex={page.startIndex}
                  pageSize={page.pageSize}
                  totalCount={page.totalCount}
                />
              </>
            ) : (
              <EmptyState mark="0" title="ამ კატეგორიაში რეცეპტი ჯერ არ არის" description="როცა ახალი რეცეპტი დაემატება, ის აქ გამოჩნდება." />
            )}

            <div className="mt-6 hidden grid-cols-3 gap-4">
              <SkeletonRecipeCard />
              <SkeletonRecipeCard />
              <SkeletonRecipeCard />
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-28">
            <SidebarCard title="სხვა კატეგორიები">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                {categories
                  .filter((item) => item.id !== category.id)
                  .slice(0, 4)
                  .map((item) => (
                    <CategoryCard key={item.id} category={item} />
                  ))}
              </div>
            </SidebarCard>
            <SidebarCard title="სწრაფი იდეები">
              {categoryRecipes.length > 0 ? (
                <div className="grid gap-3">
                  {categoryRecipes.slice(0, 3).map((recipe) => (
                    <p key={recipe.id}>
                      <strong className="text-ink">{recipe.title}</strong>
                      <br />
                      {recipe.cookingTime} {t("წთ")} • {translateDifficulty(locale, recipe.difficulty)}
                    </p>
                  ))}
                </div>
              ) : (
                <p>{t("ამ კატეგორიის იდეები აქ გამოჩნდება, როცა რეცეპტები დაემატება.")}</p>
              )}
            </SidebarCard>
          </aside>
        </section>
      </main>
  );
}
