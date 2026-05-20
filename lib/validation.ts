import { z } from "zod";
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
  | "imageUrl";

export type RecipeFieldErrors = Partial<Record<RecipeFormField, string>>;

export type RecipeInput = {
  title: string;
  description: string;
  categoryId: string | null;
  cookingTime: number;
  difficulty: Difficulty;
  servings: string;
  imageUrl: string | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
};

export type RecipeStepRow = {
  body: string;
};

export type RecipeFormValues = {
  title: string;
  description: string;
  categoryId: string;
  cookingTime: string;
  difficulty: Difficulty;
  servings: string;
  imageUrl: string;
  ingredients: Ingredient[];
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
});

const recipeFormBaseSchema = z.object({
  title: z.string().trim().max(120, "სათაური ძალიან გრძელია"),
  description: z.string().trim().max(1200, "აღწერა ძალიან გრძელია"),
  categoryId: optionalUuidFormSchema,
  cookingTime: z.string().trim(),
  difficulty: z.enum(difficulties, { error: "აირჩიე სირთულე" }),
  servings: z.string().trim().max(80, "პორციები ძალიან გრძელია"),
  imageUrl: z.string().trim().max(1000, "ფოტოს მისამართი ძალიან გრძელია"),
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
  ingredients: z.array(z.object({ name: z.string(), amount: z.string() })).min(1, "დაამატე მინიმუმ ერთი ინგრედიენტი"),
  steps: z.array(z.object({ title: z.string(), body: z.string() })).min(1, "დაამატე მინიმუმ ერთი ნაბიჯი"),
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
  ingredients: z.array(z.object({ name: z.string(), amount: z.string() })),
  steps: z.array(z.object({ title: z.string(), body: z.string() })),
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

function parseFieldArrayIngredients(formData: FormData): Ingredient[] {
  const rows = new Map<number, Partial<Ingredient>>();

  formData.forEach((value, key) => {
    if (typeof value !== "string") return;

    const match = key.match(/^ingredients\.(\d+)\.(name|amount)$/);
    if (!match?.[1] || !match[2]) return;

    const index = Number(match[1]);
    const field = match[2] as keyof Ingredient;
    const row = rows.get(index) ?? {};
    row[field] = value.trim();
    rows.set(index, row);
  });

  return [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, ingredient]) => ({
      name: ingredient.name ?? "",
      amount: ingredient.amount ?? "",
    }))
    .filter((ingredient) => ingredient.name.length > 0);
}

function parseIngredients(formData: FormData): Ingredient[] {
  const fieldArrayIngredients = parseFieldArrayIngredients(formData);
  if (fieldArrayIngredients.length > 0) return fieldArrayIngredients;

  const names = formDataStrings(formData, "ingredientName");
  const amounts = formDataStrings(formData, "ingredientAmount");

  return names
    .map((name, index) => ({
      name,
      amount: amounts[index] ?? "",
    }))
    .filter((ingredient) => ingredient.name.length > 0);
}

function parseFieldArraySteps(formData: FormData): RecipeStep[] {
  const rows = new Map<number, string>();

  formData.forEach((value, key) => {
    if (typeof value !== "string") return;

    const match = key.match(/^steps\.(\d+)\.body$/);
    if (!match?.[1]) return;

    rows.set(Number(match[1]), value.trim());
  });

  return [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, body]) => body)
    .filter((body) => body.length > 0)
    .map((body, index) => ({
      title: `ნაბიჯი ${index + 1}`,
      body,
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
