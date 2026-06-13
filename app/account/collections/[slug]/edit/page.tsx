import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { CollectionEditor } from "@/components/collection-editor";
import { CollectionForm } from "@/components/collection-form";
import { CollectionSidebar } from "@/components/collection-sidebar";
import { HeroTitle, Reveal } from "@/components/motion";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { requireAuth } from "@/lib/auth";
import { getOwnedCollectionBySlug } from "@/lib/data";
import { getServerTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EditCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requireAuth(`/account/collections/${slug}/edit`);
  const t = await getServerTranslator();

  if (!auth.configured) {
    return (
      <main className="page-main">
        <SupabaseSetupNotice title="კოლექციის რედაქტირება დროებით მიუწვდომელია" />
      </main>
    );
  }

  const detail = await getOwnedCollectionBySlug(slug, auth.userId);

  if (!detail) {
    notFound();
  }

  const { collection, members } = detail;

  return (
    <main className="page-main">
      <Link
        href="/account/collections"
        className="mb-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-muted no-underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("კოლექციებში დაბრუნება")}
      </Link>

      <Reveal as="section" className="hero-panel min-h-[160px] md:min-h-[200px]">
        <p className="eyebrow">{t("კოლექციის რედაქტირება")}</p>
        <h1 className="text-[clamp(28px,4vw,56px)] font-black leading-tight tracking-normal">
          <HeroTitle text={collection.title} />
        </h1>
        {collection.visibility === "public" && collection.creatorUsername ? (
          <div className="mt-4">
            <Link
              href={`/collections/${collection.creatorUsername}/${collection.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-oat bg-surface px-3 py-1.5 text-[12px] font-black text-ink no-underline transition hover:border-clay hover:text-clay"
            >
              <Eye className="h-3.5 w-3.5" />
              {t("საჯარო გვერდის ნახვა")}
            </Link>
          </div>
        ) : null}
      </Reveal>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <CollectionForm userId={auth.userId} collection={collection} />
          <CollectionEditor collectionId={collection.id} members={members} />
        </div>
        <CollectionSidebar collection={collection} />
      </div>
    </main>
  );
}
