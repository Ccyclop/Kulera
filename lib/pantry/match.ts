import type { Ingredient, Recipe } from "@/lib/types";
import { BASIC_ITEM_IDS, PANTRY_CATALOG, type CatalogItem } from "./catalog";

export type IngredientMatchKind = "canonical" | "freetext" | "basic" | "unmatched";

export type IngredientMatch = {
  ingredient: Ingredient;
  kind: IngredientMatchKind;
  canonicalId?: string;
  matchedBy?: string;
};

export type RecipeMatch = {
  matchedCount: number;
  missingCount: number;
  missing: Ingredient[];
  perIngredient: IngredientMatch[];
};

export type PantryInput = {
  ids: Set<string>;
  freeText: string[];
  basics: boolean;
};

export function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("ka-GE")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[.,;:!?"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type AliasIndexEntry = {
  alias: string;
  id: string;
};

let aliasIndexCache: AliasIndexEntry[] | null = null;

function getAliasIndex(): AliasIndexEntry[] {
  if (aliasIndexCache) return aliasIndexCache;

  const entries: AliasIndexEntry[] = [];
  PANTRY_CATALOG.forEach((item) => {
    const seen = new Set<string>();
    const candidates = [item.ka, item.en, ...item.aliases];
    candidates.forEach((candidate) => {
      const normalized = normalizeText(candidate);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      entries.push({ alias: normalized, id: item.id });
    });
  });

  entries.sort((a, b) => b.alias.length - a.alias.length);
  aliasIndexCache = entries;
  return entries;
}

function findCanonicalMatch(haystack: string, pantryIds: Set<string>): CatalogItem | null {
  const index = getAliasIndex();

  for (const entry of index) {
    if (!pantryIds.has(entry.id)) continue;
    if (haystack.includes(entry.alias)) {
      return PANTRY_CATALOG.find((item) => item.id === entry.id) ?? null;
    }
  }

  return null;
}

function findBasicMatch(haystack: string): CatalogItem | null {
  const index = getAliasIndex();

  for (const entry of index) {
    if (!BASIC_ITEM_IDS.has(entry.id)) continue;
    if (haystack.includes(entry.alias)) {
      return PANTRY_CATALOG.find((item) => item.id === entry.id) ?? null;
    }
  }

  return null;
}

function findFreeTextMatch(haystack: string, freeText: string[]): string | null {
  for (const token of freeText) {
    const normalized = normalizeText(token);
    if (!normalized) continue;
    if (haystack.includes(normalized)) {
      return token;
    }
  }

  return null;
}

function classifyIngredient(ingredient: Ingredient, pantry: PantryInput): IngredientMatch {
  const haystack = normalizeText(ingredient.name);
  if (!haystack) {
    return { ingredient, kind: "unmatched" };
  }

  const canonical = findCanonicalMatch(haystack, pantry.ids);
  if (canonical) {
    return { ingredient, kind: "canonical", canonicalId: canonical.id, matchedBy: canonical.ka };
  }

  if (pantry.basics) {
    const basic = findBasicMatch(haystack);
    if (basic) {
      return { ingredient, kind: "basic", canonicalId: basic.id, matchedBy: basic.ka };
    }
  }

  const freeText = findFreeTextMatch(haystack, pantry.freeText);
  if (freeText) {
    return { ingredient, kind: "freetext", matchedBy: freeText };
  }

  return { ingredient, kind: "unmatched" };
}

export function matchRecipe(recipe: Recipe, pantry: PantryInput): RecipeMatch {
  const perIngredient = recipe.ingredients.map((ingredient) => classifyIngredient(ingredient, pantry));
  const missingMatches = perIngredient.filter((entry) => entry.kind === "unmatched");

  return {
    matchedCount: perIngredient.length - missingMatches.length,
    missingCount: missingMatches.length,
    missing: missingMatches.map((entry) => entry.ingredient),
    perIngredient,
  };
}
