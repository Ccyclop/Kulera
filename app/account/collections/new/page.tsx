import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectionForm } from "@/components/collection-form";
import { HeroTitle, Reveal } from "@/components/motion";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { requireAuth } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const auth = await requireAuth("/account/collections/new");
  const t = await getServerTranslator();

  if (!auth.configured) {
    return (
      <main className="page-main">
        <SupabaseSetupNotice title="კოლექციის შექმნა დროებით მიუწვდომელია" />
      </main>
    );
  }

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
        <p className="eyebrow">{t("ახალი კოლექცია")}</p>
        <h1 className="text-[clamp(30px,4.4vw,60px)] font-black leading-none tracking-normal">
          <HeroTitle text={t("ახალი კოლექცია")} />
        </h1>
      </Reveal>

      <div className="mt-8 max-w-2xl">
        <CollectionForm userId={auth.userId} />
      </div>
    </main>
  );
}
