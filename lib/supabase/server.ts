import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "./env";
import { getSupabaseRuntimeOptions } from "./realtime";

export async function createClient() {
  const { key, url } = requireSupabaseConfig();
  const cookieStore = await cookies();
  const runtimeOptions = await getSupabaseRuntimeOptions();

  return createServerClient(url, key, {
    ...runtimeOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes sessions.
        }
      },
    },
  });
}
