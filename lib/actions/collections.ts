"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { slugifyTitle } from "@/lib/slug";
import { collectionFormSchema } from "@/lib/validation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CollectionActionState = {
  fieldErrors?: { title?: string; description?: string };
  formError?: string;
  message?: string;
  ok?: boolean;
  toastKey?: number;
  slug?: string;
};

export type CollectionMutationResult = {
  ok: boolean;
  error?: string;
  authRequired?: boolean;
  inCollection?: boolean;
};

type OwnedCollectionRow = {
  id: string;
  slug: string;
  visibility: "public" | "unlisted" | "private";
  share_token: string;
  user_id: string;
};

export type ReorderItem = {
  membershipId: string;
  recipeId: string;
  section: string | null;
  position: number;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fieldErrorsFromZod(error: ZodError): CollectionActionState["fieldErrors"] {
  const errors: NonNullable<CollectionActionState["fieldErrors"]> = {};
  error.issues.forEach((issue) => {
    const field = issue.path[0];
    if ((field === "title" || field === "description") && !errors[field]) {
      errors[field] = issue.message;
    }
  });
  return errors;
}

// Map DB trigger sentinels to friendly Georgian messages.
function mapCollectionError(message: string): string {
  if (message.includes("COLLECTION_HAS_UNLISTED_RECIPES")) {
    return "ჯერ ამოიღე ან გაასაჯაროვე არასაჯარო რეცეპტები, რომ კოლექცია საჯარო გახდეს.";
  }
  if (message.includes("PUBLIC_COLLECTION_REQUIRES_PUBLIC_RECIPE")) {
    return "საჯარო კოლექციაში მხოლოდ საჯარო რეცეპტი ემატება.";
  }
  return message;
}

async function getContext() {
  if (!hasSupabaseConfig()) {
    return { error: "Supabase არ არის კონფიგურირებული.", supabase: null, userId: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !userId) {
    return { error: "ავტორიზაცია საჭიროა.", supabase: null, userId: null };
  }

  return { error: null, supabase, userId };
}

async function getOwnedCollection(supabase: SupabaseServerClient, collectionId: string, userId: string) {
  const { data, error } = await supabase
    .from("collections")
    .select("id,slug,visibility,share_token,user_id")
    .eq("id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { error: "კოლექციის მოძებნა ვერ მოხერხდა.", collection: null };
  }
  if (!data) {
    return { error: "ამ კოლექციის შეცვლის უფლება არ გაქვს.", collection: null };
  }

  return { error: null, collection: data as OwnedCollectionRow };
}

async function generateUniqueCollectionSlug(supabase: SupabaseServerClient, title: string, currentId?: string) {
  const baseSlug = slugifyTitle(title) || `collection-${Date.now()}`;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    let query = supabase.from("collections").select("id").eq("slug", slug).limit(1);

    if (currentId) {
      query = query.neq("id", currentId);
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

async function nextPosition(supabase: SupabaseServerClient, collectionId: string) {
  const { data } = await supabase
    .from("collection_recipes")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data?.position as number | undefined) ?? -1) + 1;
}

// ---- Collection CRUD (form actions) ----

export async function createCollection(_previousState: CollectionActionState, formData: FormData): Promise<CollectionActionState> {
  const context = await getContext();
  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია საჭიროა." };
  }

  const parsed = collectionFormSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    coverImageUrl: formString(formData, "coverImageUrl"),
    visibility: formString(formData, "visibility") || "private",
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error), formError: "შეასწორე მონიშნული ველები." };
  }

  const slug = await generateUniqueCollectionSlug(context.supabase, parsed.data.title);
  const { data, error } = await context.supabase
    .from("collections")
    .insert({
      user_id: context.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      cover_image_url: parsed.data.coverImageUrl || null,
      visibility: parsed.data.visibility,
      slug,
    })
    .select("slug")
    .single();

  if (error) {
    return { formError: mapCollectionError(error.message) };
  }

  revalidatePath("/account/collections");
  redirect(`/account/collections/${data.slug as string}/edit`);
}

