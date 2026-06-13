import { cache } from "react";
import type {
  Category,
  Collection,
  CollectionDetail,
  CollectionMember,
  CollectionSection,
  Comment,
  Cook,
  Ingredient,
  Recipe,
  RecipeStep,
  RecipeTip,
} from "./types";
import type { CookingTimeFilter, RecipeFilters, RecipeSort } from "./content-options";
import { formatAmount, parseAmountText, parseServingsCount } from "./ingredients";
import { cookScore } from "./ranking";
import { getAvatarUrl, getCollectionCoverUrl, getRecipeImageUrl, getRecipeVideoUrl } from "./storage";
import { hasSupabaseConfig } from "./supabase/env";
import { createClient } from "./supabase/server";
import { matchesCategoryQuery, matchesSearchQuery } from "./search";
import { matchRecipe, type RecipeMatch } from "./pantry/match";
import type { PantryState } from "./pantry/url";

const recipeSelect =
  "id,user_id,category_id,title,slug,description,image_url,video_url,cooking_time,difficulty,servings,ingredients,steps,status,visibility,created_at,category:categories(id,name,slug,description),creator:profiles(id,full_name,username,bio,avatar_url)";

const categoryPalette = [
  { tone: "#F2D7C9", dot: "#B6542D" },
  { tone: "#E8EDE4", dot: "#66785F" },
  { tone: "#F1E8DD", dot: "#8E3F24" },
  { tone: "#F2D7C9", dot: "#4A221B" },
  { tone: "#E8EDE4", dot: "#66785F" },
  { tone: "#F1E8DD", dot: "#B6542D" },
];

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  username: string;
  bio: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  notification_prefs?: unknown;
};

type RecipeRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string;
  image_url: string | null;
  video_url: string | null;
  cooking_time: number;
  difficulty: Recipe["difficulty"];
  servings: string;
  ingredients: unknown;
  steps: unknown;
  status: Recipe["status"];
  visibility: Recipe["visibility"] | null;
  created_at: string;
  category: CategoryRow | null;
  creator: ProfileRow | null;
};

type RecipeQueryRow = Omit<RecipeRow, "category" | "creator"> & {
  category: CategoryRow | CategoryRow[] | null;
  creator: ProfileRow | ProfileRow[] | null;
};

type RecipeStatsRow = {
  recipe_id: string;
  average_rating: number | string | null;
  ratings_count: number | null;
  comments_count: number | null;
  save_count: number | null;
  recipe_score: number | string | null;
};

type CookStatsRow = {
  user_id: string;
  average_recipe_rating: number | string | null;
  total_published_recipes: number | null;
  total_ratings: number | null;
  cook_score: number | string | null;
};

type RecipeEntry = {
  recipe: Recipe;
  score: number;
};

type SupabaseError = {
  message: string;
  code?: string | null;
};

export type AccountProfile = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  bio: string;
  avatarInitial: string;
  avatarUrl: string;
  avatarPath: string | null;
  createdAt: string | null;
  totalRecipes: number;
  publishedRecipes: number;
  savedRecipes: number;
  notificationPrefs: NotificationPrefs;
};

export type NotificationPrefs = {
  comments: boolean;
  ratings: boolean;
};

