/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Reverse-proxy PostHog through our own domain so ad-blockers don't drop
  // analytics events. EU cloud hosts — if you use the US cloud, swap these for
  // us-assets.i.posthog.com and us.i.posthog.com.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // PostHog ingestion endpoints must not be trailing-slash redirected.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
