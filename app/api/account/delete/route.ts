import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig, hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (request.headers.get("x-kulera-internal-action") !== "account-delete") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase არ არის კონფიგურირებული." }, { status: 500 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY არ არის კონფიგურირებული." }, { status: 500 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !userId) {
    return NextResponse.json({ error: "ავტორიზაცია ვერ დადასტურდა." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
