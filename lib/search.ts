import type { Category, Recipe } from "./types";

const GEORGIAN_SUFFIXES: readonly string[] = [
  "ებისთვის",
  "ებისგან",
  "ებიდან",
  "ებითაც",
  "ისთვის",
  "ისგან",
  "იდან",
  "ითაც",
  "ებშიც",
  "ებზეც",
  "ებსაც",
  "შიც",
  "ზეც",
  "საც",
  "ების",
  "ებით",
  "ებად",
  "ებში",
  "ებზე",
  "ებმა",
  "ებსა",
  "ებს",
  "ები",
  "ის",
  "ით",
  "ად",
  "ში",
  "ზე",
  "მა",
  "სა",
  "ს",
  "ი",
];

const LATIN_TO_GEORGIAN: ReadonlyArray<[string, string]> = [
  ["gh", "ღ"],
  ["kh", "ხ"],
  ["sh", "შ"],
  ["ch", "ჩ"],
  ["ts", "ც"],
  ["dz", "ძ"],
  ["zh", "ჟ"],
  ["ph", "ფ"],
  ["a", "ა"],
  ["b", "ბ"],
  ["g", "გ"],
  ["d", "დ"],
  ["e", "ე"],
  ["v", "ვ"],
  ["z", "ზ"],
  ["t", "თ"],
  ["i", "ი"],
  ["k", "კ"],
  ["l", "ლ"],
  ["m", "მ"],
  ["n", "ნ"],
  ["o", "ო"],
  ["p", "პ"],
  ["r", "რ"],
  ["s", "ს"],
  ["u", "უ"],
  ["f", "ფ"],
  ["q", "ყ"],
  ["h", "ჰ"],
  ["j", "ჯ"],
  ["c", "ც"],
  ["x", "ხ"],
  ["y", "ი"],
  ["w", "ვ"],
];

const LATIN_ONLY = /^[a-z]+$/;
const WORD_SPLIT = /[\s\p{P}]+/u;
const MIN_STEM = 3;
const MIN_FUZZY_LENGTH = 4;
const SHARED_PREFIX = 4;

function transliterate(token: string): string {
  if (!LATIN_ONLY.test(token)) return token;
  let out = "";
  let i = 0;
  while (i < token.length) {
    let matched = false;
    for (const [latin, georgian] of LATIN_TO_GEORGIAN) {
      if (token.startsWith(latin, i)) {
        out += georgian;
        i += latin.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += token[i];
      i += 1;
    }
  }
  return out;
}

function stem(word: string): string {
  for (const suffix of GEORGIAN_SUFFIXES) {
    if (word.length - suffix.length >= MIN_STEM && word.endsWith(suffix)) {
      return word.slice(0, word.length - suffix.length);
    }
  }
  return word;
}

function levenshtein(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  const aLen = a.length;
  const bLen = b.length;
  let prev = new Array<number>(bLen + 1);
  let curr = new Array<number>(bLen + 1);

  for (let j = 0; j <= bLen; j++) prev[j] = j;

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bLen; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[bLen];
}

function fuzzyThreshold(len: number): number {
  if (len < MIN_FUZZY_LENGTH) return 0;
  return Math.floor(len / 5);
}

function tokenMatchesWord(qStem: string, q: string, wStem: string, w: string): boolean {
  if (w.includes(q) || q.includes(w)) return true;
  if (wStem.includes(qStem) || qStem.includes(wStem)) return true;

  if (qStem.length >= SHARED_PREFIX && wStem.length >= SHARED_PREFIX) {
    const prefixLen = Math.min(qStem.length, wStem.length);
    let shared = 0;
    while (shared < prefixLen && qStem.charCodeAt(shared) === wStem.charCodeAt(shared)) {
      shared += 1;
    }
    if (shared >= SHARED_PREFIX) return true;
  }

  const fuzzyLen = Math.max(qStem.length, wStem.length);
  const threshold = fuzzyThreshold(fuzzyLen);
  if (threshold > 0 && levenshtein(qStem, wStem, threshold) <= threshold) {
    return true;
  }

  return false;
}

export function splitWords(source: string): string[] {
  return source
    .split(WORD_SPLIT)
    .map((piece) => piece.trim().toLocaleLowerCase("ka-GE"))
    .filter(Boolean);
}

export function tokenizeQuery(query: string): string[] {
  return splitWords(query).map(transliterate);
}

const recipeWordsCache = new WeakMap<Recipe, string[]>();
const categoryWordsCache = new WeakMap<Category, string[]>();

export function recipeSearchWords(recipe: Recipe): string[] {
  const cached = recipeWordsCache.get(recipe);
  if (cached) return cached;

  const parts: string[] = [
    recipe.title,
    recipe.description,
    recipe.categoryName,
    ...recipe.ingredients.map((ingredient) => ingredient.name),
    ...recipe.tags,
  ];
  const words = Array.from(new Set(splitWords(parts.join(" "))));
  recipeWordsCache.set(recipe, words);
  return words;
}

export function categorySearchWords(category: Category): string[] {
  const cached = categoryWordsCache.get(category);
  if (cached) return cached;

  const slugWords = splitWords(category.slug.replace(/-/g, " "));
  const words = Array.from(new Set([...splitWords(category.name), ...slugWords]));
  categoryWordsCache.set(category, words);
  return words;
}

function matchesWords(targetWords: string[], query: string): boolean {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;

  const stems = targetWords.map((word) => stem(word));

  return tokens.every((token) => {
    const qStem = stem(token);
    for (let i = 0; i < targetWords.length; i++) {
      if (tokenMatchesWord(qStem, token, stems[i], targetWords[i])) {
        return true;
      }
    }
    return false;
  });
}

export function matchesSearchQuery(recipe: Recipe, query: string): boolean {
  return matchesWords(recipeSearchWords(recipe), query);
}

export function matchesCategoryQuery(category: Category, query: string): boolean {
  return matchesWords(categorySearchWords(category), query);
}
