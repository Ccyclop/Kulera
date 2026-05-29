"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatAmount, formatQuantity } from "@/lib/ingredients";
import type { Ingredient } from "@/lib/types";

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 24;

function scaleIngredientRow(ingredient: Ingredient, scale: number): Ingredient {
  if (ingredient.quantity == null) return ingredient;
  const scaled = ingredient.quantity * scale;
  return {
    ...ingredient,
    quantity: scaled,
    amount: formatAmount({ ...ingredient, quantity: scaled }) || ingredient.amount,
  };
}

function plainAmount(ingredient: Ingredient) {
  if (ingredient.quantity != null) {
    const qty = formatQuantity(ingredient.quantity);
    return [qty, ingredient.unit, ingredient.note].filter(Boolean).join(" ").trim();
  }
  return ingredient.note || ingredient.amount || "";
}

export function IngredientsPanel({
  ingredients,
  baseServings,
  initialServings,
  servingsLabel,
}: {
  ingredients: Ingredient[];
  baseServings: number | null;
  initialServings: number;
  servingsLabel: string;
}) {
  const [servings, setServings] = useState(() => Math.max(MIN_SERVINGS, Math.round(initialServings)));
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  const scale = baseServings && baseServings > 0 ? servings / baseServings : 1;

  const scaledIngredients = useMemo(
    () => ingredients.map((ingredient) => scaleIngredientRow(ingredient, scale)),
    [ingredients, scale],
  );

  const adjust = (delta: number) => {
    setServings((prev) => {
      const next = prev + delta;
      if (next < MIN_SERVINGS) return MIN_SERVINGS;
      if (next > MAX_SERVINGS) return MAX_SERVINGS;
      return next;
    });
  };

  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const showScaler = baseServings != null && baseServings > 0;

  return (
    <aside className="soft-card h-fit rounded-[28px] p-5 xl:sticky xl:top-28">
      <h2 className="text-[23px] font-black leading-tight">ინგრედიენტები</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">მონიშნე რაც უკვე გაქვს.</p>

      {showScaler ? (
        <div className="mt-5 inline-flex min-h-[42px] items-center gap-3 rounded-full border border-oat bg-[#FAF6F0] px-3 text-[13px] font-black">
          <button
            type="button"
            onClick={() => adjust(-1)}
            disabled={servings <= MIN_SERVINGS}
            className="grid h-7 w-7 place-items-center rounded-full bg-surface text-clay transition disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="პორციის შემცირება"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[88px] text-center tabular-nums">
            {servings} პორცია
          </span>
          <button
            type="button"
            onClick={() => adjust(1)}
            disabled={servings >= MAX_SERVINGS}
            className="grid h-7 w-7 place-items-center rounded-full bg-surface text-clay transition disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="პორციის გაზრდა"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="mt-5 inline-flex min-h-[42px] items-center gap-3 rounded-full border border-oat bg-[#FAF6F0] px-4 text-[13px] font-black">
          <span>{servingsLabel} პორცია</span>
        </div>
      )}

      <ul className="mt-5 grid">
        {scaledIngredients.map((ingredient, index) => {
          const isChecked = checked.has(index);
          const amountText = plainAmount(ingredient);

          return (
            <li
              key={`${ingredient.name}-${index}`}
              className="grid min-h-11 grid-cols-[24px_1fr_auto] items-center gap-3 border-t border-oat py-2 first:border-t-0"
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-[7px] border border-sand bg-[#FAF6F0] text-[10px] font-black text-white transition",
                  isChecked && "border-sage bg-sage",
                )}
                aria-pressed={isChecked}
                aria-label={`${ingredient.name} მონიშვნა`}
              >
                {isChecked ? "✓" : ""}
              </button>
              <span
                className={cn(
                  "text-sm font-bold transition",
                  isChecked && "text-muted line-through",
                )}
              >
                {ingredient.name}
              </span>
              <span
                className={cn(
                  "text-xs font-black text-muted tabular-nums transition",
                  isChecked && "line-through",
                )}
              >
                {amountText}
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
