import { notFound } from "next/navigation";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { QuerySelect } from "@/components/query-select";
import { RecipeCard } from "@/components/recipe-card";
import { Badge, EmptyState, FilterChips, Pagination, RatingStars, Tabs } from "@/components/ui";
import {
  difficultyFilterOptions,
  normalizeCookingTimeFilter,
  normalizeDifficultyFilter,
  normalizeRecipeSort,
  sortOptions,
  timeFilterOptions,
} from "@/lib/content-options";
import { getCookByUsername, getRecipesByCook } from "@/lib/data";
import { DEFAULT_PAGE_SIZE, paginate, readCursorParam } from "@/lib/pagination";
import { firstSearchParam, pathWithSearchParams, type SearchParamRecord } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function CookProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParamRecord>;
}) {
  const { username } = await params;
  const queryParams = await searchParams;
  const cookingTime = normalizeCookingTimeFilter(firstSearchParam(queryParams, "time"));
  const difficulty = normalizeDifficultyFilter(firstSearchParam(queryParams, "difficulty"));
  const sortParam = firstSearchParam(queryParams, "sort");
  const sort = normalizeRecipeSort(sortParam);
  const cook = await getCookByUsername(username);

  if (!cook) {
    notFound();
  }

  const cookRecipes = await getRecipesByCook(cook.username, {
    cookingTime,
    difficulty,
    sort,
  });
  const page = paginate(cookRecipes, readCursorParam(queryParams), DEFAULT_PAGE_SIZE);
  const pathname = `/cooks/${username}`;
  const activeTab = sortParam === "top-rated" ? "top-rated" : sortParam === "newest" ? "latest" : "recipes";
  const tabs = [
    { label: "რეცეპტები", value: "recipes", href: pathWithSearchParams(pathname, queryParams, { sort: null, cursor: null }) },
    { label: "მაღალი შეფასება", value: "top-rated", href: pathWithSearchParams(pathname, queryParams, { sort: "top-rated", cursor: null }) },
    { label: "ახალი", value: "latest", href: pathWithSearchParams(pathname, queryParams, { sort: "newest", cursor: null }) },
  ];

  return (
    <PageShell>
      <main className="page-main">
        <Reveal as="section" className="hero-panel min-h-[300px]">
          <div className="grid gap-6 lg:grid-cols-[96px_1fr_auto] lg:items-center">
            <div className="grid h-24 w-24 place-items-center rounded-[30px] bg-sage-light text-3xl font-black text-sage">
              {cook.avatarInitial}
            </div>
            <div>
              <p className="eyebrow">კულინარი</p>
              <h1 className="text-[clamp(42px,5vw,74px)] font-black leading-none tracking-normal">
                <HeroTitle text={cook.fullName} />
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted">{cook.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {cook.badges.map((badge) => (
                  <Badge key={badge}>{badge}</Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-3 rounded-[24px] border border-oat bg-[#FAF6F0] p-4 text-sm font-black text-muted">
              <span className="inline-flex items-center gap-2">
                <RatingStars value={cook.averageRating} /> {cook.averageRating.toFixed(1)}
              </span>
              <span>{cook.totalRecipes} დამატებული რეცეპტი</span>
              <span>{cook.totalRatings} მიღებული შეფასება</span>
            </div>
          </div>
          <span className="hero-watermark">კულინარი</span>
        </Reveal>

        <section className="mt-8">
          <Tabs items={tabs} active={activeTab} />
          <div className="soft-card mt-5 grid gap-4 rounded-[26px] p-4">
            <div>
              <span className="mb-2 block text-xs font-black text-muted">მომზადების დრო</span>
              <FilterChips
                items={timeFilterOptions}
                active={cookingTime ?? "all"}
                getHref={(value) => pathWithSearchParams(pathname, queryParams, { time: value, cursor: null })}
              />
            </div>
            <div>
              <span className="mb-2 block text-xs font-black text-muted">სირთულე</span>
              <FilterChips
                items={difficultyFilterOptions}
                active={difficulty ?? "all"}
                getHref={(value) => pathWithSearchParams(pathname, queryParams, { difficulty: value, cursor: null })}
              />
            </div>
            <div className="max-w-xs">
              <QuerySelect label="დალაგება" name="sort" value={sort} options={sortOptions} />
            </div>
          </div>
          <div className="mt-6">
            {page.items.length > 0 ? (
              <>
                <Stagger as="div" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
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
              <EmptyState mark="0" title="რეცეპტები ჯერ არ არის" description="ამ კულინარის რეცეპტები აქ გამოჩნდება, როცა პირველი კერძი დაემატება." />
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
