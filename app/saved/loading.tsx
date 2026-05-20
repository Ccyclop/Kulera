import { PageShell } from "@/components/page-shell";
import { SkeletonHero, SkeletonRecipeGrid } from "@/components/ui";

export default function Loading() {
  return (
    <PageShell>
      <main className="page-main">
        <SkeletonHero />
        <SkeletonRecipeGrid count={6} />
      </main>
    </PageShell>
  );
}
