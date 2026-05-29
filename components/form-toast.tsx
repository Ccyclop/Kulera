"use client";

import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";

export function FormToast({
  message,
  toastKey,
}: {
  message?: string | null;
  toastKey?: number;
}) {
  const { t } = useI18n();

  if (!message) return null;

  return (
    <div
      key={toastKey}
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-5 left-4 right-4 z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-[18px] border border-sage-light bg-surface px-4 py-3 text-sm font-extrabold text-sage shadow-panel",
        "md:left-auto md:right-6 md:mx-0",
      )}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
      <span>{t(message)}</span>
    </div>
  );
}
