import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Votara — College Club Website",
    template: "%s | Votara",
  },
  description: "Your college club's home online — events, announcements, members, and secure elections all in one place.",
  keywords: ["college club", "student elections", "campus voting", "student organization", "online voting"],
  authors: [{ name: "Votara Team" }],
  creator: "Votara",
  publisher: "Votara",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://votara.app",
    siteName: "Votara",
    title: "Votara — College Club Website",
    description: "Your college club's home online — events, announcements, members, and secure elections all in one place.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Votara - College Club Website",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Votara — College Club Website",
    description: "Your college club's home online — events, announcements, members, and secure elections all in one place.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1B1F3B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}