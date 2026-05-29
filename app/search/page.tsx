import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { QuerySelect } from "@/components/query-select";
import { RecipeCard } from "@/components/recipe-card";
import { SearchInput } from "@/components/search-input";
import { EmptyState, FilterChips, Pagination, SidebarCard, SkeletonRecipeCard } from "@/components/ui";
import {
  allFilterOption,
  difficultyFilterOptions,
  normalizeCookingTimeFilter,
  normalizeDifficultyFilter,
  normalizeRecipeSort,
  sortOptions,
  timeFilterOptions,
} from "@/lib/content-options";
import { getCategories, getRecipes, searchRecipes } from "@/lib/data";
import { DEFAULT_PAGE_SIZE, paginate, readCursorParam } from "@/lib/pagination";
import { firstSearchParam, pathWithSearchParams, type SearchParamRecord } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamRecord>;
}) {
  const params = await searchParams;
  const query = firstSearchParam(params, "q");
  const activeCategorySlug = firstSearchParam(params, "category");
  const cookingTime = normalizeCookingTimeFilter(firstSearchParam(params, "time"));
  const difficulty = normalizeDifficultyFilter(firstSearchParam(params, "difficulty"));
  const sort = normalizeRecipeSort(firstSearchParam(params, "sort"));
  const [categories, allRecipes] = await Promise.all([getCategories(), getRecipes()]);
  const activeCategory = categories.find((category) => category.slug === activeCategorySlug);
  const recipes = await searchRecipes(query, {
    categoryId: activeCategory?.id,
    cookingTime,
    difficulty,
    sort,
  });
  const page = paginate(recipes, readCursorParam(params), DEFAULT_PAGE_SIZE);
  const categoryOptions = [
    allFilterOption,
    ...categories.map((category) => ({
      label: category.name,
      value: category.slug,
    })),
  ];
  const popularSearches = Array.from(new Set(allRecipes.flatMap((recipe) => [recipe.categoryName, ...recipe.tags]))).slice(0, 6);
  const summary = query
    ? `${recipes.length} რეცეპტი მოიძებნა “${query}”-სთვის.`
    : `${recipes.length} რეცეპტი მზად არის სანახავად.`;

  return (
    <PageShell>
      <main className="page-main">
        <Reveal as="section" className="mb-6 flex flex-col gap-5 xl:mb-8 xl:grid xl:gap-7 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="hero-panel min-h-[200px] md:min-h-[280px]">
            <p className="eyebrow">ძიება</p>
            <h1 className="text-[clamp(34px,5vw,74px)] font-black leading-none tracking-normal">
              <HeroTitle text="ძიების შედეგები" />
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted md:mt-4 md:text-base">
              {summary} შეცვალე ტექსტი ან გამოიყენე ფილტრები.
            </p>
            <div className="mt-5 max-w-3xl md:mt-6">
              <SearchInput key={query} initialQuery={query} placeholder="რეცეპტი ან ინგრედიენტი" />
            </div>
            <span className="hero-watermark">Search</span>
          </div>
          <aside className="soft-card hidden rounded-[26px] p-5 xl:block">
            <strong className="block text-xl font-black leading-tight">სწრაფი არჩევა</strong>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              გამოიყენე კატეგორია, დრო და დალაგება, რომ ყოველდღიური არჩევანი სწრაფად შეამცირო.
            </p>
          </aside>
        </Reveal>

        <section className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-7">
          <div className="min-w-0">
            <div className="soft-card mb-5 flex flex-col gap-4 overflow-hidden rounded-[24px] p-3 md:rounded-[26px] md:p-4">
              <div className="min-w-0">
                <span className="mb-2 block text-xs font-black text-muted">კატეგორია</span>
                <FilterChips
                  items={categoryOptions}
                  active={activeCategory?.slug ?? "all"}
                  getHref={(value) => pathWithSearchParams("/search", params, { category: value, cursor: null })}
                />
              </div>
              <div className="min-w-0">
                <span className="mb-2 block text-xs font-black text-muted">მომზადების დრო</span>
                <FilterChips
                  items={timeFilterOptions}
                  active={cookingTime ?? "all"}
                  getHref={(value) => pathWithSearchParams("/search", params, { time: value, cursor: null })}
                />
              </div>
              <div className="min-w-0">
                <span className="mb-2 block text-xs font-black text-muted">სირთულე</span>
                <FilterChips
                  items={difficultyFilterOptions}
                  active={difficulty ?? "all"}
                  getHref={(value) => pathWithSearchParams("/search", params, { difficulty: value, cursor: null })}
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
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p>ძიების ჩიპები რეცეპტებიდან და კატეგორიებიდან შეივსება.</p>
              )}
            </SidebarCard>
            <SidebarCard title="სწრაფი იდეები">
              {allRecipes.length > 0 ? (
                <div className="grid gap-3">
                  {allRecipes.slice(0, 3).map((recipe) => (
                    <p key={recipe.id}>
                      <strong className="text-ink">{recipe.title}</strong>
                      <br />
                      {recipe.cookingTime} წთ • {recipe.difficulty}
                    </p>
                  ))}
                </div>
              ) : (
                <p>სწრაფი იდეები აქ გამოჩნდება, როცა რეცეპტები დაემატება.</p>
              )}
            </SidebarCard>
            <SidebarCard title="მაცივრიდან იდეამდე" eyebrow="მალე">
              მალე შეძლებ ინგრედიენტების მიხედვით უფრო ზუსტი იდეების მიღებას.
            </SidebarCard>
          </aside>
        </section>
      </main>
    </PageShell>
  );
}
