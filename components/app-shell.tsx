"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MobileBottomNav } from "@/components/mobile-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

function shouldRenderStandalone(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    /^\/recipes\/[^/]+\/cook\/?$/.test(pathname)
  );
}

export function AppShell({
  children,
  isAuthenticated,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();

  if (shouldRenderStandalone(pathname)) {
    return <>{children}</>;
  }

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
