"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { Eye, Plus, Trash2, X } from "lucide-react";
import { FocusDialog } from "@/components/focus-dialog";
import { ImageUploader } from "@/components/image-uploader";
import { useI18n } from "@/components/i18n-provider";
import { VideoUploader } from "@/components/video-uploader";
import type { Category, Ingredient, Recipe, RecipeStep } from "@/lib/types";
import { localizeCategory } from "@/lib/i18n/shared";
import {
  recipeDraftFormSchema,
  recipePublishFormSchema,
  type RecipeFormValues,
  type RecipeSubmitIntent,
} from "@/lib/validation";
import { submitRecipeForm, type RecipeActionState } from "@/lib/actions/recipes";
import { RECIPE_BUCKET } from "@/lib/storage";
import { Button, FormInput, Select, Textarea } from "./ui";

const emptyState: RecipeActionState = {};

type RecipeIntent = RecipeSubmitIntent | "delete";

function makeIngredientRows(ingredients: Ingredient[] = []) {
  const rows = ingredients.map((ingredient) => ({
    amount: ingredient.amount || "",
    name: ingredient.name,
  }));

  while (rows.length < 3) {
    rows.push({ amount: "", name: "" });
  }

  return rows;
}

function durationToMinutes(step: RecipeStep) {
  if (step.durationSeconds == null) return "";
  const minutes = step.durationSeconds / 60;
  if (Number.isInteger(minutes)) return String(minutes);
  return String(Math.round(minutes * 10) / 10);
}

function makeStepRows(recipe?: Recipe) {
  const rows = (recipe?.steps ?? []).map((step) => ({
    body: step.body,
    duration: durationToMinutes(step),
  }));

  while (rows.length < 3) {
    rows.push({ body: "", duration: "" });
  }

  return rows;
}

function recipeDefaultValues(recipe?: Recipe): RecipeFormValues {
  return {
    title: recipe?.title ?? "",
    description: recipe?.description ?? "",
    categoryId: recipe?.categoryId ?? "",
    cookingTime: recipe?.cookingTime ? String(recipe.cookingTime) : "",
    difficulty: recipe?.difficulty ?? "მარტივი",
    servings: recipe?.servings ?? "",
    imageUrl: recipe?.imagePath ?? "",
    videoUrl: recipe?.videoPath ?? recipe?.videoUrl ?? "",
    ingredients: makeIngredientRows(recipe?.ingredients),
    steps: makeStepRows(recipe),
    visibility: recipe?.visibility ?? "public",
  };
}

function errorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

function mergedError(clientError: unknown, serverError?: string) {
  return errorMessage(clientError) ?? serverError;
}

