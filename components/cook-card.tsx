"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Cook } from "@/lib/types";
import { cookScore } from "@/lib/ranking";
import { Badge, RatingStars } from "./ui";

export function CookCard({ cook, rank, featured = false }: { cook: Cook; rank: number; featured?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.012 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="group"
    >
      <Link
        href={`/cooks/${cook.username}`}
        className={
          featured
            ? "soft-card relative grid min-h-[300px] content-between overflow-hidden rounded-[30px] p-6 text-ink no-underline transition-shadow duration-300 group-hover:shadow-[0_24px_60px_-22px_rgba(31,26,23,0.32)]"
            : "soft-card relative grid gap-4 overflow-hidden rounded-[24px] p-5 text-ink no-underline transition-shadow duration-300 group-hover:shadow-[0_20px_50px_-20px_rgba(31,26,23,0.28)] md:grid-cols-[64px_1fr_auto]"
        }
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-clay/10 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-100 motion-reduce:hidden"
        />
        <div className={featured ? "flex items-start justify-between gap-4" : "flex items-center gap-4 md:block"}>
          <motion.div
            className="grid h-14 w-14 place-items-center rounded-2xl bg-sage-light text-lg font-black text-sage"
            whileHover={{ rotate: -6, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
          >
            {cook.avatarInitial}
          </motion.div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-oat text-xs font-black text-clay transition-all duration-300 group-hover:scale-110 group-hover:border-clay group-hover:bg-soft-clay">
            #{rank}
          </span>
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {cook.badges.slice(0, 2).map((badge) => (
              <Badge key={badge}>{badge}</Badge>
            ))}
          </div>
          <h3 className="mt-4 text-xl font-black leading-tight transition-colors duration-200 group-hover:text-clay">
            {cook.fullName}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{cook.bio}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-extrabold text-muted">
            <span className="inline-flex items-center gap-1">
              <RatingStars value={cook.averageRating} /> {cook.averageRating.toFixed(1)}
            </span>
            <span>{cook.totalRecipes} რეცეპტი</span>
            <span>{cook.totalRatings} შეფასება</span>
          </div>
        </div>

        <div className={featured ? "mt-5 border-t border-oat pt-4" : "md:text-right"}>
          <span className="block text-[11px] font-black uppercase tracking-normal text-muted">საუკეთესო რეცეპტი</span>
          <strong className="mt-1 block max-w-[220px] text-sm font-black leading-snug">{cook.mostPopularRecipe}</strong>
          <span className="mt-2 block text-xs font-extrabold text-clay">Score {cookScore(cook).toFixed(1)}</span>
        </div>
      </Link>
    </motion.div>
  );
}
