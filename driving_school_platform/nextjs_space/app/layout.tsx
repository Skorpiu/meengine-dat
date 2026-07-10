import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { LanguageProvider } from "@/contexts/language-context";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

/** Aligns with `--driving-primary` in globals.css and manifest.webmanifest */
const DAT_PWA_THEME_COLOR = "#2563eb";

export const viewport: Viewport = {
  themeColor: DAT_PWA_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  applicationName: "Driving Academy Tool",
  title: {
    default: "Driving Academy Tool",
    template: "%s | DAT",
  },
  description:
    "Driving school operations platform for lessons, people, and scheduling. Requires network access.",
  keywords:
    "driving school, driving lessons, driving instructor, driving academy, school administration",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DAT",
  },
  icons: {
    icon: [{ url: "/icons/dat-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/dat-icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <LanguageProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              {children}
              <SonnerToaster />
              <HotToaster position="top-right" />
            </ThemeProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
