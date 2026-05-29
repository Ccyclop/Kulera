import { z } from "zod";
import { formatAmount, parseAmountText } from "./ingredients";
import type { Difficulty, Ingredient, RecipeStep } from "./types";

export const difficulties = ["მარტივი", "საშუალო", "რთული"] as const;

export type RecipeValidationMode = "draft" | "publish";
export type RecipeSubmitIntent = "save-draft" | "publish" | "update";

export type RecipeFormField =
  | "title"
  | "description"
  | "categoryId"
  | "cookingTime"
  | "difficulty"
  | "servings"
  | "ingredients"
  | "steps"
  | "imageUrl"
  | "videoUrl";

export type RecipeFieldErrors = Partial<Record<RecipeFormField, string>>;

export type RecipeInput = {
  title: string;
  description: string;
  categoryId: string | null;
  cookingTime: number;
  difficulty: Difficulty;
  servings: string;
  imageUrl: string | null;
  videoUrl: string | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
};

export type RecipeIngredientRow = {
  name: string;
  amount: string;
};

export type RecipeStepRow = {
  body: string;
  duration: string;
};

export type RecipeFormValues = {
  title: string;
  description: string;
  categoryId: string;
  cookingTime: string;
  difficulty: Difficulty;
  servings: string;
  imageUrl: string;
  videoUrl: string;
  ingredients: RecipeIngredientRow[];
  steps: RecipeStepRow[];
};

export type AccountField =
  | "fullName"
  | "username"
  | "bio"
  | "avatarPath"
  | "password"
  | "confirmPassword"
  | "confirmUsername";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username მინიმუმ 3 სიმბოლო უნდა იყოს.")
  .max(32, "Username ძალიან გრძელია.")
  .regex(/^[a-z0-9_-]+$/, "Username-ში გამოიყენე მხოლოდ a-z, 0-9, _ ან -.");

export const accountProfileSchema = z.object({
  fullName: z.string().trim().min(2, "სახელი მინიმუმ 2 სიმბოლო უნდა იყოს.").max(100, "სახელი ძალიან გრძელია."),
  username: usernameSchema,
  bio: z.string().trim().max(500, "Bio 500 სიმბოლოზე მოკლე უნდა იყოს."),
  avatarPath: z.string().trim().max(1000, "ავატარის მისამართი ძალიან გრძელია.").nullable(),
});

export const accountProfileFormSchema = accountProfileSchema.extend({
  avatarPath: z.string().trim().max(1000, "ავატარის მისამართი ძალიან გრძელია."),
});

export const accountPasswordSchema = z
  .object({
    password: z.string().min(6, "პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს.").max(72, "პაროლი ძალიან გრძელია."),
    confirmPassword: z.string().min(1, "გაიმეორე პაროლი."),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "პაროლები ერთმანეთს არ ემთხვევა.",
  });

export const accountDeleteSchema = z.object({
  confirmUsername: z.string().trim().min(1, "ჩაწერე username დასადასტურებლად."),
});

export const notificationPrefsSchema = z.object({
  comments: z.boolean(),
  ratings: z.boolean(),
});

export const commentFormSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "კომენტარი ცარიელი ვერ იქნება.")
    .max(2000, "კომენტარი 2000 სიმბოლოზე მოკლე უნდა იყოს."),
});

const uuidSchema = z.string().uuid("აირჩიე სწორი კატეგორია");
const optionalUuidFormSchema = z.string().trim().refine((value) => !value || uuidSchema.safeParse(value).success, {
  message: "აირჩიე სწორი კატეგორია",
});

const recipeIngredientFormSchema = z.object({
  name: z.string().trim().max(120, "ინგრედიენტის სახელი ძალიან გრძელია"),
  amount: z.string().trim().max(80, "რაოდენობა ძალიან გრძელია"),
});

const recipeStepFormSchema = z.object({
  body: z.string().trim().max(1000, "ნაბიჯი ძალიან გრძელია"),
  duration: z.string().trim().max(6, "დრო წუთებში"),
});

const recipeFormBaseSchema = z.object({
  title: z.string().trim().max(120, "სათაური ძალიან გრძელია"),
  description: z.string().trim().max(1200, "აღწერა ძალიან გრძელია"),
  categoryId: optionalUuidFormSchema,
  cookingTime: z.string().trim(),
  difficulty: z.enum(difficulties, { error: "აირჩიე სირთულე" }),
  servings: z.string().trim().max(80, "პორციები ძალიან გრძელია"),
  imageUrl: z.string().trim().max(1000, "ფოტოს მისამართი ძალიან გრძელია"),
  videoUrl: z.string().trim().max(1000, "ვიდეოს მისამართი ძალიან გრძელია"),
  ingredients: z.array(recipeIngredientFormSchema).min(1, "დაამატე მინიმუმ ერთი ინგრედიენტი"),
  steps: z.array(recipeStepFormSchema),
});

