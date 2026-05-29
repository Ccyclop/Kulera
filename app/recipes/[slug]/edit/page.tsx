import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { SidebarCard } from "@/components/ui";
import { requireAuth } from "@/lib/auth";
import { getCategories, getEditableRecipeBySlug } from "@/lib/data";
import { getServerTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await requireAuth(`/recipes/${slug}/edit`);
  const t = await getServerTranslator();

  if (!auth.configured) {
    return (
        <main className="page-main">
          <SupabaseSetupNotice title="რეცეპტის რედაქტირება დროებით მიუწვდომელია" />
        </main>
    );
  }

  const [recipe, categories] = await Promise.all([getEditableRecipeBySlug(slug, auth.userId), getCategories()]);

  if (!recipe) {
    notFound();
  }

  return (
      <main className="page-main">
        <section className="mb-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="hero-panel min-h-[300px]">
            <p className="eyebrow">{t("რეცეპტის მართვა")}</p>
            <h1 className="text-[clamp(42px,5vw,74px)] font-black leading-none tracking-normal">{t("რეცეპტის რედაქტირება")}</h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted">
              {t("შეასწორე ტექსტი, ინგრედიენტები, ნაბიჯები ან მედია ისე, რომ არსებული რეცეპტი უკეთესი გახდეს.")}
            </p>
            <span className="hero-watermark">Edit</span>
          </div>
          <aside className="soft-card rounded-[26px] p-5">
            <strong className="block text-xl font-black leading-tight">{t("Unsaved changes")}</strong>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("შენ გაქვს შეუნახავი ცვლილებების warning state. გვერდის დატოვებამდე შეინახე ან გააუქმე.")}
            </p>
          </aside>
        </section>

        <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="mb-4 rounded-[20px] border border-oat bg-[#FAF6F0] p-4 text-sm font-bold text-muted">
              {t("Editing:")} <span className="text-ink">{recipe.title}</span>
            </div>
            <RecipeForm mode="edit" recipe={recipe} categories={categories} userId={auth.userId} />
          </div>
          <aside className="grid content-start gap-4 xl:sticky xl:top-28">
            <SidebarCard title="Helper">
              {t("ცვლილების შემდეგ გადაამოწმე title, servings და cooking time, რადგან ისინი card-ებზე ჩანს.")}
            </SidebarCard>
            <SidebarCard title="Delete confirmation">
              {t("წაშლის ღილაკი ახლა გახსნის დადასტურების ფანჯარას და მხოლოდ დადასტურების შემდეგ წაშლის რეცეპტს.")}
            </SidebarCard>
          </aside>
        </section>
      </main>
  );
}