export async function updateCollection(_previousState: CollectionActionState, formData: FormData): Promise<CollectionActionState> {
  const context = await getContext();
  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია საჭიროა." };
  }

  const collectionId = formString(formData, "collectionId");
  const owned = await getOwnedCollection(context.supabase, collectionId, context.userId);
  if (!owned.collection) {
    return { formError: owned.error ?? "კოლექცია ვერ მოიძებნა." };
  }

  const parsed = collectionFormSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    coverImageUrl: formString(formData, "coverImageUrl"),
    visibility: formString(formData, "visibility") || owned.collection.visibility,
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error), formError: "შეასწორე მონიშნული ველები." };
  }

  const { data, error } = await context.supabase
    .from("collections")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      cover_image_url: parsed.data.coverImageUrl || null,
      visibility: parsed.data.visibility,
    })
    .eq("id", collectionId)
    .eq("user_id", context.userId)
    .select("slug")
    .single();

  if (error) {
    return { formError: mapCollectionError(error.message) };
  }

  const slug = data.slug as string;
  revalidatePath("/account/collections");
  revalidatePath(`/account/collections/${slug}/edit`);
  return { ok: true, message: "კოლექცია განახლდა.", toastKey: Date.now(), slug };
}

export async function deleteCollection(formData: FormData): Promise<void> {
  const context = await getContext();
  if (!context.supabase || !context.userId) {
    return;
  }

  const collectionId = formString(formData, "collectionId");
  if (!collectionId) {
    return;
  }

  const { error } = await context.supabase.from("collections").delete().eq("id", collectionId).eq("user_id", context.userId);

  if (error) {
    console.error(`[collections:delete] ${error.message}`);
    return;
  }

  revalidatePath("/account/collections");
  redirect("/account/collections");
}

// ---- Membership (direct calls from client) ----

export async function toggleRecipeInCollection(collectionId: string, recipeId: string): Promise<CollectionMutationResult> {
  if (!hasSupabaseConfig()) {
    return { ok: false, error: "Supabase არ არის კონფიგურირებული." };
  }
  if (!collectionId || !recipeId) {
    return { ok: false, error: "მონაცემები ვერ მოიძებნა." };
  }

  const context = await getContext();
  if (!context.supabase || !context.userId) {
    return { ok: false, authRequired: true, error: "ავტორიზაცია საჭიროა." };
  }

  const owned = await getOwnedCollection(context.supabase, collectionId, context.userId);
  if (!owned.collection) {
    return { ok: false, error: owned.error ?? "კოლექცია ვერ მოიძებნა." };
  }

  const { data: existing, error: existingError } = await context.supabase
    .from("collection_recipes")
    .select("id")
    .eq("collection_id", collectionId)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existing) {
    const { error } = await context.supabase
      .from("collection_recipes")
      .delete()
      .eq("id", existing.id)
      .eq("collection_id", collectionId);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath(`/account/collections/${owned.collection.slug}/edit`);
    return { ok: true, inCollection: false };
  }

  // Adding: only published recipes, and a public collection takes public recipes only.
  const { data: recipe } = await context.supabase
    .from("recipes")
    .select("id,status,visibility")
    .eq("id", recipeId)
    .maybeSingle();

  if (!recipe || recipe.status !== "published") {
    return { ok: false, error: "მხოლოდ გამოქვეყნებული რეცეპტი დაემატება." };
  }
  if (owned.collection.visibility === "public" && recipe.visibility !== "public") {
    return { ok: false, error: "საჯარო კოლექციაში მხოლოდ საჯარო რეცეპტი ემატება." };
  }

  const position = await nextPosition(context.supabase, collectionId);
  const { error } = await context.supabase
    .from("collection_recipes")
    .insert({ collection_id: collectionId, recipe_id: recipeId, position });

  if (error) {
    return { ok: false, error: mapCollectionError(error.message) };
  }

  revalidatePath(`/account/collections/${owned.collection.slug}/edit`);
  return { ok: true, inCollection: true };
}

