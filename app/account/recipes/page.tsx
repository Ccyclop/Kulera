import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FilePen, Pencil } from "lucide-react";
import { HeroTitle, Reveal } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getOwnedRecipes } from "@/lib/data";
import type { Recipe } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<Recipe["status"], string> = {
  published: "გამოქვეყნებული",
  draft: "მონახაზი",
  archived: "არქივი",
};

function MyRecipeCard({ recipe }: { recipe: Recipe }) {
  const isDraft = recipe.status === "draft";
  const primaryHref = isDraft ? `/recipes/${recipe.slug}/edit` : `/recipes/${recipe.slug}`;

  return (
    <article className="soft-card group relative flex h-full flex-col overflow-hidden rounded-[24px]">
      <Link href={primaryHref} className="relative block aspect-[16/10] overflow-hidden bg-placeholder no-underline">
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
        <span className="absolute left-3 top-3">
          <Badge
            className={
              recipe.status === "published"
                ? "bg-sage-light text-sage"
                : recipe.status === "draft"
                  ? "bg-soft-clay text-clay-dark"
                  : "bg-oat text-muted"
            }
          >
            {STATUS_LABEL[recipe.status]}
          </Badge>
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-lg font-black leading-snug">{recipe.title || "უსათაურო მონახაზი"}</h3>
        <p className="line-clamp-2 text-xs font-bold text-muted">
          {recipe.description || "აღწერა ჯერ არ დაგიწერია."}
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] font-black text-muted">
          <span>{recipe.cookingTime} წთ</span>
          <span>•</span>
          <span>{recipe.difficulty}</span>
          {recipe.status === "published" ? (
            <>
              <span>•</span>
              <span>★ {recipe.rating.toFixed(1)} ({recipe.ratingsCount})</span>
            </>
          ) : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <ButtonLink href={`/recipes/${recipe.slug}/edit`} variant="secondary" className="flex-1 justify-center">
            <Pencil className="h-3.5 w-3.5" />
            რედაქტირება
          </ButtonLink>
          {recipe.status === "published" ? (
            <ButtonLink href={`/recipes/${recipe.slug}`} className="flex-1 justify-center">
              ნახვა
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RecipeGroup({ title, hint, recipes }: { title: string; hint: string; recipes: Recipe[] }) {
  if (recipes.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[24px] font-black leading-tight md:text-[28px]">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{hint}</p>
        </div>
        <span className="rounded-full border border-oat bg-surface px-3 py-1 text-xs font-black text-muted tabular-nums">
          {recipes.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {recipes.map((recipe) => (
          <MyRecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </section>
  );
}

export default async function MyRecipesPage() {
  const auth = await requireAuth("/account/recipes");

  if (!auth.configured) {
    return (
      <PageShell>
        <main className="page-main">
          <SupabaseSetupNotice title="ჩემი რეცეპტები დროებით მიუწვდომელია" />
        </main>
      </PageShell>
    );
  }

  const recipes = await getOwnedRecipes(auth.userId);
  const published = recipes.filter((recipe) => recipe.status === "published");
  const drafts = recipes.filter((recipe) => recipe.status === "draft");
  const archived = recipes.filter((recipe) => recipe.status === "archived");

  return (
    <PageShell>
      <main className="page-main">
        <Link
          href="/account"
          className="mb-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-muted no-underline"
        >
          <ArrowLeft className="h-4 w-4" />
          ანგარიშზე დაბრუნება
        </Link>

        <Reveal as="section" className="hero-panel min-h-[200px] md:min-h-[260px]">
          <p className="eyebrow">ჩემი რეცეპტები</p>
          <h1 className="text-[clamp(34px,5vw,74px)] font-black leading-none tracking-normal">
            <HeroTitle text="ჩემი რეცეპტები" />
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted md:mt-4 md:text-base">
            მართე შენი მონახაზები და გამოქვეყნებული რეცეპტები ერთ ადგილზე.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-[11px] font-black text-muted">
            <span className="rounded-full bg-surface px-3 py-1.5 tabular-nums">
              გამოქვეყნებული · {published.length}
            </span>
            <span className="rounded-full bg-soft-clay px-3 py-1.5 text-clay-dark tabular-nums">
              მონახაზი · {drafts.length}
            </span>
            {archived.length > 0 ? (
              <span className="rounded-full bg-oat px-3 py-1.5 tabular-nums">
                არქივი · {archived.length}
              </span>
            ) : null}
          </div>
          <span className="hero-watermark">My</span>
        </Reveal>

        {recipes.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              mark="+"
              title="ჯერ არცერთი რეცეპტი არ დაგიმატებია"
              description="დაამატე პირველი რეცეპტი — დაიწყე მონახაზიდან და გამოაქვეყნე როცა მზად იქნება."
              action={<ButtonLink href="/recipes/add">რეცეპტის დამატება</ButtonLink>}
            />
          </div>
        ) : (
          <>
            <RecipeGroup
              title="მონახაზები"
              hint="ჯერ არ გამოქვეყნებული, მხოლოდ შენი თვალისთვის."
              recipes={drafts}
            />
            <RecipeGroup
              title="გამოქვეყნებული"
              hint="ხელმისაწვდომი ყველასთვის — საჯაროდ გამოჩნდება."
              recipes={published}
            />
            <RecipeGroup
              title="არქივი"
              hint="დროებით ფარული რეცეპტები."
              recipes={archived}
            />

            <div className="mt-10 grid place-items-center">
              <ButtonLink href="/recipes/add" variant="secondary">
                <FilePen className="h-4 w-4" />
                ახალი რეცეპტი
              </ButtonLink>
            </div>
          </>
        )}
      </main>
    </PageShell>
  );
}
