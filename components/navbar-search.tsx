"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";

type PreviewResult = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  categoryName: string;
  cookingTime: number;
  rating: number;
};

export function NavbarSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [results, setResults] = useState<PreviewResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const listboxId = useId();

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search request failed");
        const data = (await response.json()) as { results: PreviewResult[]; totalCount?: number };
        setResults(data.results ?? []);
        setTotalCount(data.totalCount ?? data.results?.length ?? 0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setTotalCount(0);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function goToFullSearch(query: string) {
    const trimmed = query.trim();
    const href = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
    setOpen(false);
    startTransition(() => {
      router.push(href);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToFullSearch(value);
  }

  const trimmed = value.trim();
  const showDropdown = open && trimmed.length > 0;
  const hasResults = results.length > 0;
  const showLoading = trimmed.length > 0 && loading;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search" className="w-full">
        <label
          className="group/search relative isolate inline-flex h-[42px] w-full transform-gpu items-center gap-2 rounded-[15px] border border-oat bg-surface px-4 text-[13px] font-bold text-muted transition-all duration-300 ease-out before:pointer-events-none before:absolute before:inset-x-5 before:-bottom-2 before:-z-10 before:h-3 before:rounded-full before:bg-clay/35 before:opacity-0 before:blur-lg before:transition-all before:duration-300 before:ease-out focus-within:-translate-y-1 focus-within:border-clay focus-within:bg-soft-clay/30 focus-within:text-ink focus-within:shadow-[0_16px_34px_-18px_rgba(182,84,45,0.75)] focus-within:before:opacity-100 hover:-translate-y-1 hover:border-clay hover:bg-soft-clay/40 hover:text-ink hover:shadow-[0_16px_34px_-18px_rgba(182,84,45,0.75)] hover:before:opacity-100 motion-reduce:focus-within:translate-y-0 motion-reduce:hover:translate-y-0"
          aria-label="რეცეპტის ძიება"
        >
          <motion.span
            className="grid place-items-center"
            animate={{ rotate: open && trimmed ? -10 : 0, scale: open && trimmed ? 1.1 : 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
          >
            {showLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-clay" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-clay" />
            )}
          </motion.span>
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="კერძი ან ინგრედიენტი"
            aria-autocomplete="list"
            aria-controls={listboxId}
            className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-bold text-ink outline-none placeholder:text-muted"
          />
        </label>
      </form>

      <AnimatePresence>
        {showDropdown ? (
          <motion.div
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[18px] border border-oat bg-surface shadow-[0_24px_60px_-24px_rgba(31,26,23,0.35)]"
          >
            {showLoading && !hasResults ? (
              <div className="grid place-items-center px-4 py-6 text-[13px] font-bold text-muted">
                ვეძებთ...
              </div>
            ) : hasResults ? (
              <>
                <ul className="grid">
                  {results.map((recipe) => (
                    <li key={recipe.id}>
                      <Link
                        href={`/recipes/${recipe.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 border-b border-oat/60 px-3 py-2.5 no-underline transition-colors duration-200 last:border-b-0 hover:bg-soft-clay/30"
                      >
                        <span className="relative grid h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-placeholder">
                          <Image
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </span>
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-[13px] font-black text-ink">
                            {recipe.title}
                          </span>
                          <span className="truncate text-[11px] font-bold text-muted">
                            {recipe.categoryName} • {recipe.cookingTime} წთ
                            {recipe.rating > 0 ? ` • ★ ${recipe.rating.toFixed(1)}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => goToFullSearch(value)}
                  disabled={isPending}
                  className="flex w-full items-center justify-center gap-2 border-t border-oat bg-paper/60 px-4 py-3 text-[12px] font-black uppercase tracking-wide text-clay transition-colors duration-200 hover:bg-soft-clay/40 disabled:opacity-60"
                >
                  ყველა შედეგი{totalCount > results.length ? ` (${totalCount})` : ""}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <div className="grid gap-2 px-4 py-5 text-center">
                <span className="text-[13px] font-black text-ink">შედეგი ვერ მოიძებნა</span>
                <button
                  type="button"
                  onClick={() => goToFullSearch(value)}
                  className="text-[12px] font-bold text-clay underline-offset-2 hover:underline"
                >
                  ვცადოთ სრულ ძიებაში
                </button>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
