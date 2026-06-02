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

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <motion.nav
      aria-label={t("მობილური ნავიგაცია")}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-oat bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl lg:hidden"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative grid place-items-center gap-1 rounded-[15px] px-1 py-1.5 text-[10px] font-black no-underline transition-colors duration-200 active:scale-95",
              isActive ? "text-clay" : "text-muted hover:text-ink",
            )}
          >
            <span className="relative grid h-9 w-9 place-items-center">
              {isActive ? (
                <motion.span
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 rounded-full bg-soft-clay shadow-soft"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <motion.span
                className={cn(
                  "relative grid h-9 w-9 place-items-center rounded-full",
                  isActive ? "text-clay-dark" : "text-muted group-hover:bg-paper",
                )}
                whileTap={{ scale: 0.88 }}
                animate={isActive ? { y: -2 } : { y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Icon className="h-4 w-4" />
              </motion.span>
            </span>
            <span className="grid min-h-[22px] max-w-full place-items-start text-center text-[9px] leading-[1.08]">
              <span className="max-w-full truncate">{t(tab.label)}</span>
            </span>
          </Link>
        );
      })}
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
