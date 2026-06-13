import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionView } from "@/components/collection-view";
import { getSharedCollectionByToken } from "@/lib/data";

export const dynamic = "force-dynamic";

// Link-only collections must never be indexed — possession of the token is the
// only intended access path.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedCollectionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const detail = await getSharedCollectionByToken(token);

  if (!detail) {
    notFound();
  }

  return (
    <main className="page-main">
      <CollectionView detail={detail} showVisibility />
    </main>
  );
}