function toNumber(value: number | string | null | undefined, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function oneOrNull<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function claimString(claims: Record<string, unknown> | undefined, key: string) {
  const value = claims?.[key];
  return typeof value === "string" ? value : "";
}

function claimMetadataString(claims: Record<string, unknown> | undefined, key: string) {
  const metadata = claims?.user_metadata;

  if (!isRecord(metadata)) {
    return "";
  }

  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function avatarInitial(name: string) {
  return name.trim().charAt(0).toLocaleUpperCase("ka-GE") || "K";
}

function normalizeNotificationPrefs(value: unknown): NotificationPrefs {
  if (!isRecord(value)) {
    return {
      comments: true,
      ratings: true,
    };
  }

  return {
    comments: typeof value.comments === "boolean" ? value.comments : true,
    ratings: typeof value.ratings === "boolean" ? value.ratings : true,
  };
}

function buildIngredient(name: string, raw: {
  quantity?: unknown;
  unit?: unknown;
  note?: unknown;
  amount?: unknown;
}): Ingredient | null {
  if (!name) return null;

  const explicitQuantity =
    typeof raw.quantity === "number" && Number.isFinite(raw.quantity)
      ? raw.quantity
      : typeof raw.quantity === "string"
        ? Number(raw.quantity.replace(",", "."))
        : null;

  const explicitUnit = typeof raw.unit === "string" ? raw.unit.trim() : "";
  const explicitNote = typeof raw.note === "string" ? raw.note.trim() : "";
  const amountText = typeof raw.amount === "string" ? raw.amount.trim() : "";

  if (explicitQuantity != null && Number.isFinite(explicitQuantity)) {
    const ingredient: Ingredient = {
      name,
      quantity: explicitQuantity,
      unit: explicitUnit,
      note: explicitNote,
      amount: "",
    };
    ingredient.amount = formatAmount(ingredient);
    return ingredient;
  }

  const parsed = amountText ? parseAmountText(amountText) : { quantity: null, unit: "", note: "" };
  const ingredient: Ingredient = {
    name,
    quantity: parsed.quantity,
    unit: explicitUnit || parsed.unit,
    note: explicitNote || parsed.note,
    amount: amountText,
  };
  ingredient.amount = formatAmount(ingredient) || amountText;
  return ingredient;
}

function normalizeIngredients(value: unknown): Ingredient[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return buildIngredient(item, {});
      }

      if (!isRecord(item)) return null;

      const name = firstText(item.name, item.title, item.ingredient);
      return buildIngredient(name, {
        quantity: item.quantity,
        unit: item.unit ?? item.measure,
        note: item.note,
        amount: typeof item.amount === "string" ? item.amount : undefined,
      });
    })
    .filter((item): item is Ingredient => item !== null);
}

function normalizeSteps(value: unknown): RecipeStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return { body: item, title: `ნაბიჯი ${index + 1}`, durationSeconds: null };
      }

      if (!isRecord(item)) return null;

      const body = firstText(item.body, item.description, item.text, item.instruction);
      const title = firstText(item.title, item.name) || `ნაბიჯი ${index + 1}`;

      const durationRaw =
        typeof item.durationSeconds === "number"
          ? item.durationSeconds
          : typeof item.duration_seconds === "number"
            ? item.duration_seconds
            : typeof item.durationSeconds === "string"
              ? Number(item.durationSeconds)
              : typeof item.duration_seconds === "string"
                ? Number(item.duration_seconds)
                : null;

      const durationSeconds =
        typeof durationRaw === "number" && Number.isFinite(durationRaw) && durationRaw > 0
          ? Math.round(durationRaw)
          : null;

      return body ? { body, title, durationSeconds } : null;
    })
    .filter((item): item is RecipeStep => item !== null);
}

function normalizeTips(value: unknown): RecipeTip[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { body: item, title: "რჩევა" };
      }

      if (!isRecord(item)) return null;

      const body = firstText(item.body, item.description, item.text);
      const title = firstText(item.title, item.name) || "რჩევა";

      return body ? { body, title } : null;
    })
    .filter((item): item is RecipeTip => item !== null);
}

function mapCategory(row: CategoryRow, recipeCount = 0, index = 0): Category {
  const palette = categoryPalette[index % categoryPalette.length];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    recipeCount,
    tone: palette.tone,
    dot: palette.dot,
  };
}

function resolveVideoFields(value: string | null | undefined): { videoUrl: string | null; videoPath: string | null } {
  if (!value) return { videoUrl: null, videoPath: null };
  const trimmed = value.trim();
  if (!trimmed) return { videoUrl: null, videoPath: null };

  if (/^https?:\/\//i.test(trimmed)) {
    return { videoUrl: trimmed, videoPath: null };
  }

  return { videoUrl: getRecipeVideoUrl(trimmed), videoPath: trimmed };
}

function mapRecipe(row: RecipeRow, stats?: RecipeStatsRow): Recipe {
  const creatorName = row.creator?.full_name ?? "Kulera";
  const categoryName = row.category?.name ?? "კატეგორია";
  const { videoUrl, videoPath } = resolveVideoFields(row.video_url);

  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    categoryId: row.category_id ?? "",
    categoryName,
    imageUrl: getRecipeImageUrl(row.image_url),
    imagePath: row.image_url ?? null,
    videoUrl,
    videoPath,
    baseServings: parseServingsCount(row.servings),
    cookingTime: row.cooking_time,
    difficulty: row.difficulty,
    servings: row.servings,
    ingredients: normalizeIngredients(row.ingredients),
    steps: normalizeSteps(row.steps),
    tips: normalizeTips(null),
    rating: toNumber(stats?.average_rating),
    ratingsCount: stats?.ratings_count ?? 0,
    commentsCount: stats?.comments_count ?? 0,
    saveCount: stats?.save_count ?? 0,
    creatorUsername: row.creator?.username ?? "",
    creatorName,
    creatorAvatarUrl: getAvatarUrl(row.creator?.avatar_url),
    creatorAvatarInitial: avatarInitial(creatorName),
    createdAt: row.created_at,
    status: row.status,
    visibility: row.visibility === "unlisted" ? "unlisted" : "public",
    tags: [categoryName].filter(Boolean),
  };
}

