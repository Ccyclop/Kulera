"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function FocusDialog({
  children,
  className,
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  className?: string;
  labelledBy: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      const focusable = panel?.querySelectorAll<HTMLElement>(focusableSelector);
      (focusable?.[0] ?? panel)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (!panel) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) => element.offsetParent !== null,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn("w-full max-w-md rounded-[24px] border border-danger/20 bg-surface p-5 shadow-panel outline-none", className)}
      >
        {children}
      </div>
    </div>
  );
}
