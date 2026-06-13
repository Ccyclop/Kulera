import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n-provider";
import { PageShell } from "@/components/page-shell";
import { PostHogProvider } from "@/components/posthog-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { getLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/shared";
import { mersad } from "./fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return {
    title: {
      default: translate(locale, "Kulera - კულინარიის კერა"),
      template: "%s - Kulera",
    },
    description: translate(locale, "ქართული რეცეპტების პლატფორმა ყოველდღიური სამზარეულოსთვის."),
    icons: {
      icon: [{ url: "/brand/kulera-app-icon.png", type: "image/png" }],
      apple: [{ url: "/brand/kulera-app-icon.png", type: "image/png" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={mersad.variable} data-scroll-behavior="smooth">
      <body>
        <PostHogProvider>
          <I18nProvider initialLocale={locale}>
            <PageShell>{children}</PageShell>
            <CookieConsent />
          </I18nProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
