import { ShieldCheck } from "lucide-react";
import { CookCard } from "@/components/cook-card";
import { HeroTitle, Reveal, Stagger } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { Badge, EmptyState, SidebarCard } from "@/components/ui";
import { getRankedCooks } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TopKulinarisPage() {
  const rankedCooks = await getRankedCooks();
  const featured = rankedCooks.slice(0, 3);

  return (
    <PageShell>
      <main className="page-main">
        <Reveal as="section" className="mb-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="hero-panel min-h-[300px]">
            <p className="eyebrow">კულინარები</p>
            <h1 className="text-[clamp(42px,5vw,74px)] font-black leading-none tracking-normal">
              <HeroTitle text="ტოპ კულინარები" />
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted">
              იპოვე კულინარები, რომელთა რეცეპტებს მომხმარებლები ხშირად ირჩევენ და მაღალ შეფასებას აძლევენ.
            </p>
            <span className="hero-watermark">ტოპ</span>
          </div>
          <SidebarCard title="როგორ დგება რეიტინგი">
            <ul className="grid gap-3 text-sm">
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                კულინარს რამდენიმე რეცეპტი უკვე დამატებული აქვს
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                რეცეპტებს საკმარისი შეფასებები აქვს
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                შედეგი ითვალისწინებს შეფასებასაც და აქტიურობასაც
              </li>
            </ul>
          </SidebarCard>
        </Reveal>

        <section>
          <div className="section-title">
            <div>
              <h2>კვირის საუკეთესო სამეული</h2>
              <p>სამეული ეფუძნება საკმარის აქტივობას და არა მხოლოდ მაღალ საშუალო შეფასებას.</p>
            </div>
            <Badge>აქტიური კულინარები</Badge>
          </div>
          {featured.length > 0 ? (
            <Stagger as="div" className="grid gap-4 lg:grid-cols-3" stagger={0.1} childVariant="fadeUp">
              {featured.map((cook, index) => (
                <CookCard key={cook.id} cook={cook} rank={index + 1} featured />
              ))}
            </Stagger>
          ) : (
            <EmptyState mark="0" title="რეიტინგი ჯერ არ არის" description="ტოპ კულინარები აქ გამოჩნდებიან, როცა რეცეპტებს საკმარისი შეფასებები დაუგროვდება." />
          )}
        </section>

        <section>
          <div className="section-title">
            <div>
              <h2>სრული რეიტინგი</h2>
              <p>ყველა აქტიური კულინარი, რომლის რეცეპტებსაც უკვე აქვს მომხმარებლების შეფასება.</p>
            </div>
          </div>
          {rankedCooks.length > 0 ? (
            <Stagger as="div" className="grid gap-3" stagger={0.05} childVariant="fadeUp">
              {rankedCooks.map((cook, index) => (
                <CookCard key={cook.id} cook={cook} rank={index + 1} />
              ))}
            </Stagger>
          ) : (
            <EmptyState mark="0" title="სრული რეიტინგი ჯერ ცარიელია" description="კულინარები აქ გამოჩნდებიან, როცა მათ რეცეპტებს მეტი შეფასება დაუგროვდება." />
          )}
        </section>
      </main>
    </PageShell>
  );
}
