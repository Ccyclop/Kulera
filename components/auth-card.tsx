"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";

export function AuthCard({ children, title, description }: { children: ReactNode; title: string; description?: string }) {
  const { t } = useI18n();

  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <section className="soft-card w-full max-w-[440px] rounded-[30px] p-7">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex w-fit items-center no-underline" aria-label={t("Kulera home")}>
            <BrandLogo className="h-[50px] w-[158px]" priority />
          </Link>
          <LanguageSwitcher variant="compact" />
        </div>
        <h1 className="mt-7 text-4xl font-black leading-tight">{t(title)}</h1>
        {description ? <p className="mt-3 text-sm leading-relaxed text-muted">{t(description)}</p> : null}
        {children}
      </section>
    </main>
  );
}
