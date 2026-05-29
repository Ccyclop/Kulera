import { RecipeForm } from "@/components/recipe-form";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { SidebarCard } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { getServerTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AddRecipePage() {
  const auth = await requireAuth("/recipes/add");
  const t = await getServerTranslator();

  if (!auth.configured) {
    return (
        <main className="page-main">
          <SupabaseSetupNotice title="რეცეპტის დამატება დროებით მიუწვდომელია" />
        </main>
    );
  }

  const categories = await getCategories();

  return (
      <main className="page-main">
        <section className="mb-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="hero-panel min-h-[300px]">
            <p className="eyebrow">{t("ახალი რეცეპტი")}</p>
            <h1 className="text-[clamp(42px,5vw,74px)] font-black leading-none tracking-normal">{t("რეცეპტის დამატება")}</h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted">
              {t("დაამატე მკაფიო ინგრედიენტები, მარტივი ნაბიჯები და რეალური ფოტო, რომ სხვებმა მარტივად მოამზადონ.")}
            </p>
            <span className="hero-watermark">Add</span>
          </div>
          <aside className="soft-card rounded-[26px] p-5">
            <strong className="block text-xl font-black leading-tight">{t("სანამ გამოაქვეყნებ")}</strong>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("კარგი რეცეპტი მოკლეა, ზუსტი და გამოცდილი. თითო ნაბიჯში ერთი მთავარი მოქმედება დატოვე.")}
            </p>
          </aside>
        </section>

        <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
          <RecipeForm categories={categories} userId={auth.userId} />
          <aside className="grid content-start gap-4 xl:sticky xl:top-28">
            <SidebarCard title="დაწერე ნაბიჯები მარტივად">
              {t("გრძელი აბზაცები დაყავი მოქმედებებად. ერთი ნაბიჯი, ერთი მოქმედება.")}
            </SidebarCard>
            <SidebarCard title="დაამატე რეალური ფოტო">
              {t("სჯობს ბუნებრივი, სახლში გადაღებული ფოტო, ვიდრე ზედმეტად დამუშავებული სურათი.")}
            </SidebarCard>
            <SidebarCard title="მიუთითე ზუსტი ინგრედიენტები">
              {t("რაოდენობები ამცირებს შეცდომებს და რეცეპტი უფრო სანდო ხდება.")}
            </SidebarCard>
          </aside>
        </section>
      </main>
  );
}