function validateCookingTime(value: string, ctx: z.RefinementCtx, required: boolean) {
  if (!value) {
    if (required) {
      ctx.addIssue({
        code: "custom",
        path: ["cookingTime"],
        message: "მიუთითე მომზადების დრო",
      });
    }
    return;
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue)) {
    ctx.addIssue({
      code: "custom",
      path: ["cookingTime"],
      message: "დრო უნდა იყოს მთელი რიცხვი",
    });
    return;
  }

  if (numericValue < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["cookingTime"],
      message: "დრო უნდა იყოს მინიმუმ 1 წუთი",
    });
    return;
  }

  if (numericValue > 1440) {
    ctx.addIssue({
      code: "custom",
      path: ["cookingTime"],
      message: "დრო ძალიან დიდია",
    });
  }
}

function validateIngredientRows(input: RecipeFormValues, ctx: z.RefinementCtx, required: boolean) {
  const filledRows = input.ingredients.filter((ingredient) => ingredient.name.trim().length > 0);

  input.ingredients.forEach((ingredient, index) => {
    if (!ingredient.name.trim() && ingredient.amount.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["ingredients", index, "name"],
        message: "დაამატე ინგრედიენტის სახელი",
      });
    }
  });

  if (required && filledRows.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["ingredients"],
      message: "დაამატე მინიმუმ ერთი ინგრედიენტი",
    });
  }
}

function validateStepRows(input: RecipeFormValues, ctx: z.RefinementCtx, required: boolean) {
  const filledRows = input.steps.filter((step) => step.body.trim().length > 0);

  if (required && filledRows.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["steps"],
      message: "დაამატე მინიმუმ ერთი ნაბიჯი",
    });
  }
}

export const recipeDraftFormSchema = recipeFormBaseSchema.superRefine((input, ctx) => {
  validateCookingTime(input.cookingTime, ctx, false);
  validateIngredientRows(input, ctx, false);
  validateStepRows(input, ctx, false);
});

export const recipePublishFormSchema = recipeFormBaseSchema
  .extend({
    title: z.string().trim().min(3, "სათაური მინიმუმ 3 სიმბოლო უნდა იყოს").max(120, "სათაური ძალიან გრძელია"),
    description: z.string().trim().min(10, "აღწერა მინიმუმ 10 სიმბოლო უნდა იყოს").max(1200, "აღწერა ძალიან გრძელია"),
    servings: z.string().trim().min(1, "მიუთითე პორციები").max(80, "პორციები ძალიან გრძელია"),
  })
  .superRefine((input, ctx) => {
    validateCookingTime(input.cookingTime, ctx, true);
    validateIngredientRows(input, ctx, true);
    validateStepRows(input, ctx, true);
  });

const ingredientPayloadSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string(),
  note: z.string(),
  amount: z.string(),
});

const stepPayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
  durationSeconds: z.number().int().positive().nullable(),
});

const publishSchema = z.object({
  title: z.string().trim().min(3, "სათაური მინიმუმ 3 სიმბოლო უნდა იყოს").max(120, "სათაური ძალიან გრძელია"),
  description: z.string().trim().min(10, "აღწერა მინიმუმ 10 სიმბოლო უნდა იყოს").max(1200, "აღწერა ძალიან გრძელია"),
  categoryId: uuidSchema.nullable(),
  cookingTime: z.coerce
    .number({ error: "მიუთითე მომზადების დრო" })
    .int("დრო უნდა იყოს მთელი რიცხვი")
    .min(1, "დრო უნდა იყოს მინიმუმ 1 წუთი")
    .max(1440, "დრო ძალიან დიდია"),
  difficulty: z.enum(difficulties, { error: "აირჩიე სირთულე" }),
  servings: z.string().trim().min(1, "მიუთითე პორციები").max(80, "პორციები ძალიან გრძელია"),
  imageUrl: z.string().trim().max(1000, "ფოტოს მისამართი ძალიან გრძელია").nullable(),
  videoUrl: z.string().trim().max(1000, "ვიდეოს მისამართი ძალიან გრძელია").nullable(),
  ingredients: z.array(ingredientPayloadSchema).min(1, "დაამატე მინიმუმ ერთი ინგრედიენტი"),
  steps: z.array(stepPayloadSchema).min(1, "დაამატე მინიმუმ ერთი ნაბიჯი"),
});

const draftSchema = publishSchema.extend({
  title: z.string().trim().max(120, "სათაური ძალიან გრძელია"),
  description: z.string().trim().max(1200, "აღწერა ძალიან გრძელია"),
  categoryId: uuidSchema.nullable(),
  cookingTime: z.coerce
    .number({ error: "მიუთითე მომზადების დრო" })
    .int("დრო უნდა იყოს მთელი რიცხვი")
    .min(1, "დრო უნდა იყოს მინიმუმ 1 წუთი")
    .max(1440, "დრო ძალიან დიდია"),
  servings: z.string().trim().max(80, "პორციები ძალიან გრძელია"),
  ingredients: z.array(ingredientPayloadSchema),
  steps: z.array(stepPayloadSchema),
});

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableStringValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value ? value : null;
}

