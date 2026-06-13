import Link from "next/link";
import { ArrowLeft, FolderPlus } from "lucide-react";
import { CollectionCard } from "@/components/collection-card";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { ButtonLink, EmptyState } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getOwnedCollections } from "@/lib/data";
import { getServerTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function MyCollectionsPage() {
  const auth = await requireAuth("/account/collections");
  const t = await getServerTranslator();

  if (!auth.configured) {
    return (
      <main className="page-main">
        <SupabaseSetupNotice title="ჩემი კოლექციები დროებით მიუწვდომელია" />
      </main>
    );
  }

  const collections = await getOwnedCollections(auth.userId);

  return (
    <main className="page-main">
      <Link href="/account" className="mb-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-muted no-underline">
        <ArrowLeft className="h-4 w-4" />
        {t("ანგარიშზე დაბრუნება")}
      </Link>

      <Reveal as="section" className="hero-panel min-h-[200px] md:min-h-[260px]">
        <p className="eyebrow">{t("ჩემი კოლექციები")}</p>
        <h1 className="text-[clamp(34px,5vw,74px)] font-black leading-none tracking-normal">
          <HeroTitle text={t("ჩემი კოლექციები")} />
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted md:mt-4 md:text-base">
          {t("შექმენი რეცეპტების კრებულები და გაუზიარე ბმულით — სიად ან კვირის გეგმად.")}
        </p>
        <div className="mt-5">
          <ButtonLink href="/account/collections/new">
            <FolderPlus className="h-4 w-4" />
            {t("ახალი კოლექცია")}
          </ButtonLink>
        </div>
        <span className="hero-watermark">Sets</span>
      </Reveal>

      {collections.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            mark="+"
            title="ჯერ კოლექცია არ შეგიქმნია"
            description="შექმენი პირველი კოლექცია — დაამატე რეცეპტები, დაალაგე და გაუზიარე ბმულით."
            action={<ButtonLink href="/account/collections/new">კოლექციის შექმნა</ButtonLink>}
          />
        </div>
      ) : (
        <Stagger as="div" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              href={`/account/collections/${collection.slug}/edit`}
              showVisibility
            />
          ))}
        </Stagger>
      )}
    </main>
  );
}
