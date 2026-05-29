"use client";

import { motion } from "framer-motion";
import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";
import { ButtonShine, buttonBase, buttonVariants, motionButtonProps } from "./ui-buttons";

type Status = "idle" | "shared" | "copied";

export function ShareButton({
  title,
  description,
  slug,
}: {
  title: string;
  description?: string;
  slug: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const { t } = useI18n();

  async function handleShare() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/recipes/${slug}` : `/recipes/${slug}`;

    const shareData: ShareData = {
      title,
      text: description ? `${title} — ${description}` : title,
      url,
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function" && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        setStatus("shared");
        window.setTimeout(() => setStatus("idle"), 1800);
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("idle");
    }
  }

  const label =
    status === "shared" ? t("გაზიარდა") : status === "copied" ? t("ბმული დაკოპირდა") : t("გაზიარება");
  const Icon = status === "idle" ? Share2 : Check;

  return (
    <motion.button
      type="button"
      onClick={handleShare}
      {...motionButtonProps}
      className={cn(buttonBase, buttonVariants.secondary, "transition-colors duration-200")}
      aria-live="polite"
    >
      <ButtonShine variant="secondary" />
      <span className="relative z-[1] inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
    </motion.button>
  );
}
