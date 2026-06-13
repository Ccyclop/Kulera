import Image from "next/image";
import { notFound } from "next/navigation";
import { CollectionCard } from "@/components/collection-card";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
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
import { getCookByUsername, getPublicCollectionsByCook, getRecipesByCook } from "@/lib/data";
import { getLocale, getServerTranslator } from "@/lib/i18n/server";
import { translateCookBadge } from "@/lib/i18n/shared";
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
  const [locale, t] = await Promise.all([getLocale(), getServerTranslator()]);
  const cookingTime = normalizeCookingTimeFilter(firstSearchParam(queryParams, "time"));
  const difficulty = normalizeDifficultyFilter(firstSearchParam(queryParams, "difficulty"));
  const sortParam = firstSearchParam(queryParams, "sort");
  const sort = normalizeRecipeSort(sortParam);
  const cook = await getCookByUsername(username);

  if (!cook) {
    notFound();
  }

  const [cookRecipes, cookCollections] = await Promise.all([
    getRecipesByCook(cook.username, {
      cookingTime,
      difficulty,
      sort,
    }),
    getPublicCollectionsByCook(cook.username),
  ]);
  const page = paginate(cookRecipes, readCursorParam(queryParams), DEFAULT_PAGE_SIZE);
  const pathname = `/cooks/${username}`;
  const activeTab = sortParam === "top-rated" ? "top-rated" : sortParam === "newest" ? "latest" : "recipes";
  const tabs = [
    { label: "რეცეპტები", value: "recipes", href: pathWithSearchParams(pathname, queryParams, { sort: null, cursor: null }) },
    { label: "მაღალი შეფასება", value: "top-rated", href: pathWithSearchParams(pathname, queryParams, { sort: "top-rated", cursor: null }) },
    { label: "ახალი", value: "latest", href: pathWithSearchParams(pathname, queryParams, { sort: "newest", cursor: null }) },
  ];
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
        <Reveal as="section" className="hero-panel min-h-[260px] md:min-h-[300px]">
          <div className="grid gap-5 md:gap-6 lg:grid-cols-[96px_1fr_auto] lg:items-center">
            <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-[24px] bg-sage-light text-2xl font-black text-sage md:h-24 md:w-24 md:rounded-[30px] md:text-3xl">
              {cook.avatarUrl ? (
                <Image src={cook.avatarUrl} alt={cook.fullName} fill sizes="96px" className="object-cover" />
              ) : (
                cook.avatarInitial
              )}
            </div>
            <div className="min-w-0">
              <p className="eyebrow">{t("კულინარი")}</p>
              <h1 className="text-[clamp(32px,5vw,74px)] font-black leading-none tracking-normal">
                <HeroTitle text={cook.fullName} />
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted md:mt-4 md:text-base">{cook.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {cook.badges.map((badge) => (
                  <Badge key={badge}>{translateCookBadge(locale, badge)}</Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-2 rounded-[20px] border border-oat bg-[#FAF6F0] p-3 text-xs font-black text-muted md:gap-3 md:rounded-[24px] md:p-4 md:text-sm">
              <span className="inline-flex items-center gap-2">
                <RatingStars value={cook.averageRating} /> {cook.averageRating.toFixed(1)}
              </span>
              <span>{t("{count} დამატებული რეცეპტი", { count: cook.totalRecipes })}</span>
              <span>{t("{count} მიღებული შეფასება", { count: cook.totalRatings })}</span>
            </div>
          </div>
          <span className="hero-watermark">{t("კულინარი")}</span>
        </Reveal>

        {cookCollections.length > 0 ? (
          <section className="mt-8">
            <div className="mb-5 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-[24px] font-black leading-tight md:text-[28px]">{t("კოლექციები")}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t("ავტორის შერჩეული რეცეპტების კრებულები.")}</p>
              </div>
              <span className="rounded-full border border-oat bg-surface px-3 py-1 text-xs font-black text-muted tabular-nums">
                {cookCollections.length}
              </span>
            </div>
            <Stagger as="div" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
              {cookCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  href={`/collections/${cook.username}/${collection.slug}`}
                />
              ))}
            </Stagger>
          </section>
        ) : null}

        <section className="mt-8">
          <Tabs items={tabs} active={activeTab} />
          <div className="soft-card mt-5 flex flex-col gap-4 overflow-hidden rounded-[24px] p-3 md:rounded-[26px] md:p-4">
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
          <div className="mt-6">
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
              <EmptyState mark="0" title="რეცეპტები ჯერ არ არის" description="ამ კულინარის რეცეპტები აქ გამოჩნდება, როცა პირველი კერძი დაემატება." />
            )}
          </div>
        </section>
      </main>
  );
}
