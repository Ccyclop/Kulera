"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "./ui";

export function SearchInput({
  placeholder = "რეცეპტი ან ინგრედიენტი...",
  dark = false,
  initialQuery = "",
}: {
  placeholder?: string;
  dark?: boolean;
  initialQuery?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetPath = "/search";
    const nextQuery = value.trim();
    const params = pathname === targetPath ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }
    params.delete("cursor");

    const queryString = params.toString();
    const href = queryString ? `${targetPath}?${queryString}` : targetPath;

    startTransition(() => {
      if (pathname === targetPath) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href);
      }
    });
  }

  return (
    <motion.form
      action="/search"
      method="get"
      onSubmit={handleSubmit}
      animate={{
        scale: focused ? 1.01 : 1,
        boxShadow: focused
          ? dark
            ? "0 0 0 4px rgba(255,249,239,0.18)"
            : "0 0 0 4px rgba(182,84,45,0.18)"
          : "0 0 0 0 rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={
        dark
          ? "mt-9 grid min-h-[86px] w-full max-w-[735px] grid-cols-1 items-center gap-3 rounded-[25px] border border-white/20 bg-white/10 p-3 pl-5 md:grid-cols-[1fr_auto]"
          : "grid min-h-[62px] grid-cols-1 items-center gap-3 rounded-[22px] border border-oat bg-surface p-3 md:grid-cols-[1fr_auto]"
      }
    >
      <label className="flex min-w-0 items-center gap-3">
        <motion.span
          animate={{ rotate: focused ? -10 : 0, scale: focused ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          <Search className={dark ? "h-5 w-5 shrink-0 text-soft-clay" : "h-5 w-5 shrink-0 text-clay"} />
        </motion.span>
        <input
          name="q"
          type="search"
          aria-label={t("რეცეპტის ძიება")}
          placeholder={t(placeholder)}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={
            dark
              ? "min-h-12 w-full bg-transparent text-base font-bold text-[#FFF9EF] outline-none placeholder:text-sand"
              : "min-h-12 w-full bg-transparent text-base font-bold text-ink outline-none placeholder:text-muted"
          }
        />
      </label>
      <Button type="submit" className="w-full min-h-[52px] md:w-auto md:min-w-[132px]" disabled={isPending}>
        {t("ვიპოვოთ")}
      </Button>
    </motion.form>
  );
}
