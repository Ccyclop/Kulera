"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import { useRef, type PointerEvent } from "react";
import type { Category } from "@/lib/types";

const cardSpring = { type: "spring" as const, stiffness: 300, damping: 28, mass: 0.7 };
const cardRadius = "rounded-[22px_22px_22px_6px]";

export function CategoryCard({ category }: { category: Category }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const background = useMotionTemplate`radial-gradient(190px circle at ${glowX}% ${glowY}%, rgba(182,84,45,0.14), transparent 68%)`;

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (shouldReduceMotion || event.pointerType !== "mouse") return;

    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    glowX.set(px * 100);
    glowY.set(py * 100);
  }

  function handleLeave() {
    glowX.set(50);
    glowY.set(50);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="group relative h-full"
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
      transition={cardSpring}
    >
      <Link
        href={`/categories/${category.slug}`}
        className={`${cardRadius} relative block h-full min-h-[112px] overflow-hidden border border-oat bg-surface/90 p-4 text-ink no-underline shadow-soft transition-[background-color,border-color,box-shadow] duration-300 ease-out group-hover:border-sand group-hover:bg-surface group-hover:shadow-[0_18px_46px_-24px_rgba(31,26,23,0.36)] group-focus-within:border-clay/40 group-focus-within:shadow-[0_18px_46px_-24px_rgba(31,26,23,0.36)]`}
      >
        <motion.span
          aria-hidden
          className={`${cardRadius} pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:hidden`}
          style={{ background }}
        />
        <span
          aria-hidden
          className={`${cardRadius} pointer-events-none absolute inset-0 ring-1 ring-inset ring-transparent transition duration-300 ease-out group-hover:ring-clay/10 group-focus-within:ring-clay/15`}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
        />
        <div className="relative grid h-full min-h-[84px] content-between">
          <div className="flex items-start justify-between gap-3">
            <span
              className="relative block h-8 w-11 overflow-hidden rounded-[13px] shadow-[inset_0_0_0_1px_rgba(31,26,23,0.06)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-105 group-focus-within:-translate-y-0.5 group-focus-within:scale-105 motion-reduce:transition-none"
              style={{ background: category.tone }}
            >
              <span
                className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.42)]"
                style={{ background: category.dot }}
              />
            </span>
            <span
              aria-hidden
              className="grid h-7 w-7 translate-x-1 -translate-y-1 place-items-center rounded-full border border-oat/80 bg-surface/90 text-clay opacity-0 shadow-soft transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none"
            >
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
          </div>
          <span>
            <strong className="block text-[15px] font-black leading-tight transition-colors duration-200 group-hover:text-clay">
              {category.name}
            </strong>
            <span className="mt-1.5 block text-xs font-bold text-muted">{category.recipeCount} რეცეპტი</span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
