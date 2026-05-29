# Kulera — Path to Production-Grade MVP

## Context

Kulera is a Georgian recipe discovery platform built on Next.js 16 + React 19 + Supabase + Tailwind. The **read path is largely complete** (homepage, recipe detail, categories, top-kulinaris, cook profiles, search results render real Supabase data). The **write path is almost entirely stubbed** — every "Publish", "Save draft", "Rate", "Comment", "Bookmark", "Change password", "Delete account" button is non-functional. There is no image upload. Filters and pagination don't exist beyond UI.

Target: production-grade launch. AI fridge feature is post-launch. Images go to Supabase Storage.

---

## Current State Snapshot

**What works**
- Schema is solid: `profiles`, `recipes`, `categories`, `ratings`, `comments`, `saved_recipes`, plus `recipe_stats` and `cook_stats` views. RLS is enabled. Auto-profile trigger on `auth.users` insert. ([supabase/schema.sql](supabase/schema.sql))
- Auth (email+password, Google OAuth, email confirmation, password reset) — fully wired in [components/auth-forms.tsx](components/auth-forms.tsx) and [lib/actions/auth.ts](lib/actions/auth.ts).
- Read-side data layer: [lib/data.ts](lib/data.ts) with React `cache()`, server components fetch directly.
- Routes that render real data: `/`, `/recipes/[slug]`, `/categories`, `/categories/[slug]`, `/top-kulinaris`, `/cooks/[username]`, `/search` (results only).

**What's broken or missing**
- [components/recipe-form.tsx](components/recipe-form.tsx) — every button is `type="button"` with no handler. No submission, no validation, no draft/publish, no delete.
- No image upload anywhere. No Supabase Storage bucket configured.
- Ratings / comments / save-bookmark — UI present, zero handlers.
- `/account` — profile edit, password change, notification prefs, account deletion all stubs.
- Search/category filters and sort — UI only, not wired to query.
- No pagination on any list.
- Mobile nav is `overflow-x-auto` strip — no hamburger, no mobile-optimized header.
- No SEO metadata, no sitemap, no robots, no OG images.
- No analytics, no error reporting, no email transactional layer beyond Supabase auth.
- No legal pages (privacy, terms, cookie notice).
- No tests of any kind. No form validation library.

---

## Phased Roadmap

### Phase 1 — Core write loops (the actual MVP unblocker)

Without this phase users can read but not contribute. This is the highest-leverage work.

**1.1 Image upload via Supabase Storage**
- Add bucket `recipe-images` (public read, authenticated insert, owner update/delete) via new migration in [supabase/](supabase/).
- Build a client uploader component (drag/drop + file input, client-side resize to ~1600px max, WebP conversion, 5MB cap). Replace `UploadPlaceholder` in [components/ui.tsx](components/ui.tsx).
- Store image path (not full URL) in `recipes.image_url`; resolve via `supabase.storage.from('recipe-images').getPublicUrl()` at read time so bucket renames don't break old rows.
- Use `next/image` with a loader configured for the Supabase domain in [next.config.mjs](next.config.mjs).
- Add `avatars` bucket and wire to `/account` for profile pictures.

**1.2 Recipe CRUD via Server Actions**
- Create [lib/actions/recipes.ts](lib/actions/recipes.ts) with `createRecipe`, `updateRecipe`, `deleteRecipe`, `publishRecipe`, `saveDraft`. Use `createServerClient` from [lib/supabase/server.ts](lib/supabase/server.ts).
- Add validation with **zod** (new dep). Parse ingredients/steps from textarea format into the JSONB shape used by the schema.
- Wire all four buttons in [components/recipe-form.tsx](components/recipe-form.tsx). Convert to client component or use form actions; show inline errors per field.
- Slug generation: transliterate Georgian → Latin (use `slugify` or hand-rolled map); ensure uniqueness with retry-on-conflict.
- Delete confirmation modal with hard-delete (Phase 5 will replace with soft-delete + 30d recovery).

**1.3 Ratings**
- Server action `rateRecipe(recipeId, value)` — upsert on `(recipe_id, user_id)`.
- 5-star widget on `/recipes/[slug]`, optimistic update, show user's existing rating.
- Refresh `recipe_stats` view dependency by `revalidatePath` on the recipe page.

