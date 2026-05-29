"use client";

import { motion } from "framer-motion";
import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { buttonBase, buttonVariants } from "./ui-buttons";

const motionButtonProps = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.96, y: 0 },
  transition: { type: "spring" as const, stiffness: 420, damping: 24 },
};

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
    status === "shared" ? "გაზიარდა" : status === "copied" ? "ბმული დაკოპირდა" : "გაზიარება";
  const Icon = status === "idle" ? Share2 : Check;

  return (
    <motion.button
      type="button"
      onClick={handleShare}
      {...motionButtonProps}
      className={cn(buttonBase, buttonVariants.secondary, "transition-colors duration-200")}
      aria-live="polite"
    >
      <span className="relative z-[1] inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
    </motion.button>
  );
}
