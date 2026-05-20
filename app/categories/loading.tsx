import { PageShell } from "@/components/page-shell";
import { SkeletonCategoryGrid, SkeletonHero } from "@/components/ui";

export default function Loading() {
  return (
    <PageShell>
      <main className="page-main">
        <SkeletonHero />
        <SkeletonCategoryGrid count={12} />
      </main>
    </PageShell>
  );
}
