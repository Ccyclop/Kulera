"use client";

import { Languages } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";
import { nextLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/shared";

const localeLabel: Record<Locale, string> = {
  ka: "KA",
  en: "EN",
};

export function LanguageSwitcher({
  variant = "segmented",
  className,
}: {
  variant?: "segmented" | "compact";
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
          "inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-[15px] border border-oat bg-surface px-3 text-[12px] font-black text-ink transition-colors duration-200 hover:border-clay hover:bg-soft-clay/40 disabled:opacity-60",
          className,
        )}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 360, damping: 22 }}
      >
        <Languages className="h-4 w-4 text-clay" aria-hidden />
        {localeLabel[locale]}
      </motion.button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex min-h-[42px] items-center gap-1 rounded-[15px] border border-oat bg-paper/75 p-1",
        className,
      )}
      aria-label={t("ენის არჩევა")}
      role="group"
    >
      <span className="grid h-8 w-8 place-items-center text-clay" aria-hidden>
        <Languages className="h-4 w-4" />
      </span>
      {SUPPORTED_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          disabled={pending || item === locale}
          className={cn(
            "grid min-h-8 min-w-10 place-items-center rounded-[11px] px-2 text-[11px] font-black transition-colors duration-200",
            item === locale ? "bg-surface text-clay shadow-soft" : "text-muted hover:bg-surface hover:text-ink",
          )}
          aria-pressed={item === locale}
        >
          {localeLabel[item]}
        </button>
      ))}
    </div>
  );
}
