import type { Difficulty } from "./types";

export type FilterOption<T extends string = string> = {
  label: string;
  value: T;
};

export type CookingTimeFilter = "under-15" | "under-30" | "under-60";
export type RecipeSort = "newest" | "top-rated" | "fastest";

export type RecipeFilters = {
  categoryId?: string;
  cookingTime?: CookingTimeFilter;
  difficulty?: Difficulty;
  sort?: RecipeSort;
};

export const allFilterOption: FilterOption<"all"> = {
  label: "ყველა",
  value: "all",
};

export const timeFilterOptions: Array<FilterOption<"all" | CookingTimeFilter>> = [
  allFilterOption,
  { label: "<15 წთ", value: "under-15" },
  { label: "<30 წთ", value: "under-30" },
  { label: "<60 წთ", value: "under-60" },
];

export const difficultyFilterOptions: Array<FilterOption<"all" | Difficulty>> = [
  allFilterOption,
  { label: "მარტივი", value: "მარტივი" },
  { label: "საშუალო", value: "საშუალო" },
  { label: "რთული", value: "რთული" },
];

export const sortOptions: Array<FilterOption<RecipeSort>> = [
  { label: "ახალი", value: "newest" },
  { label: "რეიტინგით", value: "top-rated" },
  { label: "სწრაფი მომზადება", value: "fastest" },
];

export function normalizeCookingTimeFilter(value: string | null | undefined): CookingTimeFilter | undefined {
  return timeFilterOptions.some((option) => option.value === value) && value !== "all"
    ? (value as CookingTimeFilter)
    : undefined;
}

export function normalizeDifficultyFilter(value: string | null | undefined): Difficulty | undefined {
  return difficultyFilterOptions.some((option) => option.value === value) && value !== "all"
    ? (value as Difficulty)
    : undefined;
}

export function normalizeRecipeSort(value: string | null | undefined): RecipeSort {
  return sortOptions.some((option) => option.value === value) ? (value as RecipeSort) : "newest";
}
