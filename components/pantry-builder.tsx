"use client";

import { Plus, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useI18n } from "@/components/i18n-provider";
import {
  PANTRY_CATALOG,
  PANTRY_CATALOG_BY_ID,
  PANTRY_CATEGORIES,
  type CatalogItem,
  type PantryCategoryId,
} from "@/lib/pantry/catalog";
import { normalizeText } from "@/lib/pantry/match";
import {
  MAX_PANTRY_FREE_TEXT,
  MAX_PANTRY_IDS,
  type MaxMissing,
  type PantryState,
  pantryStateToUpdates,
} from "@/lib/pantry/url";
import { cn } from "@/lib/cn";
import { Button } from "./ui";

const LOCAL_STORAGE_KEY = "kulera.pantry.v1";

type LocalState = {
  ids: string[];
  freeText: string[];
  basics: boolean;
  maxMissing: MaxMissing;
  savedAt: number;
};

function readLocalPantry(): LocalState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalState>;
    if (!parsed || typeof parsed !== "object") return null;

    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((id): id is string => typeof id === "string") : [];
    const freeText = Array.isArray(parsed.freeText)
      ? parsed.freeText.filter((value): value is string => typeof value === "string")
      : [];
    const basics = typeof parsed.basics === "boolean" ? parsed.basics : true;
    const maxMissing: MaxMissing = parsed.maxMissing === 1 || parsed.maxMissing === 3 ? parsed.maxMissing : 2;
    const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : 0;
    return { ids, freeText, basics, maxMissing, savedAt };
  } catch {
    return null;
  }
}

function writeLocalPantry(state: PantryState) {
  if (typeof window === "undefined") return;
  try {
    const payload: LocalState = { ...state, savedAt: Date.now() };
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private mode, quota, etc.) - silently ignore.
  }
}

function buildHref(pathname: string, currentParams: URLSearchParams, state: PantryState): string {
  const updates = pantryStateToUpdates(state);
  const params = new URLSearchParams(currentParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function searchCatalog(query: string, ownedIds: Set<string>, locale: "ka" | "en"): CatalogItem[] {
  const normalized = normalizeText(query);
  if (!normalized) return [];

  const matches: Array<{ item: CatalogItem; score: number }> = [];

  for (const item of PANTRY_CATALOG) {
    if (ownedIds.has(item.id)) continue;
    const candidates = [item.ka, item.en, ...item.aliases].map(normalizeText);
    let bestScore = Infinity;
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (candidate === normalized) {
        bestScore = Math.min(bestScore, 0);
      } else if (candidate.startsWith(normalized)) {
        bestScore = Math.min(bestScore, 1);
      } else if (candidate.includes(normalized)) {
        bestScore = Math.min(bestScore, 2);
      }
    }
    if (Number.isFinite(bestScore)) {
      matches.push({ item, score: bestScore });
    }
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.item[locale].localeCompare(b.item[locale]);
  });

  return matches.slice(0, 8).map((entry) => entry.item);
}

