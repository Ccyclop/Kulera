"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/components/i18n-provider";
import { formatMinutes, formatRatingCount, translateCategoryName } from "@/lib/i18n/shared";
import type { Recipe } from "@/lib/types";
import { Badge } from "./ui";

const cardSpring = { type: "spring" as const, stiffness: 320, damping: 24 };

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { locale } = useI18n();
  const categoryName = translateCategoryName(locale, recipe.categoryName);

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={cardSpring}
      className="group relative"
    >
      <Link
        href={`/recipes/${recipe.slug}`}
        className="soft-card relative block overflow-hidden rounded-[25px] text-ink no-underline transition-shadow duration-300 ease-out group-hover:shadow-[0_24px_60px_-24px_rgba(31,26,23,0.35)]"
      >
        <div className="relative min-h-[198px] overflow-hidden bg-placeholder">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            sizes="(max-width: 820px) 100vw, (max-width: 1180px) 50vw, 33vw"
            className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.12] motion-reduce:group-hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/40 transition-opacity duration-300 group-hover:to-ink/20" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-100 motion-reduce:hidden"
          />
          <div className="absolute left-3 top-3 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <span className="rounded-full bg-surface/95 px-3 py-1 text-[10px] font-black text-clay shadow-soft">
              {formatMinutes(locale, recipe.cookingTime)} • ★ {recipe.rating.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="p-4">
          <Badge>{categoryName}</Badge>
          <h3 className="mt-3 text-lg font-black leading-snug transition-colors duration-200 group-hover:text-clay">
            {recipe.title}
          </h3>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-extrabold text-muted">
            <span>★ {recipe.rating.toFixed(1)}</span>
            <span>{formatRatingCount(locale, recipe.ratingsCount)}</span>
            <span>{formatMinutes(locale, recipe.cookingTime)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function CompactRecipeRow({ recipe, index }: { recipe: Recipe; index: number }) {
  const { locale } = useI18n();

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={cardSpring}
      className="group"
    >
      <Link
        href={`/recipes/${recipe.slug}`}
        className="soft-card relative grid min-h-[124px] grid-cols-[104px_1fr] items-center gap-4 overflow-hidden rounded-[23px] p-3 text-ink no-underline transition-shadow duration-300 group-hover:shadow-[0_20px_50px_-20px_rgba(31,26,23,0.3)] md:grid-cols-[124px_1fr_auto]"
      >
        <div className="relative min-h-[100px] overflow-hidden rounded-[17px] bg-placeholder">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            sizes="124px"
            className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.12] motion-reduce:group-hover:scale-100"
          />
        </div>
        <div>
          <h3 className="text-[17px] font-black leading-snug transition-colors duration-200 group-hover:text-clay">
            {recipe.title}
          </h3>
          <p className="mt-2 text-xs font-bold text-muted">
            {translateCategoryName(locale, recipe.categoryName)} • {formatMinutes(locale, recipe.cookingTime)} • ★ {recipe.rating.toFixed(1)}
          </p>
        </div>
        <span className="hidden h-[34px] w-[34px] place-items-center rounded-full border border-oat text-xs font-black text-clay transition-all duration-300 group-hover:scale-110 group-hover:border-clay group-hover:bg-soft-clay md:grid">
          {String(index).padStart(2, "0")}
        </span>
      </Link>
    </motion.div>
  );
}

export function LatestRecipeCard({ recipe }: { recipe: Recipe }) {
  const { locale } = useI18n();

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.012 }}
      whileTap={{ scale: 0.99 }}
      transition={cardSpring}
      className="group"
    >
      <Link
        href={`/recipes/${recipe.slug}`}
        className="soft-card relative grid min-h-[108px] grid-cols-[82px_1fr] items-center gap-4 overflow-hidden rounded-[23px] p-3 text-ink no-underline transition-shadow duration-300 group-hover:shadow-[0_18px_44px_-18px_rgba(31,26,23,0.28)]"
      >
        <div className="relative min-h-[82px] overflow-hidden rounded-[18px] bg-placeholder">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            sizes="82px"
            className="object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-[1.15] motion-reduce:group-hover:scale-100"
          />
        </div>
        <div>
          <strong className="block text-base font-black leading-snug transition-colors duration-200 group-hover:text-clay">
            {recipe.title}
          </strong>
          <span className="mt-2 block text-[11px] font-extrabold text-muted">
            {formatMinutes(locale, recipe.cookingTime)} • ★ {recipe.rating.toFixed(1)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
