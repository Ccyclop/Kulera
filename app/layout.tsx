import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { mersad } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kulera - კულინარიის კერა",
    template: "%s - Kulera",
  },
  description: "ქართული რეცეპტების პლატფორმა ყოველდღიური სამზარეულოსთვის.",
  icons: {
    icon: [{ url: "/brand/kulera-app-icon.png", type: "image/png" }],
    apple: [{ url: "/brand/kulera-app-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" className={mersad.variable} data-scroll-behavior="smooth">
      <body>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
