/**
 * Kulera recipe seeder — one-time bulk import of seed recipes + brand cook + images.
 *
 * Usage (run from the project root):
 *   npm run seed                    # insert recipes as "published" (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
 *   npm run seed -- --dry-run       # validate all JSON + image presence, write nothing to the DB
 *   npm run seed -- --status=draft  # insert as drafts (hidden from the public until published)
 *   npm run seed -- --only=khinkali # only the matching recipe (by filename or slug)
 *
 * Data lives in data/seed-recipes/ (cooks.json + recipes/*.json + images/*).
 * Uses the service-role admin client, which bypasses RLS, so it can attribute recipes
 * to the brand cook and upload images under a shared seed/ path.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "../lib/supabase/admin";
import { slugifyTitle } from "../lib/slug";
import { RECIPE_BUCKET, AVATAR_BUCKET } from "../lib/storage";
import WebSocket from "ws";

// @supabase/supabase-js initializes a Realtime client that requires a WebSocket.
// Node 20 has no native WebSocket, so provide the `ws` implementation (already a dependency).
if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

type Admin = ReturnType<typeof createAdminClient>;

const DATA_DIR = join(process.cwd(), "data", "seed-recipes");
const RECIPES_DIR = join(DATA_DIR, "recipes");

// Load .env.local into process.env (no dotenv dependency; existing vars win).
function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
loadEnvLocal();

// ---- CLI flags -------------------------------------------------------------
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const ONLY = argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const STATUS = (argv.find((a) => a.startsWith("--status="))?.split("=")[1] ?? "published") as
  | "draft"
  | "published";

if (STATUS !== "draft" && STATUS !== "published") {
  console.error(`❌ --status უნდა იყოს "draft" ან "published" (მიღებული: ${STATUS})`);
  process.exit(1);
}

// ---- validation schemas (mirror lib/validation.ts) -------------------------
const DIFFICULTIES = ["მარტივი", "საშუალო", "რთული"] as const;
const CATEGORY_SLUGS = [
  "georgian-classics",
  "family-dinner",
  "quick-everyday",
  "breakfast",
  "salads-snacks",
  "bakery-bread",
  "vegetarian",
  "desserts",
  "kids",
  "feast-table",
] as const;

const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable(),
  unit: z.string(),
  note: z.string(),
  amount: z.string(),
});

const stepSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  durationSeconds: z.number().int().positive().nullable(),
});

const recipeSchema = z.object({
  cookKey: z.string().min(1),
  categorySlug: z.enum(CATEGORY_SLUGS).nullable(),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(1200),
  cookingTime: z.number().int().min(1).max(1440),
  difficulty: z.enum(DIFFICULTIES),
  servings: z.string().min(1).max(80),
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(stepSchema).min(1),
  imageLocalPath: z.string().optional(),
  imagePrompt: z.string().optional(),
  videoUrl: z.string().nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.string()).optional(),
});

const cookSchema = z.object({
  cookKey: z.string().min(1),
  email: z.string().min(3),
  username: z.string().regex(/^[a-z0-9_-]+$/),
  fullName: z.string().min(1),
  bio: z.string().optional(),
  avatarLocalPath: z.string().optional(),
});

type SeedRecipe = z.infer<typeof recipeSchema>;
type SeedCook = z.infer<typeof cookSchema>;

// ---- loaders ---------------------------------------------------------------
function loadCooks(): SeedCook[] {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, "cooks.json"), "utf8"));
  const parsed = z.array(cookSchema).safeParse(raw);
  if (!parsed.success) {
    console.error("❌ cooks.json ვალიდაცია ჩავარდა:");
    console.error(parsed.error.issues.map((i) => `   - ${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exit(1);
  }
  return parsed.data;
}

function loadRecipes(): { file: string; recipe: SeedRecipe }[] {
  const files = readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const out: { file: string; recipe: SeedRecipe }[] = [];
  for (const file of files) {
    const parsed = recipeSchema.safeParse(JSON.parse(readFileSync(join(RECIPES_DIR, file), "utf8")));
    if (!parsed.success) {
      console.error(`❌ ვალიდაცია ჩავარდა: recipes/${file}`);
      console.error(parsed.error.issues.map((i) => `   - ${i.path.join(".")}: ${i.message}`).join("\n"));
      process.exit(1);
    }
    out.push({ file, recipe: parsed.data });
  }
  return out;
}

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

function resolveImage(localPath?: string): { abs: string; ext: string; contentType: string } | null {
  if (!localPath) return null;
  const abs = join(DATA_DIR, localPath);
  if (!existsSync(abs)) return null;
  const ext = extname(abs).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return null;
  return { abs, ext, contentType };
}

// ---- cook upsert (auth user + profile, idempotent) -------------------------
async function findUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureCook(admin: Admin, cook: SeedCook): Promise<string> {
  // Create the auth user (the handle_new_user trigger then creates a matching profile).
  const { data: created } = await admin.auth.admin.createUser({
    email: cook.email,
    email_confirm: true,
    password: randomBytes(24).toString("base64"),
    user_metadata: { full_name: cook.fullName, username: cook.username },
  });

  let userId = created?.user?.id ?? null;
  if (!userId) {
    // Most likely the email already exists from a previous run — reuse it.
    userId = await findUserIdByEmail(admin, cook.email);
  }
  if (!userId) {
    throw new Error(`კულინარის შექმნა/მოძებნა ვერ მოხერხდა: ${cook.email}`);
  }

  // Optional avatar upload to the avatars bucket.
  let avatarUrl: string | null = null;
  const avatar = resolveImage(cook.avatarLocalPath);
  if (avatar) {
    const path = `seed/${cook.username}${avatar.ext}`;
    const { error } = await admin.storage
      .from(AVATAR_BUCKET)
      .upload(path, readFileSync(avatar.abs), { contentType: avatar.contentType, upsert: true });
    if (!error) avatarUrl = path;
  }

  // Upsert the profile (works whether the trigger already created the row or not).
  const profile: Record<string, unknown> = {
    id: userId,
    full_name: cook.fullName,
    username: cook.username,
  };
  if (cook.bio !== undefined) profile.bio = cook.bio;
  if (avatarUrl) profile.avatar_url = avatarUrl;

  const { error: profileErr } = await admin.from("profiles").upsert(profile, { onConflict: "id" });
  if (profileErr) throw new Error(`პროფილის განახლება ჩავარდა: ${profileErr.message}`);

  return userId;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const cooks = loadCooks();
  const allRecipes = loadRecipes();
  const recipes = allRecipes.filter(
    ({ file, recipe }) => !ONLY || file.replace(/\.json$/, "") === ONLY || slugifyTitle(recipe.title) === ONLY,
  );

  if (!recipes.length) {
    console.error(`❌ რეცეპტი ვერ მოიძებნა${ONLY ? ` (--only=${ONLY})` : ""}.`);
    process.exit(1);
  }

  const missingImages = recipes.filter(({ recipe }) => !resolveImage(recipe.imageLocalPath)).length;

  console.log(`📋 კულინარები: ${cooks.length} | რეცეპტები: ${recipes.length} | სტატუსი: ${STATUS}`);
  if (missingImages) {
    console.log(`⚠️  ${missingImages} რეცეპტს ფოტო არ მოეძებნა — ჩაისმება ფოტოს გარეშე (image_url=null, აპში fallback სურათი გამოჩნდება).`);
  }

  if (DRY_RUN) {
    console.log("\n— DRY RUN — ვალიდაცია წარმატებულია, ბაზაში არაფერი ჩაწერილა. ✅");
    for (const { recipe } of recipes) {
      const img = resolveImage(recipe.imageLocalPath) ? "🖼" : "··";
      console.log(
        `   ${img} ${slugifyTitle(recipe.title).padEnd(34)} ${(recipe.categorySlug ?? "—").padEnd(18)} ${recipe.difficulty}, ${recipe.cookingTime} წთ`,
      );
    }
    console.log("\nნამდვილი ჩასაწერად: დაამატე SUPABASE_SERVICE_ROLE_KEY ფაილში .env.local და გაუშვი `npm run seed`.");
    return;
  }

  let admin: Admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("❌ admin client ვერ შეიქმნა. დაამატე SUPABASE_SERVICE_ROLE_KEY ფაილში .env.local (Supabase → Settings → API).");
    console.error("   დეტალი:", (error as Error).message);
    process.exit(1);
  }

  // Ensure every cook exists, mapped by cookKey → user_id.
  const cookIds = new Map<string, string>();
  for (const cook of cooks) {
    const id = await ensureCook(admin, cook);
    cookIds.set(cook.cookKey, id);
    console.log(`👤 კულინარი მზადაა: ${cook.fullName} (@${cook.username})`);
  }

  // Build category slug → id map once.
  const { data: cats, error: catErr } = await admin.from("categories").select("id,slug");
  if (catErr) {
    console.error("❌ კატეგორიების წამოღება ვერ მოხერხდა:", catErr.message);
    process.exit(1);
  }
  const categoryIdBySlug = new Map<string, string>((cats ?? []).map((c) => [c.slug as string, c.id as string]));
  if (!categoryIdBySlug.size) {
    console.error("❌ კატეგორიები ცარიელია. ჯერ გაუშვი categories seed migration Supabase-ში.");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  // Sequential on purpose: slug-existence check + insert must not race.
  for (const { file, recipe } of recipes) {
    try {
      const userId = cookIds.get(recipe.cookKey);
      if (!userId) throw new Error(`უცნობი cookKey: ${recipe.cookKey}`);

      let categoryId: string | null = null;
      if (recipe.categorySlug) {
        categoryId = categoryIdBySlug.get(recipe.categorySlug) ?? null;
        if (!categoryId) throw new Error(`უცნობი categorySlug: ${recipe.categorySlug}`);
      }

      const slug = slugifyTitle(recipe.title) || `recipe-${file.replace(/\.json$/, "")}`;

      // Idempotency: skip if a recipe with this slug already exists.
      const { data: existing } = await admin.from("recipes").select("id").eq("slug", slug).maybeSingle();
      if (existing) {
        console.log(`↩️  გამოტოვდა (უკვე არსებობს): ${slug}`);
        skipped += 1;
        continue;
      }

      // Upload the image (if present) to recipe-images/seed/{slug}.{ext}.
      let imageUrl: string | null = null;
      const image = resolveImage(recipe.imageLocalPath);
      if (image) {
        const storagePath = `seed/${slug}${image.ext}`;
        const { error: uploadErr } = await admin.storage
          .from(RECIPE_BUCKET)
          .upload(storagePath, readFileSync(image.abs), { contentType: image.contentType, upsert: true });
        if (uploadErr) throw new Error(`ფოტოს ატვირთვა ჩავარდა: ${uploadErr.message}`);
        imageUrl = storagePath;
      }

      const status = recipe.status ?? STATUS;
      const { error: insertErr } = await admin.from("recipes").insert({
        user_id: userId,
        category_id: categoryId,
        title: recipe.title,
        slug,
        description: recipe.description,
        image_url: imageUrl,
        video_url: recipe.videoUrl ?? null,
        cooking_time: recipe.cookingTime,
        difficulty: recipe.difficulty,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        status,
      });
      if (insertErr) throw new Error(insertErr.message);

      console.log(`✅ ჩაიწერა: ${slug} (${status})`);
      created += 1;
    } catch (error) {
      console.error(`❌ ვერ ჩაიწერა ${file}: ${(error as Error).message}`);
      failed += 1;
    }
  }

  console.log(`\n📊 შედეგი — ჩაიწერა: ${created} | გამოტოვდა: ${skipped} | ჩავარდა: ${failed}`);
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
