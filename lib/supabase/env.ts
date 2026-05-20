export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { key, url };
}

export function hasSupabaseConfig() {
  return getSupabaseConfig() !== null;
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }

  return config;
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function hasSupabaseAdminConfig() {
  return getSupabaseConfig() !== null && Boolean(getSupabaseServiceRoleKey());
}
