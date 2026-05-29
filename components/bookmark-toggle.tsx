"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Sparkles } from "lucide-react";
import { toggleSavedRecipe } from "@/lib/actions/social";
import { cn } from "@/lib/cn";

type BookmarkToggleProps = {
  recipeId: string;
  recipeSlug: string;
  initialSaved: boolean;
  isAuthenticated: boolean;
  className?: string;
};

const SPARKS = [
  { angle: -90, distance: 36, delay: 0.0 },
  { angle: -45, distance: 32, delay: 0.04 },
  { angle: 0, distance: 36, delay: 0.06 },
  { angle: 45, distance: 32, delay: 0.04 },
  { angle: 90, distance: 36, delay: 0.0 },
  { angle: 135, distance: 32, delay: 0.04 },
  { angle: 180, distance: 36, delay: 0.06 },
  { angle: 225, distance: 32, delay: 0.04 },
];

export function BookmarkToggle({
  recipeId,
  recipeSlug,
  initialSaved,
  isAuthenticated,
  className,
}: BookmarkToggleProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [burstKey, setBurstKey] = useState(0);
  const [toastKey, setToastKey] = useState(0);
  const statusId = useId();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/recipes/${recipeSlug}`)}`);
      return;
    }

    if (isPending) return;

    const previous = saved;
    const next = !previous;
    setSaved(next);
    setError(null);
    if (next) {
      setBurstKey((value) => value + 1);
    }
    setToastKey((value) => value + 1);

    startTransition(async () => {
      const result = await toggleSavedRecipe(recipeId);

      if (!result.ok) {
        setSaved(previous);
        setError(result.error ?? "შენახვა ვერ მოხერხდა.");
        return;
      }

      if (typeof result.saved === "boolean" && result.saved !== next) {
        setSaved(result.saved);
      }
    });
  }

  const toastLabel = error ? error : saved ? "+1 შენახული" : "ამოღებულია";

  return (
    <div className={cn("relative inline-flex", className)}>
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={saved}
        aria-describedby={statusId}
        aria-label={saved ? "შენახულიდან ამოღება" : "რეცეპტის შენახვა"}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 420, damping: 20 }}
        className={cn(
          "relative inline-grid h-[42px] w-[42px] place-items-center overflow-visible rounded-[15px] border border-oat bg-surface text-ink transition-colors hover:border-soft-clay hover:bg-soft-clay focus:outline-none focus-visible:ring-4 focus-visible:ring-soft-clay/60 disabled:cursor-not-allowed disabled:opacity-60",
          saved && "border-clay bg-soft-clay text-clay-dark",
        )}
      >
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[15px]">
          <AnimatePresence>
            {saved ? (
              <motion.span
                key={`pulse-${burstKey}`}
                className="absolute inset-0 rounded-[15px] bg-clay/25"
                initial={{ scale: 0.4, opacity: 0.9 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
          </AnimatePresence>
        </span>

        <AnimatePresence>
          {saved ? (
            <motion.span
              key={`sparks-${burstKey}`}
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {SPARKS.map((spark, index) => {
                const rad = (spark.angle * Math.PI) / 180;
                const x = Math.cos(rad) * spark.distance;
                const y = Math.sin(rad) * spark.distance;
                return (
                  <motion.span
                    key={`spark-${burstKey}-${index}`}
                    className="absolute left-1/2 top-1/2 grid h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-clay"
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{ x, y, scale: [0, 1.1, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 0.7, delay: spark.delay, ease: [0.22, 1, 0.36, 1] }}
                  />
                );
              })}
              <motion.span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-clay"
                initial={{ scale: 0, opacity: 0, rotate: -20 }}
                animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0], rotate: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <Sparkles className="h-5 w-5" />
              </motion.span>
            </motion.span>
          ) : null}
        </AnimatePresence>

        <motion.span
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: 0.7, opacity: 0, rotate: saved ? -180 : 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 16 }}
          className="relative grid place-items-center"
        >
          <Bookmark className={cn("h-4 w-4 transition-colors", saved && "fill-current")} aria-hidden />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {toastKey > 0 ? (
          <motion.span
            key={`toast-${toastKey}`}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: -28, scale: 1 }}
            exit={{ opacity: 0, y: -42, scale: 0.92 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black shadow-soft",
              error ? "bg-danger text-white" : saved ? "bg-clay text-white" : "bg-ink text-white",
            )}
          >
            {toastLabel}
          </motion.span>
        ) : null}
      </AnimatePresence>

      <span id={statusId} className="sr-only" role={error ? "alert" : "status"} aria-live="polite">
        {error ?? (saved ? "რეცეპტი შენახულია." : "რეცეპტი შენახული არ არის.")}
      </span>
    </div>
  );
}
