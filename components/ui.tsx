import Link from "next/link";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Bookmark, ChevronDown, Star, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, ButtonLink, buttonBase, buttonVariants, type ButtonVariant } from "./ui-buttons";

export { Button, ButtonLink };
export type { ButtonVariant };

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid min-h-7 w-fit place-items-center rounded-full bg-sage-light px-3 text-[11px] font-black text-sage",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RatingStars({ value = 5, className }: { value?: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-clay", className)} aria-label={`${value} შეფასება`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={cn("h-4 w-4", index < rounded ? "fill-current" : "text-oat")} />
      ))}
    </span>
  );
}

export function BookmarkButton({ saved = false, className }: { saved?: boolean; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "group inline-grid h-[42px] w-[42px] place-items-center rounded-[15px] border border-oat bg-surface text-ink transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-soft-clay hover:bg-soft-clay active:translate-y-0 active:scale-90",
        saved && "border-soft-clay bg-soft-clay text-clay-dark",
        className,
      )}
      aria-label="რეცეპტის შენახვა"
    >
      <Bookmark
        className={cn(
          "h-4 w-4 transition-transform duration-300 ease-out group-active:scale-125",
          saved && "fill-current",
        )}
      />
    </button>
  );
}

type ChoiceItem = string | { label: string; value: string; href?: string };

function choiceLabel(item: ChoiceItem) {
  return typeof item === "string" ? item : item.label;
}

function choiceValue(item: ChoiceItem) {
  return typeof item === "string" ? item : item.value;
}

export function FilterChips({
  items,
  active,
  getHref,
}: {
  items: ChoiceItem[];
  active?: string;
  getHref?: (value: string) => string;
}) {
  const activeValue = active ?? choiceValue(items[0]);

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {items.map((item) => {
        const value = choiceValue(item);
        const label = choiceLabel(item);
        const href = typeof item === "string" ? getHref?.(value) : item.href ?? getHref?.(value);
        const className = cn(
          "inline-grid min-h-9 shrink-0 place-items-center rounded-full border px-4 text-xs font-black no-underline transition",
          value === activeValue ? "border-sage-light bg-sage-light text-sage" : "border-oat bg-surface text-muted hover:border-sand",
        );

        return href ? (
          <Link key={value} href={href} className={className} aria-current={value === activeValue ? "true" : undefined}>
            {label}
          </Link>
        ) : (
          <button key={value} type="button" className={className}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function SidebarCard({
  title,
  children,
  eyebrow,
  className,
}: {
  title: string;
  children: ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <section className={cn("soft-card rounded-[26px] p-5", className)}>
      {eyebrow ? <Badge className="mb-3 bg-soft-clay text-wine">{eyebrow}</Badge> : null}
      <h2 className="text-[22px] font-black leading-tight">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function EmptyState({
  mark,
  title,
  description,
  action,
  hidden = false,
}: {
  mark: string;
  title: string;
  description: string;
  action?: ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <section className="soft-card grid min-h-[320px] place-items-center rounded-[30px] px-6 py-12 text-center">
      <div>
        <div className="mx-auto mb-5 grid h-[76px] w-[76px] place-items-center rounded-3xl bg-sage-light text-2xl font-black text-sage">
          {mark}
        </div>
        <h2 className="text-2xl font-black leading-tight">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </section>
  );
}

export function SkeletonRecipeCard() {
  return (
    <div className="soft-card overflow-hidden rounded-[25px]">
      <div className="h-48 animate-pulse bg-[#EDE1D3]" />
      <div className="grid gap-3 p-4">
        <div className="h-3 w-20 animate-pulse rounded-full bg-[#EDE1D3]" />
        <div className="h-4 animate-pulse rounded-full bg-[#EDE1D3]" />
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-[#EDE1D3]" />
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <section className="hero-panel min-h-[260px]" aria-hidden="true">
      <div className="h-3 w-24 animate-pulse rounded-full bg-[#EDE1D3]" />
      <div className="mt-5 h-12 w-2/3 animate-pulse rounded-2xl bg-[#EDE1D3]" />
      <div className="mt-4 h-3 w-1/2 animate-pulse rounded-full bg-[#EDE1D3]" />
      <div className="mt-2 h-3 w-2/5 animate-pulse rounded-full bg-[#EDE1D3]" />
    </section>
  );
}

export function SkeletonRecipeGrid({
  count = 6,
  className = "mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRecipeCard key={index} />
      ))}
    </div>
  );
}

export function SkeletonCategoryGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="soft-card h-32 animate-pulse rounded-[24px] bg-[#EDE1D3]" />
      ))}
    </div>
  );
}

export function SkeletonCookCard() {
  return (
    <div className="soft-card grid gap-4 rounded-[26px] p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-[#EDE1D3]" />
        <div className="grid flex-1 gap-2">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#EDE1D3]" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#EDE1D3]" />
        </div>
      </div>
      <div className="h-3 w-full animate-pulse rounded-full bg-[#EDE1D3]" />
      <div className="h-3 w-4/5 animate-pulse rounded-full bg-[#EDE1D3]" />
    </div>
  );
}

