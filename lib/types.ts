export type Difficulty = "მარტივი" | "საშუალო" | "რთული";
export type RecipeStatus = "draft" | "published" | "archived";
export type RecipeVisibility = "public" | "unlisted";
export type CollectionVisibility = "public" | "unlisted" | "private";

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
  quantity: number | null;
  unit: string;
  note: string;
  amount: string;
}

export interface RecipeStep {
  title: string;
  body: string;
  durationSeconds: number | null;
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
  videoUrl: string | null;
  videoPath: string | null;
  baseServings: number | null;
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
  creatorAvatarUrl: string;
  creatorAvatarInitial: string;
  createdAt: string;
  status: RecipeStatus;
  visibility: RecipeVisibility;
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

export interface Collection {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  coverImagePath: string | null;
  visibility: CollectionVisibility;
  shareToken: string;
  recipeCount: number;
  createdAt: string;
  updatedAt: string;
  creatorUsername: string;
  creatorName: string;
  creatorAvatarUrl: string;
  creatorAvatarInitial: string;
}

// One recipe inside a collection, carrying its membership row id + ordering.
export interface CollectionMember {
  membershipId: string;
  section: string | null;
  position: number;
  recipe: Recipe;
}

// Recipes grouped for display: a flat list yields one section with label === null.
export interface CollectionSection {
  label: string | null;
  recipes: Recipe[];
}

export interface CollectionDetail {
  collection: Collection;
  members: CollectionMember[];
  sections: CollectionSection[];
}