**1.4 Comments**
- Server actions `addComment`, `deleteComment` (own only).
- Wire form on recipe detail page; render own comments with delete affordance.
- Basic length validation (1–2000 chars). Profanity filter is Phase 5.

**1.5 Save / unsave**
- Server action `toggleSavedRecipe(recipeId)` — insert or delete on `saved_recipes`.
- Wire `BookmarkButton` and the heart in [components/site-header.tsx](components/site-header.tsx); for unauth users redirect to `/login?next=...`.
- `/saved` already reads — make sure it revalidates on toggle.

**1.6 Account management**
- Profile update server action (full_name, username, bio, avatar). Username uniqueness check.
- Password change via Supabase `updateUser({ password })` (requires recent login — handle the re-auth case).
- Notification preferences: add `profiles.notification_prefs jsonb` column, simple toggle persistence.
- Account deletion: server action that calls `supabase.auth.admin.deleteUser` from a privileged route handler (needs service role key). Cascade is already in schema.

**Verification for Phase 1:** sign up → add recipe with photo → publish → browse → rate → comment → save → edit → delete → log out → log in → confirm everything persists. End-to-end on a fresh DB.

---

### Phase 2 — Discovery: search, filters, pagination

**2.1 Full-text search**
- Add `tsvector` column on `recipes` populated from title+description+ingredients via trigger. GIN index. Migration in [supabase/](supabase/).
- Update [lib/data.ts](lib/data.ts) `searchRecipes` to use `websearch_to_tsquery`.
- Optional: Georgian stemming is weak in Postgres — accept that as a known limitation, document it.

**2.2 Wire filters and sort**
- The UI in `/search`, `/categories/[slug]`, `/saved`, and `/cooks/[username]` already exists. Read filters from `searchParams`, pass to data fetchers, render active state.
- Filters: category, cooking time bucket, difficulty. Sort: newest, top-rated, fastest.

**2.3 Pagination**
- Cursor-based pagination on listing pages (created_at + id tiebreaker). Add a Pagination component to [components/ui.tsx](components/ui.tsx).
- Apply to `/search`, `/categories/[slug]`, `/cooks/[username]`, `/saved`, homepage "latest".

**2.4 Cook profile tabs**
- Activate Top Rated and Latest tabs on `/cooks/[username]` with the ranking helpers in [lib/ranking.ts](lib/ranking.ts).

---

### Phase 3 — Mobile, polish, accessibility

**3.1 Mobile navigation**
- Replace `overflow-x-auto` strip in [components/site-header.tsx](components/site-header.tsx) with a hamburger + sheet/drawer below `md`. Keep desktop layout as-is.
- Bottom-tab nav on mobile for `/`, `/search`, `/recipes/add`, `/saved`, `/account` (recipe-app idiom).

**3.2 Loading, empty, error states everywhere**
- `loading.tsx` with skeletons (reuse `SkeletonRecipeCard`) for every list route.
- `error.tsx` per route segment with a retry CTA.
- Use the existing `EmptyState` component on `/saved`, `/search` (no results), `/cooks/[username]` (no recipes), `/categories/[slug]` (empty category).

**3.3 Accessibility**
- Audit with axe: ARIA roles on the rating widget, focus-visible rings, focus trap in modals, `prefers-reduced-motion`, `aria-live` for form errors and toast notifications, alt text on every image.
- Keyboard reachability for the bookmark button, rating, comment delete.
- Color contrast pass on `text-muted` on `bg-paper` (currently borderline).

**3.4 Form validation polish**
- Adopt **react-hook-form + zod resolver** across recipe form, account form, comment form. Inline errors, disabled submit while pending, success toasts.

---

### Phase 4 — SEO, content surface, growth

**4.1 Metadata**
- Per-route `generateMetadata` for `/recipes/[slug]`, `/categories/[slug]`, `/cooks/[username]`. Title, description, OG image (use the recipe `image_url`), canonical.
- Default OG card image asset in [public/](public/).

**4.2 Sitemap + robots**
- `app/sitemap.ts` enumerating all published recipes, categories, public cook profiles. `app/robots.ts`.

**4.3 Structured data**
- JSON-LD `Recipe` schema on `/recipes/[slug]` (Google Recipe results). Big SEO win for a recipe site — non-negotiable for production.

