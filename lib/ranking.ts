import type { Cook, Recipe } from "./types";

export function recipeScore(recipe: Pick<Recipe, "rating" | "ratingsCount">) {
  return recipe.rating * Math.log(recipe.ratingsCount + 1);
}

export function cookScore(cook: Pick<Cook, "averageRating" | "totalRatings" | "totalRecipes">) {
  const activityFactor = 1 + Math.min(cook.totalRecipes, 20) / 20;
  return cook.averageRating * Math.log(cook.totalRatings + 1) * activityFactor;
}

export function eligibleTopCooks(cooks: Cook[]) {
  return cooks
    .filter((cook) => cook.totalRecipes >= 3 && cook.totalRatings >= 20)
    .sort((a, b) => cookScore(b) - cookScore(a));
}
