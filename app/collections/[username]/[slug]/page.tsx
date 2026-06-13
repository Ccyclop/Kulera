import { notFound } from "next/navigation";
import { CollectionView } from "@/components/collection-view";
import { getPublicCollectionBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PublicCollectionPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const detail = await getPublicCollectionBySlug(username, slug);

  if (!detail) {
    notFound();
  }

  return (
    <main className="page-main">
      <CollectionView detail={detail} />
    </main>
  );
}
