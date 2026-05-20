import { NextResponse } from "next/server";
import { searchRecipes } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const recipes = await searchRecipes(query);
  const results = recipes.slice(0, 4).map((recipe) => ({
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    imageUrl: recipe.imageUrl,
    categoryName: recipe.categoryName,
    cookingTime: recipe.cookingTime,
    rating: recipe.rating,
  }));

  return NextResponse.json({
    results,
    totalCount: recipes.length,
  });
}