**4.4 Legal & informational pages**
- `/privacy`, `/terms`, `/cookies`. Link from footer. (Boilerplate is fine; the user can have a lawyer review later.)
- Update [components/site-footer.tsx](components/site-footer.tsx) with these links + social.

**4.5 Email transactional layer**
- For password reset / email confirmation, Supabase already covers it but the templates are default. Customize templates in Supabase dashboard with Kulera branding.
- Add comment-on-your-recipe and new-rating notifications via a Supabase trigger → Postgres `pg_net` → Resend (or via Edge Function). Respect `notification_prefs`.

---

### Phase 5 — Production-grade hardening

**5.1 Observability**
- **Sentry** for client + server error reporting. Wrap server actions.
- **PostHog** or **Plausible** for product analytics (privacy-first; PostHog supports both). Track: signup, recipe_published, recipe_saved, search_performed.

**5.2 Rate limiting & abuse**
- Upstash Redis + middleware for write actions: `rateRecipe`, `addComment`, `createRecipe` capped per-user-per-hour.
- Comment + recipe text run through a basic profanity filter (`bad-words` lib or a small word list); flag rather than block.
- "Report content" action on recipes and comments → `reports` table (new migration), surfaced in a future admin page.

**5.3 Moderation**
- Add `recipes.status` workflow: drafts default; first-time publishers go through a `pending_review` queue (optional toggle). Existing column is already `draft|published|archived` — extend.
- Soft-delete (`deleted_at` column) with 30-day recovery for recipes and comments.
- Minimal admin page at `/admin` gated by `profiles.role = 'admin'` for handling reports.

**5.4 Performance**
- Image optimization end-to-end (already covered by Supabase Storage + `next/image` once configured).
- Verify ISR / `revalidate` strategy on listing pages (currently `force-dynamic` on home — relax to `revalidate: 60`).
- Lighthouse budget: LCP < 2.5s on 4G, TBT < 200ms. Run on `/` and `/recipes/[slug]`.

**5.5 Tests**
- **Vitest** for unit tests on [lib/data.ts](lib/data.ts), [lib/ranking.ts](lib/ranking.ts), zod schemas, server actions (mock Supabase client).
- **Playwright** for E2E on the Phase 1 verification flow (sign up → publish → rate → comment → save → delete). Run against a seeded local Supabase.
- GitHub Actions: lint + typecheck + unit + e2e on every PR.

**5.6 Operational**
- Database backups verified (Supabase handles this; document the restore drill).
- Staging environment (separate Supabase project) wired to a `staging` branch.
- `.env.example` audit — confirm every required var is listed. Currently has the basics; add Sentry DSN, PostHog key, Resend key, Upstash creds.

---

## Verification — what "done" looks like

A new user on a clean device should be able to, end-to-end, with no console errors and no unexpected redirects:

1. Land on `/`, see recipes loaded, working mobile nav.
2. Sign up, confirm email, complete profile with avatar.
3. Add a recipe with photo, ingredients, steps. Save draft → revisit → publish.
4. Their recipe appears in search, in their cook profile, on the homepage "latest" rail.
5. Another user can rate, comment, save it. Original author gets an email notification.
6. Filter `/search` by category + cooking time + sort by top-rated; pagination works.
7. Edit a recipe, change the image, re-publish. Old image is removed from Storage.
8. Delete the recipe (soft delete, 30d). Hard delete the account (cascades).
9. Sentry catches a forced error in staging. PostHog records the events. Lighthouse passes.
10. Playwright E2E suite green in CI.

---

## Critical files to modify (across all phases)

- New: [lib/actions/recipes.ts](lib/actions/recipes.ts), [lib/actions/social.ts](lib/actions/social.ts) (ratings/comments/saves), [lib/actions/account.ts](lib/actions/account.ts), [lib/validation.ts](lib/validation.ts) (zod schemas), [lib/storage.ts](lib/storage.ts).
- New: [components/image-uploader.tsx](components/image-uploader.tsx), [components/rating-widget.tsx](components/rating-widget.tsx), [components/comment-thread.tsx](components/comment-thread.tsx), [components/bookmark-button.tsx](components/bookmark-button.tsx), [components/mobile-nav.tsx](components/mobile-nav.tsx), [components/pagination.tsx](components/pagination.tsx).
- Heavy edits: [components/recipe-form.tsx](components/recipe-form.tsx), [components/site-header.tsx](components/site-header.tsx), [components/site-footer.tsx](components/site-footer.tsx), [app/account/page.tsx](app/account/page.tsx), [app/search/page.tsx](app/search/page.tsx), [app/recipes/[slug]/page.tsx](app/recipes/[slug]/page.tsx), [lib/data.ts](lib/data.ts), [next.config.mjs](next.config.mjs).
- Migrations: storage buckets + policies, `tsvector` column + trigger + GIN index, `notification_prefs`, `reports` table, `deleted_at` columns, optional `role` column.

