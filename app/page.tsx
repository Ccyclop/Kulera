import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { CategoryCard } from "@/components/category-card";
import { AnimatedCounter, Floating, HeroTitle, MagneticChip, Reveal, Stagger } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { CompactRecipeRow, LatestRecipeCard } from "@/components/recipe-card";
import { SearchInput } from "@/components/search-input";
import { Badge, ButtonLink, EmptyState, Pagination, SidebarCard } from "@/components/ui";
import { getCategories, getRecipes, getTopRecipes } from "@/lib/data";
import { paginate } from "@/lib/pagination";
import { firstSearchParam, type SearchParamRecord } from "@/lib/search-params";

export const dynamic = "force-dynamic";

const LATEST_PAGE_SIZE = 4;
const LATEST_CURSOR_KEY = "latest";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamRecord>;
}) {
  const params = await searchParams;
  const latestCursor = firstSearchParam(params, LATEST_CURSOR_KEY) || undefined;
  const [categories, recipes, topRecipes] = await Promise.all([
    getCategories(),
    getRecipes({ sort: "newest" }),
    getTopRecipes(5),
  ]);
  const latestPage = paginate(recipes, latestCursor, LATEST_PAGE_SIZE);
  const latestRecipes = latestPage.items;
  const dailyRecipe = recipes[0];
  const featuredRecipe = topRecipes[0] ?? dailyRecipe;
  const quickRecipesCount = recipes.filter((recipe) => recipe.cookingTime <= 30).length;
  const averageRating = recipes.length > 0
    ? recipes.reduce((sum, recipe) => sum + recipe.rating, 0) / recipes.length
    : 0;

  return (
    <PageShell>
      <main className="page-main">
        <section className="grid min-h-[536px] gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="relative overflow-hidden rounded-[30px] bg-ink px-6 py-9 text-[#FFF9EF] shadow-panel md:px-14 md:py-[52px]">
            <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background:linear-gradient(90deg,transparent_0_50%,rgba(255,255,255,.24)_50%_51%,transparent_51%)_0_0/40px_40px,linear-gradient(0deg,transparent_0_50%,rgba(255,255,255,.18)_50%_51%,transparent_51%)_0_0/40px_40px]" />
            <Floating
              className="pointer-events-none absolute bottom-4 right-7 h-[230px] w-[230px] opacity-25 md:bottom-6 md:right-10 md:h-[310px] md:w-[310px]"
              duration={9}
              distance={12}
            >
              <BrandLogo variant="icon" className="h-full w-full" decorative />
            </Floating>
            <div className="relative z-10">
              <p className="mb-7 inline-flex items-center gap-2 text-[13px] font-black text-soft-clay before:h-2 before:w-2 before:rounded-full before:bg-clay">
                დღეს თბილისში • ნამდვილი არჩევანი
              </p>
              <h1 className="max-w-none text-balance text-[clamp(48px,5.6vw,92px)] font-black leading-[1.15] tracking-normal">
                <HeroTitle text="იპოვე რა მოამზადო დღეს" stagger={0.035} />
              </h1>
              <p className="mt-7 max-w-2xl text-lg font-medium leading-relaxed text-sand">
                დაწერე კერძი, ინგრედიენტი ან უბრალოდ ის, რაც სახლში გაქვს. Kulera გაჩვენებს რეცეპტებს,
                რომლებიც რეალურად ჯდება დღეში.
              </p>
              <SearchInput dark />
              <div className="mt-4 flex flex-wrap gap-2">
                {["15 წუთი", "ორი ადამიანისთვის", "ღუმელის გარეშე", "ბავშვებისთვის"].map((chip) => (
                  <MagneticChip
                    key={chip}
                    className="min-h-[34px] cursor-pointer place-items-center rounded-full border border-white/20 bg-white/10 px-4 text-xs font-extrabold transition-colors duration-200 hover:border-white/50 hover:bg-white/20"
                  >
                    {chip}
                  </MagneticChip>
                ))}
              </div>
              <Stagger as="div" className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3" stagger={0.12} delay={0.2}>
                <div className="border-l border-white/25 pl-4">
                  <strong className="block text-2xl font-black leading-none">
                    <AnimatedCounter value={recipes.length} />
                  </strong>
                  <span className="mt-2 block text-xs font-bold leading-snug text-sand">შერჩეული რეცეპტი სეზონით</span>
                </div>
                <div className="border-l border-white/25 pl-4">
                  <strong className="block text-2xl font-black leading-none">
                    <AnimatedCounter value={quickRecipesCount} />
                  </strong>
                  <span className="mt-2 block text-xs font-bold leading-snug text-sand">კერძი 30 წუთზე ნაკლებში</span>
                </div>
                <div className="border-l border-white/25 pl-4">
                  <strong className="block text-2xl font-black leading-none">
                    <AnimatedCounter value={averageRating} decimals={1} />
                  </strong>
                  <span className="mt-2 block text-xs font-bold leading-snug text-sand">საშუალო შეფასება ოჯახურ კერძებზე</span>
                </div>
              </Stagger>
            </div>
          </div>

          {dailyRecipe ? (
            <Link href={`/recipes/${dailyRecipe.slug}`} className="soft-card grid rounded-[34px] p-5 text-ink no-underline">
              <div className="mb-5 flex items-start justify-between gap-5">
                <h2 className="text-[25px] font-black leading-tight">დღის კერძი</h2>
                <span className="rounded-full bg-soft-clay px-3 py-1 text-xs font-black text-wine">★ {dailyRecipe.rating.toFixed(1)}</span>
              </div>
              <div className="relative min-h-[306px] overflow-hidden rounded-[26px] bg-placeholder">
                <Image src={dailyRecipe.imageUrl} alt={dailyRecipe.title} fill sizes="424px" className="object-cover" />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-[11px] font-black text-clay">
                  რედაქციის არჩევანი
                </div>
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
                <strong className="text-[22px] font-black leading-tight">{dailyRecipe.title}</strong>
                <span className="text-right text-xs font-extrabold leading-relaxed text-muted">
                  {dailyRecipe.cookingTime} წთ
                  <br />
                  {dailyRecipe.difficulty}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-[15px] border border-oat bg-[#FAF6F0] p-3">
                  <b className="block text-sm">{dailyRecipe.ingredients.length} ინგრ.</b>
                  <small className="mt-2 block text-[11px] font-extrabold text-muted">ძირითადი</small>
                </div>
                <div className="rounded-[15px] border border-oat bg-[#FAF6F0] p-3">
                  <b className="block text-sm">{dailyRecipe.steps.length} ნაბიჯი</b>
                  <small className="mt-2 block text-[11px] font-extrabold text-muted">მოკლე პროცესი</small>
                </div>
                <div className="rounded-[15px] border border-oat bg-[#FAF6F0] p-3">
                  <b className="block text-sm">{dailyRecipe.servings}</b>
                  <small className="mt-2 block text-[11px] font-extrabold text-muted">პორცია</small>
                </div>
              </div>
            </Link>
          ) : (
            <div className="soft-card grid content-center rounded-[34px] p-6 text-ink">
              <h2 className="text-[25px] font-black leading-tight">დღის კერძი</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                რეცეპტები ჯერ არ არის დამატებული. პირველი რეცეპტი აქ დღის კერძად გამოჩნდება.
              </p>
              <ButtonLink href="/recipes/add" className="mt-5 w-fit">
                რეცეპტის დამატება
              </ButtonLink>
            </div>
          )}
        </section>

        <Reveal as="section">
          <div className="section-title">
            <div>
              <h2>აირჩიე სიტუაციით</h2>
              <p>კატეგორიები დატოვებულია ქცევით ენაზე: რას ამზადებ, ვისთვის და რა დრო გაქვს.</p>
            </div>
            <Link href="/categories" className="text-[13px] font-black text-clay no-underline">
              ყველას ნახვა
            </Link>
          </div>
          {categories.length > 0 ? (
            <Stagger as="div" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" stagger={0.05} childVariant="popIn">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </Stagger>
          ) : (
            <EmptyState mark="0" title="კატეგორიები ჯერ არ არის" description="კატეგორიები მალე დაემატება, რომ რეცეპტების არჩევა უფრო მარტივი გახდეს." />
          )}
        </Reveal>

        <Reveal as="section" className="mt-12 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="section-title mt-0">
              <div>
                <h2>ტოპ რეცეპტები</h2>
                <p>ყველაზე მეტად მოწონებული რეცეპტები, რომლებსაც მომხმარებლები ენდობიან.</p>
              </div>
              <ButtonLink href="/search" variant="secondary">
                ძიება
              </ButtonLink>
            </div>

            {featuredRecipe ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(320px,.95fr)_minmax(320px,1fr)]">
                <Link
                  href={`/recipes/${featuredRecipe.slug}`}
                  className="soft-card group overflow-hidden rounded-[30px] text-ink no-underline transition-shadow duration-300 hover:shadow-[0_24px_60px_-24px_rgba(31,26,23,0.35)]"
                >
                  <div className="relative min-h-[302px] bg-placeholder">
                    <Image
                      src={featuredRecipe.imageUrl}
                      alt={featuredRecipe.title}
                      fill
                      sizes="50vw"
                      className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06] motion-reduce:group-hover:scale-100"
                    />
                  </div>
                  <div className="p-6">
                    <Badge>{featuredRecipe.categoryName}</Badge>
                    <h3 className="mt-4 text-[29px] font-black leading-tight transition-colors duration-200 group-hover:text-clay">
                      {featuredRecipe.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{featuredRecipe.description}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs font-extrabold text-muted">
                      <span>★ {featuredRecipe.rating.toFixed(1)}</span>
                      <span>{featuredRecipe.ratingsCount} შეფასება</span>
                      <span>{featuredRecipe.cookingTime} წთ</span>
                    </div>
                  </div>
                </Link>
                <div className="grid gap-3">
                  {topRecipes.slice(1, 5).map((recipe, index) => (
                    <CompactRecipeRow key={recipe.id} recipe={recipe} index={index + 2} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState mark="0" title="ტოპ რეცეპტები ჯერ არ არის" description="რეცეპტები აქ გამოჩნდება, როცა მომხმარებლები შეფასებებს დატოვებენ." />
            )}
          </div>

          <aside className="grid content-start gap-4 xl:sticky xl:top-28">
            <SidebarCard title="დღის იდეები">
              {recipes.length > 0 ? (
                <div className="grid gap-1">
                  {recipes.slice(0, 4).map((recipe, index) => (
                    <div key={recipe.id} className="grid grid-cols-[58px_1fr] items-center gap-3 border-t border-oat py-3 first:border-t-0">
                      <span className="text-xs font-black text-clay">#{index + 1}</span>
                      <div>
                        <strong className="block text-sm font-black text-ink">{recipe.title}</strong>
                        <span className="mt-1 block text-[11px] font-bold text-muted">
                          {recipe.cookingTime} წთ • {recipe.difficulty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>დღის იდეები აქ გამოჩნდება, როცა პირველი რეცეპტები დაემატება.</p>
              )}
            </SidebarCard>

            <SidebarCard title="მაცივრიდან იდეამდე" eyebrow="მალე">
              <p>
                მომავალში Kulera შეძლებს მაცივრის ფოტოდან ინგრედიენტების ამოცნობას და შესაბამისი რეცეპტების
                შეთავაზებას.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["კვერცხი", "მწვანილი", "ყველი", "პომიდორი"].map((item) => (
                  <span key={item} className="rounded-full border border-oat bg-surface px-3 py-2 text-[11px] font-extrabold">
                    {item}
                  </span>
                ))}
              </div>
            </SidebarCard>
          </aside>
        </Reveal>

        <Reveal as="section" id="latest-recipes" className="mt-12" amount={0.05}>
          <div className="section-title">
            <div>
              <h2>ახალი რეცეპტები</h2>
              <p>ბოლო დამატებული იდეები მოკლე ბარათებით, რომ სწრაფად გადაავლო თვალი.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-[13px] font-black text-muted">
              <Clock className="h-4 w-4 text-clay" />
              განახლებულია დღეს
            </span>
          </div>
          {latestRecipes.length > 0 ? (
            <>
              <Stagger as="div" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" stagger={0.08}>
                {latestRecipes.map((recipe) => (
                  <LatestRecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </Stagger>
              <Pagination
                basePath="/"
                searchParams={params}
                cursorKey={LATEST_CURSOR_KEY}
                prevCursor={latestPage.prevCursor}
                nextCursor={latestPage.nextCursor}
                isFirstPage={latestPage.isFirstPage}
                startIndex={latestPage.startIndex}
                pageSize={latestPage.pageSize}
                totalCount={latestPage.totalCount}
                hashAnchor="latest-recipes"
              />
            </>
          ) : (
            <EmptyState mark="0" title="ახალი რეცეპტები ჯერ არ არის" description="ახალი რეცეპტები აქ გამოჩნდება, როცა კულინარები პირველ იდეებს დაამატებენ." />
          )}
        </Reveal>

      </main>
    </PageShell>
  );
}
