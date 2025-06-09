import type { Metadata } from "next";
import "./globals.css";
import "./styles/local-fonts.css";
import "./styles/fonts.css";
import MainLayout from "@/components/MainLayout";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { SoundProvider } from "@/contexts/SoundContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Narratium",
  description: "交互式故事体验",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: { url: "/logo.png", sizes: "180x180" },
    shortcut: { url: "/logo.png" },
  },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="h-full">
      <body className="h-full bg-[#171717] text-white">
        <GoogleAnalytics />
        <SoundProvider>
          <LanguageProvider>
            <MainLayout>{children}</MainLayout>
          </LanguageProvider>
        </SoundProvider>
        <Analytics />
      </body>
    </html>
  );
}

