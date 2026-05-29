import { notFound } from "next/navigation";
import { CookMode } from "@/components/cook-mode";
import { getRecipeBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function RecipeCookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  return <CookMode recipe={recipe} />;
}
