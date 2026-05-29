"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";

const buttonBase =
  "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[15px] px-4 text-[13px] font-black no-underline transition focus:outline-none focus:ring-4 focus:ring-soft-clay/50";

export function RouteError({
  error,
  reset,
  title = "რაღაც შეცდომა მოხდა",
  description = "ვერ მოვახერხეთ ამ გვერდის ჩატვირთვა. სცადე თავიდან ან დაბრუნდი მთავარზე.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="kulera-container grid min-h-[100dvh] place-items-center py-12">
      <section
        role="alert"
        aria-live="assertive"
        className="soft-card grid w-full max-w-xl gap-5 rounded-[30px] px-6 py-10 text-center"
      >
        <Link href="/" className="mx-auto block w-fit no-underline" aria-label={t("Kulera home")}>
          <BrandLogo className="h-10 w-[126px]" />
        </Link>
        <div className="mx-auto grid h-[76px] w-[76px] place-items-center rounded-3xl bg-danger/10 text-2xl font-black text-danger">
          !
        </div>
        <div>
          <h1 className="text-2xl font-black leading-tight">{t(title)}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{t(description)}</p>
          {error.digest ? (
            <p className="mt-3 text-[11px] font-extrabold text-muted">ID: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className={cn(buttonBase, "border border-clay bg-clay text-white hover:border-clay-dark hover:bg-clay-dark")}
          >
            <RotateCcw className="h-4 w-4" />
            {t("თავიდან ცდა")}
          </button>
          <Link
            href="/"
            className={cn(buttonBase, "border border-oat bg-surface text-ink hover:border-sand hover:bg-[#FAF6F0]")}
          >
            <Home className="h-4 w-4" />
            {t("მთავარზე დაბრუნება")}
          </Link>
        </div>
      </section>
    </main>
  );
}