export async function removeRecipeFromCollection(collectionId: string, recipeId: string): Promise<CollectionMutationResult> {
  const context = await getContext();
  if (!context.supabase || !context.userId) {
    return { ok: false, authRequired: true, error: "ავტორიზაცია საჭიროა." };
  }

  const owned = await getOwnedCollection(context.supabase, collectionId, context.userId);
  if (!owned.collection) {
    return { ok: false, error: owned.error ?? "კოლექცია ვერ მოიძებნა." };
  }

  const { error } = await context.supabase
    .from("collection_recipes")
    .delete()
    .eq("collection_id", collectionId)
    .eq("recipe_id", recipeId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/account/collections/${owned.collection.slug}/edit`);
  return { ok: true };
}

// Persist the full ordered snapshot in one upsert. The client always sends a
// complete normalized list, so overlapping saves can't corrupt the order.
export async function reorderCollection(collectionId: string, items: ReorderItem[]): Promise<CollectionMutationResult> {
  const context = await getContext();
  if (!context.supabase || !context.userId) {
    return { ok: false, authRequired: true, error: "ავტორიზაცია საჭიროა." };
  }

  const owned = await getOwnedCollection(context.supabase, collectionId, context.userId);
  if (!owned.collection) {
    return { ok: false, error: owned.error ?? "კოლექცია ვერ მოიძებნა." };
  }

  if (items.length === 0) {
    return { ok: true };
  }

  const rows = items.map((item) => ({
    id: item.membershipId,
    collection_id: collectionId,
    recipe_id: item.recipeId,
    section: item.section && item.section.trim() ? item.section.trim() : null,
    position: item.position,
  }));

  const { error } = await context.supabase.from("collection_recipes").upsert(rows, { onConflict: "id" });

  if (error) {
    return { ok: false, error: mapCollectionError(error.message) };
  }

  revalidatePath(`/account/collections/${owned.collection.slug}/edit`);
  return { ok: true };
}

export async function rotateShareToken(collectionId: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const context = await getContext();
  if (!context.supabase || !context.userId) {
    return { ok: false, error: "ავტორიზაცია საჭიროა." };
  }

  const owned = await getOwnedCollection(context.supabase, collectionId, context.userId);
  if (!owned.collection) {
    return { ok: false, error: owned.error ?? "კოლექცია ვერ მოიძებნა." };
  }

  const token = randomUUID().replace(/-/g, "");
  const { data, error } = await context.supabase
    .from("collections")
    .update({ share_token: token })
    .eq("id", collectionId)
    .eq("user_id", context.userId)
    .select("share_token")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/account/collections/${owned.collection.slug}/edit`);
  return { ok: true, token: data.share_token as string };
}

// Quick-create a private collection and drop a recipe into it — powers the
// "new collection" shortcut in the add-to-collection dialog.
export async function createCollectionForRecipe(
  title: string,
  recipeId: string,
): Promise<CollectionMutationResult & { collectionId?: string }> {
  const context = await getContext();
  if (!context.supabase || !context.userId) {
    return { ok: false, authRequired: true, error: "ავტორიზაცია საჭიროა." };
  }

  const parsed = collectionFormSchema.safeParse({ title, description: "", coverImageUrl: "", visibility: "private" });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "სათაური არასწორია." };
  }

  const slug = await generateUniqueCollectionSlug(context.supabase, parsed.data.title);
  const { data: collection, error: collectionError } = await context.supabase
    .from("collections")
    .insert({ user_id: context.userId, title: parsed.data.title, visibility: "private", slug })
    .select("id")
    .single();

  if (collectionError) {
    return { ok: false, error: collectionError.message };
  }

  const collectionId = collection.id as string;

  if (recipeId) {
    const { error: memberError } = await context.supabase
      .from("collection_recipes")
      .insert({ collection_id: collectionId, recipe_id: recipeId, position: 0 });

    if (memberError) {
      return { ok: false, error: mapCollectionError(memberError.message), collectionId };
    }
  }

  revalidatePath("/account/collections");
  return { ok: true, inCollection: true, collectionId };
}
