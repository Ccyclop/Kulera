import { firstSearchParam, type SearchParamRecord } from "@/lib/search-params";

export const PANTRY_MODE_KEY = "mode";
export const PANTRY_MODE_VALUE = "pantry";
export const PANTRY_IDS_KEY = "pantry";
export const PANTRY_FREE_TEXT_KEY = "freeText";
export const PANTRY_BASICS_KEY = "basics";
export const PANTRY_MISSING_KEY = "missing";

export const MAX_PANTRY_IDS = 40;
export const MAX_PANTRY_FREE_TEXT = 10;
export const DEFAULT_MAX_MISSING: MaxMissing = 2;

export type MaxMissing = 1 | 2 | 3;

export type PantryState = {
  ids: string[];
  freeText: string[];
  basics: boolean;
  maxMissing: MaxMissing;
};

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMaxMissing(value: string | undefined): MaxMissing {
  if (value === "1") return 1;
  if (value === "3") return 3;
  return DEFAULT_MAX_MISSING;
}

export function isPantryMode(searchParams: SearchParamRecord): boolean {
  return firstSearchParam(searchParams, PANTRY_MODE_KEY) === PANTRY_MODE_VALUE;
}

export function parsePantryParams(searchParams: SearchParamRecord): PantryState {
  const rawIds = firstSearchParam(searchParams, PANTRY_IDS_KEY);
  const rawFreeText = firstSearchParam(searchParams, PANTRY_FREE_TEXT_KEY);
  const rawBasics = firstSearchParam(searchParams, PANTRY_BASICS_KEY);
  const rawMissing = firstSearchParam(searchParams, PANTRY_MISSING_KEY);

  const ids = Array.from(new Set(splitCsv(rawIds))).slice(0, MAX_PANTRY_IDS);
  const freeText = Array.from(new Set(splitCsv(rawFreeText))).slice(0, MAX_PANTRY_FREE_TEXT);

  return {
    ids,
    freeText,
    basics: rawBasics === "1",
    maxMissing: normalizeMaxMissing(rawMissing),
  };
}

export function pantryStateToUpdates(state: PantryState): Record<string, string | null> {
  const ids = state.ids.slice(0, MAX_PANTRY_IDS);
  const freeText = state.freeText.slice(0, MAX_PANTRY_FREE_TEXT);

  return {
    [PANTRY_MODE_KEY]: PANTRY_MODE_VALUE,
    [PANTRY_IDS_KEY]: ids.length ? ids.join(",") : null,
    [PANTRY_FREE_TEXT_KEY]: freeText.length ? freeText.join(",") : null,
    [PANTRY_BASICS_KEY]: state.basics ? "1" : null,
    [PANTRY_MISSING_KEY]: state.maxMissing === DEFAULT_MAX_MISSING ? null : String(state.maxMissing),
    cursor: null,
  };
}

export function emptyPantryState(): PantryState {
  return {
    ids: [],
    freeText: [],
    basics: true,
    maxMissing: DEFAULT_MAX_MISSING,
  };
}