export function PantryBuilder({ initialState }: { initialState: PantryState }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { t, locale } = useI18n();

  const [state, setState] = useState<PantryState>(initialState);
  const [draft, setDraft] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [openCategory, setOpenCategory] = useState<PantryCategoryId | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const hasUrlState = initialState.ids.length > 0 || initialState.freeText.length > 0;
    if (hasUrlState) return;
    const stored = readLocalPantry();
    if (!stored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing UI state from localStorage after hydration is intentional; SSR can't read it.
    setState({
      ids: stored.ids,
      freeText: stored.freeText,
      basics: stored.basics,
      maxMissing: stored.maxMissing,
    });
  }, [initialState]);

  const ownedIds = useMemo(() => new Set(state.ids), [state.ids]);
  const suggestions = useMemo(
    () => (draft.trim() ? searchCatalog(draft, ownedIds, locale) : []),
    [draft, ownedIds, locale],
  );

  const totalSelected = state.ids.length + state.freeText.length;
  const idsCapped = state.ids.length >= MAX_PANTRY_IDS;
  const freeTextCapped = state.freeText.length >= MAX_PANTRY_FREE_TEXT;

  function addId(id: string) {
    setState((prev) => {
      if (prev.ids.includes(id) || prev.ids.length >= MAX_PANTRY_IDS) return prev;
      return { ...prev, ids: [...prev.ids, id] };
    });
  }

  function removeId(id: string) {
    setState((prev) => ({ ...prev, ids: prev.ids.filter((value) => value !== id) }));
  }

  function addFreeText(rawValue: string) {
    const value = rawValue.trim();
    if (!value) return;
    const normalized = normalizeText(value);
    setState((prev) => {
      if (prev.freeText.some((entry) => normalizeText(entry) === normalized)) return prev;
      if (prev.freeText.length >= MAX_PANTRY_FREE_TEXT) return prev;
      return { ...prev, freeText: [...prev.freeText, value] };
    });
  }

  function removeFreeText(value: string) {
    setState((prev) => ({ ...prev, freeText: prev.freeText.filter((entry) => entry !== value) }));
  }

  function handleDraftSubmit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const exact = suggestions[0];
    if (exact && normalizeText(exact.ka) === normalizeText(trimmed)) {
      addId(exact.id);
    } else if (exact && normalizeText(exact.en) === normalizeText(trimmed)) {
      addId(exact.id);
    } else {
      addFreeText(trimmed);
    }
    setDraft("");
    setShowAutocomplete(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    writeLocalPantry(state);
    const href = buildHref(pathname, new URLSearchParams(searchParams.toString()), state);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function handleClear() {
    setState((prev) => ({ ...prev, ids: [], freeText: [] }));
  }

  const groupedByCategory = useMemo(() => {
    const groups = new Map<PantryCategoryId, CatalogItem[]>();
    for (const item of PANTRY_CATALOG) {
      const list = groups.get(item.category) ?? [];
      list.push(item);
      groups.set(item.category, list);
    }
    return groups;
  }, []);

  const selectedItems = state.ids
    .map((id) => PANTRY_CATALOG_BY_ID.get(id))
    .filter((item): item is CatalogItem => Boolean(item));

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-[22px] border border-oat bg-surface p-4 md:p-5"
      aria-label={t("მაცივრის რეჟიმი")}
    >
      <div>
        <label className="flex min-w-0 items-center gap-3 rounded-[18px] border border-oat bg-paper px-3 py-2">
          <Search className="h-5 w-5 shrink-0 text-clay" aria-hidden />
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setShowAutocomplete(true);
            }}
            onFocus={() => setShowAutocomplete(true)}
            onBlur={() => {
              window.setTimeout(() => setShowAutocomplete(false), 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (suggestions[0]) {
                  addId(suggestions[0].id);
                  setDraft("");
                  setShowAutocomplete(false);
                } else {
                  handleDraftSubmit();
                }
              }
            }}
            placeholder={t("მოძებნე ან აირჩიე ინგრედიენტი")}
            aria-label={t("მოძებნე ან აირჩიე ინგრედიენტი")}
            className="min-h-10 w-full bg-transparent text-base font-bold text-ink outline-none placeholder:text-muted"
            disabled={idsCapped && freeTextCapped}
          />
          {draft.trim() ? (
            <button
              type="button"
              onClick={() => {
                handleDraftSubmit();
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-soft-clay px-3 py-1 text-xs font-black text-clay-dark"
              aria-label={t("დაამატე")}
            >
              <Plus className="h-3.5 w-3.5" /> {t("დაამატე")}
            </button>
          ) : null}
        </label>
        {showAutocomplete && suggestions.length > 0 ? (
          <ul className="mt-2 grid gap-1 rounded-2xl border border-oat bg-surface p-2 shadow-soft">
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    addId(item.id);
                    setDraft("");
                    setShowAutocomplete(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold text-ink hover:bg-soft-clay"
                >
                  <span>{locale === "en" ? item.en : item.ka}</span>
                  <span className="text-xs font-extrabold text-muted">{locale === "en" ? item.ka : item.en}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selectedItems.length > 0 || state.freeText.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full bg-sage-light px-3 py-1 text-xs font-black text-sage"
            >
              {locale === "en" ? item.en : item.ka}
              <button
                type="button"
                onClick={() => removeId(item.id)}
                aria-label={`${t("გასუფთავება")}: ${locale === "en" ? item.en : item.ka}`}
                className="grid h-4 w-4 place-items-center rounded-full text-sage hover:bg-sage hover:text-paper"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {state.freeText.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-soft-clay px-3 py-1 text-xs font-black text-clay-dark"
            >
              {value}
              <button
                type="button"
                onClick={() => removeFreeText(value)}
                aria-label={`${t("გასუფთავება")}: ${value}`}
                className="grid h-4 w-4 place-items-center rounded-full text-clay-dark hover:bg-clay hover:text-paper"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2">
        <span className="text-xs font-black text-muted">{t("რა გაქვს სახლში?")}</span>
        <div className="grid gap-1 rounded-[18px] border border-oat bg-paper p-2">
          {PANTRY_CATEGORIES.map((category) => {
            const items = groupedByCategory.get(category.id) ?? [];
            if (items.length === 0) return null;
            const isOpen = openCategory === category.id;
            const selectedCount = items.filter((item) => ownedIds.has(item.id)).length;
            return (
              <div key={category.id} className="rounded-2xl border border-transparent">
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : category.id)}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-black text-ink hover:bg-soft-clay/60"
                  aria-expanded={isOpen}
                >
                  <span>{locale === "en" ? category.en : category.ka}</span>
                  <span className="text-xs font-extrabold text-muted">
                    {selectedCount > 0 ? `${selectedCount}/${items.length}` : items.length}
                  </span>
                </button>
                {isOpen ? (
                  <div className="flex flex-wrap gap-2 px-3 pb-3">
                    {items.map((item) => {
                      const owned = ownedIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => (owned ? removeId(item.id) : addId(item.id))}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-black transition",
                            owned
                              ? "border-sage bg-sage-light text-sage"
                              : "border-oat bg-surface text-muted hover:border-sand",
                          )}
                          aria-pressed={owned}
                        >
                          {locale === "en" ? item.en : item.ka}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-oat bg-paper px-4 py-3 text-sm font-bold text-ink">
        <input
          type="checkbox"
          checked={state.basics}
          onChange={(event) => setState((prev) => ({ ...prev, basics: event.target.checked }))}
          className="h-4 w-4 accent-clay"
        />
        <span>{t("ძირითადი ინგრედიენტები უკვე მაქვს (მარილი, ზეთი, წყალი, შაქარი, პილპილი)")}</span>
      </label>

      <div className="grid gap-2">
        <span className="text-xs font-black text-muted">{t("მაქსიმუმ რამდენი შეიძლება აკლდეს?")}</span>
        <div className="flex gap-2">
          {[1, 2, 3].map((value) => {
            const active = state.maxMissing === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, maxMissing: value as MaxMissing }))}
                className={cn(
                  "inline-grid min-h-9 min-w-[48px] place-items-center rounded-full border px-4 text-xs font-black transition",
                  active
                    ? "border-sage-light bg-sage-light text-sage"
                    : "border-oat bg-surface text-muted hover:border-sand",
                )}
                aria-pressed={active}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending || totalSelected === 0}>
          {t("შედეგების ჩვენება")}
        </Button>
        {totalSelected > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-black uppercase tracking-wide text-muted hover:text-ink"
          >
            {t("გასუფთავება")}
          </button>
        ) : null}
        <span className="ml-auto text-xs font-extrabold text-muted">
          {totalSelected > 0 ? `${totalSelected} ${t("მაცივარში დამატებული")}` : null}
        </span>
      </div>
    </form>
  );
}

