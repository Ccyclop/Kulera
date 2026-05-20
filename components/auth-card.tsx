import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

export function AuthCard({ children, title, description }: { children: ReactNode; title: string; description?: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <section className="soft-card w-full max-w-[440px] rounded-[30px] p-7">
        <Link href="/" className="flex w-fit items-center no-underline" aria-label="Kulera home">
          <BrandLogo className="h-[50px] w-[158px]" priority />
        </Link>
        <h1 className="mt-7 text-4xl font-black leading-tight">{title}</h1>
        {description ? <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p> : null}
        {children}
      </section>
    </main>
  );
}
