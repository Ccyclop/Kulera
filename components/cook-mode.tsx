"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChefHat,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer as TimerIcon,
  Trophy,
} from "lucide-react";
import { FocusDialog } from "@/components/focus-dialog";
import { Button, ButtonLink } from "@/components/ui-buttons";
import { cn } from "@/lib/cn";
import { formatAmount, formatQuantity } from "@/lib/ingredients";
import type { Ingredient, Recipe, RecipeStep } from "@/lib/types";

function plainAmount(ingredient: Ingredient) {
  if (ingredient.quantity != null) {
    const qty = formatQuantity(ingredient.quantity);
    return [qty, ingredient.unit, ingredient.note].filter(Boolean).join(" ").trim();
  }
  return ingredient.note || ingredient.amount || "";
}

function scaleIngredientRow(ingredient: Ingredient, scale: number): Ingredient {
  if (ingredient.quantity == null) return ingredient;
  const scaled = ingredient.quantity * scale;
  return {
    ...ingredient,
    quantity: scaled,
    amount: formatAmount({ ...ingredient, quantity: scaled }) || ingredient.amount,
  };
}

function formatSeconds(value: number) {
  const total = Math.max(0, Math.round(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type ConfettiPiece = {
  key: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotate: number;
  color: string;
};

const CONFETTI_COLORS = ["#B6542D", "#66785F", "#E8B86C", "#D8554A", "#8E3F24", "#F2C26B"];

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const CONFETTI_PIECES: ConfettiPiece[] = Array.from({ length: 80 }, (_, index) => ({
  key: index,
  left: pseudoRandom(index + 1) * 100,
  delay: pseudoRandom(index + 21) * 0.6,
  duration: 1.6 + pseudoRandom(index + 42) * 1.4,
  size: 8 + pseudoRandom(index + 63) * 8,
  rotate: pseudoRandom(index + 84) * 360,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? "#B6542D",
}));

function ConfettiBurst() {
  const pieces = CONFETTI_PIECES;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.key}
          className="absolute -top-6 block"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 0.55}px`,
            background: piece.color,
            transform: `rotate(${piece.rotate}deg)`,
            borderRadius: "2px",
            animation: `kulera-confetti-fall ${piece.duration}s cubic-bezier(0.22, 1, 0.36, 1) ${piece.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function StepTimer({ step }: { step: RecipeStep }) {
  const totalSeconds = step.durationSeconds ?? 0;
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerCompleted, setTimerCompleted] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    const handle = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(handle);
          setTimerRunning(false);
          setTimerCompleted(true);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate?.([200, 100, 200]);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(handle);
  }, [timerRunning]);

  const timerProgress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="mt-8 rounded-[24px] border border-oat bg-[#FAF6F0] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-muted">ტაიმერი</p>
          <p
            className={cn(
              "mt-1 text-[44px] font-black leading-none tabular-nums",
              timerCompleted ? "text-sage" : "text-ink",
            )}
          >
            {formatSeconds(secondsLeft)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={timerRunning ? "secondary" : "primary"}
            onClick={() => setTimerRunning((value) => !value)}
          >
            {timerRunning ? (
              <>
                <Pause className="h-4 w-4" />
                პაუზა
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                დაწყება
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSecondsLeft(totalSeconds);
              setTimerCompleted(false);
              setTimerRunning(false);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            განულება
          </Button>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-oat/80">
        <div
          className={cn("h-full rounded-full transition-all duration-500", timerCompleted ? "bg-sage" : "bg-clay")}
          style={{ width: `${timerProgress}%` }}
        />
      </div>
      {timerCompleted ? (
        <p className="mt-3 text-sm font-black text-sage">დრო ამოიწურა — გადადი შემდეგ ნაბიჯზე.</p>
      ) : null}
    </div>
  );
}

export function CookMode({ recipe }: { recipe: Recipe }) {
  const totalSteps = recipe.steps.length;
  const baseServings = recipe.baseServings ?? 1;

  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());
  const [servings, setServings] = useState(() => Math.max(1, Math.round(baseServings || 1)));
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(() => new Set());
  const [finished, setFinished] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const scale = baseServings && baseServings > 0 ? servings / baseServings : 1;

  const scaledIngredients = useMemo(
    () => recipe.ingredients.map((ingredient) => scaleIngredientRow(ingredient, scale)),
    [recipe.ingredients, scale],
  );

  const currentStep = recipe.steps[stepIndex];
  const isLast = stepIndex === totalSteps - 1;
  const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const completedCount = completed.size;

  const totalDuration = useMemo(
    () => recipe.steps.reduce((sum, step) => sum + (step.durationSeconds ?? 0), 0),
    [recipe.steps],
  );

  const swipeStartX = useRef<number | null>(null);

  const markCurrentDone = useCallback(() => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(stepIndex);
      return next;
    });
  }, [stepIndex]);

  const goPrev = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goNext = useCallback(() => {
    markCurrentDone();
    setStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  }, [markCurrentDone, totalSteps]);

  const finish = useCallback(() => {
    markCurrentDone();
    setFinished(true);
  }, [markCurrentDone]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (finished) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (isLast) finish();
        else goNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [finished, goNext, goPrev, isLast, finish]);

  useEffect(() => {
    if (finished || typeof navigator === "undefined") return;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } };
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    nav.wakeLock
      .request("screen")
      .then((lock) => {
        if (cancelled) {
          lock.release().catch(() => undefined);
        } else {
          sentinel = lock;
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      sentinel?.release().catch(() => undefined);
    };
  }, [finished]);

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const adjustServings = (delta: number) => {
    setServings((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > 24) return 24;
      return next;
    });
  };

  const restart = () => {
    setStepIndex(0);
    setCompleted(new Set());
    setCheckedIngredients(new Set());
    setFinished(false);
  };

  if (totalSteps === 0) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="page-main grid place-items-center text-center">
          <div className="soft-card max-w-md rounded-[28px] p-8">
            <h1 className="text-2xl font-black">ეს რეცეპტი ჯერ არ შეიცავს ნაბიჯებს</h1>
            <p className="mt-3 text-sm text-muted">
              დაბრუნდი რეცეპტზე და დაამატე ნაბიჯები რომ მზადებას მიყვე.
            </p>
            <div className="mt-5 inline-flex">
              <ButtonLink href={`/recipes/${recipe.slug}`}>
                <ArrowLeft className="h-4 w-4" />
                რეცეპტზე დაბრუნება
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-paper">
        <ConfettiBurst />
        <div className="page-main relative z-10 grid place-items-center text-center">
          <div className="soft-card max-w-lg rounded-[32px] p-8 pop-in">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-sage-light text-sage">
              <Trophy className="h-9 w-9" />
            </span>
            <h1 className="mt-5 text-[34px] font-black leading-tight">გილოცავ — გავაკეთე!</h1>
            <p className="mt-3 text-base leading-relaxed text-muted">
              {recipe.title} მზად არის. გასინჯე, გააზიარე ოჯახთან და დატოვე შეფასება.
            </p>

            <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[18px] border border-oat bg-[#FAF6F0] p-3">
                <dt className="text-[11px] font-extrabold text-muted">ნაბიჯი</dt>
                <dd className="text-lg font-black tabular-nums">{totalSteps}</dd>
              </div>
              <div className="rounded-[18px] border border-oat bg-[#FAF6F0] p-3">
                <dt className="text-[11px] font-extrabold text-muted">პორცია</dt>
                <dd className="text-lg font-black tabular-nums">{servings}</dd>
              </div>
              <div className="rounded-[18px] border border-oat bg-[#FAF6F0] p-3">
                <dt className="text-[11px] font-extrabold text-muted">დრო</dt>
                <dd className="text-lg font-black tabular-nums">{recipe.cookingTime} წთ</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <ButtonLink href={`/recipes/${recipe.slug}`}>
                <Sparkles className="h-4 w-4" />
                შეფასების დატოვება
              </ButtonLink>
              <Button type="button" variant="secondary" onClick={restart}>
                <RotateCcw className="h-4 w-4" />
                თავიდან დაწყება
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasTimer = (currentStep?.durationSeconds ?? 0) > 0;
  const nextStep = !isLast ? recipe.steps[stepIndex + 1] : null;
  const stepNumberLabel = String(stepIndex + 1).padStart(2, "0");

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper">
      <header className="shrink-0 border-b border-oat/60 bg-paper/85 backdrop-blur">
        <div className="kulera-container flex items-center justify-between gap-3 py-3">
          <Link
            href={`/recipes/${recipe.slug}`}
            className="inline-flex items-center gap-2 text-[13px] font-extrabold text-muted no-underline"
          >
            <ArrowLeft className="h-4 w-4" />
            გასვლა
          </Link>
          <div className="flex items-center gap-3 text-[13px] font-black text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-soft-clay text-clay-dark">
              <ChefHat className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline truncate max-w-[280px]">{recipe.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobilePanelOpen(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-oat bg-surface px-3 text-xs font-black text-ink xl:hidden"
              aria-label="ინგრედიენტები და ნაბიჯები"
            >
              <ListChecks className="h-3.5 w-3.5 text-clay" />
              ინგრედიენტები
            </button>
            <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-oat bg-surface px-3 text-xs font-black text-muted tabular-nums">
              <Flame className="h-3.5 w-3.5 text-clay" />
              {completedCount}/{totalSteps}
            </div>
          </div>
        </div>
        <div className="kulera-container pb-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-oat/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-clay via-clay-dark to-sage transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-3 overflow-hidden px-[clamp(12px,3vw,28px)] py-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] xl:gap-4 xl:py-4">
        <section
          key={stepIndex}
          className="soft-card relative flex h-full flex-col overflow-hidden rounded-[28px] p-5 md:p-8"
          style={{ animation: "kulera-step-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
          onTouchStart={(event) => {
            swipeStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = swipeStartX.current;
            swipeStartX.current = null;
            if (start == null) return;
            const end = event.changedTouches[0]?.clientX ?? start;
            const delta = end - start;
            if (Math.abs(delta) < 60) return;
            if (delta < 0) {
              if (isLast) finish();
              else goNext();
            } else {
              goPrev();
            }
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -right-6 select-none text-[clamp(180px,28vw,300px)] font-black leading-none text-clay/5"
          >
            {stepNumberLabel}
          </span>

          <div className="relative flex shrink-0 items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-soft-clay px-3 py-1 text-[12px] font-black text-clay-dark">
              ნაბიჯი {stepIndex + 1} / {totalSteps}
            </span>
            <div className="flex items-center gap-2">
              {hasTimer ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-oat bg-[#FAF6F0] px-3 py-1 text-[12px] font-black text-muted">
                  <TimerIcon className="h-3.5 w-3.5" />
                  {Math.round((currentStep?.durationSeconds ?? 0) / 60)} წთ
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-oat bg-[#FAF6F0] px-3 py-1 text-[12px] font-black text-muted">
                {recipe.difficulty}
              </span>
            </div>
          </div>

          <div className="relative mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <h1 className="text-[clamp(28px,3.4vw,46px)] font-black leading-[1.05] tracking-tight">
              {currentStep?.title}
            </h1>
            <p className="mt-3 max-w-3xl text-[clamp(15px,1.5vw,18px)] leading-relaxed text-muted">
              {currentStep?.body}
            </p>

            {hasTimer && currentStep ? <StepTimer key={stepIndex} step={currentStep} /> : null}
          </div>

          <div className="relative mt-4 grid shrink-0 gap-3">
            {nextStep ? (
              <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-oat bg-[#FAF6F0]/70 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-[12px] font-black text-clay">
                  {stepIndex + 2}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted">შემდეგი</p>
                  <p className="truncate text-sm font-black">{nextStep.title}</p>
                </div>
                {nextStep.durationSeconds ? (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[10px] font-black text-muted">
                    <TimerIcon className="h-3 w-3" />
                    {Math.round(nextStep.durationSeconds / 60)} წთ
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-sage/40 bg-sage-light px-4 py-3 text-sage">
                <Trophy className="h-5 w-5" />
                <p className="text-sm font-black">ეს ბოლო ნაბიჯია — შემდეგ მზად ხარ!</p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="secondary" onClick={goPrev} disabled={stepIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
                წინა
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={markCurrentDone}
                  disabled={completed.has(stepIndex)}
                  className={cn(completed.has(stepIndex) && "border-sage/40 bg-sage-light text-sage")}
                >
                  <Check className="h-4 w-4" />
                  {completed.has(stepIndex) ? "მონიშნულია" : "გავაკეთე"}
                </Button>
                {isLast ? (
                  <Button type="button" onClick={finish}>
                    <Trophy className="h-4 w-4" />
                    დასრულება
                  </Button>
                ) : (
                  <Button type="button" onClick={goNext}>
                    შემდეგი
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden h-full min-h-0 grid-rows-[minmax(0,1fr)_auto_auto] gap-3 overflow-hidden xl:grid">
          <div className="soft-card relative min-h-0 overflow-hidden rounded-[24px]">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              sizes="(max-width: 1280px) 100vw, 420px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-wider opacity-80">{recipe.categoryName}</p>
              <h2 className="mt-1 text-[20px] font-black leading-tight">{recipe.title}</h2>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black backdrop-blur tabular-nums">
                {totalSteps} ნაბიჯი • {totalDuration > 0 ? `${Math.round(totalDuration / 60)} წთ` : `${recipe.cookingTime} წთ`} • {recipe.difficulty}
              </p>
            </div>
          </div>

          <div className="soft-card flex max-h-[42vh] flex-col overflow-hidden rounded-[22px]">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-oat px-4 py-3">
              <h3 className="text-[15px] font-black leading-tight">ინგრედიენტები</h3>
              <div className="inline-flex items-center gap-1 rounded-full border border-oat bg-[#FAF6F0] px-1.5 py-0.5 text-[11px] font-black">
                <button
                  type="button"
                  onClick={() => adjustServings(-1)}
                  disabled={servings <= 1}
                  className="grid h-6 w-6 place-items-center rounded-full bg-surface text-clay disabled:opacity-40"
                  aria-label="პორციის შემცირება"
                >
                  −
                </button>
                <span className="min-w-[24px] text-center tabular-nums">{servings}</span>
                <button
                  type="button"
                  onClick={() => adjustServings(1)}
                  disabled={servings >= 24}
                  className="grid h-6 w-6 place-items-center rounded-full bg-surface text-clay disabled:opacity-40"
                  aria-label="პორციის გაზრდა"
                >
                  +
                </button>
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              {scaledIngredients.map((ingredient, index) => {
                const isChecked = checkedIngredients.has(index);
                return (
                  <li
                    key={`${ingredient.name}-${index}`}
                    className="grid min-h-9 grid-cols-[22px_1fr_auto] items-center gap-3 border-t border-oat py-1.5 first:border-t-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleIngredient(index)}
                      className={cn(
                        "grid h-5 w-5 place-items-center rounded-[7px] border border-sand bg-[#FAF6F0] text-[10px] font-black text-white transition",
                        isChecked && "border-sage bg-sage",
                      )}
                      aria-pressed={isChecked}
                    >
                      {isChecked ? "✓" : ""}
                    </button>
                    <span className={cn("text-[13px] font-bold", isChecked && "text-muted line-through")}>
                      {ingredient.name}
                    </span>
                    <span className={cn("text-[11px] font-black text-muted tabular-nums", isChecked && "line-through")}>
                      {plainAmount(ingredient)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="soft-card flex max-h-[32vh] flex-col overflow-hidden rounded-[22px] p-3">
            <h3 className="shrink-0 px-1 text-[13px] font-black leading-tight text-muted">ნაბიჯები</h3>
            <ol className="mt-2 grid min-h-0 flex-1 gap-0.5 overflow-y-auto">
              {recipe.steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = completed.has(index);
                return (
                  <li key={`${step.title}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={cn(
                        "grid w-full grid-cols-[24px_1fr_auto] items-center gap-2 rounded-[12px] border border-transparent px-2 py-1.5 text-left text-[12px] font-bold transition",
                        isActive && "border-clay/30 bg-soft-clay",
                        isDone && !isActive && "text-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full text-[10px] font-black",
                          isActive ? "bg-clay text-white" : isDone ? "bg-sage text-white" : "bg-oat text-muted",
                        )}
                      >
                        {isDone ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className="truncate">{step.title}</span>
                      {step.durationSeconds ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                          {Math.round(step.durationSeconds / 60)}წ
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </main>

      {mobilePanelOpen ? (
        <FocusDialog
          labelledBy="cook-mobile-panel-title"
          onClose={() => setMobilePanelOpen(false)}
          className="!max-w-md !border-oat !p-0"
        >
          <div className="flex items-center justify-between gap-2 border-b border-oat px-4 py-3">
            <h2 id="cook-mobile-panel-title" className="text-base font-black">
              ინგრედიენტები
            </h2>
            <div className="inline-flex items-center gap-1 rounded-full border border-oat bg-[#FAF6F0] px-1.5 py-0.5 text-[11px] font-black">
              <button
                type="button"
                onClick={() => adjustServings(-1)}
                disabled={servings <= 1}
                className="grid h-6 w-6 place-items-center rounded-full bg-surface text-clay disabled:opacity-40"
                aria-label="პორციის შემცირება"
              >
                −
              </button>
              <span className="min-w-[24px] text-center tabular-nums">{servings}</span>
              <button
                type="button"
                onClick={() => adjustServings(1)}
                disabled={servings >= 24}
                className="grid h-6 w-6 place-items-center rounded-full bg-surface text-clay disabled:opacity-40"
                aria-label="პორციის გაზრდა"
              >
                +
              </button>
            </div>
          </div>
          <ul className="max-h-[40vh] overflow-y-auto px-4 py-2">
            {scaledIngredients.map((ingredient, index) => {
              const isChecked = checkedIngredients.has(index);
              return (
                <li
                  key={`${ingredient.name}-${index}-mobile`}
                  className="grid min-h-10 grid-cols-[22px_1fr_auto] items-center gap-3 border-t border-oat py-2 first:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleIngredient(index)}
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-[7px] border border-sand bg-[#FAF6F0] text-[10px] font-black text-white transition",
                      isChecked && "border-sage bg-sage",
                    )}
                    aria-pressed={isChecked}
                  >
                    {isChecked ? "✓" : ""}
                  </button>
                  <span className={cn("text-[13px] font-bold", isChecked && "text-muted line-through")}>
                    {ingredient.name}
                  </span>
                  <span className={cn("text-[11px] font-black text-muted tabular-nums", isChecked && "line-through")}>
                    {plainAmount(ingredient)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-oat px-4 py-3">
            <h3 className="text-[12px] font-black uppercase tracking-wider text-muted">ნაბიჯები</h3>
            <ol className="mt-2 max-h-[30vh] overflow-y-auto">
              {recipe.steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = completed.has(index);
                return (
                  <li key={`${step.title}-${index}-m`}>
                    <button
                      type="button"
                      onClick={() => {
                        setStepIndex(index);
                        setMobilePanelOpen(false);
                      }}
                      className={cn(
                        "grid w-full grid-cols-[24px_1fr_auto] items-center gap-2 rounded-[12px] border border-transparent px-2 py-2 text-left text-[13px] font-bold transition",
                        isActive && "border-clay/30 bg-soft-clay",
                        isDone && !isActive && "text-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full text-[10px] font-black",
                          isActive ? "bg-clay text-white" : isDone ? "bg-sage text-white" : "bg-oat text-muted",
                        )}
                      >
                        {isDone ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className="truncate">{step.title}</span>
                      {step.durationSeconds ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                          {Math.round(step.durationSeconds / 60)}წ
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="border-t border-oat bg-[#FAF6F0] px-4 py-3">
            <Button type="button" onClick={() => setMobilePanelOpen(false)} className="w-full">
              დახურვა
            </Button>
          </div>
        </FocusDialog>
      ) : null}
    </div>
  );
}