function formDataStrings(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => (typeof value === "string" ? value.trim() : ""));
}

function buildStructuredIngredient(name: string, amount: string): Ingredient {
  const trimmedName = name.trim();
  const trimmedAmount = amount.trim();
  const parsed = parseAmountText(trimmedAmount);
  const ingredient: Ingredient = {
    name: trimmedName,
    quantity: parsed.quantity,
    unit: parsed.unit,
    note: parsed.note,
    amount: "",
  };
  ingredient.amount = formatAmount(ingredient) || trimmedAmount;
  return ingredient;
}

function parseFieldArrayIngredients(formData: FormData): Ingredient[] {
  const rows = new Map<number, { name?: string; amount?: string }>();

  formData.forEach((value, key) => {
    if (typeof value !== "string") return;

    const match = key.match(/^ingredients\.(\d+)\.(name|amount)$/);
    if (!match?.[1] || !match[2]) return;

    const index = Number(match[1]);
    const row = rows.get(index) ?? {};
    if (match[2] === "name") row.name = value;
    if (match[2] === "amount") row.amount = value;
    rows.set(index, row);
  });

  return [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, row]) => buildStructuredIngredient(row.name ?? "", row.amount ?? ""))
    .filter((ingredient) => ingredient.name.length > 0);
}

function parseIngredients(formData: FormData): Ingredient[] {
  const fieldArrayIngredients = parseFieldArrayIngredients(formData);
  if (fieldArrayIngredients.length > 0) return fieldArrayIngredients;

  const names = formDataStrings(formData, "ingredientName");
  const amounts = formDataStrings(formData, "ingredientAmount");

  return names
    .map((name, index) => buildStructuredIngredient(name, amounts[index] ?? ""))
    .filter((ingredient) => ingredient.name.length > 0);
}

function parseStepDuration(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const seconds = Math.round(numeric * 60);
  return seconds > 0 ? seconds : null;
}

function parseFieldArraySteps(formData: FormData): RecipeStep[] {
  const rows = new Map<number, { body?: string; duration?: string }>();

  formData.forEach((value, key) => {
    if (typeof value !== "string") return;

    const match = key.match(/^steps\.(\d+)\.(body|duration)$/);
    if (!match?.[1] || !match[2]) return;

    const index = Number(match[1]);
    const row = rows.get(index) ?? {};
    if (match[2] === "body") row.body = value;
    if (match[2] === "duration") row.duration = value;
    rows.set(index, row);
  });

  return [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, row]) => ({
      body: (row.body ?? "").trim(),
      durationSeconds: parseStepDuration(row.duration),
    }))
    .filter((entry) => entry.body.length > 0)
    .map((entry, index) => ({
      title: `ნაბიჯი ${index + 1}`,
      body: entry.body,
      durationSeconds: entry.durationSeconds,
    }));
}

function fieldErrorsFromZod(error: z.ZodError): RecipeFieldErrors {
  const errors: RecipeFieldErrors = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0];

    if (typeof field === "string" && !errors[field as RecipeFormField]) {
      errors[field as RecipeFormField] = issue.message;
    }
  });

  return errors;
}

function normalizeDraftInput(input: RecipeInput): RecipeInput {
  return {
    ...input,
    title: input.title || "Untitled draft",
    cookingTime: input.cookingTime || 1,
  };
}

export function parseRecipeFormData(formData: FormData, mode: RecipeValidationMode) {
  const rawInput: RecipeInput = {
    title: stringValue(formData, "title"),
    description: stringValue(formData, "description"),
    categoryId: nullableStringValue(formData, "categoryId"),
    cookingTime: Number(stringValue(formData, "cookingTime") || 1),
    difficulty: (stringValue(formData, "difficulty") || "მარტივი") as Difficulty,
    servings: stringValue(formData, "servings"),
    imageUrl: nullableStringValue(formData, "imageUrl"),
    videoUrl: nullableStringValue(formData, "videoUrl"),
    ingredients: parseIngredients(formData),
    steps: parseFieldArraySteps(formData),
  };

  const schema = mode === "publish" ? publishSchema : draftSchema;
  const result = schema.safeParse(rawInput);

  if (!result.success) {
    return {
      data: null,
      errors: fieldErrorsFromZod(result.error),
      success: false as const,
    };
  }

  return {
    data: mode === "draft" ? normalizeDraftInput(result.data) : result.data,
    errors: {},
    success: true as const,
  };
}
