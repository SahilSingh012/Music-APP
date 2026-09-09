import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PWA } from "@/components/pwa";

/**
 * Fonts are loaded from the Google Fonts CDN via <link> rather than
 * `next/font/google`. `next/font` downloads the files at build time, which
 * makes the production build fail in any sandboxed / offline / firewalled CI
 * environment. The <link> approach keeps the exact same typefaces at runtime
 * and degrades to the system stack if the CDN is unreachable.
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700;800&display=swap";

export const metadata: Metadata = {
  title: "RanaSongs — Punjabi, Haryanvi & Hindi songs, no login",
  description:
    "Stream new Punjabi, Haryanvi and Hindi songs instantly on RanaSongs. No sign-up, no login, no paywall — press play. Search anything and play it online too.",
  applicationName: "RanaSongs",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RanaSongs",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body className="bg-stage font-sans text-zinc-100 antialiased">
        {children}
        <PWA />
      </body>
    </html>
  );
}
