import { CategoryCard } from "@/components/category-card";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { EmptyState } from "@/components/ui";
import { getCategories } from "@/lib/data";
import { getServerTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, t] = await Promise.all([getCategories(), getServerTranslator()]);

  return (
      <main className="page-main">
        <Reveal as="section" className="hero-panel min-h-[200px] md:min-h-[280px]" variant="fadeUp">
          <p className="eyebrow">{t("კატეგორიები")}</p>
          <h1 className="text-[clamp(34px,5vw,74px)] font-black leading-none tracking-normal">
            <HeroTitle text={t("ყველა კატეგორია")} />
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted md:mt-4 md:text-base">
            {t("აირჩიე რეცეპტები სიტუაციით, დროით ან იმ განწყობით, რაც დღეს სამზარეულოში გაქვს.")}
          </p>
          <span className="hero-watermark">Cats</span>
        </Reveal>

        <section className="mt-8">
          {categories.length > 0 ? (
            <Stagger as="div" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" stagger={0.04} childVariant="popIn">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </Stagger>
          ) : (
            <EmptyState mark="0" title="კატეგორიები ჯერ არ არის" description="კატეგორიები მალე დაემატება, რომ სასურველი რეცეპტი უფრო მარტივად იპოვო." />
          )}
        </section>
      </main>
  );
}
