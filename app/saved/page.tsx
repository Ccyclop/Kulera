import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
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
import { DEFAULT_PAGE_SIZE, paginate, readCursorParam } from "@/lib/pagination";
import { firstSearchParam, pathWithSearchParams, type SearchParamRecord } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function SavedRecipesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamRecord>;
}) {
  const params = await searchParams;
  const cookingTime = normalizeCookingTimeFilter(firstSearchParam(params, "time"));
  const difficulty = normalizeDifficultyFilter(firstSearchParam(params, "difficulty"));
  const sort = normalizeRecipeSort(firstSearchParam(params, "sort"));
  const auth = await requireAuth("/saved");

  if (!auth.configured) {
    return (
      <PageShell>
        <main className="page-main">
          <SupabaseSetupNotice title="შენახული რეცეპტები დროებით მიუწვდომელია" />
        </main>
      </PageShell>
    );
  }

  const savedEntries = await getSavedRecipeEntries(auth.userId, {
    cookingTime,
    difficulty,
    sort,
  });
  const paginableEntries = savedEntries.map((entry) => ({
    id: entry.recipe.id,
    createdAt: entry.savedAt,
    recipe: entry.recipe,
  }));
  const page = paginate(paginableEntries, readCursorParam(params), DEFAULT_PAGE_SIZE);

  return (
    <PageShell>
      <main className="page-main">
        <Reveal as="section" className="hero-panel min-h-[260px]">
          <p className="eyebrow">შენახული</p>
          <h1 className="text-[clamp(42px,5vw,74px)] font-black leading-none tracking-normal">
            <HeroTitle text="შენახული რეცეპტები" />
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted">
            რეცეპტები, რომლებსაც მოგვიანებით დაუბრუნდები.
          </p>
          <span className="hero-watermark">Saved</span>
        </Reveal>

        <div className="soft-card mt-6 grid gap-4 rounded-[26px] p-4">
          <div>
            <span className="mb-2 block text-xs font-black text-muted">მომზადების დრო</span>
            <FilterChips
              items={timeFilterOptions}
              active={cookingTime ?? "all"}
              getHref={(value) => pathWithSearchParams("/saved", params, { time: value, cursor: null })}
            />
          </div>
          <div>
            <span className="mb-2 block text-xs font-black text-muted">სირთულე</span>
            <FilterChips
              items={difficultyFilterOptions}
              active={difficulty ?? "all"}
              getHref={(value) => pathWithSearchParams("/saved", params, { difficulty: value, cursor: null })}
            />
          </div>
          <div className="max-w-xs">
            <QuerySelect label="დალაგება" name="sort" value={sort} options={sortOptions} />
          </div>
        </div>

        {page.items.length > 0 ? (
          <>
            <Stagger as="section" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
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
    </PageShell>
  );
}
