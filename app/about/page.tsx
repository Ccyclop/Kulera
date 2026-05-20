import { ButtonLink } from "@/components/ui";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { PageShell } from "@/components/page-shell";

const sections = [
  {
    title: "რა არის Kulera?",
    body: "Kulera არის ქართული რეცეპტების პლატფორმა: მოძებნე კერძი, ინგრედიენტი ან სიტუაცია და სწრაფად აირჩიე რეცეპტი.",
  },
  {
    title: "რატომ Kulera?",
    body: "პლატფორმა პასუხობს ყოველდღიურ კითხვას: რა მოვამზადო დღეს? ძიება, კატეგორიები და რეიტინგები არჩევას მარტივს ხდის.",
  },
  {
    title: "საზოგადოება",
    body: "მომხმარებლებს შეუძლიათ დაამატონ რეცეპტები, შეაფასონ კერძები და აღმოაჩინონ კულინარები, რომელთა რეცეპტებიც სანდოა.",
  },
  {
    title: "მაცივრიდან იდეამდე",
    body: "სამომავლოდ Kulera შეძლებს მაცივრის ფოტოდან ინგრედიენტების ამოცნობას და შესაბამისი რეცეპტების შეთავაზებას.",
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <main className="page-main">
        <Reveal as="section" className="hero-panel min-h-[320px]">
          <p className="eyebrow">Kulera</p>
          <h1 className="text-[clamp(42px,5vw,74px)] font-black leading-none tracking-normal">
            <HeroTitle text="Kulera — კულინარიის კერა" />
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted">
            ქართული რეცეპტების პლატფორმა ყოველდღიური სამზარეულოსთვის.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/">რეცეპტების ნახვა</ButtonLink>
            <ButtonLink href="/recipes/add" variant="secondary">
              რეცეპტის დამატება
            </ButtonLink>
          </div>
          <span className="hero-watermark">Kulera</span>
        </Reveal>

        <Stagger as="section" className="mt-8 grid gap-4 md:grid-cols-2" stagger={0.1} childVariant="fadeUp">
          {sections.map((section) => (
            <article key={section.title} className="soft-card rounded-[28px] p-6">
              <h2 className="text-[24px] font-black leading-tight">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{section.body}</p>
            </article>
          ))}
        </Stagger>
      </main>
    </PageShell>
  );
}
