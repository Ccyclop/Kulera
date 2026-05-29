import { ButtonLink } from "@/components/ui";
import { getServerTranslator } from "@/lib/i18n/server";

export async function SupabaseSetupNotice({ title = "ეს ნაწილი დროებით მიუწვდომელია" }: { title?: string }) {
  const t = await getServerTranslator();

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-black leading-tight">{t(title)}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        {t("ავტორიზაციის სერვისი ამ მომენტში ვერ ჩაიტვირთა. სცადე მოგვიანებით ან დაბრუნდი მთავარ გვერდზე.")}
      </p>
      <div className="mt-5">
        <ButtonLink href="/" variant="secondary">
          მთავარზე დაბრუნება
        </ButtonLink>
      </div>
    </section>
  );
}
