"use client";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";
import type { RecipeMatch } from "@/lib/pantry/match";
import type { Recipe } from "@/lib/types";
import { RecipeCard } from "./recipe-card";

export function PantryRecipeCard({ recipe, match }: { recipe: Recipe; match: RecipeMatch }) {
  const { t } = useI18n();
  const missingNames = match.missing.slice(0, 3).map((ingredient) => ingredient.name).join(", ");
  const isAllMatched = match.missingCount === 0;
  const tone =
    isAllMatched
      ? "bg-sage-light text-sage"
      : match.missingCount === 1
        ? "bg-soft-clay text-clay-dark"
        : "bg-clay text-paper";

  const label = isAllMatched
    ? t("მთლიანად შეესაბამება")
    : missingNames
      ? t("აკლია {count}: {names}", { count: match.missingCount, names: missingNames })
      : t("აკლია {count}", { count: match.missingCount });

  return (
    <div className="relative">
      <RecipeCard recipe={recipe} />
      <span
        className={cn(
          "pointer-events-none absolute left-3 top-3 z-10 max-w-[88%] truncate rounded-full px-3 py-1 text-[11px] font-black shadow-soft",
          tone,
        )}
        title={label}
      >
        {label}
      </span>
    </div>
  );
}