function normalizeRecipeRow(row: RecipeQueryRow): RecipeRow {
  return {
    ...row,
    category: oneOrNull(row.category),
    creator: oneOrNull(row.creator),
  };
}

function logSupabaseError(scope: string, error: SupabaseError | null) {
  if (error) {
    console.error(`[supabase:${scope}] ${error.message}`);
  }
}

function matchesCookingTime(recipe: Recipe, cookingTime?: CookingTimeFilter) {
  if (!cookingTime) return true;

  if (cookingTime === "under-15") return recipe.cookingTime <= 15;
  if (cookingTime === "under-30") return recipe.cookingTime <= 30;
  return recipe.cookingTime <= 60;
}

function matchesRecipeFilters(recipe: Recipe, filters: RecipeFilters = {}) {
  return (
    (!filters.categoryId || recipe.categoryId === filters.categoryId) &&
    (!filters.difficulty || recipe.difficulty === filters.difficulty) &&
    matchesCookingTime(recipe, filters.cookingTime)
  );
}

function compareNewest(a: RecipeEntry, b: RecipeEntry) {
  const dateDiff = Date.parse(b.recipe.createdAt) - Date.parse(a.recipe.createdAt);
  return dateDiff || b.recipe.id.localeCompare(a.recipe.id);
}

function compareTopRated(a: RecipeEntry, b: RecipeEntry) {
  return (
    b.score - a.score ||
    b.recipe.rating - a.recipe.rating ||
    b.recipe.ratingsCount - a.recipe.ratingsCount ||
    compareNewest(a, b)
  );
}

function compareFastest(a: RecipeEntry, b: RecipeEntry) {
  return a.recipe.cookingTime - b.recipe.cookingTime || compareNewest(a, b);
}

function sortRecipeEntries(entries: RecipeEntry[], sort: RecipeSort = "newest") {
  return [...entries].sort((a, b) => {
    if (sort === "top-rated") return compareTopRated(a, b);
    if (sort === "fastest") return compareFastest(a, b);
    return compareNewest(a, b);
  });
}

function filterAndSortRecipeEntries(entries: RecipeEntry[], filters: RecipeFilters = {}) {
  return sortRecipeEntries(
    entries.filter((entry) => matchesRecipeFilters(entry.recipe, filters)),
    filters.sort,
  );
}

async function getClientOrNull() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createClient();
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await getClientOrNull();
  if (!supabase) return [];

  const [{ data: categoryRows, error: categoryError }, { data: recipeRows, error: recipeError }] = await Promise.all([
    supabase.from("categories").select("id,name,slug,description").order("name", { ascending: true }),
    supabase.from("recipes").select("category_id").eq("status", "published").eq("visibility", "public"),
  ]);

  logSupabaseError("categories", categoryError);
  logSupabaseError("category-counts", recipeError);

  if (categoryError || !categoryRows) return [];

  const counts = new Map<string, number>();
  (recipeRows ?? []).forEach((row) => {
    if (row.category_id) {
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    }
  });

  return (categoryRows as CategoryRow[]).map((row, index) => mapCategory(row, counts.get(row.id) ?? 0, index));
});

