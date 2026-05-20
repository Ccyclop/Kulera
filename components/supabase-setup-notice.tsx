import { ButtonLink } from "@/components/ui";

export function SupabaseSetupNotice({ title = "ეს ნაწილი დროებით მიუწვდომელია" }: { title?: string }) {
  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-black leading-tight">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        ავტორიზაციის სერვისი ამ მომენტში ვერ ჩაიტვირთა. სცადე მოგვიანებით ან დაბრუნდი მთავარ გვერდზე.
      </p>
      <div className="mt-5">
        <ButtonLink href="/" variant="secondary">
          მთავარზე დაბრუნება
        </ButtonLink>
      </div>
    </section>
  );
}
