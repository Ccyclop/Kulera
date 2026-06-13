"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, Link as LinkIcon, ListOrdered, Lock } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import type { Collection } from "@/lib/types";

const cardSpring = { type: "spring" as const, stiffness: 320, damping: 24 };

const visibilityMeta = {
  public: { label: "საჯარო", icon: Globe, tone: "bg-sage-light text-sage" },
  unlisted: { label: "ბმულით", icon: LinkIcon, tone: "bg-soft-clay text-clay-dark" },
  private: { label: "პირადი", icon: Lock, tone: "bg-oat text-muted" },
} as const;

export function CollectionCard({
  collection,
  href,
  showVisibility = false,
}: {
  collection: Collection;
  href: string;
  showVisibility?: boolean;
}) {
  const { t } = useI18n();
  const meta = visibilityMeta[collection.visibility];
  const VisibilityIcon = meta.icon;

  return (
    <motion.div whileHover={{ y: -6, scale: 1.012 }} whileTap={{ scale: 0.99 }} transition={cardSpring} className="group h-full">
      <Link
        href={href}
        className="soft-card relative flex h-full flex-col overflow-hidden rounded-[24px] text-ink no-underline transition-shadow duration-300 group-hover:shadow-[0_22px_56px_-24px_rgba(31,26,23,0.35)]"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-placeholder">
          {collection.coverImageUrl ? (
            <Image
              src={collection.coverImageUrl}
              alt={collection.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-soft-clay via-paper to-sage-light">
              <ListOrdered className="h-9 w-9 text-clay/60" aria-hidden />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
          {showVisibility ? (
            <span
              className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${meta.tone}`}
            >
              <VisibilityIcon className="h-3 w-3" aria-hidden />
              {t(meta.label)}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-lg font-black leading-snug transition-colors duration-200 group-hover:text-clay">
            {collection.title}
          </h3>
          {collection.description ? (
            <p className="line-clamp-2 text-xs font-bold text-muted">{collection.description}</p>
          ) : null}
          <span className="mt-auto pt-1 text-[11px] font-black text-muted tabular-nums">
            {t("{count} რეცეპტი", { count: collection.recipeCount })}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
