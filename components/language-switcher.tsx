"use client";

import { motion } from "framer-motion";
import { Check, Globe } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";
import { nextLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/shared";

const localeLabel: Record<Locale, string> = {
  ka: "KA",
  en: "EN",
};

const localeName: Record<Locale, string> = {
  ka: "ქართული",
  en: "English",
};

export function LanguageSwitcher({
  variant = "segmented",
  className,
}: {
  variant?: "segmented" | "compact" | "panel";
  className?: string;
}) {
  const { locale, setLocale, t, pending } = useI18n();

  if (variant === "compact") {
    const target = nextLocale(locale);

    return (
      <motion.button
        type="button"
        onClick={() => setLocale(target)}
        disabled={pending}
        aria-label={t("ენის შეცვლა")}
        className={cn(
          "inline-flex min-h-[38px] items-center justify-center rounded-full border border-oat bg-surface px-3 text-[11px] font-black tracking-normal text-muted transition-colors duration-200 hover:border-clay hover:bg-soft-clay/35 hover:text-clay disabled:opacity-60",
          className,
        )}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 360, damping: 22 }}
      >
        <span className="text-clay">{localeLabel[locale]}</span>
        <span className="px-1 text-muted/45" aria-hidden>
          /
        </span>
        <span>{localeLabel[target]}</span>
      </motion.button>
    );
  }

  if (variant === "panel") {
    return (
      <div
        className={cn("flex flex-col gap-2", className)}
        role="group"
        aria-label={t("ენის არჩევა")}
      >
        <span className="flex items-center gap-1.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
          <Globe className="h-3.5 w-3.5" />
          {t("ენა")}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_LOCALES.map((item) => {
            const active = item === locale;
            return (
              <motion.button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                disabled={pending}
                aria-pressed={active}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex items-center justify-center rounded-2xl border px-3 py-2.5 transition-all duration-300 disabled:cursor-default",
                  active
                    ? "border-clay bg-soft-clay/45 shadow-soft"
                    : "border-oat bg-surface hover:border-clay/40 hover:bg-paper",
                )}
              >
                <span className={cn("text-[14px] font-black", active ? "text-clay-dark" : "text-ink")}>
                  {localeName[item]}
                </span>
                {active ? (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 24 }}
                    className="absolute -right-1 -top-1 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-surface bg-clay text-white"
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </motion.span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex min-h-[38px] items-center gap-0.5 rounded-full border border-oat bg-paper/70 p-0.5",
        className,
      )}
      aria-label={t("ენის არჩევა")}
      role="group"
    >
      {SUPPORTED_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          disabled={pending || item === locale}
          className={cn(
            "grid min-h-8 min-w-[42px] place-items-center rounded-full px-3 text-[11px] font-black tracking-normal transition-colors duration-200",
            item === locale ? "bg-clay text-white shadow-soft" : "text-muted hover:bg-surface hover:text-ink",
          )}
          aria-pressed={item === locale}
        >
          {localeLabel[item]}
        </button>
      ))}
    </div>
  );
}
