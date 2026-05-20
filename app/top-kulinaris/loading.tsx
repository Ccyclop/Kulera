import { PageShell } from "@/components/page-shell";
import { SkeletonCookCard, SkeletonHero } from "@/components/ui";

export default function Loading() {
  return (
    <PageShell>
      <main className="page-main">
        <SkeletonHero />
        <div className="mt-8 grid gap-3" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonCookCard key={index} />
          ))}
        </div>
      </main>
    </PageShell>
  );
}
