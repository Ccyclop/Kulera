import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { DeleteAccountForm, NotificationSettingsForm, PasswordSettingsForm, ProfileSettingsForm } from "@/components/account-forms";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { requireAuth } from "@/lib/auth";
import { getAccountProfile, getOwnedRecipes } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const auth = await requireAuth("/account");

  if (!auth.configured) {
    return (
      <PageShell>
        <main className="page-main">
          <SupabaseSetupNotice />
        </main>
      </PageShell>
    );
  }

  const [profile, ownedRecipes] = await Promise.all([
    getAccountProfile(auth.userId, auth.claims),
    getOwnedRecipes(auth.userId),
  ]);

  const draftCount = ownedRecipes.filter((recipe) => recipe.status === "draft").length;
  const publishedCount = ownedRecipes.filter((recipe) => recipe.status === "published").length;

  return (
    <PageShell>
      <main className="page-main">
        <Reveal as="section" className="hero-panel min-h-[260px]">
          <p className="eyebrow">პროფილი</p>
          <h1 className="text-[clamp(42px,5vw,74px)] font-black leading-none tracking-normal">
            <HeroTitle text="ანგარიშის პარამეტრები" />
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted">
            მართე პროფილის ინფორმაცია, პაროლი და შეტყობინებები.
          </p>
          <span className="hero-watermark">Account</span>
        </Reveal>

        <Stagger as="section" className="mt-8 grid gap-5" stagger={0.08} childVariant="fadeUp">
          <Link
            href="/account/recipes"
            className="soft-card group flex items-center justify-between gap-4 rounded-[28px] p-5 no-underline transition-shadow duration-200 hover:shadow-panel md:p-6"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-soft-clay text-clay-dark">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[18px] font-black leading-tight text-ink md:text-[20px]">ჩემი რეცეპტები</h2>
                <p className="mt-1 text-xs font-bold text-muted md:text-sm">
                  {publishedCount} გამოქვეყნებული • {draftCount} მონახაზი
                </p>
              </div>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full border border-oat bg-surface text-clay transition-transform duration-200 group-hover:translate-x-1">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <ProfileSettingsForm profile={profile} userId={auth.userId} />

          <article className="soft-card rounded-[28px] p-5 md:p-7">
            <div className="mb-5">
              <h2 className="text-[28px] font-black leading-tight">ანგარიში</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">პაროლი და შეტყობინებების პრეფერენციები.</p>
            </div>
            <div className="grid gap-6">
              <PasswordSettingsForm />
              <div className="h-px bg-oat" />
              <NotificationSettingsForm profile={profile} />
            </div>
          </article>

          <article className="soft-card flex flex-col gap-4 rounded-[28px] p-5 md:flex-row md:items-center md:justify-between md:p-7">
            <div>
              <h2 className="text-[20px] font-black leading-tight">სესიის დასრულება</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">გამოდი ანგარიშიდან — შენი მონაცემები შენარჩუნდება.</p>
            </div>
            <SignOutButton />
          </article>

          <article className="soft-card rounded-[28px] border-danger/25 p-5 md:p-7">
            <DeleteAccountForm username={profile?.username ?? ""} />
          </article>
        </Stagger>
      </main>
    </PageShell>
  );
}
