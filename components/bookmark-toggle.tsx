"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { toggleSavedRecipe } from "@/lib/actions/social";
import { cn } from "@/lib/cn";

type BookmarkToggleProps = {
  recipeId: string;
  recipeSlug: string;
  initialSaved: boolean;
  isAuthenticated: boolean;
  className?: string;
};

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
  const statusId = useId();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/recipes/${recipeSlug}`)}`);
      return;
    }

    if (isPending) return;

    const previous = saved;
    setSaved(!previous);
    setError(null);

    startTransition(async () => {
      const result = await toggleSavedRecipe(recipeId);

      if (!result.ok) {
        setSaved(previous);
        setError(result.error ?? "შენახვა ვერ მოხერხდა.");
        return;
      }

      if (typeof result.saved === "boolean") {
        setSaved(result.saved);
      }

      router.refresh();
    });
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={saved}
        aria-describedby={statusId}
        aria-label={saved ? "შენახულიდან ამოღება" : "რეცეპტის შენახვა"}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className={cn(
          "relative inline-grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-[15px] border border-oat bg-surface text-ink transition-colors hover:border-soft-clay hover:bg-soft-clay focus:outline-none focus-visible:ring-4 focus-visible:ring-soft-clay/60 disabled:cursor-not-allowed disabled:opacity-60",
          saved && "border-soft-clay bg-soft-clay text-clay-dark",
          className,
        )}
      >
        <AnimatePresence>
          {saved ? (
            <motion.span
              key="pulse"
              className="absolute inset-0 rounded-[15px] bg-clay/15"
              initial={{ scale: 0.4, opacity: 0.8 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
        </AnimatePresence>
        <motion.span
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="relative grid place-items-center"
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} aria-hidden />
        </motion.span>
      </motion.button>
      <span id={statusId} className="sr-only" role={error ? "alert" : "status"} aria-live="polite">
        {error ?? (saved ? "რეცეპტი შენახულია." : "რეცეპტი შენახული არ არის.")}
      </span>
    </>
  );
}
