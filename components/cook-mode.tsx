"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChefHat,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Timer as TimerIcon,
  Trophy,
} from "lucide-react";
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
          <button
            type="button"
            onClick={() => setTimerRunning((value) => !value)}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] px-4 text-sm font-black",
              timerRunning ? "border border-oat bg-surface text-ink" : "bg-clay text-white",
            )}
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
          </button>
          <button
            type="button"
            onClick={() => {
              setSecondsLeft(totalSeconds);
              setTimerCompleted(false);
              setTimerRunning(false);
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-4 text-sm font-black"
          >
            <RotateCcw className="h-4 w-4" />
            განულება
          </button>
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
            <Link
              href={`/recipes/${recipe.slug}`}
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-clay px-5 text-sm font-black text-white no-underline"
            >
              <ArrowLeft className="h-4 w-4" />
              რეცეპტზე დაბრუნება
            </Link>
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

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href={`/recipes/${recipe.slug}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-clay px-5 text-sm font-black text-white no-underline"
              >
                <Sparkles className="h-4 w-4" />
                შეფასების დატოვება
              </Link>
              <button
                type="button"
                onClick={restart}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-5 text-sm font-black text-ink"
              >
                <RotateCcw className="h-4 w-4" />
                თავიდან დაწყება
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasTimer = (currentStep?.durationSeconds ?? 0) > 0;

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-oat/60 bg-paper/85 backdrop-blur">
        <div className="kulera-container flex items-center justify-between gap-3 py-4">
          <Link
            href={`/recipes/${recipe.slug}`}
            className="inline-flex items-center gap-2 text-[13px] font-extrabold text-muted no-underline"
          >
            <ArrowLeft className="h-4 w-4" />
            გასვლა
          </Link>
          <div className="flex items-center gap-3 text-[13px] font-black text-ink">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-soft-clay text-clay-dark">
              <ChefHat className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">{recipe.title}</span>
          </div>
          <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-oat bg-surface px-3 text-xs font-black text-muted tabular-nums">
            <Flame className="h-3.5 w-3.5 text-clay" />
            {completedCount}/{totalSteps}
          </div>
        </div>
        <div className="kulera-container pb-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-oat/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-clay via-clay-dark to-sage transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="page-main grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section
          key={stepIndex}
          className="soft-card relative flex min-h-[520px] flex-col overflow-hidden rounded-[32px] p-6 md:p-10"
          style={{ animation: "kulera-step-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-soft-clay px-3 py-1 text-[12px] font-black text-clay-dark">
              ნაბიჯი {stepIndex + 1} / {totalSteps}
            </span>
            {hasTimer ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-oat bg-[#FAF6F0] px-3 py-1 text-[12px] font-black text-muted">
                <TimerIcon className="h-3.5 w-3.5" />
                {Math.round((currentStep?.durationSeconds ?? 0) / 60)} წთ
              </span>
            ) : null}
          </div>

          <h1 className="mt-5 text-[clamp(30px,4vw,52px)] font-black leading-[1.05] tracking-tight">
            {currentStep?.title}
          </h1>
          <p className="mt-4 max-w-3xl text-[18px] leading-relaxed text-muted md:text-[19px]">
            {currentStep?.body}
          </p>

          {hasTimer && currentStep ? <StepTimer key={stepIndex} step={currentStep} /> : null}

          <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={stepIndex === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-5 text-sm font-black text-ink transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              წინა
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={markCurrentDone}
                disabled={completed.has(stepIndex)}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-4 text-sm font-black text-ink transition",
                  completed.has(stepIndex) && "border-sage/40 bg-sage-light text-sage",
                )}
              >
                <Check className="h-4 w-4" />
                {completed.has(stepIndex) ? "მონიშნულია" : "გავაკეთე"}
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={finish}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-clay px-5 text-sm font-black text-white"
                >
                  <Trophy className="h-4 w-4" />
                  დასრულება
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] bg-clay px-5 text-sm font-black text-white"
                >
                  შემდეგი
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <div className="soft-card overflow-hidden rounded-[26px]">
            <div className="relative aspect-[16/10] w-full bg-placeholder">
              <Image
                src={recipe.imageUrl}
                alt={recipe.title}
                fill
                sizes="(max-width: 1280px) 100vw, 420px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 text-white">
                <p className="text-[11px] font-black uppercase tracking-wider opacity-80">{recipe.categoryName}</p>
                <h2 className="text-lg font-black leading-tight">{recipe.title}</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-oat border-t border-oat text-center">
              <div className="px-2 py-3">
                <p className="text-[10px] font-extrabold uppercase text-muted">ნაბიჯი</p>
                <p className="text-base font-black tabular-nums">{totalSteps}</p>
              </div>
              <div className="px-2 py-3">
                <p className="text-[10px] font-extrabold uppercase text-muted">დრო</p>
                <p className="text-base font-black tabular-nums">
                  {totalDuration > 0 ? `${Math.round(totalDuration / 60)} წთ` : `${recipe.cookingTime} წთ`}
                </p>
              </div>
              <div className="px-2 py-3">
                <p className="text-[10px] font-extrabold uppercase text-muted">სირთულე</p>
                <p className="text-base font-black">{recipe.difficulty}</p>
              </div>
            </div>
          </div>

          <div className="soft-card rounded-[26px] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[18px] font-black leading-tight">ინგრედიენტები</h3>
              <div className="inline-flex items-center gap-2 rounded-full border border-oat bg-[#FAF6F0] px-2 py-1 text-[11px] font-black">
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
            <ul className="mt-3 grid">
              {scaledIngredients.map((ingredient, index) => {
                const isChecked = checkedIngredients.has(index);
                return (
                  <li
                    key={`${ingredient.name}-${index}`}
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
          </div>

          <div className="soft-card rounded-[26px] p-5">
            <h3 className="text-[16px] font-black leading-tight">ნაბიჯები</h3>
            <ol className="mt-3 grid gap-1">
              {recipe.steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = completed.has(index);
                return (
                  <li key={`${step.title}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={cn(
                        "grid w-full grid-cols-[28px_1fr_auto] items-center gap-2 rounded-[14px] border border-transparent px-2 py-2 text-left text-[13px] font-bold transition",
                        isActive && "border-clay/30 bg-soft-clay",
                        isDone && !isActive && "text-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-full text-[11px] font-black",
                          isActive ? "bg-clay text-white" : isDone ? "bg-sage text-white" : "bg-oat text-muted",
                        )}
                      >
                        {isDone ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className="truncate">{step.title}</span>
                      {step.durationSeconds ? (
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                          {Math.round(step.durationSeconds / 60)} წთ
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
    </div>
  );
}
