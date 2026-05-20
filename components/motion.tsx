"use client";

import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, type HTMLMotionProps, type Transition, type Variants } from "framer-motion";
import { Children, isValidElement, useEffect, useRef, type ReactNode } from "react";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_SOFT = [0.4, 0, 0.2, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
};

const defaultTransition: Transition = { duration: 0.55, ease: EASE_OUT };

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  variant?: "fadeUp" | "fadeIn" | "popIn" | "slideRight";
  as?: "div" | "section" | "article" | "header" | "footer" | "aside" | "ul" | "li" | "span";
  once?: boolean;
  amount?: number;
  id?: string;
};

const variantMap = {
  fadeUp,
  fadeIn,
  popIn,
  slideRight,
};

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.55,
  variant = "fadeUp",
  as = "div",
  once = true,
  amount = 0.2,
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once, amount });
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      ref={ref as never}
      id={id}
      className={className}
      variants={variantMap[variant]}
      initial={reduce ? "visible" : "hidden"}
      animate={reduce ? "visible" : inView ? "visible" : "hidden"}
      transition={{ duration, ease: EASE_OUT, delay }}
    >
      {children}
    </MotionTag>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: "div" | "section" | "ul" | "ol" | "article";
  once?: boolean;
  amount?: number;
  childVariant?: "fadeUp" | "fadeIn" | "popIn" | "slideRight";
};

export function Stagger({
  children,
  className,
  stagger = 0.07,
  delay = 0,
  as = "div",
  once = true,
  amount = 0.15,
  childVariant = "fadeUp",
}: StaggerProps) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once, amount });
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  const childVariants = variantMap[childVariant];

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      variants={container}
      initial={reduce ? "visible" : "hidden"}
      animate={reduce ? "visible" : inView ? "visible" : "hidden"}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        return (
          <motion.div variants={childVariants} transition={defaultTransition}>
            {child}
          </motion.div>
        );
      })}
    </MotionTag>
  );
}

type StaggerItemProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
};

export function StaggerItem({ children, ...rest }: StaggerItemProps) {
  return (
    <motion.div variants={fadeUp} transition={defaultTransition} {...rest}>
      {children}
    </motion.div>
  );
}

type AnimatedCounterProps = {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  suffix?: string;
};

export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 1.6,
  className,
  suffix = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (n) => {
    return n.toFixed(decimals) + suffix;
  });

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    if (inView) {
      mv.set(value);
    }
  }, [inView, value, mv, reduce]);

  return (
    <motion.span ref={ref} className={className}>
      {reduce ? value.toFixed(decimals) + suffix : display}
    </motion.span>
  );
}

export function HoverLift({
  children,
  className,
  lift = -4,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: lift, transition: { duration: 0.25, ease: EASE_SOFT } }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.25, ease: EASE_SOFT }}
    >
      {children}
    </motion.div>
  );
}

type HeroTitleProps = {
  text: string;
  className?: string;
  stagger?: number;
  delay?: number;
};

export function HeroTitle({ text, className, stagger = 0.04, delay = 0.05 }: HeroTitleProps) {
  const reduce = useReducedMotion();
  const segmenter =
    typeof Intl !== "undefined" && typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  const tokens = text.split(/(\s+)/).filter(Boolean);
  const getGraphemes = (value: string) =>
    segmenter
      ? Array.from(segmenter.segment(value), (s) => s.segment)
      : Array.from(value);
  const characterVariants: Variants = {
    hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  };

  if (reduce) return <span className={className}>{text}</span>;

  return (
    <motion.span
      aria-label={text}
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger * 2, delayChildren: delay } },
      }}
      style={{ display: "inline" }}
    >
      {tokens.map((token, tokenIndex) =>
        token.trim() === "" ? (
          <span key={`space-${tokenIndex}`} aria-hidden="true">
            {" "}
          </span>
        ) : (
          <motion.span
            key={`${token}-${tokenIndex}`}
            aria-hidden="true"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: stagger } },
            }}
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
          >
            {getGraphemes(token).map((char, charIndex) => (
              <motion.span
                key={`${char}-${charIndex}`}
                aria-hidden="true"
                variants={characterVariants}
                transition={{ duration: 0.55, ease: EASE_OUT }}
                style={{ display: "inline-block" }}
              >
                {char}
              </motion.span>
            ))}
          </motion.span>
        )
      )}
    </motion.span>
  );
}

export function Floating({
  children,
  className,
  duration = 6,
  distance = 8,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{children}</span>;
  return (
    <motion.span
      className={className}
      animate={{ y: [0, -distance, 0], rotate: [0, 1.5, 0] }}
      transition={{ duration, ease: "easeInOut", repeat: Infinity }}
      style={{ display: "inline-block" }}
    >
      {children}
    </motion.span>
  );
}

export function MagneticChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.span
      className={className}
      whileHover={{ y: -3, scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
      style={{ display: "inline-grid" }}
    >
      {children}
    </motion.span>
  );
}

export { motion, EASE_OUT, EASE_SOFT };