---

## Suggested execution order & rough effort

| Phase | Effort | Why this order |
|-------|--------|----------------|
| 1     | 5–8 days | Nothing else matters until users can contribute. |
| 2     | 3–4 days | Discovery turns a recipe collection into a platform. |
| 3     | 3–4 days | Mobile is where most recipe traffic lives. |
| 4     | 2–3 days | SEO compounds — start it before any marketing. |
| 5     | 4–6 days | Hardening for the actual launch. |

Total: ~3–5 weeks of focused work to reach the production-grade MVP bar.

---

# Session Handoff — Recipe Detail UX Overhaul

ეს სექცია არის ღია handoff იმისთვის, რომ მეორე AI agent-მა გააგრძელოს ან გადახედოს ცვლილებებს, რომელიც ბოლო session-ში გაკეთდა.

## მოთხოვნა (user)

რეცეპტის შიდა გვერდზე უნდა გაკეთდეს სამი მთავარი ცვლილება:

1. **ვიდეო რეცეპტი** — მთავარ ფოტოზე "ვიდეო რეცეპტი" ღილაკი მხოლოდ მაშინ უნდა ჩანდეს, როცა მომხმარებელი ვიდეოს ატვირთავს. სხვა შემთხვევაში ღილაკი საერთოდ არ უნდა იყოს.
2. **პორციების კონტროლი** — `-` / `+` ღილაკები პორციის რაოდენობას ცვლის და ინგრედიენტებიც შესაბამისად სკალირდება რეალურ დროში.
3. **"დაწყება" ღილაკი → cooking mode** — ცალკე გვერდი, სადაც რეცეპტის ნაბიჯები გადმოცემულია "თამაშის სტილში" (one-step-per-view, ტაიმერი, ingredients checklist, confetti).

დიზაინი უნდა მოერგოს მთლიანი საიტის სტილს (clay/cream, soft-card, ჯორჯიული `font-mersad`, rounded-[28px] ბარათები).

## მომხმარებლის გადაწყვეტილებები (გადამოწმებული AskUserQuestion-ით)

| თემა | არჩევანი |
|------|----------|
| ვიდეო ატვირთვა | ფაილი (Supabase Storage) + YouTube/Vimeo ლინკი |
| ვიდეო ჩვენება | Modal (lightbox) |
| ინგრედიენტების ფორმატი | სტრუქტურირებული `{quantity, unit, note}` + ძველი ფორმატის backward-compat |
| ნაბიჯის ტაიმერი | ოფშენალი duration ველი — გამოჩნდება მხოლოდ თუ შევსებულია |
| Cooking mode UI | სრულეკრანი per step + ტაიმერი + ინგრედიენტების checklist + confetti |
| Cooking mode URL | `/recipes/[slug]/cook` |

## რა გაკეთდა ამ session-ში

### Schema / Storage

- `supabase/storage.sql` — დაემატა `recipe-videos` bucket (100MB lim, `video/mp4`, `video/webm`, `video/quicktime`) + RLS policies. **DEPLOY: საჭიროა ხელით გაშვება Supabase-ში — `psql -f supabase/storage.sql` ან dashboard SQL editor-ში.**
- `supabase/schema.sql` — `video_url` სვეტი უკვე იყო (ცვლილება არ მოითხოვა).

### Types & data layer

- `lib/types.ts` — ახალი ველები:
  - `Ingredient`: `quantity: number | null`, `unit: string`, `note: string`, `amount: string` (legacy/derived).
  - `RecipeStep`: `durationSeconds: number | null`.
  - `Recipe`: `videoUrl`, `videoPath`, `baseServings`.
