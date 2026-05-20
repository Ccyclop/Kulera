export type Difficulty = "მარტივი" | "საშუალო" | "რთული";
export type RecipeStatus = "draft" | "published" | "archived";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  recipeCount: number;
  tone: string;
  dot: string;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeStep {
  title: string;
  body: string;
}

export interface RecipeTip {
  title: string;
  body: string;
}

export interface Recipe {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  imagePath: string | null;
  cookingTime: number;
  difficulty: Difficulty;
  servings: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tips: RecipeTip[];
  rating: number;
  ratingsCount: number;
  commentsCount: number;
  saveCount: number;
  creatorUsername: string;
  creatorName: string;
  createdAt: string;
  status: RecipeStatus;
  tags: string[];
}

export interface Cook {
  id: string;
  fullName: string;
  username: string;
  avatarInitial: string;
  avatarUrl: string;
  bio: string;
  averageRating: number;
  totalRecipes: number;
  totalRatings: number;
  badges: string[];
  mostPopularRecipe: string;
}

export interface Comment {
  id: string;
  userId: string;
  recipeSlug: string;
  author: string;
  avatarInitial: string;
  body: string;
  createdAt: string;
}
