import { getSupabaseConfig } from "./supabase/env";

export const RECIPE_BUCKET = "recipe-images";
export const RECIPE_VIDEO_BUCKET = "recipe-videos";
export const AVATAR_BUCKET = "avatars";

const RECIPE_FALLBACK = "/assets/chakhokhbili.jpg";

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

export function getPublicImageUrl(path: string | null | undefined, bucket: string, fallback = ""): string {
  if (!path) return fallback;
  if (isAbsoluteUrl(path)) return path;

  const config = getSupabaseConfig();
  if (!config) return fallback;

  const cleaned = path.replace(/^\/+/, "");
  return `${config.url}/storage/v1/object/public/${bucket}/${cleaned}`;
}

export function getRecipeImageUrl(path: string | null | undefined) {
  return getPublicImageUrl(path, RECIPE_BUCKET, RECIPE_FALLBACK);
}

export function getRecipeVideoUrl(path: string | null | undefined) {
  return getPublicImageUrl(path, RECIPE_VIDEO_BUCKET, "");
}

export function getAvatarUrl(path: string | null | undefined) {
  return getPublicImageUrl(path, AVATAR_BUCKET, "");
}

// Collection covers reuse the recipe-images bucket (no new bucket/policy needed).
export function getCollectionCoverUrl(path: string | null | undefined) {
  return getPublicImageUrl(path, RECIPE_BUCKET, "");
}
