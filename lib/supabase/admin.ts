import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig, getSupabaseServiceRoleKey } from "./env";

export function createAdminClient() {
  const config = getSupabaseConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!config || !serviceRoleKey) {
    throw new Error("Missing Supabase admin configuration. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  }

  return createSupabaseClient(config.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
