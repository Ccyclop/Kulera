"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export const buttonBase =
  "group/btn relative inline-flex min-h-[42px] items-center justify-center gap-2 overflow-hidden rounded-[15px] px-4 text-[13px] font-black no-underline focus:outline-none focus-visible:ring-4 focus-visible:ring-soft-clay/60 disabled:cursor-not-allowed disabled:opacity-55";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-clay bg-clay text-white hover:border-clay-dark hover:bg-clay-dark hover:shadow-[0_10px_30px_-12px_rgba(182,84,45,0.55)]",
  secondary:
    "border border-oat bg-surface text-ink hover:border-sand hover:bg-[#FAF6F0] hover:shadow-[0_10px_30px_-14px_rgba(31,26,23,0.18)]",
  ghost: "border border-transparent bg-transparent text-muted hover:bg-sage-light hover:text-sage",
  danger: "border border-danger/25 bg-danger/10 text-danger hover:bg-danger hover:text-white",
};

export const motionButtonProps = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.96, y: 0 },
  transition: { type: "spring" as const, stiffness: 420, damping: 24 },
};

export function ButtonShine({ variant }: { variant: ButtonVariant }) {
  if (variant === "ghost") return null;
  const tint =
    variant === "primary" || variant === "danger" ? "via-white/30" : "via-clay/15";
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full motion-reduce:hidden",
        tint,
      )}
    />
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <motion.button
      {...motionButtonProps}
      className={cn(buttonBase, buttonVariants[variant], "transition-colors duration-200", className)}
      {...(props as object)}
    >
      <ButtonShine variant={variant} />
      <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.span {...motionButtonProps} className="inline-flex">
      <Link
        href={href}
        className={cn(buttonBase, buttonVariants[variant], "transition-colors duration-200", className)}
      >
        <ButtonShine variant={variant} />
        <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
      </Link>
    </motion.span>
  );
}
