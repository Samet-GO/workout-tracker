import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DbProvider } from "@/components/layout/db-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { BottomNav } from "@/components/layout/bottom-nav";
import { InstallPrompt } from "@/components/layout/install-prompt";
import { OfflineIndicator } from "@/components/layout/offline-indicator";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "Offline-first strength training logger",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Workout Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-50 dark:bg-zinc-950 antialiased`}>
        {/* Skip link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <DbProvider>
          <ThemeProvider>
            <main id="main-content" className="mx-auto min-h-screen max-w-lg pb-20" tabIndex={-1}>
              {children}
            </main>
            <BottomNav />
            <InstallPrompt />
            <OfflineIndicator />
          </ThemeProvider>
        </DbProvider>
      </body>
    </html>
  );
}