- `lib/ingredients.ts` *(new)* — `parseAmountText`, `formatQuantity`, `formatAmount`, `scaleIngredient`, `parseServingsCount`. ცნობს უნიკოდის წილადებს (½, ⅓...) და mixed numbers (1 1/2).
- `lib/video.ts` *(new)* — `resolveVideoSource` ცნობს YouTube/Vimeo/mp4/webm.
- `lib/storage.ts` — `RECIPE_VIDEO_BUCKET`, `getRecipeVideoUrl`.
- `lib/data.ts`:
  - `recipeSelect`-ში `video_url` დაემატა.
  - `normalizeIngredients` ახლა აშენებს structured ingredient-ს და backward-compat ფეშის ძველ "200 გ" ფორმატს.
  - `normalizeSteps` კითხულობს `durationSeconds`.
  - `mapRecipe` ავსებს ახალ ველებს (`videoUrl/videoPath/baseServings`).

### Validation & actions

- `lib/validation.ts`:
  - `RecipeInput`-ში დაემატა `videoUrl`.
  - `RecipeFormValues.ingredients` დარჩა როგორც `{name, amount}` (UX-ისთვის ერთი ველი), მაგრამ save-ის დროს `parseAmountText` ცვლის structured-ად.
  - `RecipeFormValues.steps`-ში დაემატა `duration: string` (წუთებში).
  - `parseFieldArraySteps` კონვერტირებს წუთებს → seconds (`durationSeconds`).
  - publish/draft schemas მიიღებენ structured ingredient/step payload-ს.
- `lib/actions/recipes.ts` — `recipePayload`-ში დაემატა `video_url`.

### UI components (ახალი)

- `components/video-uploader.tsx` — toggle "ფაილი / YouTube-Vimeo", validation, preview chip, წაშლა.
- `components/video-lightbox.tsx` — ღილაკი + `FocusDialog` modal-ი video player-ით (file ან embed iframe).
- `components/ingredients-panel.tsx` — interactive sidebar: `-/+` პორცია, ცოცხალი ingredient სკალირება, checklist (strikethrough).
- `components/cook-mode.tsx` *(დიდი)* — სრულეკრანი cooking mode:
  - progress bar header-ში
  - per-step view animation-ით
  - **`StepTimer`** child component (key-ით remount-დება per step → state სუფთა)
  - ingredient checklist sidebar (პორციის +/- მუშაობს აქაც)
  - სტეპების navigation list
  - keyboard ნავიგაცია (←/→)
  - დასასრულზე confetti burst + "გავაკეთე" → შეფასების ბმული
- `app/globals.css`-ში: `kulera-confetti-fall` + `kulera-step-in` keyframes გლობალურად.

### UI components (განახლებული)

- `components/recipe-form.tsx`:
  - VideoUploader-ი ImageUploader-ის გვერდით.
  - ნაბიჯში ოფშენალი "ტაიმერი (წთ)" input.
  - `videoUrl` hidden field და `steps.{n}.duration` form-data submission.
- `app/recipes/[slug]/page.tsx`:
  - "ვიდეო რეცეპტი" ღილაკი მხოლოდ `recipe.videoUrl ? <VideoLightboxTrigger /> : null`.
  - "დაწყება" ღილაკი → `<ButtonLink href="/recipes/[slug]/cook">`.
  - hardcoded ingredient/portion sidebar შეცვალა `<IngredientsPanel />`-მა.

### ახალი route

- `app/recipes/[slug]/cook/page.tsx` — server route, fetch-ავს რეცეპტს და გადასცემს `<CookMode recipe={recipe} />`.

## ფაილების სრული სია (modified/added)

```
M  app/globals.css
M  app/recipes/[slug]/page.tsx
A  app/recipes/[slug]/cook/page.tsx
A  components/cook-mode.tsx
A  components/ingredients-panel.tsx
A  components/video-lightbox.tsx
A  components/video-uploader.tsx
M  components/recipe-form.tsx
M  lib/actions/recipes.ts
M  lib/data.ts
A  lib/ingredients.ts
M  lib/storage.ts
M  lib/types.ts
M  lib/validation.ts
A  lib/video.ts
M  supabase/storage.sql
```

## QA Status

