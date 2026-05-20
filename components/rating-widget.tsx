"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { rateRecipe } from "@/lib/actions/social";
import { cn } from "@/lib/cn";

type RatingWidgetProps = {
  recipeId: string;
  recipeSlug: string;
  initialUserRating: number | null;
  isAuthenticated: boolean;
  size?: "md" | "lg";
};

const sizeClass = {
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

export function RatingWidget({
  recipeId,
  recipeSlug,
  initialUserRating,
  isAuthenticated,
  size = "lg",
}: RatingWidgetProps) {
  const router = useRouter();
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const helpId = useId();

  const displayValue = hovered ?? userRating ?? 0;
  const helpText =
    userRating !== null
      ? `შენი შეფასება: ${userRating} ვარსკვლავი`
      : "შენი შეფასება დაეხმარება სხვებს სწრაფად აირჩიონ კარგი რეცეპტი.";

  function handleSelect(value: number) {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/recipes/${recipeSlug}`)}`);
      return;
    }

    if (isPending) return;

    const previous = userRating;
    setUserRating(value);
    setError(null);

    startTransition(async () => {
      const result = await rateRecipe(recipeId, value);

      if (!result.ok) {
        setUserRating(previous);
        setError(result.error ?? "შეფასების შენახვა ვერ მოხერხდა.");
        return;
      }

      router.refresh();
    });
  }

  function focusRating(value: number) {
    buttonRefs.current[value - 1]?.focus();
    setHovered(value);
  }

  function handleKeyDown(value: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      focusRating(value === 5 ? 1 : value + 1);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      focusRating(value === 1 ? 5 : value - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusRating(1);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusRating(5);
    }
  }

  return (
    <div className="grid gap-2">
      <div
        role="radiogroup"
        aria-label="რეცეპტის შეფასება"
        aria-describedby={helpId}
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHovered(null)}
      >
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          const filled = value <= displayValue;
          return (
            <button
              key={value}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={userRating === value}
              aria-label={`${value} ვარსკვლავი`}
              aria-describedby={helpId}
              disabled={isPending}
              onClick={() => handleSelect(value)}
              onKeyDown={(event) => handleKeyDown(value, event)}
              onMouseEnter={() => setHovered(value)}
              onFocus={() => setHovered(value)}
              onBlur={() => setHovered(null)}
              className={cn(
                "grid place-items-center rounded-full p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/60 disabled:cursor-not-allowed",
                filled ? "text-clay" : "text-oat hover:text-soft-clay",
              )}
            >
              <Star className={cn(sizeClass[size], filled && "fill-current")} aria-hidden />
            </button>
          );
        })}
      </div>
      <p id={helpId} className="text-xs font-extrabold text-muted" aria-live="polite">
        {error ?? helpText}
      </p>
    </div>
  );
}