export async function getCategoryBySlug(slug: string) {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

async function getRecipeStatsById(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("recipe_stats")
    .select("recipe_id,average_rating,ratings_count,comments_count,save_count,recipe_score");

  logSupabaseError("recipe-stats", error);

  const stats = new Map<string, RecipeStatsRow>();
  if (!error) {
    (data as RecipeStatsRow[] | null ?? []).forEach((row) => {
      stats.set(row.recipe_id, row);
    });
  }

  return stats;
}

function mapRecipeEntries(rows: RecipeQueryRow[], statsById: Map<string, RecipeStatsRow>): RecipeEntry[] {
  return rows.map((queryRow) => {
    const row = normalizeRecipeRow(queryRow);
    const stats = statsById.get(row.id);
    return {
      recipe: mapRecipe(row, stats),
      score: toNumber(stats?.recipe_score),
    };
  });
}

async function fetchPublishedRecipeEntries(): Promise<RecipeEntry[]> {
  const supabase = await getClientOrNull();
  if (!supabase) return [];

  const [{ data, error }, statsById] = await Promise.all([
    supabase
      .from("recipes")
      .select(recipeSelect)
      .eq("status", "published")
      .eq("visibility", "public")
      .order("created_at", { ascending: false }),
    getRecipeStatsById(supabase),
  ]);

  logSupabaseError("recipes", error);

  if (error || !data) return [];

  return mapRecipeEntries(data as unknown as RecipeQueryRow[], statsById);
}

const getPublishedRecipeEntries = cache(async (): Promise<RecipeEntry[]> => fetchPublishedRecipeEntries());

export async function getRecipes(filters: RecipeFilters = {}) {
  const entries = await getPublishedRecipeEntries();
  return filterAndSortRecipeEntries(entries, filters).map((entry) => entry.recipe);
}

export async function getTopRecipes(limit = 5) {
  const entries = await getPublishedRecipeEntries();

  return filterAndSortRecipeEntries(entries, { sort: "top-rated" })
    .slice(0, limit)
    .map((entry) => entry.recipe);
}

export async function getLatestRecipes(limit = 4) {
  const recipes = await getRecipes({ sort: "newest" });
  return recipes.slice(0, limit);
}

function tbilisiDayNumber(now = new Date()) {
  const tbilisiMs = now.getTime() + 4 * 60 * 60 * 1000;
  return Math.floor(tbilisiMs / (24 * 60 * 60 * 1000));
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function getDailyPicks({ poolSize = 20, count = 5 } = {}) {
  const entries = await getPublishedRecipeEntries();
  const pool = filterAndSortRecipeEntries(entries, { sort: "top-rated" })
    .slice(0, poolSize)
    .map((entry) => entry.recipe);
  if (pool.length === 0) return [];
  return seededShuffle(pool, tbilisiDayNumber()).slice(0, Math.min(count, pool.length));
}

export async function getRecipeBySlug(slug: string) {
  // Direct lookup (not derived from the public pool) so published-but-unlisted
  // recipes are reachable by their own slug for anyone with the link, while still
  // being absent from every listing. RLS already gates this to published rows.
  const supabase = await getClientOrNull();
  if (!supabase) return null;

  const [{ data, error }, statsById] = await Promise.all([
    supabase.from("recipes").select(recipeSelect).eq("slug", slug).eq("status", "published").maybeSingle(),
    getRecipeStatsById(supabase),
  ]);

  logSupabaseError("recipe-by-slug", error);

  if (error || !data) return null;

  const row = normalizeRecipeRow(data as unknown as RecipeQueryRow);
  return mapRecipe(row, statsById.get(row.id));
}

export async function getEditableRecipeBySlug(slug: string, userId: string) {
  const supabase = await getClientOrNull();
  if (!supabase) return null;

  const [{ data, error }, statsById] = await Promise.all([
    supabase
      .from("recipes")
      .select(recipeSelect)
      .eq("slug", slug)
      .eq("user_id", userId)
      .maybeSingle(),
    getRecipeStatsById(supabase),
  ]);

  logSupabaseError("editable-recipe", error);

  if (error || !data) return null;

  const row = normalizeRecipeRow(data as unknown as RecipeQueryRow);
  return mapRecipe(row, statsById.get(row.id));
}

export async function getRecipesByCategoryId(categoryId: string, filters: Omit<RecipeFilters, "categoryId"> = {}) {
  return getRecipes({ ...filters, categoryId });
}

export async function getRecipesByCook(username: string, filters: RecipeFilters = {}) {
  const entries = await getPublishedRecipeEntries();
  return filterAndSortRecipeEntries(
    entries.filter((entry) => entry.recipe.creatorUsername === username),
    filters,
  ).map((entry) => entry.recipe);
}

export async function getOwnedRecipes(userId: string): Promise<Recipe[]> {
  const supabase = await getClientOrNull();
  if (!supabase) return [];

  const [{ data, error }, statsById] = await Promise.all([
    supabase
      .from("recipes")
      .select(recipeSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    getRecipeStatsById(supabase),
  ]);

  logSupabaseError("owned-recipes", error);

  if (error || !data) return [];

  return mapRecipeEntries(data as unknown as RecipeQueryRow[], statsById).map((entry) => entry.recipe);
}

export async function searchRecipes(query: string, filters: RecipeFilters = {}) {
  const trimmed = query.trim();

  if (!trimmed) {
    return getRecipes(filters);
  }

  const entries = await getPublishedRecipeEntries();
  const matched = entries.filter((entry) => matchesSearchQuery(entry.recipe, trimmed));
  return filterAndSortRecipeEntries(matched, filters).map((entry) => entry.recipe);
}

export type PantryRecipeResult = {
  recipe: Recipe;
  match: RecipeMatch;
};

export async function getPantryRecipes(
  pantry: PantryState,
  filters: RecipeFilters = {},
): Promise<PantryRecipeResult[]> {
  if (pantry.ids.length === 0 && pantry.freeText.length === 0) {
    return [];
  }

  const entries = await getPublishedRecipeEntries();
  const pantryInput = {
    ids: new Set(pantry.ids),
    freeText: pantry.freeText,
    basics: pantry.basics,
  };

  const matched = entries
    .filter((entry) => entry.recipe.ingredients.length > 0)
    .filter((entry) => matchesRecipeFilters(entry.recipe, filters))
    .map((entry) => ({ entry, match: matchRecipe(entry.recipe, pantryInput) }))
    .filter(({ match }) => match.missingCount <= pantry.maxMissing);

  matched.sort((a, b) => {
    if (a.match.missingCount !== b.match.missingCount) {
      return a.match.missingCount - b.match.missingCount;
    }
    if (a.entry.score !== b.entry.score) {
      return b.entry.score - a.entry.score;
    }
    return Date.parse(b.entry.recipe.createdAt) - Date.parse(a.entry.recipe.createdAt);
  });

  return matched.map(({ entry, match }) => ({ recipe: entry.recipe, match }));
}

export async function searchCategories(query: string): Promise<Category[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const categories = await getCategories();
  return categories.filter((category) => matchesCategoryQuery(category, trimmed));
}

export async function getRecipeComments(recipe: Recipe): Promise<Comment[]> {
  const supabase = await getClientOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("comments")
    .select("id,user_id,body,created_at,author:profiles(full_name,username)")
    .eq("recipe_id", recipe.id)
    .order("created_at", { ascending: false });

  logSupabaseError("comments", error);

  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      user_id: string;
      body: string;
      created_at: string;
      author: Pick<ProfileRow, "full_name" | "username"> | Pick<ProfileRow, "full_name" | "username">[] | null;
    }>
  ).map((comment) => {
    const profile = oneOrNull(comment.author);
    const author = profile?.full_name ?? profile?.username ?? "Kulera";

    return {
      id: comment.id,
      userId: comment.user_id,
      recipeSlug: recipe.slug,
      author,
      avatarInitial: avatarInitial(author),
      body: comment.body,
      createdAt: comment.created_at,
    };
  });
}

export async function isRecipeSavedBy(recipeId: string, userId: string): Promise<boolean> {
  const supabase = await getClientOrNull();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("saved_recipes")
    .select("id")
    .eq("recipe_id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();

  logSupabaseError("is-saved", error);

  if (error || !data) return false;

  return true;
}

export async function getUserRecipeRating(recipeId: string, userId: string): Promise<number | null> {
  const supabase = await getClientOrNull();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("ratings")
    .select("value")
    .eq("recipe_id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();

  logSupabaseError("user-rating", error);

  if (error || !data) return null;

  return typeof data.value === "number" ? data.value : null;
}

export async function getSimilarRecipes(recipe: Recipe, limit = 3) {
  const recipes = await getRecipes();
  const categoryMatches = recipes.filter((item) => item.id !== recipe.id && item.categoryId === recipe.categoryId);
  const fallbackMatches = recipes.filter((item) => item.id !== recipe.id && item.categoryId !== recipe.categoryId);

  return [...categoryMatches, ...fallbackMatches].slice(0, limit);
}

export const getCooks = cache(async (): Promise<Cook[]> => {
  const supabase = await getClientOrNull();
  if (!supabase) return [];

  const [{ data: profiles, error: profilesError }, { data: statsRows, error: statsError }, recipes] = await Promise.all([
    supabase.from("profiles").select("id,full_name,username,bio,avatar_url").order("full_name", { ascending: true }),
    supabase.from("cook_stats").select("user_id,average_recipe_rating,total_published_recipes,total_ratings,cook_score"),
    getRecipes(),
  ]);

  logSupabaseError("profiles", profilesError);
  logSupabaseError("cook-stats", statsError);

  if (profilesError || !profiles) return [];

  const statsByUserId = new Map<string, CookStatsRow>();
  if (!statsError) {
    (statsRows as CookStatsRow[] | null ?? []).forEach((row) => {
      statsByUserId.set(row.user_id, row);
    });
  }

  return (profiles as ProfileRow[]).map((profile) => {
    const stats = statsByUserId.get(profile.id);
    const cookRecipes = recipes.filter((recipe) => recipe.creatorUsername === profile.username);
    const mostPopularRecipe = [...cookRecipes].sort((a, b) => b.saveCount + b.ratingsCount - (a.saveCount + a.ratingsCount))[0];
    const totalRecipes = stats?.total_published_recipes ?? cookRecipes.length;
    const totalRatings = stats?.total_ratings ?? cookRecipes.reduce((sum, recipe) => sum + recipe.ratingsCount, 0);
    const averageRating = toNumber(stats?.average_recipe_rating);

    return {
      id: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      avatarInitial: avatarInitial(profile.full_name),
      avatarUrl: getAvatarUrl(profile.avatar_url),
      bio: profile.bio ?? "",
      averageRating,
      totalRecipes,
      totalRatings,
      badges: buildCookBadges({ averageRating, totalRatings, totalRecipes }),
      mostPopularRecipe: mostPopularRecipe?.title ?? "რეცეპტი ჯერ არ არის",
    };
  });
});

function buildCookBadges(cook: Pick<Cook, "averageRating" | "totalRatings" | "totalRecipes">) {
  const badges: string[] = [];

  if (cook.totalRecipes >= 3 && cook.averageRating >= 4.5) badges.push("Top Kulinar");
  if (cook.totalRatings >= 20) badges.push("Most Loved");
  if (cook.totalRecipes > 0 && cook.totalRecipes < 3) badges.push("Rising Cook");
  if (badges.length === 0) badges.push("New");

  return badges;
}

export async function getRankedCooks() {
  const cooks = await getCooks();

  return cooks
    .filter((cook) => cook.totalRecipes >= 3 && cook.totalRatings >= 20)
    .sort((a, b) => cookScore(b) - cookScore(a));
}

export async function getCookByUsername(username: string) {
  const cooks = await getCooks();
  return cooks.find((cook) => cook.username === username) ?? null;
}

export type SavedRecipeEntry = { recipe: Recipe; savedAt: string };

export async function getSavedRecipeEntries(
  userId: string,
  filters: RecipeFilters = {},
): Promise<SavedRecipeEntry[]> {
  const supabase = await getClientOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("saved_recipes")
    .select("recipe_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  logSupabaseError("saved-recipes", error);

  if (error || !data) return [];

  const entries = await getPublishedRecipeEntries();
  const entriesById = new Map(entries.map((entry) => [entry.recipe.id, entry]));

  const savedRows = data as Array<{ recipe_id: string; created_at: string }>;
  const savedByRecipeId = new Map(savedRows.map((row) => [row.recipe_id, row.created_at] as const));

  const savedEntries = savedRows
    .map((saved) => entriesById.get(saved.recipe_id))
    .filter((entry): entry is RecipeEntry => Boolean(entry));

  const ordered = filters.sort
    ? filterAndSortRecipeEntries(savedEntries, filters)
    : savedEntries.filter((entry) => matchesRecipeFilters(entry.recipe, filters));

  return ordered.map((entry) => ({
    recipe: entry.recipe,
    savedAt: savedByRecipeId.get(entry.recipe.id) ?? entry.recipe.createdAt,
  }));
}

export async function getSavedRecipes(userId: string, filters: RecipeFilters = {}) {
  const entries = await getSavedRecipeEntries(userId, filters);
  return entries.map((entry) => entry.recipe);
}

export async function getAccountProfile(userId: string, claims?: Record<string, unknown>): Promise<AccountProfile | null> {
  const supabase = await getClientOrNull();
  if (!supabase) return null;

  const [{ data: profile, error: profileError }, { data: recipeRows, error: recipesError }, { count: savedCount, error: savedError }] =
    await Promise.all([
      supabase.from("profiles").select("id,full_name,username,bio,avatar_url,created_at,notification_prefs").eq("id", userId).maybeSingle(),
      supabase.from("recipes").select("id,status").eq("user_id", userId),
      supabase.from("saved_recipes").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

  logSupabaseError("account-profile", profileError);
  logSupabaseError("account-recipes", recipesError);
  logSupabaseError("account-saved", savedError);

  const profileRow = profile as ProfileRow | null;
  const recipes = recipeRows as Array<{ id: string; status: string }> | null;
  const email = claimString(claims, "email");
  const fullName =
    profileRow?.full_name ||
    claimMetadataString(claims, "full_name") ||
    (email ? email.split("@")[0] : "") ||
    "Kulera user";
  const username = profileRow?.username || claimMetadataString(claims, "username");
  const bio = profileRow?.bio ?? "";

  return {
    id: userId,
    fullName,
    username,
    email,
    bio,
    avatarInitial: avatarInitial(fullName),
    avatarUrl: getAvatarUrl(profileRow?.avatar_url),
    avatarPath: profileRow?.avatar_url ?? null,
    createdAt: profileRow?.created_at ?? null,
    totalRecipes: recipes?.length ?? 0,
    publishedRecipes: recipes?.filter((recipe) => recipe.status === "published").length ?? 0,
    savedRecipes: savedCount ?? 0,
    notificationPrefs: normalizeNotificationPrefs(profileRow?.notification_prefs),
  };
}

// ============================================================================
// Collections
// ============================================================================

const collectionSelect =
  "id,user_id,title,slug,description,cover_image_url,visibility,share_token,created_at,updated_at,creator:profiles(id,full_name,username,bio,avatar_url)";

type CollectionRow = {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  visibility: Collection["visibility"];
  share_token: string;
  created_at: string;
  updated_at: string;
  creator?: ProfileRow | ProfileRow[] | null;
};

type MembershipRow = {
  id: string;
  recipe_id: string;
  section: string | null;
  position: number;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function mapCollection(row: CollectionRow, recipeCount = 0, creatorOverride?: ProfileRow | null): Collection {
  const creator = creatorOverride ?? oneOrNull(row.creator);
  const creatorName = creator?.full_name ?? "Kulera";

  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    coverImageUrl: row.cover_image_url ? getCollectionCoverUrl(row.cover_image_url) : null,
    coverImagePath: row.cover_image_url ?? null,
    visibility: row.visibility,
    shareToken: row.share_token,
    recipeCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creatorUsername: creator?.username ?? "",
    creatorName,
    creatorAvatarUrl: getAvatarUrl(creator?.avatar_url),
    creatorAvatarInitial: avatarInitial(creatorName),
  };
}

// Full recipe objects (category + creator + stats) for a set of ids. RLS allows
// any published recipe to be read by id, so this also covers unlisted recipes
// surfaced through a shared collection.
async function getRecipesByIds(supabase: SupabaseClient, ids: string[]): Promise<Map<string, Recipe>> {
  const map = new Map<string, Recipe>();
  if (ids.length === 0) return map;

  const [{ data, error }, statsById] = await Promise.all([
    supabase.from("recipes").select(recipeSelect).in("id", ids).eq("status", "published"),
    getRecipeStatsById(supabase),
  ]);

  logSupabaseError("collection-recipe-data", error);

  if (error || !data) return map;

  (data as unknown as RecipeQueryRow[]).forEach((queryRow) => {
    const row = normalizeRecipeRow(queryRow);
    map.set(row.id, mapRecipe(row, statsById.get(row.id)));
  });

  return map;
}

function buildMembers(rows: MembershipRow[], recipesById: Map<string, Recipe>): CollectionMember[] {
  return rows
    .map((row) => {
      const recipe = recipesById.get(row.recipe_id);
      if (!recipe) return null;
      return {
        membershipId: row.id,
        section: row.section,
        position: row.position,
        recipe,
      } satisfies CollectionMember;
    })
    .filter((member): member is CollectionMember => member !== null);
}

// Walk position order; start a new visual group whenever the section label
// changes. A flat collection (all labels null) yields a single null-labelled group.
function groupIntoSections(members: CollectionMember[]): CollectionSection[] {
  const sections: CollectionSection[] = [];

  for (const member of members) {
    const label = member.section?.trim() ? member.section.trim() : null;
    const last = sections[sections.length - 1];

    if (last && last.label === label) {
      last.recipes.push(member.recipe);
    } else {
      sections.push({ label, recipes: [member.recipe] });
    }
  }

  return sections;
}

async function getCollectionCounts(supabase: SupabaseClient, collectionIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (collectionIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("collection_recipes")
    .select("collection_id")
    .in("collection_id", collectionIds);

  logSupabaseError("collection-counts", error);

  if (error || !data) return counts;

  (data as Array<{ collection_id: string }>).forEach((row) => {
    counts.set(row.collection_id, (counts.get(row.collection_id) ?? 0) + 1);
  });

  return counts;
}

async function loadCollectionDetail(supabase: SupabaseClient, row: CollectionRow, creatorOverride?: ProfileRow | null) {
  const { data: memberData, error: memberError } = await supabase
    .from("collection_recipes")
    .select("id,recipe_id,section,position")
    .eq("collection_id", row.id)
    .order("position", { ascending: true });

  logSupabaseError("collection-members", memberError);

  const memberRows = (memberData ?? []) as MembershipRow[];
  const recipesById = await getRecipesByIds(supabase, memberRows.map((member) => member.recipe_id));
  const members = buildMembers(memberRows, recipesById);

  return {
    collection: mapCollection(row, members.length, creatorOverride),
    members,
    sections: groupIntoSections(members),
  } satisfies CollectionDetail;
}

export async function getOwnedCollections(userId: string): Promise<Collection[]> {
  const supabase = await getClientOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("collections")
    .select(collectionSelect)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  logSupabaseError("owned-collections", error);

  if (error || !data) return [];

  const rows = data as unknown as CollectionRow[];
  const counts = await getCollectionCounts(supabase, rows.map((row) => row.id));
  return rows.map((row) => mapCollection(row, counts.get(row.id) ?? 0));
}

export async function getOwnedCollectionBySlug(slug: string, userId: string): Promise<CollectionDetail | null> {
  const supabase = await getClientOrNull();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("collections")
    .select(collectionSelect)
    .eq("slug", slug)
    .eq("user_id", userId)
    .maybeSingle();

  logSupabaseError("owned-collection", error);

  if (error || !data) return null;

  return loadCollectionDetail(supabase, data as unknown as CollectionRow);
}

export async function getSharedCollectionByToken(token: string): Promise<CollectionDetail | null> {
  const supabase = await getClientOrNull();
  if (!supabase || !token) return null;

  const { data: collData, error: collError } = await supabase.rpc("get_shared_collection", { p_token: token });
  logSupabaseError("shared-collection", collError);

  const collRow = (Array.isArray(collData) ? collData[0] : null) as CollectionRow | null;
  if (collError || !collRow) return null;

  const [{ data: memberData, error: memberError }, { data: creatorData }] = await Promise.all([
    supabase.rpc("get_shared_collection_recipes", { p_token: token }),
    supabase.from("profiles").select("id,full_name,username,bio,avatar_url").eq("id", collRow.user_id).maybeSingle(),
  ]);

  logSupabaseError("shared-collection-recipes", memberError);

  const memberRows = ((memberData ?? []) as Array<{ cr_id: string; recipe_id: string; section: string | null; position: number }>).map(
    (member) => ({ id: member.cr_id, recipe_id: member.recipe_id, section: member.section, position: member.position }),
  );

  const recipesById = await getRecipesByIds(supabase, memberRows.map((member) => member.recipe_id));
  const members = buildMembers(memberRows, recipesById);

  return {
    collection: mapCollection(collRow, members.length, (creatorData ?? null) as ProfileRow | null),
    members,
    sections: groupIntoSections(members),
  };
}

export async function getPublicCollectionsByCook(username: string): Promise<Collection[]> {
  const supabase = await getClientOrNull();
  if (!supabase) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,username,bio,avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return [];

  const { data, error } = await supabase
    .from("collections")
    .select(collectionSelect)
    .eq("user_id", (profile as ProfileRow).id)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false });

  logSupabaseError("public-collections", error);

  if (error || !data) return [];

  const rows = data as unknown as CollectionRow[];
  const counts = await getCollectionCounts(supabase, rows.map((row) => row.id));
  return rows.map((row) => mapCollection(row, counts.get(row.id) ?? 0));
}

export async function getPublicCollectionBySlug(username: string, slug: string): Promise<CollectionDetail | null> {
  const supabase = await getClientOrNull();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("collections")
    .select(collectionSelect)
    .eq("slug", slug)
    .eq("visibility", "public")
    .maybeSingle();

  logSupabaseError("public-collection", error);

  if (error || !data) return null;

  const row = data as unknown as CollectionRow;
  const creator = oneOrNull(row.creator);
  if (creator && creator.username !== username) return null;

  return loadCollectionDetail(supabase, row);
}

// The user's own collection ids that already contain a given recipe — powers the
// checked state of the add-to-collection menu.
export async function getCollectionMembershipsForRecipe(recipeId: string, userId: string): Promise<Set<string>> {
  const memberships = new Set<string>();

  const supabase = await getClientOrNull();
  if (!supabase || !recipeId || !userId) return memberships;

  const { data: collections } = await supabase.from("collections").select("id").eq("user_id", userId);
  const collectionIds = ((collections ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (collectionIds.length === 0) return memberships;

  const { data, error } = await supabase
    .from("collection_recipes")
    .select("collection_id")
    .eq("recipe_id", recipeId)
    .in("collection_id", collectionIds);

  logSupabaseError("recipe-memberships", error);

  ((data ?? []) as Array<{ collection_id: string }>).forEach((row) => memberships.add(row.collection_id));

  return memberships;
}
