import { SkeletonHero, SkeletonRecipeGrid } from "@/components/ui";

export default function Loading() {
  return (
      <main className="page-main">
        <SkeletonHero />
        <SkeletonRecipeGrid count={8} className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" />
      </main>
  );
}
