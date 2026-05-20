import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthGuardResult =
  | {
      claims: null;
      configured: false;
      userId: null;
    }
  | {
      claims: Record<string, unknown>;
      configured: true;
      userId: string;
    };

export async function requireAuth(redirectTo: string): Promise<AuthGuardResult> {
  if (!hasSupabaseConfig()) {
    return {
      claims: null,
      configured: false,
      userId: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as Record<string, unknown> | null;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (error || !claims || !userId) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  return {
    claims,
    configured: true,
    userId,
  };
}

export async function getAuthClaims() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return data.claims as Record<string, unknown>;
}
