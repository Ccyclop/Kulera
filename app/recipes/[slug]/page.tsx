import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddToCollection } from "@/components/add-to-collection";
import { BookmarkToggle } from "@/components/bookmark-toggle";
import { CommentThread } from "@/components/comment-thread";
import { IngredientsPanel } from "@/components/ingredients-panel";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { RatingWidget } from "@/components/rating-widget";
import { RecipeCard } from "@/components/recipe-card";
import { ShareButton } from "@/components/share-button";
import { VideoLightboxTrigger } from "@/components/video-lightbox";
import { Badge, ButtonLink, RatingStars } from "@/components/ui";
import { getAuthClaims } from "@/lib/auth";
import {
  getCollectionMembershipsForRecipe,
  getOwnedCollections,
  getRecipeBySlug,
  getRecipeComments,
  getSimilarRecipes,
  getUserRecipeRating,
  isRecipeSavedBy,
} from "@/lib/data";
import type { Collection } from "@/lib/types";
import { getLocale, getServerTranslator } from "@/lib/i18n/server";
import { formatMinutes, formatRatingCount, translateCategoryName } from "@/lib/i18n/shared";
import { parseServingsCount } from "@/lib/ingredients";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [recipe, locale, t] = await Promise.all([getRecipeBySlug(slug), getLocale(), getServerTranslator()]);

  if (!recipe) {
    notFound();
  }

  const claims = await getAuthClaims();
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  const [recipeComments, similar, userRating, initialSaved, ownedCollections, recipeMemberships] = await Promise.all([
    getRecipeComments(recipe),
    getSimilarRecipes(recipe, 3),
    userId ? getUserRecipeRating(recipe.id, userId) : Promise.resolve(null),
    userId ? isRecipeSavedBy(recipe.id, userId) : Promise.resolve(false),
    userId ? getOwnedCollections(userId) : Promise.resolve([] as Collection[]),
    userId ? getCollectionMembershipsForRecipe(recipe.id, userId) : Promise.resolve(new Set<string>()),
  ]);

  return (
      <main className="page-main">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-muted no-underline">
          <ArrowLeft className="h-4 w-4" />
          {t("რეცეპტებში დაბრუნება")}
        </Link>

        <Reveal as="section" className="grid gap-6 xl:grid-cols-[minmax(480px,.96fr)_minmax(440px,1.04fr)]">
          <div className="hero-panel flex min-h-[540px] flex-col justify-between">
            <div>
              <p className="eyebrow">
                {t("{category} • ოჯახური სადილი", { category: translateCategoryName(locale, recipe.categoryName) })}
              </p>
              <h1 className="max-w-3xl text-[clamp(42px,5vw,78px)] font-black leading-[0.99] tracking-normal">
                <HeroTitle text={recipe.title} stagger={0.025} />
              </h1>
              <p className="mt-6 max-w-2xl text-[17px] font-medium leading-relaxed text-muted">{recipe.description}</p>
              <Badge className="mt-5">{t("{category} სამზარეულო", { category: translateCategoryName(locale, recipe.categoryName) })}</Badge>

              <div className="mt-6 flex items-center gap-3">
                {recipe.creatorAvatarUrl ? (
                  <Image
                    src={recipe.creatorAvatarUrl}
                    alt={recipe.creatorName}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sage-light text-base font-black text-sage">
                    {recipe.creatorAvatarInitial}
                  </span>
                )}
                <div className="leading-tight">
                  <span className="block text-[11px] font-extrabold text-muted">{t("ავტორი")}</span>
                  {recipe.creatorUsername ? (
                    <Link
                      href={`/cooks/${recipe.creatorUsername}`}
                      className="text-[15px] font-black text-ink no-underline transition-colors hover:text-clay"
                    >
                      {recipe.creatorName}
                    </Link>
                  ) : (
                    <span className="text-[15px] font-black text-ink">{recipe.creatorName}</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[17px] border border-oat bg-[#FAF6F0] p-4">
                  <strong className="block text-lg font-black leading-none">{recipe.rating}</strong>
                  <span className="mt-2 block text-[11px] font-extrabold text-muted">{t("საშუალო შეფასება")}</span>
                </div>
                <div className="rounded-[17px] border border-oat bg-[#FAF6F0] p-4">
                  <strong className="block text-lg font-black leading-none">{recipe.ratingsCount}</strong>
                  <span className="mt-2 block text-[11px] font-extrabold text-muted">{t("შეფასება")}</span>
                </div>
                <div className="rounded-[17px] border border-oat bg-[#FAF6F0] p-4">
                  <strong className="block text-lg font-black leading-none">{formatMinutes(locale, recipe.cookingTime)}</strong>
                  <span className="mt-2 block text-[11px] font-extrabold text-muted">{t("მომზადების დრო")}</span>
                </div>
                <div className="rounded-[17px] border border-oat bg-[#FAF6F0] p-4">
                  <strong className="block text-lg font-black leading-none">{recipe.servings}</strong>
                  <span className="mt-2 block text-[11px] font-extrabold text-muted">{t("პორცია")}</span>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                <ButtonLink href={`/recipes/${recipe.slug}/cook`}>დაწყება</ButtonLink>
                <BookmarkToggle
                  recipeId={recipe.id}
                  recipeSlug={recipe.slug}
                  initialSaved={initialSaved}
                  isAuthenticated={Boolean(userId)}
                />
                <ShareButton title={recipe.title} description={recipe.description} slug={recipe.slug} />
                <AddToCollection
                  recipeId={recipe.id}
                  recipeSlug={recipe.slug}
                  recipeVisibility={recipe.visibility}
                  isAuthenticated={Boolean(userId)}
                  collections={ownedCollections.map((collection) => ({
                    id: collection.id,
                    title: collection.title,
                    visibility: collection.visibility,
                  }))}
                  initialMemberships={[...recipeMemberships]}
                />
                {userId === recipe.userId ? (
                  <ButtonLink href={`/recipes/${recipe.slug}/edit`} variant="secondary">
                    რედაქტირება
                  </ButtonLink>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[30px] bg-placeholder shadow-panel xl:min-h-[540px]">
            <Image src={recipe.imageUrl} alt={recipe.title} fill sizes="50vw" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/55" />
            {recipe.videoUrl ? (
              <VideoLightboxTrigger videoUrl={recipe.videoUrl} title={recipe.title} />
            ) : null}
          </div>
        </Reveal>

        <Reveal as="section" className="mt-10 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]" amount={0.1}>
          <div className="order-2 grid gap-5 xl:order-1">
            <article className="soft-card rounded-[28px] p-5 md:p-8">
              <div className="mb-6">
                <h2 className="text-[28px] font-black leading-tight">{t("მომზადების ნაბიჯები")}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  {t("ნაბიჯები მოკლეა, მაგრამ საკმარისად კონკრეტული, რომ რეცეპტი რეალურად გამოიყენო სამზარეულოში.")}
                </p>
              </div>
              <ol className="grid gap-0">
                {recipe.steps.map((step, index) => (
                  <li key={step.title} className="grid gap-4 border-t border-oat py-6 first:border-t-0 first:pt-0 md:grid-cols-[56px_1fr]">
                    <span className="grid h-12 w-12 place-items-center rounded-full border border-oat bg-[#FAF6F0] text-[13px] font-black text-clay">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-[19px] font-black leading-tight">{step.title}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>

            {recipe.tips.length > 0 ? (
              <article className="soft-card rounded-[28px] p-5 md:p-8">
                <div className="mb-6">
                  <h2 className="text-[28px] font-black leading-tight">{t("Tips / notes")}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t("პატარა დეტალები, რომლებიც გემოს ცვლის.")}</p>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {recipe.tips.map((tip) => (
                    <div key={tip.title} className="min-h-32 rounded-[22px] border border-oat bg-[#FAF6F0] p-4">
                      <strong className="block text-[15px] font-black leading-tight">{tip.title}</strong>
                      <span className="mt-2 block text-sm leading-relaxed text-muted">{tip.body}</span>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            <article className="soft-card rounded-[28px] p-5 md:p-6">
              <h2 className="text-[23px] font-black leading-tight">{t("შეაფასე რეცეპტი")}</h2>
              <div className="mt-5 grid gap-4 rounded-[22px] border border-oat bg-[#FAF6F0] p-5 md:grid-cols-[auto_1fr] md:items-center">
                <div>
                  <div className="text-[42px] font-black leading-none">{recipe.rating}</div>
                  <RatingStars value={recipe.rating} className="mt-2 text-[18px]" />
                  <p className="mt-2 text-xs font-extrabold text-muted">{formatRatingCount(locale, recipe.ratingsCount)}</p>
                </div>
                <RatingWidget
                  recipeId={recipe.id}
                  recipeSlug={recipe.slug}
                  initialUserRating={userRating}
                  isAuthenticated={Boolean(userId)}
                />
              </div>
            </article>

            <CommentThread comments={recipeComments} currentUserId={userId} recipeId={recipe.id} recipeSlug={recipe.slug} />
          </div>

          <IngredientsPanel
            className="order-1 xl:order-2"
            ingredients={recipe.ingredients}
            baseServings={recipe.baseServings ?? parseServingsCount(recipe.servings)}
            initialServings={recipe.baseServings ?? parseServingsCount(recipe.servings) ?? 1}
            servingsLabel={recipe.servings}
          />
        </Reveal>

        <section className="mt-10">
          <div className="section-title mt-0">
            <div>
              <h2>{t("მსგავსი რეცეპტები")}</h2>
              <p>{t("თუ ეს გემო მოგწონს, ეს არჩევანიც ახლოს არის.")}</p>
            </div>
          </div>
          <Stagger as="div" className="grid gap-4 md:grid-cols-3" stagger={0.08}>
            {similar.map((item) => (
              <RecipeCard key={item.id} recipe={item} />
            ))}
          </Stagger>
        </section>
      </main>
  );
}
