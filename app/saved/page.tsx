import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { QuerySelect } from "@/components/query-select";
import { RecipeCard } from "@/components/recipe-card";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { ButtonLink, EmptyState, FilterChips, Pagination } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import {
  difficultyFilterOptions,
  normalizeCookingTimeFilter,
  normalizeDifficultyFilter,
  normalizeRecipeSort,
  sortOptions,
  timeFilterOptions,
} from "@/lib/content-options";
import { getSavedRecipeEntries } from "@/lib/data";
import { getServerTranslator } from "@/lib/i18n/server";
import { DEFAULT_PAGE_SIZE, paginate, readCursorParam } from "@/lib/pagination";
import { firstSearchParam, pathWithSearchParams, type SearchParamRecord } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function SavedRecipesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamRecord>;
}) {
  const params = await searchParams;
  const t = await getServerTranslator();
  const cookingTime = normalizeCookingTimeFilter(firstSearchParam(params, "time"));
  const difficulty = normalizeDifficultyFilter(firstSearchParam(params, "difficulty"));
  const sort = normalizeRecipeSort(firstSearchParam(params, "sort"));
  const auth = await requireAuth("/saved");

  if (!auth.configured) {
    return (
        <main className="page-main">
          <SupabaseSetupNotice title="შენახული რეცეპტები დროებით მიუწვდომელია" />
        </main>
    );
  }

  const savedEntries = await getSavedRecipeEntries(auth.userId, {
    cookingTime,
    difficulty,
    sort,
  });
  const timeOptions = timeFilterOptions.map((option) => ({
    ...option,
    href: pathWithSearchParams("/saved", params, { time: option.value, cursor: null }),
  }));
  const difficultyOptions = difficultyFilterOptions.map((option) => ({
    ...option,
    href: pathWithSearchParams("/saved", params, { difficulty: option.value, cursor: null }),
  }));
  const paginableEntries = savedEntries.map((entry) => ({
    id: entry.recipe.id,
    createdAt: entry.savedAt,
    recipe: entry.recipe,
  }));
  const page = paginate(paginableEntries, readCursorParam(params), DEFAULT_PAGE_SIZE);

  return (
      <main className="page-main">
        <Reveal as="section" className="hero-panel min-h-[200px] md:min-h-[260px]">
          <p className="eyebrow">{t("შენახული")}</p>
          <h1 className="text-[clamp(34px,5vw,74px)] font-black leading-none tracking-normal">
            <HeroTitle text={t("შენახული რეცეპტები")} />
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted md:mt-4 md:text-base">
            {t("რეცეპტები, რომლებსაც მოგვიანებით დაუბრუნდები.")}
          </p>
          <span className="hero-watermark">Saved</span>
        </Reveal>

        <div className="soft-card mt-6 flex flex-col gap-4 overflow-hidden rounded-[24px] p-3 md:rounded-[26px] md:p-4">
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
            <Stagger as="section" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
              {page.items.map((entry) => (
                <RecipeCard key={entry.id} recipe={entry.recipe} />
              ))}
            </Stagger>
            <Pagination
              basePath="/saved"
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
          <div className="mt-6">
            <EmptyState
              mark="♡"
              title="ჯერ შენახული რეცეპტები არ გაქვს"
              description="რეცეპტის შესანახად დააჭირე შენახვის ღილაკს."
              action={<ButtonLink href="/">რეცეპტების ნახვა</ButtonLink>}
            />
          </div>
        )}
      </main>
  );
}
