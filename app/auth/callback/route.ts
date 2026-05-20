import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

function safeRedirectPath(value: string | null, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.search = "";

  if (!hasSupabaseConfig()) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "supabase-env-missing");
    return NextResponse.redirect(redirectTo);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "oauth-callback-failed");
  return NextResponse.redirect(redirectTo);
}
