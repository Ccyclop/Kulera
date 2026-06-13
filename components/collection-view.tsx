"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Globe, Link as LinkIcon, Lock } from "lucide-react";
import { CompactRecipeRow, RecipeCard } from "@/components/recipe-card";
import { Reveal, Stagger } from "@/components/motion";
import { useI18n } from "@/components/i18n-provider";
import { EmptyState } from "@/components/ui";
import type { CollectionDetail } from "@/lib/types";

const visibilityMeta = {
  public: { label: "საჯარო", icon: Globe },
  unlisted: { label: "ბმულით ხილვადი", icon: LinkIcon },
  private: { label: "პირადი", icon: Lock },
} as const;

export function CollectionView({ detail, showVisibility = false }: { detail: CollectionDetail; showVisibility?: boolean }) {
  const { t } = useI18n();
  const { collection, sections } = detail;
  const totalRecipes = sections.reduce((sum, section) => sum + section.recipes.length, 0);
  const isPlan = sections.some((section) => section.label !== null);
  const meta = visibilityMeta[collection.visibility];
  const VisibilityIcon = meta.icon;

  return (
    <>
      <Reveal as="section" className="hero-panel min-h-[220px] md:min-h-[280px]">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="eyebrow">{t("კოლექცია")}</p>
            <h1 className="text-[clamp(32px,4.6vw,64px)] font-black leading-[1.02] tracking-normal">{collection.title}</h1>
            {collection.description ? (
              <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-muted md:text-base">{collection.description}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {collection.creatorUsername ? (
                <Link
                  href={`/cooks/${collection.creatorUsername}`}
                  className="inline-flex items-center gap-2 no-underline"
                >
                  {collection.creatorAvatarUrl ? (
                    <Image
                      src={collection.creatorAvatarUrl}
                      alt={collection.creatorName}
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-sage-light text-sm font-black text-sage">
                      {collection.creatorAvatarInitial}
                    </span>
                  )}
                  <span className="text-[14px] font-black text-ink transition-colors hover:text-clay">{collection.creatorName}</span>
                </Link>
              ) : null}

              <span className="rounded-full bg-surface px-3 py-1.5 text-[11px] font-black text-muted tabular-nums">
                {t("{count} რეცეპტი", { count: totalRecipes })}
              </span>

              {isPlan ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-soft-clay px-3 py-1.5 text-[11px] font-black text-clay-dark">
                  <CalendarDays className="h-3 w-3" aria-hidden />
                  {t("გეგმა")}
                </span>
              ) : null}

              {showVisibility ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-oat bg-surface px-3 py-1.5 text-[11px] font-black text-muted">
                  <VisibilityIcon className="h-3 w-3" aria-hidden />
                  {t(meta.label)}
                </span>
              ) : null}
            </div>
          </div>

          {collection.coverImageUrl ? (
            <div className="relative h-32 w-full overflow-hidden rounded-[22px] bg-placeholder shadow-soft md:h-36 md:w-56">
              <Image src={collection.coverImageUrl} alt={collection.title} fill sizes="224px" className="object-cover" />
            </div>
          ) : null}
        </div>
        <span className="hero-watermark">{isPlan ? "Plan" : "Set"}</span>
      </Reveal>

      {totalRecipes === 0 ? (
        <div className="mt-8">
          <EmptyState
            mark="✦"
            title="ამ კოლექციაში რეცეპტები ჯერ არ არის"
            description="როცა ავტორი რეცეპტებს დაამატებს, აქ გამოჩნდება."
          />
        </div>
      ) : isPlan ? (
        <div className="mt-8 grid gap-8">
          {sections.map((section, sectionIndex) => (
            <section key={`${section.label ?? "section"}-${sectionIndex}`}>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-soft-clay text-sm font-black text-clay-dark">
                  {sectionIndex + 1}
                </span>
                <h2 className="text-[22px] font-black leading-tight">{section.label ?? t("რეცეპტები")}</h2>
              </div>
              <Stagger as="div" className="grid gap-3" stagger={0.05}>
                {section.recipes.map((recipe, index) => (
                  <CompactRecipeRow key={recipe.id} recipe={recipe} index={index + 1} />
                ))}
              </Stagger>
            </section>
          ))}
        </div>
      ) : (
        <Stagger as="div" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
          {sections[0]?.recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </Stagger>
      )}
    </>
  );
}
