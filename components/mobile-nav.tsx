"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, Home, LogIn, Menu, Plus, Search, UserRound, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";

const drawerLinks = [
  { href: "/", label: "მთავარი" },
  { href: "/search", label: "ძიება" },
  { href: "/categories", label: "კატეგორიები" },
  { href: "/top-kulinaris", label: "ტოპ კულინარები" },
  { href: "/saved", label: "შენახული" },
  { href: "/recipes/add", label: "რეცეპტის დამატება" },
  { href: "/about", label: "Kulera-ს შესახებ" },
];

const tabs = [
  { href: "/", label: "მთავარი", icon: Home, match: (p: string) => p === "/" },
  { href: "/search", label: "ძიება", icon: Search, match: (p: string) => p.startsWith("/search") },
  { href: "/recipes/add", label: "დამატება", icon: Plus, match: (p: string) => p.startsWith("/recipes/add") },
  { href: "/saved", label: "შენახული", icon: Heart, match: (p: string) => p.startsWith("/saved") },
  { href: "/account", label: "პროფილი", icon: UserRound, match: (p: string) => p.startsWith("/account") },
];

export function MobileMenuButton({ onOpen, open }: { onOpen: () => void; open: boolean }) {
  const { t } = useI18n();

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={t("მენიუს გახსნა")}
      aria-expanded={open}
      className="grid h-[42px] w-[42px] place-items-center rounded-[15px] border border-oat bg-surface text-ink lg:hidden"
      whileHover={{ y: -2, borderColor: "var(--clay)" }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.span
        animate={{ rotate: open ? 90 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="grid place-items-center"
      >
        <Menu className="h-5 w-5" />
      </motion.span>
    </motion.button>
  );
}

export function MobileDrawer({
  open,
  onClose,
  isAuthenticated,
}: {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  const reduce = useReducedMotion();

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("ნავიგაცია")}
          initial={{ pointerEvents: "auto" }}
        >
          <motion.button
            type="button"
            aria-label={t("დახურვა")}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 flex w-[min(320px,86vw)] flex-col overflow-y-auto border-l border-oat bg-surface px-6 py-5 shadow-panel"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-center justify-between">
              <BrandLogo className="h-9 w-[114px]" />
              <motion.button
                type="button"
                onClick={onClose}
                aria-label={t("დახურვა")}
                className="grid h-10 w-10 place-items-center rounded-[15px] border border-oat bg-surface text-ink"
                whileHover={{ rotate: 90, borderColor: "var(--clay)" }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
            <div className="mb-5">
              <LanguageSwitcher variant="panel" />
            </div>
            <nav className="grid gap-1" aria-label={t("მობილური ნავიგაცია")}>
              {drawerLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "block min-h-[48px] truncate rounded-[15px] px-4 py-3 text-[15px] font-black no-underline transition-all duration-300 ease-out",
                      isActive
                        ? "bg-soft-clay text-clay-dark"
                        : "text-ink hover:translate-x-1 hover:bg-paper active:scale-[0.98]",
                    )}
                  >
                    {t(link.label)}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto grid gap-2 pt-6">
              {isAuthenticated ? (
                <Link
                  href="/account"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-4 text-sm font-black text-ink no-underline transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                >
                  <UserRound className="h-4 w-4" />
                  {t("პროფილი")}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[15px] border border-clay bg-clay px-4 text-sm font-black text-white no-underline transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-clay-dark active:translate-y-0 active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4" />
                  {t("შესვლა")}
                </Link>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

// Brand-canonical motion tokens (mirrors components/motion.tsx + the spring used
// across the app). The chip + its spotlight share ONE spring so they stay
// phase-locked frame-for-frame as the active tab changes.
const NAV_EASE = [0.22, 1, 0.36, 1] as const;
const NAV_SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;
const TAP_SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;

// "Ribbon Rail" — a floating glazed bar. A single shared `layoutId` chip slides
// AND resizes between tabs; the active tab grows (flexGrow) to reveal its
// Georgian word at 13px while inactive tabs keep a calm 10px label so all five
// destinations stay scannable one-handed. The central Add(+) tab gets the only
// solid-clay chip plus a twist + landing ring-pulse to mark the create action.
export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const reduce = useReducedMotion();
  // Springs bypass the global prefers-reduced-motion CSS, so gate them in JS:
  // the chip jumps instead of sliding, but color + grown shape still indicate
  // the active tab, so no information depends on motion.
  const indicator = reduce ? { duration: 0 } : NAV_SPRING;

  return (
    <motion.nav
      aria-label={t("მობილური ნავიგაცია")}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),6px)] lg:hidden"
      initial={reduce ? { opacity: 0 } : { y: 20, opacity: 0 }}
      animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: NAV_EASE, delay: 0.1 }}
    >
      <div
        className="relative mx-auto flex h-[58px] w-full max-w-[440px] items-center gap-1 overflow-hidden rounded-[30px] border border-oat bg-surface/90 px-1.5 shadow-panel backdrop-blur-xl"
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match(pathname);
          const isAdd = tab.href === "/recipes/add";

          return (
            <motion.div
              key={tab.href}
              layout
              transition={indicator}
              // Active tab sizes to its own content so its Georgian word never
              // clips; inactive icon-tabs flex-fill the rest equally with a 44px
              // tap-target floor.
              style={
                isActive
                  ? { flexGrow: 0, flexShrink: 0, flexBasis: "auto" }
                  : { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 44 }
              }
            >
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={t(tab.label)}
                className="relative grid min-h-[48px] place-items-center rounded-[20px] no-underline"
              >
                {isActive ? (
                  <>
                    {/* Warm spotlight glow — a STATIC pre-blurred radial whose
                        POSITION animates with the chip's exact spring (never its
                        blur radius), so the light sweeps locked to the chip. */}
                    <motion.span
                      layoutId="kulera-nav-spot"
                      initial={false}
                      transition={indicator}
                      aria-hidden
                      className="pointer-events-none absolute -top-2 left-1/2 h-10 w-24 -translate-x-1/2 rounded-full bg-clay/20 blur-2xl"
                    />
                    {/* The signature chip — soft-clay for browse tabs, solid clay
                        for Add. Shared layoutId makes framer FLIP it across the
                        rail with no manual x/width math. */}
                    <motion.span
                      layoutId="kulera-nav-chip"
                      initial={false}
                      transition={indicator}
                      aria-hidden
                      className="absolute inset-0 rounded-[20px] bg-clay ring-1 ring-white/25"
                    />
                    {/* One-shot "lit the fire" ripple when you land on Add. */}
                    {isAdd && !reduce ? (
                      <motion.span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[20px] ring-2 ring-soft-clay"
                        initial={{ scale: 0.85, opacity: 0.55 }}
                        animate={{ scale: 1.35, opacity: 0 }}
                        transition={{ duration: 0.55, ease: NAV_EASE }}
                      />
                    ) : null}
                  </>
                ) : null}

                {/* Instant pointer-down depress masks App-Router route-commit
                    latency — the chip only slides once the pathname updates. */}
                <motion.span
                  className={cn(
                    "relative z-10 flex items-center justify-center",
                    isActive ? "flex-row gap-2 px-3" : "",
                  )}
                  whileTap={{ scale: reduce ? 0.97 : 0.94 }}
                  transition={TAP_SPRING}
                >
                  <motion.span
                    className={cn(
                      "grid place-items-center rounded-full transition-colors duration-200",
                      !isActive && isAdd
                        ? "h-9 w-9 bg-clay text-white shadow-[0_2px_10px_rgba(182,84,45,0.45)]"
                        : "",
                      isActive ? "text-white" : !isAdd ? "text-muted" : "",
                    )}
                    animate={
                      isActive && !reduce
                        ? { scale: [1, 1.14, 1.06], y: [0, -2, -1] }
                        : { scale: 1, y: 0 }
                    }
                    transition={{ duration: 0.32, ease: NAV_EASE }}
                  >
                    {isAdd ? (
                      <motion.span
                        className="grid place-items-center"
                        animate={isActive && !reduce ? { rotate: [0, 90, 0] } : { rotate: 0 }}
                        transition={{ duration: 0.4, ease: NAV_EASE }}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2.5} />
                      </motion.span>
                    ) : (
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                    )}
                  </motion.span>

                  {isActive ? (
                    <motion.span
                      className="whitespace-nowrap text-[13px] font-black leading-none tracking-[-0.01em] text-white"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 8, filter: "blur(3px)" }}
                      animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, filter: "blur(0px)" }}
                      transition={
                        reduce ? { duration: 0 } : { duration: 0.26, ease: NAV_EASE, delay: 0.12 }
                      }
                    >
                      {t(tab.label)}
                    </motion.span>
                  ) : null}
                </motion.span>
              </Link>
            </motion.div>
          );
        })}

        {/* Specular top hairline — a static lit upper-lip depth cue. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-px z-20 h-px rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
        />
      </div>
    </motion.nav>
  );
}

export function MobileNavToggle({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);
  return (
    <>
      <MobileMenuButton onOpen={handleOpen} open={open} />
      <MobileDrawer open={open} onClose={handleClose} isAuthenticated={isAuthenticated} />
    </>
  );
}
