"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { commentFormSchema } from "@/lib/validation";

export type CommentActionState = {
  fieldErrors?: {
    body?: string;
  };
  formError?: string;
  message?: string;
  ok?: boolean;
  toastKey?: number;
};

export type RateRecipeResult = {
  ok: boolean;
  error?: string;
  value?: number;
};

export type ToggleSavedResult = {
  ok: boolean;
  error?: string;
  saved?: boolean;
  authRequired?: boolean;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRedirectTarget(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

async function getAuthenticatedContext(redirectTo: string) {
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

function revalidateRecipeCommentPaths(recipeSlug: string) {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/saved");
  revalidatePath("/top-kulinaris");
  revalidatePath(`/recipes/${recipeSlug}`);
}

export async function rateRecipe(recipeId: string, value: number): Promise<RateRecipeResult> {
  if (!hasSupabaseConfig()) {
    return { ok: false, error: "Supabase არ არის კონფიგურირებული." };
  }

  if (typeof recipeId !== "string" || !recipeId) {
    return { ok: false, error: "რეცეპტი ვერ მოიძებნა." };
  }

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return { ok: false, error: "შეფასება უნდა იყოს 1-დან 5-მდე." };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (claimsError || !userId) {
    return { ok: false, error: "შეფასებისთვის საჭიროა ავტორიზაცია." };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("id,slug,status")
    .eq("id", recipeId)
    .maybeSingle();

  if (recipeError || !recipe) {
    return { ok: false, error: "რეცეპტი ვერ მოიძებნა." };
  }

  if (recipe.status !== "published") {
    return { ok: false, error: "მხოლოდ გამოქვეყნებული რეცეპტის შეფასებაა შესაძლებელი." };
  }

  const { error: upsertError } = await supabase
    .from("ratings")
    .upsert(
      {
        recipe_id: recipeId,
        user_id: userId,
        value,
      },
      { onConflict: "recipe_id,user_id" },
    );

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  revalidatePath(`/recipes/${recipe.slug}`);
  revalidatePath("/");
  revalidatePath("/top-kulinaris");

  return { ok: true, value };
}

export async function toggleSavedRecipe(recipeId: string): Promise<ToggleSavedResult> {
  if (!hasSupabaseConfig()) {
    return { ok: false, error: "Supabase არ არის კონფიგურირებული." };
  }

  if (typeof recipeId !== "string" || !recipeId) {
    return { ok: false, error: "რეცეპტი ვერ მოიძებნა." };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (claimsError || !userId) {
    return { ok: false, authRequired: true, error: "შენახვისთვის საჭიროა ავტორიზაცია." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("saved_recipes")
    .select("id")
    .eq("recipe_id", recipeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existing) {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/saved");
    revalidatePath("/account");
    return { ok: true, saved: false };
  }

  const { error: insertError } = await supabase.from("saved_recipes").insert({
    recipe_id: recipeId,
    user_id: userId,
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/saved");
  revalidatePath("/account");
  return { ok: true, saved: true };
}

export async function addComment(_previousState: CommentActionState, formData: FormData): Promise<CommentActionState> {
  const recipeId = formString(formData, "recipeId");
  const recipeSlug = formString(formData, "recipeSlug");
  const redirectTo = normalizeRedirectTarget(formString(formData, "redirectTo") || (recipeSlug ? `/recipes/${recipeSlug}` : "/"));
  const parsed = commentFormSchema.safeParse({
    body: formString(formData, "body"),
  });

  const context = await getAuthenticatedContext(redirectTo);

  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია ვერ დადასტურდა." };
  }

  if (!recipeId || !recipeSlug) {
    return { formError: "რეცეპტის მოძებნა ვერ მოხერხდა." };
  }

  if (!parsed.success) {
    return {
      fieldErrors: {
        body: parsed.error.issues[0]?.message ?? "კომენტარი არასწორია.",
      },
    };
  }

  const { data: recipe, error: recipeError } = await context.supabase
    .from("recipes")
    .select("id,status")
    .eq("id", recipeId)
    .eq("slug", recipeSlug)
    .maybeSingle();

  if (recipeError || !recipe) {
    return { formError: "რეცეპტის მოძებნა ვერ მოხერხდა." };
  }

  if (recipe.status !== "published") {
    return { formError: "კომენტარის დამატება მხოლოდ გამოქვეყნებულ რეცეპტზეა შესაძლებელი." };
  }

  const { error } = await context.supabase.from("comments").insert({
    recipe_id: recipeId,
    user_id: context.userId,
    body: parsed.data.body,
  });

  if (error) {
    return { formError: error.message };
  }

  revalidateRecipeCommentPaths(recipeSlug);
  return {
    message: "კომენტარი დაემატა.",
    ok: true,
    toastKey: Date.now(),
  };
}

export async function deleteComment(formData: FormData): Promise<void> {
  const commentId = formString(formData, "commentId");
  const recipeSlug = formString(formData, "recipeSlug");
  const redirectTo = normalizeRedirectTarget(formString(formData, "redirectTo") || (recipeSlug ? `/recipes/${recipeSlug}` : "/"));

  const context = await getAuthenticatedContext(redirectTo);

  if (!context.supabase || !context.userId || !commentId || !recipeSlug) {
    return;
  }

  const { error } = await context.supabase.from("comments").delete().eq("id", commentId).eq("user_id", context.userId);

  if (error) {
    console.error(`[supabase:delete-comment] ${error.message}`);
    return;
  }

  revalidateRecipeCommentPaths(recipeSlug);
}
