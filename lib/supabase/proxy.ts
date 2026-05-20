import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./env";
import { getSupabaseRuntimeOptions } from "./realtime";

const protectedRoutes = [
  "/account",
  "/recipes/add",
  "/saved",
];

const authRoutes = ["/login", "/register", "/forgot-password"];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    || /^\/recipes\/[^/]+\/edit$/.test(pathname);
}

function isAuthRoute(pathname: string) {
  return authRoutes.some((route) => pathname === route);
}

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const runtimeOptions = await getSupabaseRuntimeOptions();

  const supabase = createServerClient(config.url, config.key, {
    ...runtimeOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, options, value }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  let claims: unknown = null;

  try {
    const { data } = await supabase.auth.getClaims();
    claims = data?.claims ?? null;
  } catch {
    claims = null;
  }

  const pathname = request.nextUrl.pathname;

  if (!claims && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (claims && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
