import type { ReactNode } from "react";
import { getAuthClaims } from "@/lib/auth";
import { MobileBottomNav } from "./mobile-nav";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export async function PageShell({ children }: { children: ReactNode }) {
  const claims = await getAuthClaims();
  const isAuthenticated = Boolean(claims);

  return (
    <>
      <SiteHeader isAuthenticated={isAuthenticated} />
      <div className="pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
        <SiteFooter />
      </div>
      <MobileBottomNav />
    </>
  );
}