- ✅ `npx tsc --noEmit` — სუფთა.
- ✅ `npm run lint` — სუფთა.
- ✅ `npm run build` — წარმატებული. `/recipes/[slug]/cook` route დარეგისტრირდა.
- ❌ Browser-ში არ შემოწმდა — locally dev server-ის გაშვება არ მომხდარა.

## რა საჭიროა შემდეგ AI agent-ის მიერ

### 1. Supabase setup (BLOCKER for video upload)

```bash
# შეასრულე Supabase project-ში (SQL editor ან psql):
# - გადატარდეს supabase/storage.sql (recipe-videos bucket + policies)
# - დარწმუნდი რომ schema.sql-ში video_url column უკვე ნამდვილად არსებობს
```

თუ Supabase project-ში არ არსებობს `recipe-videos` bucket, video upload ვერ მუშავდება და მომხმარებელი დაინახავს "ფაილი ვერ აიტვირთა" შეცდომას.

### 2. Manual QA (HIGH PRIORITY)

ლოკალურად:
```bash
npm run dev
```

შემოწმდეს:
- `/recipes/[slug]` — ვიდეო ღილაკი არ ჩანს თუ ვიდეო არ არის
- რეცეპტი ვიდეოთი (YouTube ლინკი + ფაილი) — ღილაკზე დაჭერა modal-ში გახსნა
- `/recipes/[slug]` — `-/+` პორციის ცვლა, ingredient-ის რიცხვები სკალირდება
- რეცეპტი არანუმერული amounts-ით ("მცირე მუჭა") — სკალირება არ უნდა ცადოს, უცვლელად დარჩეს
- "დაწყება" → `/cook` გვერდი იხსნება
- Cooking mode: step navigation (←/→ keyboard), timer (თუ ნაბიჯს აქვს duration), ingredient checklist, confetti finish screen
- რეცეპტის ფორმა (`/recipes/add`): video uploader-ში file ატვირთვა და link ცვლა, step row-ში "ტაიმერი (წთ)" შენახვა

### 3. შემდეგი ნაბიჯები / improvements

- **Mobile cook mode** — keyboard navigation არ მუშავდება mobile-ზე; დაამატე swipe gesture (touch handlers).
- **Wake lock** — cooking mode-ში `navigator.wakeLock.request('screen')` რომ ეკრანი არ ჩაქრეს.
- **TTS step reader** — დამატებითი gamification: ნაბიჯის ხმოვანი წაკითხვა.
- **გვერდის გაზიარების ფუნქცია** — დეტალის გვერდზე "გაზიარება" ღილაკი ჯერ უაღრესად placeholder-ია (`href="#"`). გადასაკეთებელია `navigator.share` API-ით ან copy-link toast-ით.
- **Ingredient unit normalization** — ერთეულების ერთგვაროვნება (გ vs გრამი vs g) — ეხება დროებას, ჯერ scope-გარეშეა.
- **Video thumbnail** — ვიდეო ღილაკზე YouTube thumbnail-ის ჩვენება (`source.thumbnailSrc` უკვე resolve-დება YouTube-ისთვის).

## დიზაინის გადაწყვეტილებები / Why

- **ერთი amount input, structured შენახვა** — UX მარტივი დარჩა (მომხმარებელი ერთ ველში წერს "200 გ"), მაგრამ save-ის დროს structured-ად ვინახავთ. ეს უზრუნველყოფს ცოცხალ სკალირებას ყოველგვარი ფორმის ცვლილების გარეშე.
- **StepTimer key-ით remount** — React 19-ის `react-hooks/set-state-in-effect` rule ეწინააღმდეგება useEffect-ში state reset-ს, ამიტომ TimerComponent extract-ი + `key={stepIndex}` უფრო სუფთა გადაწყვეტაა.
- **Confetti deterministic seed** — Math.random impure-ად ითვლება React 19-ში, ამიტომ `pseudoRandom(seed)` ფუნქცია (sin-based) module-level-ზე გენერირდება.
- **`baseServings` derive** — `parseServingsCount("4 ცალი")` → 4. სკალირების coefficient = `currentServings / baseServings`.

## ცნობები

- All UI strings ქართულად.
- პროექტი იყენებს Next.js 16 (Turbopack), React 19, Tailwind 3, Supabase SSR.
- Build size არსად არ გაიზარდა მკვეთრად, lighthouse არ შემოწმდა.
