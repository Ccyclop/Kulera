"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseRecipeFormData, type RecipeFieldErrors, type RecipeInput, type RecipeValidationMode } from "@/lib/validation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type RecipeIntent = "save-draft" | "publish" | "update" | "delete";

export type RecipeActionState = {
  fieldErrors?: RecipeFieldErrors;
  formError?: string;
  ok?: boolean;
};

type OwnedRecipeRow = {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived";
  user_id: string;
};

const georgianToLatin: Record<string, string> = {
  ა: "a",
  ბ: "b",
  გ: "g",
  დ: "d",
  ე: "e",
  ვ: "v",
  ზ: "z",
  თ: "t",
  ი: "i",
  კ: "k",
  ლ: "l",
  მ: "m",
  ნ: "n",
  ო: "o",
  პ: "p",
  ჟ: "zh",
  რ: "r",
  ს: "s",
  ტ: "t",
  უ: "u",
  ფ: "p",
  ქ: "q",
  ღ: "gh",
  ყ: "q",
  შ: "sh",
  ჩ: "ch",
  ც: "ts",
  ძ: "dz",
  წ: "ts",
  ჭ: "ch",
  ხ: "kh",
  ჯ: "j",
  ჰ: "h",
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function recipePayload(input: RecipeInput, userId: string, status: "draft" | "published") {
  return {
    user_id: userId,
    category_id: input.categoryId,
    title: input.title,
    description: input.description,
    image_url: input.imageUrl,
    cooking_time: input.cookingTime,
    difficulty: input.difficulty,
    servings: input.servings,
    ingredients: input.ingredients,
    steps: input.steps,
    status,
  };
}

function slugifyTitle(title: string) {
  const transliterated = [...title.toLocaleLowerCase("ka-GE")]
    .map((character) => georgianToLatin[character] ?? character)
    .join("");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

async function getAuthenticatedContext(redirectTo = "/recipes/add") {
  if (!hasSupabaseConfig()) {
    return {
      error: "Supabase არ არის კონფიგურირებული.",
      supabase: null,
      userId: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !userId) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  return {
    error: null,
    supabase,
    userId,
  };
}

async function getOwnedRecipe(supabase: SupabaseServerClient, recipeId: string, userId: string) {
  const { data, error } = await supabase
    .from("recipes")
    .select("id,slug,status,user_id")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      error: "რეცეპტის მოძებნა ვერ მოხერხდა.",
      recipe: null,
    };
  }

  if (!data) {
    return {
      error: "ამ რეცეპტის შეცვლის უფლება არ გაქვს.",
      recipe: null,
    };
  }

  return {
    error: null,
    recipe: data as OwnedRecipeRow,
  };
}

async function generateUniqueSlug(supabase: SupabaseServerClient, title: string, currentRecipeId?: string) {
  const baseSlug = slugifyTitle(title) || `recipe-${Date.now()}`;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    let query = supabase.from("recipes").select("id").eq("slug", slug).limit(1);

    if (currentRecipeId) {
      query = query.neq("id", currentRecipeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error("Slug-ის შემოწმება ვერ მოხერხდა.");
    }

    if (!data) {
      return slug;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

function revalidateRecipePaths(slug?: string) {
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/search");
  revalidatePath("/saved");
  revalidatePath("/categories");
  revalidatePath("/top-kulinaris");

  if (slug) {
    revalidatePath(`/recipes/${slug}`);
    revalidatePath(`/recipes/${slug}/edit`);
  }
}

async function upsertRecipe(formData: FormData, mode: RecipeValidationMode, status: "draft" | "published", preserveStatus = false) {
  const context = await getAuthenticatedContext(formString(formData, "redirectTo") || "/recipes/add");

  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია ვერ დადასტურდა." };
  }

  const parsed = parseRecipeFormData(formData, mode);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.errors,
      formError: "შეასწორე მონიშნული ველები.",
    };
  }

  const recipeId = formString(formData, "recipeId");
  const existing = recipeId ? await getOwnedRecipe(context.supabase, recipeId, context.userId) : null;

  if (existing?.error) {
    return { formError: existing.error };
  }

  const nextStatus = preserveStatus && existing?.recipe ? existing.recipe.status : status;
  const payload = recipePayload(parsed.data, context.userId, nextStatus === "published" ? "published" : "draft");

  if (existing?.recipe) {
    const { data, error } = await context.supabase
      .from("recipes")
      .update(payload)
      .eq("id", existing.recipe.id)
      .eq("user_id", context.userId)
      .select("slug")
      .single();

    if (error) {
      return { formError: error.message };
    }

    const slug = data.slug as string;
    revalidateRecipePaths(slug);
    redirect(nextStatus === "published" ? `/recipes/${slug}` : `/recipes/${slug}/edit`);
  }

  const slug = await generateUniqueSlug(context.supabase, parsed.data.title);
  const { data, error } = await context.supabase
    .from("recipes")
    .insert({
      ...payload,
      slug,
    })
    .select("slug")
    .single();

  if (error) {
    return { formError: error.message };
  }

  const nextSlug = data.slug as string;
  revalidateRecipePaths(nextSlug);
  redirect(nextStatus === "published" ? `/recipes/${nextSlug}` : `/recipes/${nextSlug}/edit`);
}

export async function createRecipe(formData: FormData): Promise<RecipeActionState> {
  return upsertRecipe(formData, "publish", "published");
}

export async function updateRecipe(formData: FormData): Promise<RecipeActionState> {
  return upsertRecipe(formData, "publish", "published", true);
}

export async function saveDraft(formData: FormData): Promise<RecipeActionState> {
  return upsertRecipe(formData, "draft", "draft");
}

export async function publishRecipe(formData: FormData): Promise<RecipeActionState> {
  return upsertRecipe(formData, "publish", "published");
}

export async function deleteRecipe(formData: FormData): Promise<RecipeActionState> {
  const context = await getAuthenticatedContext(formString(formData, "redirectTo") || "/recipes/add");

  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია ვერ დადასტურდა." };
  }

  const recipeId = formString(formData, "recipeId");

  if (!recipeId) {
    return { formError: "წასაშლელი რეცეპტი ვერ მოიძებნა." };
  }

  const existing = await getOwnedRecipe(context.supabase, recipeId, context.userId);

  if (existing.error || !existing.recipe) {
    return { formError: existing.error ?? "რეცეპტის მოძებნა ვერ მოხერხდა." };
  }

  const { error } = await context.supabase.from("recipes").delete().eq("id", existing.recipe.id).eq("user_id", context.userId);

  if (error) {
    return { formError: error.message };
  }

  revalidateRecipePaths(existing.recipe.slug);
  redirect("/account");
}

export async function submitRecipeForm(_previousState: RecipeActionState, formData: FormData): Promise<RecipeActionState> {
  const intent = formString(formData, "intent") as RecipeIntent;

  if (intent === "save-draft") {
    return saveDraft(formData);
  }

  if (intent === "publish") {
    return publishRecipe(formData);
  }

  if (intent === "update") {
    return updateRecipe(formData);
  }

  if (intent === "delete") {
    return deleteRecipe(formData);
  }

  return {
    formError: "უცნობი მოქმედება.",
  };
}
