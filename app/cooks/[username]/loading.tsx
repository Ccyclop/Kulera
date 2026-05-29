import { SkeletonHero, SkeletonRecipeGrid } from "@/components/ui";

export default function Loading() {
  return (
      <main className="page-main">
        <SkeletonHero />
        <SkeletonRecipeGrid count={6} />
      </main>
  );
}