export function RecipeForm({
  categories = [],
  mode = "add",
  recipe,
  userId,
}: {
  categories?: Category[];
  mode?: "add" | "edit";
  recipe?: Recipe;
  userId: string;
}) {
  const intentRef = useRef<RecipeSubmitIntent>("publish");
  const [activeIntent, setActiveIntent] = useState<RecipeIntent | null>(null);
  const [state, formAction, actionPending] = useActionState(submitRecipeForm, emptyState);
  const [transitionPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isPending = actionPending || transitionPending;
  const isEdit = mode === "edit";
  const isPublished = recipe?.status === "published";
  const saveIntent: RecipeSubmitIntent = isEdit && isPublished ? "update" : "save-draft";
  const { locale, t } = useI18n();
  const localizedCategories = categories.map((category) => localizeCategory(locale, category));

  const resolver = useMemo<Resolver<RecipeFormValues>>(
    () =>
      async (values, context, options) => {
        const schema = intentRef.current === "save-draft" ? recipeDraftFormSchema : recipePublishFormSchema;
        const selectedResolver = zodResolver(schema) as Resolver<RecipeFormValues>;
        return selectedResolver(values, context, options);
      },
    [],
  );

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setFocus,
    setValue,
  } = useForm<RecipeFormValues>({
    defaultValues: recipeDefaultValues(recipe),
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver,
  });

  const {
    append: appendIngredient,
    fields: ingredientFields,
    remove: removeIngredient,
    replace: replaceIngredients,
  } = useFieldArray({
    control,
    name: "ingredients",
  });

  const {
    append: appendStep,
    fields: stepFields,
    remove: removeStep,
    replace: replaceSteps,
  } = useFieldArray({
    control,
    name: "steps",
  });

  function formDataFromValues(values: RecipeFormValues, intent: RecipeIntent) {
    const formData = new FormData();

    formData.set("recipeId", recipe?.id ?? "");
    formData.set("redirectTo", isEdit && recipe ? `/recipes/${recipe.slug}/edit` : "/recipes/add");
    formData.set("intent", intent);
    formData.set("title", values.title);
    formData.set("description", values.description);
    formData.set("categoryId", values.categoryId);
    formData.set("cookingTime", values.cookingTime);
    formData.set("difficulty", values.difficulty);
    formData.set("servings", values.servings);
    formData.set("visibility", values.visibility);
    formData.set("imageUrl", values.imageUrl);
    formData.set("videoUrl", values.videoUrl);

    values.ingredients.forEach((ingredient, index) => {
      formData.set(`ingredients.${index}.name`, ingredient.name);
      formData.set(`ingredients.${index}.amount`, ingredient.amount);
    });

    values.steps.forEach((step, index) => {
      formData.set(`steps.${index}.body`, step.body);
      formData.set(`steps.${index}.duration`, step.duration ?? "");
    });

    return formData;
  }

  function dispatchForm(values: RecipeFormValues, intent: RecipeIntent) {
    if (isPending) return;

    const formData = formDataFromValues(values, intent);

    startTransition(() => {
      formAction(formData);
    });
  }

  function submitIntent(intent: RecipeSubmitIntent) {
    intentRef.current = intent;
    setActiveIntent(intent);
    void handleSubmit((values) => dispatchForm(values, intent))();
  }

  function deleteRecipe() {
    if (isPending) return;

    const formData = new FormData();
    formData.set("recipeId", recipe?.id ?? "");
    formData.set("redirectTo", isEdit && recipe ? `/recipes/${recipe.slug}/edit` : "/recipes/add");
    formData.set("intent", "delete");
    setActiveIntent("delete");

    startTransition(() => {
      formAction(formData);
    });
  }

  function focusIngredient(index: number) {
    requestAnimationFrame(() => setFocus(`ingredients.${index}.name`));
  }

  function addIngredientRow(focusNext = true) {
    const nextIndex = ingredientFields.length;
    appendIngredient({ name: "", amount: "" });
    if (focusNext) focusIngredient(nextIndex);
  }

  function removeIngredientRow(index: number) {
    if (ingredientFields.length <= 1) {
      replaceIngredients([{ name: "", amount: "" }]);
      focusIngredient(0);
      return;
    }

    removeIngredient(index);
  }

  function addStepRowAt(focusNext = true) {
    const nextIndex = stepFields.length;
    appendStep({ body: "", duration: "" });
    if (focusNext) focusStep(nextIndex);
  }

  function resetStepRows() {
    replaceSteps([{ body: "", duration: "" }]);
    focusStep(0);
  }

  function handleAmountKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (index === ingredientFields.length - 1) {
      addIngredientRow();
      return;
    }

    focusIngredient(index + 1);
  }

  function focusStep(index: number) {
    requestAnimationFrame(() => setFocus(`steps.${index}.body`));
  }

  function addStepRow(focusNext = true) {
    addStepRowAt(focusNext);
  }

  function removeStepRow(index: number) {
    if (stepFields.length <= 1) {
      resetStepRows();
      return;
    }

    removeStep(index);
  }

  const ingredientsError = mergedError(errors.ingredients, state.fieldErrors?.ingredients);
  const stepsError = mergedError(errors.steps, state.fieldErrors?.steps);

  return (
    <form className="soft-card rounded-[28px] p-5 md:p-7" onSubmit={(event) => event.preventDefault()} noValidate>
      <input type="hidden" name="recipeId" value={recipe?.id ?? ""} />
      <input type="hidden" name="redirectTo" value={isEdit && recipe ? `/recipes/${recipe.slug}/edit` : "/recipes/add"} />
      <input type="hidden" {...register("imageUrl")} />
      <input type="hidden" {...register("videoUrl")} />

      {state.formError ? (
        <div
          className="mb-4 rounded-[18px] border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-extrabold text-danger"
          role="alert"
          aria-live="assertive"
        >
          {t(state.formError)}
        </div>
      ) : null}

      <div className="grid gap-4">
        <FormInput
          label="რეცეპტის სათაური"
          placeholder="მაგ. შენი რეცეპტის სახელი"
          error={mergedError(errors.title, state.fieldErrors?.title)}
          {...register("title")}
        />
        <Textarea
          label="მოკლე აღწერა"
          placeholder="მოკლედ აღწერე გემო, სიტუაცია და მთავარი ინგრედიენტები"
          error={mergedError(errors.description, state.fieldErrors?.description)}
          {...register("description")}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Select label="კატეგორია" error={mergedError(errors.categoryId, state.fieldErrors?.categoryId)} {...register("categoryId")}>
            <option value="">
              {categories.length > 0 ? t("აირჩიე კატეგორია") : t("კატეგორიები ვერ ჩაიტვირთა")}
            </option>
            {localizedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <FormInput
            label="მომზადების დრო"
            type="number"
            min={1}
            placeholder="წუთებში"
            error={mergedError(errors.cookingTime, state.fieldErrors?.cookingTime)}
            {...register("cookingTime")}
          />
          <Select label="სირთულე" error={mergedError(errors.difficulty, state.fieldErrors?.difficulty)} {...register("difficulty")}>
            <option value="მარტივი">{t("მარტივი")}</option>
            <option value="საშუალო">{t("საშუალო")}</option>
            <option value="რთული">{t("რთული")}</option>
          </Select>
        </div>
        <FormInput
          label="პორციები"
          placeholder="მაგ. 2-4"
          error={mergedError(errors.servings, state.fieldErrors?.servings)}
          {...register("servings")}
        />

        <div className="grid gap-1.5">
          <Select
            label="ხილვადობა"
            error={mergedError(errors.visibility, state.fieldErrors?.visibility)}
            {...register("visibility")}
          >
            <option value="public">{t("საჯარო — ჩანს ძიებასა და სიებში")}</option>
            <option value="unlisted">{t("მხოლოდ ბმულით — სიებში არ ჩანს")}</option>
          </Select>
          <p className="text-[11px] leading-snug text-muted">
            {t("მხოლოდ ბმულით — რეცეპტი საჯაროდ არ გამოჩნდება, ხელმისაწვდომია მხოლოდ პირდაპირი ბმულით ან კოლექციით.")}
          </p>
        </div>

        <section className="grid gap-2" aria-describedby={ingredientsError ? "ingredients-error" : undefined}>
          <div className="flex items-center justify-between gap-3">
            <span className="field-label">{t("ინგრედიენტები")}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => addIngredientRow()}
              className="min-h-9 rounded-[13px] px-3 text-xs"
            >
              <Plus className="h-4 w-4" aria-hidden />
              დამატება
            </Button>
          </div>
          <div className="grid gap-2">
            {ingredientFields.map((ingredient, index) => {
              const nameError = errorMessage(errors.ingredients?.[index]?.name);
              const amountError = errorMessage(errors.ingredients?.[index]?.amount);
              const nameErrorId = nameError ? `ingredient-${ingredient.id}-name-error` : undefined;
              const amountErrorId = amountError ? `ingredient-${ingredient.id}-amount-error` : undefined;

              return (
                <div key={ingredient.id} className="grid gap-2 rounded-[18px] border border-oat bg-[#FAF6F0] p-2 sm:grid-cols-[minmax(0,1fr)_minmax(140px,220px)_42px]">
                  <div className="grid gap-1">
                    <input
                      {...register(`ingredients.${index}.name`)}
                      data-ingredient-index={index}
                      data-ingredient-part="name"
                      className="field-control bg-surface"
                      placeholder={t("ინგრედიენტი")}
                      aria-label={t("ინგრედიენტი {count}", { count: index + 1 })}
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={nameErrorId}
                    />
                    {nameError ? (
                      <span id={nameErrorId} className="text-xs font-extrabold text-danger" aria-live="polite">
                        {t(nameError)}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    <input
                      {...register(`ingredients.${index}.amount`)}
                      onKeyDown={(event) => handleAmountKeyDown(index, event)}
                      className="field-control bg-surface"
                      placeholder={t("რაოდენობა")}
                      aria-label={t("რაოდენობა ინგრედიენტისთვის {count}", { count: index + 1 })}
                      aria-invalid={Boolean(amountError)}
                      aria-describedby={amountErrorId}
                    />
                    {amountError ? (
                      <span id={amountErrorId} className="text-xs font-extrabold text-danger" aria-live="polite">
                        {t(amountError)}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(index)}
                    className="grid h-[42px] w-[42px] place-items-center rounded-[14px] border border-oat bg-surface text-muted transition hover:border-danger/30 hover:bg-danger/10 hover:text-danger focus:outline-none focus-visible:ring-4 focus-visible:ring-danger/20"
                    aria-label={t("ინგრედიენტის {count} წაშლა", { count: index + 1 })}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
          {ingredientsError ? (
            <span id="ingredients-error" className="text-xs font-extrabold text-danger" aria-live="polite">
              {t(ingredientsError)}
            </span>
          ) : null}
        </section>

        <section className="grid gap-2" aria-describedby={stepsError ? "steps-error" : undefined}>
          <div className="flex items-center justify-between gap-3">
            <span className="field-label">{t("მომზადების ნაბიჯები")}</span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => addStepRow()}
              className="min-h-9 rounded-[13px] px-3 text-xs"
            >
              <Plus className="h-4 w-4" aria-hidden />
              დამატება
            </Button>
          </div>
          <div className="grid gap-2">
            {stepFields.map((step, index) => {
              const bodyError = errorMessage(errors.steps?.[index]?.body);
              const bodyErrorId = bodyError ? `step-${step.id}-body-error` : undefined;
              const durationError = errorMessage(errors.steps?.[index]?.duration);

              return (
                <div key={step.id} className="grid gap-2 rounded-[18px] border border-oat bg-[#FAF6F0] p-2 sm:grid-cols-[44px_minmax(0,1fr)_42px] sm:items-start">
                  <div className="grid h-12 w-11 place-items-center rounded-[14px] border border-oat bg-surface text-sm font-black text-muted" aria-hidden>
                    {index + 1}
                  </div>
                  <div className="grid gap-2">
                    <textarea
                      {...register(`steps.${index}.body`)}
                      rows={1}
                      className="field-control resize-y bg-surface py-3 leading-snug"
                      placeholder={t("ნაბიჯი {count}", { count: index + 1 })}
                      aria-label={t("ნაბიჯი {count}", { count: index + 1 })}
                      aria-invalid={Boolean(bodyError)}
                      aria-describedby={bodyErrorId}
                    />
                    {bodyError ? (
                      <span id={bodyErrorId} className="text-xs font-extrabold text-danger" aria-live="polite">
                        {t(bodyError)}
                      </span>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-[12px] border border-oat bg-surface px-3 py-1.5 text-xs font-black text-muted">
                        <span>{t("ტაიმერი")}</span>
                        <input
                          {...register(`steps.${index}.duration`)}
                          type="number"
                          min="0"
                          step="0.5"
                          inputMode="decimal"
                          placeholder={t("წთ")}
                          className="w-16 bg-transparent text-center text-sm font-black text-ink outline-none"
                          aria-label={t("ნაბიჯის {count} ხანგრძლივობა წუთებში", { count: index + 1 })}
                        />
                      </label>
                      <span className="text-[11px] leading-snug text-muted">
                        {t("არჩევითი — დატოვე ცარიელი, თუ ტაიმერი არ გჭირდება.")}
                      </span>
                    </div>
                    {durationError ? (
                      <span className="text-xs font-extrabold text-danger" aria-live="polite">
                        {t(durationError)}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStepRow(index)}
                    className="grid h-12 w-[42px] place-items-center rounded-[14px] border border-oat bg-surface text-muted transition hover:border-danger/30 hover:bg-danger/10 hover:text-danger focus:outline-none focus-visible:ring-4 focus-visible:ring-danger/20"
                    aria-label={t("ნაბიჯის {count} წაშლა", { count: index + 1 })}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
          {stepsError ? (
            <span id="steps-error" className="text-xs font-extrabold text-danger" aria-live="polite">
              {t(stepsError)}
            </span>
          ) : null}
        </section>

        <div>
          <ImageUploader
            bucket={RECIPE_BUCKET}
            pathPrefix={`${userId}/recipes`}
            value={recipe?.imagePath ?? null}
            label="რეცეპტის ფოტო"
            onChange={(path) => setValue("imageUrl", path ?? "", { shouldDirty: true, shouldValidate: true })}
          />
          {state.fieldErrors?.imageUrl ? (
            <span className="mt-2 block text-xs font-extrabold text-danger" aria-live="polite">
              {t(state.fieldErrors.imageUrl)}
            </span>
          ) : null}
        </div>

        <div>
          <VideoUploader
            pathPrefix={`${userId}/recipes`}
            value={recipe?.videoPath ?? recipe?.videoUrl ?? null}
            onChange={(next) => setValue("videoUrl", next ?? "", { shouldDirty: true, shouldValidate: true })}
          />
          {state.fieldErrors?.videoUrl ? (
            <span className="mt-2 block text-xs font-extrabold text-danger" aria-live="polite">
              {t(state.fieldErrors.videoUrl)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {isEdit && isPublished ? (
          <Link
            href={`/recipes/${recipe.slug}`}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-4 text-[13px] font-black no-underline transition hover:border-sand hover:bg-[#FAF6F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-soft-clay/60"
          >
            <Eye className="h-4 w-4" aria-hidden />
            გადახედვა
          </Link>
        ) : (
          <Button type="button" variant="secondary" disabled>
            <Eye className="h-4 w-4" aria-hidden />
            გადახედვა
          </Button>
        )}
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => submitIntent(saveIntent)}>
          {isPending && activeIntent === saveIntent ? "ინახება..." : isEdit ? "ცვლილების შენახვა" : "მონახაზად შენახვა"}
        </Button>
        <Button type="button" disabled={isPending} onClick={() => submitIntent("publish")}>
          {isPending && activeIntent === "publish" ? "ქვეყნდება..." : isEdit && isPublished ? "განახლება" : "რეცეპტის გამოქვეყნება"}
        </Button>
        {isEdit ? (
          <Button type="button" variant="danger" className="sm:ml-auto" onClick={() => setDeleteOpen(true)} disabled={isPending}>
            <Trash2 className="h-4 w-4" aria-hidden />
            რეცეპტის წაშლა
          </Button>
        ) : null}
      </div>

      {deleteOpen ? (
        <FocusDialog labelledBy="delete-recipe-title" onClose={() => setDeleteOpen(false)}>
          <h2 id="delete-recipe-title" className="text-xl font-black leading-tight">
            {t("წავშალოთ რეცეპტი?")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("ეს მოქმედება შეუქცევადია. რეცეპტი, შეფასებები, კომენტარები და შენახვები წაიშლება.")}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="danger" disabled={isPending} onClick={deleteRecipe}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {isPending ? "იშლება..." : "წაშლა"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} disabled={isPending}>
              გაუქმება
            </Button>
          </div>
        </FocusDialog>
      ) : null}
    </form>
  );
}
