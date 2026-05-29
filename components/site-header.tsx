"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, LogIn, Plus, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { MobileNavToggle } from "@/components/mobile-nav";
import { MobileSearchToggle } from "@/components/mobile-search";
import { NavbarSearch } from "@/components/navbar-search";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/", label: "რეცეპტები", match: ["/", "/recipes", "/search"] },
  { href: "/categories", label: "კატეგორიები", match: ["/categories"] },
  { href: "/top-kulinaris", label: "ტოპ", match: ["/top-kulinaris", "/cooks"] },
  { href: "/#latest-recipes", label: "ახალი", match: ["#latest"] },
  { href: "/about", label: "ჩვენ შესახებ", match: ["/about"] },
];

export function SiteHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname();

  return (
    <motion.header
      className="sticky top-0 z-30 grid min-h-[78px] grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-oat/90 bg-surface/90 px-[clamp(18px,5vw,76px)] py-4 backdrop-blur-xl md:grid-cols-1 xl:grid-cols-[minmax(210px,auto)_minmax(360px,560px)_auto] xl:gap-7 xl:py-0"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href="/" className="flex w-fit items-center no-underline" aria-label="Kulera home">
        <motion.span
          whileHover={{ scale: 1.04, rotate: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}
          className="inline-block"
        >
          <BrandLogo className="h-[46px] w-[145px]" priority />
        </motion.span>
      </Link>

      <nav
        className="hidden justify-self-start overflow-x-auto rounded-full border border-oat bg-paper/80 p-1 md:flex xl:justify-self-center"
        aria-label="Primary"
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/recipes") || pathname === "/search"
              : item.match.some((match) => pathname.startsWith(match));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group/nav relative grid min-h-[34px] shrink-0 place-items-center rounded-full px-4 text-[13px] font-extrabold no-underline transition-colors duration-200",
                isActive ? "text-clay" : "text-muted hover:text-ink",
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="primary-nav-pill"
                  className="absolute inset-0 -z-0 rounded-full bg-surface shadow-soft"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative z-10">{item.label}</span>
              {!isActive ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-1 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-clay transition-all duration-300 ease-out group-hover/nav:w-[60%]"
                />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="hidden flex-wrap items-center justify-end gap-2 md:flex xl:flex-nowrap">
        <div className="inline-flex min-h-[42px] min-w-0 flex-1 xl:flex-none xl:w-[min(280px,22vw)]">
          <NavbarSearch />
        </div>
        <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}>
          <Link
            href="/saved"
            className="group/heart grid h-[42px] w-[42px] place-items-center rounded-[15px] border border-oat bg-surface text-ink no-underline transition-colors duration-200 hover:border-clay hover:bg-soft-clay/50 hover:text-clay"
            aria-label="შენახული"
          >
            <Heart className="h-4 w-4 transition-transform duration-300 group-hover/heart:scale-125 group-hover/heart:fill-current" />
          </Link>
        </motion.span>
        <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 360, damping: 22 }}>
          <Link
            href="/recipes/add"
            className="group/add inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-4 text-[13px] font-black text-ink no-underline transition-colors duration-200 hover:border-clay hover:bg-soft-clay/40"
          >
            <Plus className="hidden h-4 w-4 transition-transform duration-300 group-hover/add:rotate-90 sm:block" />
            დამატება
          </Link>
        </motion.span>
        {isAuthenticated ? (
          <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 360, damping: 22 }}>
            <Link
              href="/account"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-4 text-[13px] font-black text-ink no-underline transition-colors duration-200 hover:border-clay hover:bg-soft-clay/40"
              aria-label="პროფილი"
            >
              <UserRound className="h-4 w-4" />
              <span className="hidden sm:inline">პროფილი</span>
            </Link>
          </motion.span>
        ) : (
          <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 360, damping: 22 }}>
            <Link
              href="/login"
              className="group/login relative inline-flex min-h-[42px] items-center justify-center gap-2 overflow-hidden rounded-[15px] border border-clay bg-clay px-4 text-[13px] font-black text-white no-underline transition-colors duration-200 hover:bg-clay-dark hover:shadow-[0_10px_28px_-12px_rgba(182,84,45,0.6)]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-all duration-700 ease-out group-hover/login:left-[120%] group-hover/login:opacity-100 motion-reduce:hidden"
              />
              <LogIn className="relative h-4 w-4 transition-transform duration-300 group-hover/login:translate-x-0.5" />
              <span className="relative hidden sm:inline">შესვლა</span>
            </Link>
          </motion.span>
        )}
      </div>

      <div className="flex items-center gap-2 justify-self-end md:hidden">
        <MobileSearchToggle />
        <MobileNavToggle isAuthenticated={isAuthenticated} />
      </div>
    </motion.header>
  );
}
