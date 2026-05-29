"use client";

import { createContext, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  getTranslator,
  LOCALE_COOKIE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/shared";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: ReturnType<typeof getTranslator>;
  pending: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(() => normalizeLocale(initialLocale));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const setLocale = (nextLocale: Locale) => {
      const normalized = normalizeLocale(nextLocale);
      document.cookie = `${LOCALE_COOKIE}=${normalized}; Path=/; Max-Age=31536000; SameSite=Lax`;
      setLocaleState(normalized);
      document.documentElement.lang = normalized;
      startTransition(() => {
        router.refresh();
      });
    };

    return {
      locale,
      setLocale,
      t: getTranslator(locale),
      pending,
    };
  }, [locale, pending, router]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (context) return context;

  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => undefined,
    t: getTranslator(DEFAULT_LOCALE),
    pending: false,
  };
}
