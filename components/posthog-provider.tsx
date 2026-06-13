"use client";

import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/env";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// App host used for the PostHog toolbar / links. Ingestion itself goes through
// the `/ingest` reverse proxy configured in next.config.mjs. Default is the EU
// cloud; override with NEXT_PUBLIC_POSTHOG_HOST if you use the US cloud.
const POSTHOG_UI_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com";

// Lets the cookie banner know PostHog has finished initialising, so it reads the
// persisted consent choice (not a pre-init default) before deciding to show.
const PostHogReadyContext = createContext(false);

export function usePostHogReady() {
  return useContext(PostHogReadyContext);
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!POSTHOG_KEY) return;

    posthog.init(POSTHOG_KEY, {
      // Route events through our own domain (/ingest) so ad-blockers don't drop them.
      api_host: "/ingest",
      ui_host: POSTHOG_UI_HOST,
      // We capture pageviews manually below — the App Router doesn't fire them on
      // client-side navigation, so the automatic capture would miss most pages.
      capture_pageview: false,
      capture_pageleave: true,
      // Only create person profiles for logged-in users we explicitly identify.
      // Anonymous visitors are still counted as unique visitors in Web Analytics.
      person_profiles: "identified_only",
      // GDPR: capture nothing until the visitor accepts via the cookie banner.
      // The choice is persisted, so returning visitors resume automatically.
      opt_out_capturing_by_default: true,
    });

    // init() reads persisted consent synchronously, so it's safe to mark ready now.
    setReady(true);
  }, []);

  // When PostHog isn't configured (e.g. local dev without keys), render nothing extra.
  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <PostHogReadyContext.Provider value={ready}>
        <SuspendedPostHogPageView />
        <PostHogIdentify />
        {children}
      </PostHogReadyContext.Provider>
    </PHProvider>
  );
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (!pathname || !posthogClient) return;

    let url = window.origin + pathname;
    const query = searchParams.toString();
    if (query) url += `?${query}`;

    posthogClient.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthogClient]);

  return null;
}

// useSearchParams() must be wrapped in Suspense to avoid de-opting the whole
// app into client-side rendering.
function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}

// Tie analytics events to the signed-in Supabase user so unique real users are
// recognised across sessions and devices.
function PostHogIdentify() {
  const posthogClient = usePostHog();

  useEffect(() => {
    if (!posthogClient || !getSupabaseConfig()) return;

    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        posthogClient.identify(session.user.id, {
          email: session.user.email ?? undefined,
        });
      } else if (event === "SIGNED_OUT") {
        posthogClient.reset();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [posthogClient]);

  return null;
}
