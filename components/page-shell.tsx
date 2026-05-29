import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getAuthClaims } from "@/lib/auth";

export async function PageShell({ children }: { children: ReactNode }) {
  const claims = await getAuthClaims();
  const isAuthenticated = Boolean(claims);

  return <AppShell isAuthenticated={isAuthenticated}>{children}</AppShell>;
}