export function ErrorPanel({
  title,
  description,
  reset,
}: {
  title: string;
  description: string;
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="soft-card grid min-h-[320px] place-items-center rounded-[30px] px-6 py-12 text-center"
    >
      <div>
        <div className="mx-auto mb-5 grid h-[76px] w-[76px] place-items-center rounded-3xl bg-danger/10 text-2xl font-black text-danger">
          !
        </div>
        <h2 className="text-2xl font-black leading-tight">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>
        <div className="mt-5 flex justify-center">
          <Button onClick={reset}>თავიდან ცდა</Button>
        </div>
      </div>
    </section>
  );
}

export function Tabs({ items, active }: { items: ChoiceItem[]; active?: string }) {
  const activeValue = active ?? choiceValue(items[0]);

  return (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-oat bg-paper/75 p-1">
      {items.map((item) => {
        const value = choiceValue(item);
        const label = choiceLabel(item);
        const href = typeof item === "string" ? undefined : item.href;
        const className = cn(
          "inline-grid min-h-9 shrink-0 place-items-center rounded-full px-4 text-xs font-black no-underline",
          value === activeValue ? "bg-surface text-clay shadow-soft" : "text-muted hover:text-ink",
        );

        return href ? (
          <Link key={value} href={href} className={className} aria-current={value === activeValue ? "true" : undefined}>
            {label}
          </Link>
        ) : (
          <button type="button" key={value} className={className}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({
  basePath,
  searchParams,
  cursorKey = "cursor",
  prevCursor,
  nextCursor,
  isFirstPage,
  startIndex,
  pageSize,
  totalCount,
  hashAnchor,
}: {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  cursorKey?: string;
  prevCursor: string | null;
  nextCursor: string | null;
  isFirstPage: boolean;
  startIndex: number;
  pageSize: number;
  totalCount: number;
  hashAnchor?: string;
}) {
  if (totalCount <= pageSize && isFirstPage) return null;

  const buildHref = (cursorValue: string | null) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === cursorKey) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry != null) params.append(key, entry);
        });
      } else if (value != null) {
        params.set(key, value);
      }
    });

    if (cursorValue) params.set(cursorKey, cursorValue);
    const qs = params.toString();
    const suffix = hashAnchor ? `#${hashAnchor}` : "";
    return `${basePath}${qs ? `?${qs}` : ""}${suffix}`;
  };

  const from = totalCount === 0 ? 0 : startIndex + 1;
  const to = Math.min(startIndex + pageSize, totalCount);
  const prevHref = isFirstPage ? null : buildHref(prevCursor);
  const nextHref = nextCursor ? buildHref(nextCursor) : null;

  return (
    <nav
      aria-label="გვერდები"
      className="mt-6 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs font-extrabold text-muted">
        {from}–{to} / {totalCount}
      </p>
      <div className="flex gap-2">
        {prevHref ? (
          <ButtonLink variant="secondary" href={prevHref}>
            წინა
          </ButtonLink>
        ) : (
          <span
            className={cn(buttonBase, buttonVariants.secondary, "pointer-events-none opacity-50")}
            aria-hidden="true"
          >
            წინა
          </span>
        )}
        {nextHref ? (
          <ButtonLink variant="secondary" href={nextHref}>
            შემდეგი
          </ButtonLink>
        ) : (
          <span
            className={cn(buttonBase, buttonVariants.secondary, "pointer-events-none opacity-50")}
            aria-hidden="true"
          >
            შემდეგი
          </span>
        )}
      </div>
    </nav>
  );
}

type FieldErrorProps = {
  error?: string;
};

function fieldId(label: string, name: unknown, id: unknown) {
  if (typeof id === "string" && id) return id;
  if (typeof name === "string" && name) return name;
  return label.toLocaleLowerCase("ka-GE").replace(/\s+/g, "-");
}

export function FormInput({
  label,
  className,
  error,
  id,
  name,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string } & FieldErrorProps) {
  const inputId = fieldId(label, name, id);
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <label className="grid gap-2">
      <span className="field-label">{label}</span>
      <input
        id={inputId}
        name={name}
        className={cn("field-control", error && "border-danger", className)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...props}
      />
      {error ? (
        <span id={errorId} className="text-xs font-extrabold text-danger" aria-live="polite">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Textarea({
  label,
  className,
  error,
  id,
  name,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string } & FieldErrorProps) {
  const textareaId = fieldId(label, name, id);
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <label className="grid gap-2">
      <span className="field-label">{label}</span>
      <textarea
        id={textareaId}
        name={name}
        className={cn("field-control min-h-[118px] resize-y py-3 leading-relaxed", error && "border-danger", className)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...props}
      />
      {error ? (
        <span id={errorId} className="text-xs font-extrabold text-danger" aria-live="polite">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Select({
  label,
  children,
  className,
  error,
  id,
  name,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string } & FieldErrorProps) {
  const selectId = fieldId(label, name, id);
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <label className="grid gap-2">
      <span className="field-label">{label}</span>
      <div className="relative">
        <select
          id={selectId}
          name={name}
          className={cn(
            "field-control appearance-none pr-10",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
      {error ? (
        <span id={errorId} className="text-xs font-extrabold text-danger" aria-live="polite">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Modal({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-danger/20 bg-danger/5 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-danger/10 text-danger">
          <TriangleAlert className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-black leading-tight text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
