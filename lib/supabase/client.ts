import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "./env";

export function createClient() {
  const { key, url } = requireSupabaseConfig();

  return createBrowserClient(url, key);
}
