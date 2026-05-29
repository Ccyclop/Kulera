"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/brand-logo";
import { useI18n } from "@/components/i18n-provider";

const links = [
  { href: "/search", label: "ძიება" },
  { href: "/categories", label: "კატეგორიები" },
  { href: "/top-kulinaris", label: "ტოპ კულინარები" },
  { href: "/recipes/add", label: "რეცეპტის დამატება" },
  { href: "/about", label: "Kulera-ს შესახებ" },
];

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="kulera-container border-t border-oat/80 py-10 text-sm text-muted">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="block w-fit no-underline" aria-label={t("Kulera home")}>
            <motion.span
              className="inline-block"
              whileHover={{ scale: 1.05, rotate: -1.5 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              <BrandLogo className="h-10 w-[126px]" />
            </motion.span>
          </Link>
          <span className="mt-1 block">{t("კულინარიის კერა ყოველდღიური არჩევანისთვის.")}</span>
        </div>
        <nav className="flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group/foot relative inline-flex font-bold no-underline transition-colors duration-200 hover:text-clay"
            >
              <span>{t(link.label)}</span>
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-0.5 left-0 h-[2px] w-0 rounded-full bg-clay transition-all duration-300 ease-out group-hover/foot:w-full"
              />
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
