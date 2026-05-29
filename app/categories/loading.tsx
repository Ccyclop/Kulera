import { SkeletonCategoryGrid, SkeletonHero } from "@/components/ui";

export default function Loading() {
  return (
      <main className="page-main">
        <SkeletonHero />
        <SkeletonCategoryGrid count={12} />
      </main>
  );
}
